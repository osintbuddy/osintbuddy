use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::{types::Uuid, PgPool, Row};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Job {
    pub job_id: Uuid,
    pub kind: String,
    pub payload: JsonValue,
    pub status: String,
    pub priority: i32,
    pub attempts: i32,
    pub max_attempts: i32,
    pub lease_owner: Option<String>,
    pub lease_until: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub scheduled_at: DateTime<Utc>,
    pub started_at: Option<DateTime<Utc>>,
    pub finished_at: Option<DateTime<Utc>>,
    pub backoff_until: Option<DateTime<Utc>>,
    pub idempotency_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewJob {
    pub kind: String,
    pub payload: JsonValue,
    pub priority: Option<i32>,
    pub max_attempts: Option<i32>,
    pub scheduled_at: Option<DateTime<Utc>>,
    pub idempotency_key: Option<String>,
}

pub async fn enqueue_job(pool: &PgPool, j: NewJob) -> Result<Job, sqlx::Error> {
    let rec = sqlx::query!(
        r#"
        insert into jobs (job_id, kind, payload, status, priority, max_attempts, scheduled_at, idempotency_key)
        values (uuid_generate_v4(), $1, $2, 'enqueued', coalesce($3, 100), coalesce($4, 3), coalesce($5, now()), $6)
        returning job_id, kind, payload, status, priority, attempts, max_attempts, lease_owner, lease_until,
                  created_at, scheduled_at, started_at, finished_at, backoff_until, idempotency_key
        "#,
        j.kind,
        j.payload,
        j.priority,
        j.max_attempts,
        j.scheduled_at,
        j.idempotency_key
    )
    .fetch_one(pool)
    .await?;

    Ok(Job {
        job_id: rec.job_id,
        kind: rec.kind,
        payload: rec.payload,
        status: rec.status,
        priority: rec.priority,
        attempts: rec.attempts,
        max_attempts: rec.max_attempts,
        lease_owner: rec.lease_owner,
        lease_until: rec.lease_until,
        created_at: rec.created_at,
        scheduled_at: rec.scheduled_at,
        started_at: rec.started_at,
        finished_at: rec.finished_at,
        backoff_until: rec.backoff_until,
        idempotency_key: rec.idempotency_key,
    })
}

pub async fn lease_jobs(pool: &PgPool, owner: &str, lease_seconds: i32, max: i64) -> Result<Vec<Job>, sqlx::Error> {
    // Use SKIP LOCKED pattern to avoid thundering herd
    let rows = sqlx::query(
        r#"
        update jobs j set
            status = 'leased',
            lease_owner = $2,
            lease_until = now() + ($3::text || ' seconds')::interval
        where job_id in (
            select job_id from jobs
            where status = 'enqueued'
              and scheduled_at <= now()
              and (backoff_until is null or backoff_until <= now())
            order by priority asc, created_at asc
            limit $1
            for update skip locked
        )
        returning job_id, kind, payload, status, priority, attempts, max_attempts, lease_owner, lease_until,
                  created_at, scheduled_at, started_at, finished_at, backoff_until, idempotency_key
        "#,
    )
    .bind(max)
    .bind(owner)
    .bind(lease_seconds)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|row| Job {
            job_id: row.get("job_id"),
            kind: row.get::<String, _>("kind"),
            payload: row.get("payload"),
            status: row.get::<String, _>("status"),
            priority: row.get("priority"),
            attempts: row.get("attempts"),
            max_attempts: row.get("max_attempts"),
            lease_owner: row.get("lease_owner"),
            lease_until: row.get("lease_until"),
            created_at: row.get("created_at"),
            scheduled_at: row.get("scheduled_at"),
            started_at: row.get("started_at"),
            finished_at: row.get("finished_at"),
            backoff_until: row.get("backoff_until"),
            idempotency_key: row.get("idempotency_key"),
        })
        .collect())
}

pub async fn start_job(pool: &PgPool, job_id: Uuid, owner: &str) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"update jobs set status = 'running', started_at = now() where job_id = $1 and lease_owner = $2"#,
        job_id,
        owner
    )
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn extend_lease(pool: &PgPool, job_id: Uuid, owner: &str, lease_seconds: i32) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"update jobs set lease_until = now() + ($3::text || ' seconds')::interval where job_id = $1 and lease_owner = $2"#,
        job_id,
        owner,
        lease_seconds
    )
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn complete_job(pool: &PgPool, job_id: Uuid, owner: &str) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"update jobs set status = 'completed', finished_at = now() where job_id = $1 and lease_owner = $2"#,
        job_id,
        owner
    )
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn fail_job(pool: &PgPool, job_id: Uuid, owner: &str, backoff_seconds: i32) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        update jobs set
            status = case when attempts + 1 >= max_attempts then 'dead' else 'failed' end,
            attempts = attempts + 1,
            finished_at = now(),
            backoff_until = now() + ($3::text || ' seconds')::interval
        where job_id = $1 and lease_owner = $2
        "#,
        job_id,
        owner,
        backoff_seconds
    )
    .execute(pool)
    .await?;
    Ok(())
}
