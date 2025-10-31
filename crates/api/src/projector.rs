use common::eventstore;
use common::eventstore::EventRecord;
use log::{debug, error, info};
use serde_json::Value as JsonValue;
use sqlx::PgPool;
use sqlx::types::Uuid;

const PROJECTION_NAME: &str = "graph_materializer";

pub async fn run(pool: PgPool) {
    info!("Projector '{}' started", PROJECTION_NAME);
    let mut last = match eventstore::get_checkpoint(&pool, PROJECTION_NAME).await {
        Ok(v) => v,
        Err(e) => {
            error!("checkpoint load error: {e}");
            0
        }
    };

    loop {
        match eventstore::events_after(&pool, last, 500).await {
            Ok(events) if events.is_empty() => {
                // idle briefly
                tokio::time::sleep(std::time::Duration::from_millis(1500)).await;
            }
            Ok(events) => {
                for ev in events.iter() {
                    if let Err(err) = apply_event(&pool, ev).await {
                        error!("projection apply error at seq {}: {}", ev.seq, err);
                        // back off a bit to avoid hot looping on a poison pill
                        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
                        break;
                    }
                    last = ev.seq;
                }
                if let Err(e) = eventstore::set_checkpoint(&pool, PROJECTION_NAME, last).await {
                    error!("checkpoint save error: {e}");
                }
            }
            Err(e) => {
                error!("events fetch error: {e}");
                tokio::time::sleep(std::time::Duration::from_secs(1)).await;
            }
        }
    }
}

