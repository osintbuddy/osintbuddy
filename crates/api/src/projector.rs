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

    match (stream.category.as_str(), ev.event_type.as_str()) {
        // --------------------------
        // Entity projection handlers
        // --------------------------
        ("entity", "create") => {
            // Store the entire event payload as the document (id, position, data)
            // UI will add {type: "view" or "edit" } on read for Reactflow.
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
                ev.payload,
                ev.valid_from,
                ev.valid_to
            )
            .execute(pool)
            .await?;
        }
        ("entity", "update") => {
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

            // shallow merge fields into current doc
            if let (Some(dst), Some(src)) = (doc.as_object_mut(), ev.payload.as_object()) {
                for (k, v) in src.iter() {
                    // never allow id overwrite
                    if k == "id" {
                        continue;
                    }
                    dst.insert(k.clone(), v.clone());
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
        ("entity", "delete") => {
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
        // --------------------------
        // Edge projection handlers
        // --------------------------
        ("edge", "create") => {
            // payload: { id, source, target, data }
            let eid = ev.payload.get("id").and_then(|v| v.as_str());
            let src = ev.payload.get("source").and_then(|v| v.as_str());
            let dst = ev.payload.get("target").and_then(|v| v.as_str());
            if let (Some(eid), Some(src), Some(dst)) = (eid, src, dst) {
                let Ok(edge_id) = Uuid::parse_str(eid) else {
                    return Ok(());
                };
                let Ok(src_id) = Uuid::parse_str(src) else {
                    return Ok(());
                };
                let Ok(dst_id) = Uuid::parse_str(dst) else {
                    return Ok(());
                };

                let props: JsonValue = ev
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
                    edge_id,
                    src_id,
                    dst_id,
                    graph_uuid,
                    props,
                    ev.valid_from,
                    ev.valid_to
                )
                .execute(pool)
                .await?;
            }
        }
        ("edge", "update") => {
            // payload: { id, source?, target?, kind?, data? }
            let eid = ev.payload.get("id").and_then(|v| v.as_str());
            let Some(eid) = eid else {
                return Ok(());
            };
            let Ok(edge_id) = Uuid::parse_str(eid) else {
                return Ok(());
            };

            // Load current, merge shallowly
            let current = sqlx::query!(
                r#"SELECT src_id, dst_id, props FROM edges_current WHERE edge_id = $1 AND sys_to IS NULL"#,
                edge_id
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
                // shallow merge for object; otherwise replace
                if let (Some(dst), Some(src)) = (props.as_object_mut(), newp.as_object()) {
                    for (k, v) in src.iter() {
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
            )
            .execute(pool)
            .await?;
        }
        ("edge", "delete") => {
            // payload: { id }
            let eid = ev.payload.get("id").and_then(|v| v.as_str());
            let Some(eid) = eid else {
                return Ok(());
            };
            let Ok(edge_id) = Uuid::parse_str(eid) else {
                return Ok(());
            };

            sqlx::query!(
                r#"
                UPDATE edges_current
                   SET sys_to   = now(),
                       valid_to = COALESCE(valid_to, now())
                 WHERE edge_id = $1
                   AND graph_id = $2
                   AND sys_to   IS NULL
                "#,
                edge_id,
                graph_uuid
            )
            .execute(pool)
            .await?;
        }
        _ => {}
    }

    Ok(())
}
