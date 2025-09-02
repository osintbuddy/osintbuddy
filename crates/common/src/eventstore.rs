use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::{PgPool, types::Uuid};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Stream {
    pub stream_id: Uuid,
    pub category: String,
    pub key: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventRecord {
    pub seq: i64,
    pub stream_id: Uuid,
    pub version: i32,
    pub event_type: String,
    pub payload: JsonValue,
    pub valid_from: DateTime<Utc>,
    pub valid_to: Option<DateTime<Utc>>,
    pub recorded_at: DateTime<Utc>,
    pub causation_id: Option<Uuid>,
    pub correlation_id: Option<Uuid>,
    pub idempotency_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppendEvent {
    pub category: String,
    pub key: String,
    pub event_type: String,
    pub payload: JsonValue,
    pub valid_from: DateTime<Utc>,
    pub valid_to: Option<DateTime<Utc>>,
    pub idempotency_key: Option<String>,
    pub correlation_id: Option<Uuid>,
    pub causation_id: Option<Uuid>,
    pub expected_version: Option<i32>,
}

pub async fn ensure_stream(
    pool: &PgPool,
    category: &str,
    key: &str,
) -> Result<Stream, sqlx::Error> {
    let rec = sqlx::query!(
        r#"
        INSERT INTO event_streams(stream_id, category, key)
        VALUES (uuid_generate_v4(), $1, $2)
        ON CONFLICT(category, key) DO UPDATE SET category = excluded.category
        RETURNING stream_id, category, key, created_at
        "#,
        category,
        key
    )
    .fetch_one(pool)
    .await?;

    Ok(Stream {
        stream_id: rec.stream_id,
        category: rec.category,
        key: rec.key,
        created_at: rec.created_at,
    })
}

pub async fn append_event(pool: &PgPool, ev: AppendEvent) -> Result<EventRecord, sqlx::Error> {
    let mut tx = pool.begin().await?;

    let stream = ensure_stream(&pool, &ev.category, &ev.key).await?;

    // Determine next version and optimistic check
    let cur = sqlx::query!(
        r#"SELECT max(version) AS max FROM events WHERE stream_id = $1"#,
        stream.stream_id
    )
    .fetch_one(&mut *tx)
    .await?;
    let next_version = match cur.max {
        Some(v) => v + 1,
        None => 1,
    };
    if let Some(exp) = ev.expected_version {
        if exp + 1 != next_version {
            // fail fast to let caller retry with correct concurrency
            return Err(sqlx::Error::Protocol(
                "optimistic concurrency failure".into(),
            ));
        }
    }

    let rec = sqlx::query!(
        r#"
        INSERT INTO events(
            stream_id, version, event_type, payload, valid_from, valid_to,
            causation_id, correlation_id, idempotency_key
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING seq, stream_id, version, event_type, payload, valid_from, valid_to,
                  recorded_at, causation_id, correlation_id, idempotency_key
        "#,
        stream.stream_id,
        next_version,
        ev.event_type,
        ev.payload,
        ev.valid_from,
        ev.valid_to,
        ev.causation_id,
        ev.correlation_id,
        ev.idempotency_key
    )
    .fetch_one(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(EventRecord {
        seq: rec.seq,
        stream_id: rec.stream_id,
        version: rec.version,
        event_type: rec.event_type,
        payload: rec.payload,
        valid_from: rec.valid_from,
        valid_to: rec.valid_to,
        recorded_at: rec.recorded_at,
        causation_id: rec.causation_id,
        correlation_id: rec.correlation_id,
        idempotency_key: rec.idempotency_key,
    })
}

pub async fn events_after(
    pool: &PgPool,
    after_seq: i64,
    limit: i64,
) -> Result<Vec<EventRecord>, sqlx::Error> {
    let rows = sqlx::query!(
        r#"
        SELECT seq, stream_id, version, event_type, payload, valid_from, valid_to,
               recorded_at, causation_id, correlation_id, idempotency_key
        FROM events
        WHERE seq > $1
        ORDER BY seq ASC
        LIMIT $2
        "#,
        after_seq,
        limit
    )
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|rec| EventRecord {
            seq: rec.seq,
            stream_id: rec.stream_id,
            version: rec.version,
            event_type: rec.event_type,
            payload: rec.payload,
            valid_from: rec.valid_from,
            valid_to: rec.valid_to,
            recorded_at: rec.recorded_at,
            causation_id: rec.causation_id,
            correlation_id: rec.correlation_id,
            idempotency_key: rec.idempotency_key,
        })
        .collect())
}

pub async fn get_checkpoint(pool: &PgPool, name: &str) -> Result<i64, sqlx::Error> {
    let rec = sqlx::query!(
        r#"SELECT last_seq from event_checkpoints WHERE projection_name = $1"#,
        name
    )
    .fetch_optional(pool)
    .await?;
    Ok(rec.map(|r| r.last_seq).unwrap_or(0))
}

pub async fn set_checkpoint(pool: &PgPool, name: &str, last_seq: i64) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        INSERT INTO event_checkpoints(projection_name, last_seq)
        VALUES ($1, $2)
        ON CONFLICT (projection_name) DO UPDATE SET last_seq = excluded.last_seq, updated_at = now()
        "#,
        name,
        last_seq
    )
    .execute(pool)
    .await?;
    Ok(())
}
