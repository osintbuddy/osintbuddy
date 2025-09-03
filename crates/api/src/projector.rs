use common::eventstore;
use common::eventstore::EventRecord;
use log::{debug, error, info};
use serde_json::Value as JsonValue;
use sqlx::PgPool;
use sqlx::types::Uuid;

const PROJECTION_NAME: &str = "entities_edges_materializer";

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
    let graph_id = Uuid::parse_str(&stream.key).ok();

    match (stream.category.as_str(), ev.event_type.as_str()) {
        ("entity", "create") => {
            // Expect payload: { id, label, position:{x,y}, properties:{} }
            let Some(id_val) = ev.payload.get("id") else {
                return Ok(());
            };
            let id_str = match id_val {
                JsonValue::String(s) => s.clone(),
                other => other.to_string(),
            };
            let Ok(entity_id) = Uuid::parse_str(&id_str) else {
                return Ok(());
            };

            // Upsert current snapshot (now includes graph_id)
            let Some(graph_id) = graph_id else {
                return Ok(());
            };
            sqlx::query!(
                r#"
                INSERT INTO entities_current(entity_id, graph_id, doc, valid_from, valid_to, sys_from, sys_to)
                VALUES ($1, $2, $3, $4, $5, now(), NULL)
                ON CONFLICT (entity_id) DO UPDATE SET
                  graph_id = EXCLUDED.graph_id,
                  doc = EXCLUDED.doc,
                  valid_from = EXCLUDED.valid_from,
                  valid_to = EXCLUDED.valid_to,
                  sys_from = now(),
                  sys_to = NULL
                "#,
                entity_id,
                graph_id,
                ev.payload,
                ev.valid_from,
                ev.valid_to
            )
            .execute(pool)
            .await?;
        }
        ("entity", "update") => {
            // Patch existing entity document and create new current snapshot
            let Some(id_val) = ev.payload.get("id") else {
                return Ok(());
            };
            let id_str = match id_val {
                JsonValue::String(s) => s.clone(),
                other => other.to_string(),
            };
            let Ok(entity_id) = Uuid::parse_str(&id_str) else {
                return Ok(());
            };

            // Load current document; if missing, ignore update
            let current = sqlx::query!(
                r#"SELECT doc FROM entities_current WHERE entity_id = $1 AND sys_to IS NULL"#,
                entity_id
            )
            .fetch_optional(pool)
            .await?;
            let Some(mut doc) = current.map(|r| r.doc) else {
                return Ok(());
            };

            // Merge fields from payload.entity into current doc (shallow object merge)
            if let (Some(dst), Some(src)) = (doc.as_object_mut(), ev.payload.as_object()) {
                for (k, v) in src.iter() {
                    // never allow id overwrite
                    if k == "id" {
                        continue;
                    }
                    dst.insert(k.clone(), v.clone());
                }
            }
            // Insert/replace current snapshot (with graph_id)
            let Some(graph_id) = graph_id else {
                return Ok(());
            };
            sqlx::query!(
                r#"
                INSERT INTO entities_current(entity_id, graph_id, doc, valid_from, valid_to, sys_from, sys_to)
                VALUES ($1, $2, $3, $4, $5, now(), NULL)
                ON CONFLICT (entity_id) DO UPDATE SET
                  graph_id = EXCLUDED.graph_id,
                  doc = EXCLUDED.doc,
                  valid_from = EXCLUDED.valid_from,
                  valid_to = EXCLUDED.valid_to,
                  sys_from = now(),
                  sys_to = NULL
                "#,
                entity_id,
                graph_id,
                doc,
                ev.valid_from,
                ev.valid_to
            )
            .execute(pool)
            .await?;
        }
        ("entity", "delete") => {
            // Mark entity as deleted by clearing current row
            let Some(id_val) = ev.payload.get("id") else {
                return Ok(());
            };
            let id_str = match id_val {
                JsonValue::String(s) => s.clone(),
                other => other.to_string(),
            };
            let Ok(entity_id) = Uuid::parse_str(&id_str) else {
                return Ok(());
            };

            // Remove current snapshot for this entity
            sqlx::query!(
                r#"DELETE FROM entities_current WHERE entity_id = $1"#,
                entity_id
            )
            .execute(pool)
            .await?;
        }
        // Future: handle edges
        _ => {}
    }

    Ok(())
}
