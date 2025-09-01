use chrono::Duration;
use common::eventstore;
use common::eventstore::EventRecord;
use log::{debug, error, info};
use sqlx::PgPool;

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
                tokio::time::sleep(std::time::Duration::from_millis(750)).await;
            }
            Ok(events) => {
                for ev in events.iter() {
                    if let Err(err) = apply_event(&pool, ev).await {
                        error!("projection apply error at seq {}: {}", ev.seq, err);
                        // back off a bit to avoid hot looping on a poison pill
                        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
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
    // Placeholder projector: advance checkpoints only.
    // Intentionally leave room for domain-specific materializations (entities/edges/doc snapshots).
    debug!("apply event_type='{}' seq={}", ev.event_type, ev.seq);
    let _ = pool; // silence unused for now
    Ok(())
}

