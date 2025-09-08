use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::{PgPool, Row, types::Uuid};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Job {
    pub job_id: Uuid,
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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewJob {
    pub payload: JsonValue,
    pub priority: Option<i32>,
    pub max_attempts: Option<i32>,
    pub scheduled_at: Option<DateTime<Utc>>,
}

pub async fn enqueue_job(pool: &PgPool, j: NewJob) -> Result<Job, sqlx::Error> {
    let rec = sqlx::query!(
        r#"
        INSERT INTO jobs (job_id, payload, status, priority, max_attempts, scheduled_at)
        VALUES (uuid_generate_v4(), $1, 'enqueued'::job_status, coalesce($2, 100), coalesce($3, 3), coalesce($4, now()))
        RETURNING job_id, payload, status::text as "status!", priority, attempts, max_attempts, lease_owner, lease_until,
                  created_at, scheduled_at, started_at, finished_at, backoff_until
        "#,
        j.payload,
        j.priority,
        j.max_attempts,
        j.scheduled_at,
    )
    .fetch_one(pool)
    .await?;

    Ok(Job {
        job_id: rec.job_id,
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
    })
}

pub async fn lease_jobs(
    pool: &PgPool,
    owner: &str,
    lease_seconds: i32,
    max: i64,
) -> Result<Vec<Job>, sqlx::Error> {
    // Use SKIP LOCKED pattern to avoid thundering herd
    let rows = sqlx::query(
        r#"
        UPDATE jobs j SET
            status = 'leased'::job_status,
            lease_owner = $2,
            lease_until = now() + ($3::text || ' seconds')::interval
        WHERE job_id in (
            SELECT job_id FROM jobs
            WHERE status = 'enqueued'::job_status
              AND scheduled_at <= now()
              AND (backoff_until is null or backoff_until <= now())
            ORDER BY priority ASC, created_at ASC
            LIMIT $1
            FOR UPDATE SKIP LOCKED
        )
        RETURNING job_id, kind, payload, status::text as "status!", priority, attempts, max_attempts, lease_owner, lease_until,
                  created_at, scheduled_at, started_at, finished_at, backoff_until
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
        })
        .collect())
}

pub async fn start_job(pool: &PgPool, job_id: Uuid, owner: &str) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"UPDATE jobs SET status = 'running'::job_status, started_at = now() WHERE job_id = $1 AND lease_owner = $2"#,
        job_id,
        owner
    )
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn extend_lease(
    pool: &PgPool,
    job_id: Uuid,
    owner: &str,
    lease_seconds: i32,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"UPDATE jobs SET lease_until = now() + make_interval(secs => $3::double precision) WHERE job_id = $1 AND lease_owner = $2"#,
        job_id,
        owner,
        lease_seconds as f64
    )
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn complete_job(pool: &PgPool, job_id: Uuid, owner: &str) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"UPDATE jobs SET status = 'completed'::job_status, finished_at = now() WHERE job_id = $1 AND lease_owner = $2"#,
        job_id,
        owner
    )
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn fail_job(
    pool: &PgPool,
    job_id: Uuid,
    owner: &str,
    backoff_seconds: i32,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        UPDATE jobs SET
            status = case when attempts + 1 >= max_attempts then 'dead'::job_status else 'failed'::job_status end,
            attempts = attempts + 1,
            finished_at = now(),
            backoff_until = now() + make_interval(secs => $3::double precision)
        WHERE job_id = $1 AND lease_owner = $2
        "#,
        job_id,
        owner,
        backoff_seconds as f64
    )
    .execute(pool)
    .await?;
    Ok(())
}