async fn apply_event(pool: &PgPool, ev: &EventRecord) -> Result<(), sqlx::Error> {
    debug!("apply event_type='{}' seq={}", ev.event_type, ev.seq);

    // Fetch stream info for routing (category + key). Key is our graph UUID string.
    let stream = sqlx::query!(
        r#"SELECT category, key FROM event_streams WHERE stream_id = $1"#,
        ev.stream_id
    )
    .fetch_one(pool)
    .await?;

    // Parse graph_id from stream key when applicable (UUID string)
    let Some(graph_uuid) = Uuid::parse_str(&stream.key).ok() else {
        error!(
            "bad stream key (not a UUID) key='{}' seq={}",
            stream.key, ev.seq
        );
        return Ok(());
    };
    match stream.category.as_str() {
        // --------------------------
        // Entity projection handlers
        // --------------------------
        "entity" => {
            let entity_uuid = if stream.category == "entity" {
                ev.payload
                    .get("id")
                    .and_then(|v| v.as_str())
                    .and_then(|s| Uuid::parse_str(s).ok())
            } else {
                None
            };
            let Some(entity_uuid) = entity_uuid else {
                error!("entity event missing/invalid id (seq={})", ev.seq);
                return Ok(());
            };
            match ev.event_type.as_str() {
                "create" => {
                    // Store normalized entity document (label/entity_type at top-level)
                    let mut doc = ev.payload.clone();
                    if let Some(obj) = doc.as_object_mut() {
                        // If label/entity_type were sent under data, lift them up
                        let (lab_opt, ent_opt) =
                            if let Some(JsonValue::Object(data)) = obj.get_mut("data") {
                                (data.remove("label"), data.remove("entity_type"))
                            } else {
                                (None, None)
                            };
                        if let Some(lab) = lab_opt {
                            obj.entry("label").or_insert(lab);
                        }
                        if let Some(ent) = ent_opt {
                            obj.entry("entity_type").or_insert(ent);
                        }

                        // Ensure doc.data.label mirrors entity_type for downstream usage
                        let etype = obj
                            .get("entity_type")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string());
                        if let Some(etype) = etype {
                            // Set or create data object with label = entity_type
                            let make_data_with_label = || {
                                let mut m = serde_json::Map::new();
                                m.insert("label".to_string(), JsonValue::String(etype.clone()));
                                JsonValue::Object(m)
                            };
                            match obj.get_mut("data") {
                                Some(JsonValue::Object(d)) => {
                                    d.insert("label".to_string(), JsonValue::String(etype));
                                }
                                _ => {
                                    obj.insert("data".to_string(), make_data_with_label());
                                }
                            }
                        }
                    }
                    sqlx::query!(
                r#"
                INSERT INTO entities_current(entity_id, graph_id, doc,valid_from, valid_to, sys_from, sys_to)
                VALUES ($1, $2, $3, $4, $5, now(), NULL)
                ON CONFLICT (graph_id, entity_id) DO UPDATE SET
                  graph_id = EXCLUDED.graph_id,
                  doc = EXCLUDED.doc,
                  valid_from = EXCLUDED.valid_from,
                  valid_to = EXCLUDED.valid_to,
                  sys_from = now(),
                  sys_to = NULL
                "#,
                entity_uuid,
                graph_uuid,
                doc,
                ev.valid_from,
                ev.valid_to
            )
            .execute(pool)
            .await?;
                }
                "update" => {
                    // load current document; if missing, ignore update
                    let current = sqlx::query!(
                r#"SELECT doc FROM entities_current WHERE entity_id = $1 AND graph_id = $2 AND sys_to IS NULL"#,
                entity_uuid,
                graph_uuid
            )
            .fetch_optional(pool)
            .await?;
                    let Some(mut doc) = current.map(|r| r.doc) else {
                        return Ok(());
                    };

                    // merge fields into current doc; perform a deep merge for the `data` object
                    if let (Some(dst), Some(src)) = (doc.as_object_mut(), ev.payload.as_object()) {
                        for (k, v) in src.iter() {
                            if k == "id" {
                                continue;
                            }
                            if k == "data" {
                                match (dst.get_mut("data"), v) {
                                    (
                                        Some(JsonValue::Object(dst_obj)),
                                        JsonValue::Object(src_obj),
                                    ) => {
                                        for (sk, sv) in src_obj.iter() {
                                            dst_obj.insert(sk.clone(), sv.clone());
                                        }
                                    }
                                    _ => {
                                        dst.insert(k.clone(), v.clone());
                                    }
                                }
                            } else {
                                dst.insert(k.clone(), v.clone());
                            }
                        }
                    }

                    // Ensure label/entity_type are top-level (normalize from data if present)
                    if let Some(obj) = doc.as_object_mut() {
                        let (lab_opt, ent_opt) =
                            if let Some(JsonValue::Object(data)) = obj.get_mut("data") {
                                (data.remove("label"), data.remove("entity_type"))
                            } else {
                                (None, None)
                            };
                        if let Some(lab) = lab_opt {
                            obj.insert("label".to_string(), lab);
                        }
                        if let Some(ent) = ent_opt {
                            obj.insert("entity_type".to_string(), ent);
                        }

                        // Ensure doc.data.label mirrors entity_type for downstream usage
                        let etype = obj
                            .get("entity_type")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string());
                        if let Some(etype) = etype {
                            let make_data_with_label = || {
                                let mut m = serde_json::Map::new();
                                m.insert("label".to_string(), JsonValue::String(etype.clone()));
                                JsonValue::Object(m)
                            };
                            match obj.get_mut("data") {
                                Some(JsonValue::Object(d)) => {
                                    d.insert("label".to_string(), JsonValue::String(etype));
                                }
                                _ => {
                                    obj.insert("data".to_string(), make_data_with_label());
                                }
                            }
                        }
                    }
                    sqlx::query!(
                r#"
                INSERT INTO entities_current(entity_id, graph_id, doc, valid_from, valid_to, sys_from, sys_to)
                VALUES ($1, $2, $3, $4, $5, now(), NULL)
                ON CONFLICT (graph_id, entity_id) DO UPDATE SET
                  graph_id = EXCLUDED.graph_id,
                  doc = EXCLUDED.doc,
                  valid_from = EXCLUDED.valid_from,
                  valid_to = EXCLUDED.valid_to,
                  sys_from = now(),
                  sys_to = NULL
                "#,
                entity_uuid,
                graph_uuid,
                doc,
                ev.valid_from,
                ev.valid_to
            )
            .execute(pool)
            .await?;
                }
                "delete" => {
                    // Mark entity as deleted by clearing current row
                    sqlx::query!(
                        r#"
            UPDATE entities_current
               SET sys_to   = now(),
                   valid_to = COALESCE(valid_to, now())
             WHERE entity_id = $1
               AND graph_id  = $2
               AND sys_to    IS NULL
            "#,
                        entity_uuid,
                        graph_uuid
                    )
                    .execute(pool)
                    .await?;

                    // prevent dangling edges
                    sqlx::query!(
                        r#"
            UPDATE edges_current
               SET sys_to   = now(),
                   valid_to = COALESCE(valid_to, now())
             WHERE graph_id = $1
               AND sys_to   IS NULL
               AND (src_id = $2 OR dst_id = $2)
            "#,
                        graph_uuid,
                        entity_uuid
                    )
                    .execute(pool)
                    .await?;
                }
                _ => return Ok(()),
            }
        }
        // --------------------------
        // Edge projection handlers
        // --------------------------
        "edge" => match ev.event_type.as_str() {
            "create" => {
                let eid = ev.payload.get("id").and_then(|v| v.as_str());
                let src = ev.payload.get("source").and_then(|v| v.as_str());
                let dst = ev.payload.get("target").and_then(|v| v.as_str());
                let (Some(eid), Some(src), Some(dst)) = (eid, src, dst) else {
                    return Ok(());
                };

                let (edge_id, src_id, dst_id) = (
                    Uuid::parse_str(eid).ok(),
                    Uuid::parse_str(src).ok(),
                    Uuid::parse_str(dst).ok(),
                );
                let (Some(edge_id), Some(src_id), Some(dst_id)) = (edge_id, src_id, dst_id) else {
                    return Ok(());
                };

                let props = ev
                    .payload
                    .get("data")
                    .cloned()
                    .unwrap_or(JsonValue::Object(Default::default()));

                sqlx::query!(
                r#"
                INSERT INTO edges_current(edge_id, src_id, dst_id, graph_id, props, valid_from, valid_to, sys_from, sys_to)
                VALUES ($1,$2,$3,$4,$5,$6,$7, now(), NULL)
                ON CONFLICT (edge_id) DO UPDATE SET
                  src_id     = EXCLUDED.src_id,
                  dst_id     = EXCLUDED.dst_id,
                  graph_id   = EXCLUDED.graph_id,
                  props      = EXCLUDED.props,
                  valid_from = EXCLUDED.valid_from,
                  valid_to   = EXCLUDED.valid_to,
                  sys_from   = now(),
                  sys_to     = NULL
                "#,
                edge_id, src_id, dst_id, graph_uuid, props, ev.valid_from, ev.valid_to
            ).execute(pool).await?;
            }
            "update" => {
                let eid = ev.payload.get("id").and_then(|v| v.as_str());
                let Some(edge_id) = eid.and_then(|s| Uuid::parse_str(s).ok()) else {
                    return Ok(());
                };

                let current = sqlx::query!(
                    r#"SELECT src_id, dst_id, props FROM edges_current
                   WHERE edge_id=$1 AND graph_id=$2 AND sys_to IS NULL"#,
                    edge_id,
                    graph_uuid
                )
                .fetch_optional(pool)
                .await?;
                let Some(row) = current else {
                    return Ok(());
                };

                let mut src_id = row.src_id;
                let mut dst_id = row.dst_id;
                let mut props = row.props;

                if let Some(s) = ev
                    .payload
                    .get("source")
                    .and_then(|v| v.as_str())
                    .and_then(|s| Uuid::parse_str(s).ok())
                {
                    src_id = s;
                }
                if let Some(d) = ev
                    .payload
                    .get("target")
                    .and_then(|v| v.as_str())
                    .and_then(|d| Uuid::parse_str(d).ok())
                {
                    dst_id = d;
                }

                if let Some(newp) = ev.payload.get("data") {
                    if let (Some(dst), Some(src)) = (props.as_object_mut(), newp.as_object()) {
                        for (k, v) in src {
                            dst.insert(k.clone(), v.clone());
                        }
                    } else {
                        props = newp.clone();
                    }
                }

                sqlx::query!(
                r#"
                INSERT INTO edges_current(edge_id, src_id, dst_id, graph_id, props, valid_from, valid_to, sys_from, sys_to)
                VALUES ($1,$2,$3,$4,$5,$6,$7, now(), NULL)
                ON CONFLICT (edge_id) DO UPDATE SET
                  src_id     = EXCLUDED.src_id,
                  dst_id     = EXCLUDED.dst_id,
                  graph_id   = EXCLUDED.graph_id,
                  props      = EXCLUDED.props,
                  valid_from = EXCLUDED.valid_from,
                  valid_to   = EXCLUDED.valid_to,
                  sys_from   = now(),
                  sys_to     = NULL
                "#,
                edge_id, src_id, dst_id, graph_uuid, props, ev.valid_from, ev.valid_to
            ).execute(pool).await?;
            }
            "delete" => {
                let eid = ev.payload.get("id").and_then(|v| v.as_str());
                let Some(edge_id) = eid.and_then(|s| Uuid::parse_str(s).ok()) else {
                    return Ok(());
                };

                sqlx::query!(
                    r#"UPDATE edges_current SET sys_to=now(), valid_to=COALESCE(valid_to,now())
                   WHERE edge_id=$1 AND graph_id=$2 AND sys_to IS NULL"#,
                    edge_id,
                    graph_uuid
                )
                .execute(pool)
                .await?;
            }
            _ => return Ok(()),
        },
        _ => {}
    }

    Ok(())
}
