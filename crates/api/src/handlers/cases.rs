use actix_web::{get, HttpResponse, Result, web::{Data, Path}};
use chrono::{DateTime, Utc};
use common::{db, errors::AppError};
use serde::Serialize;
use serde_json::Value as JsonValue;
use sqids::Sqids;

use crate::{
    middleware::auth::AuthMiddleware,
    schemas::Paginate,
};

#[derive(Debug, Serialize)]
struct CaseActivityItem {
    seq: i64,
    category: String,
    event_type: String,
    payload: JsonValue,
    version: i32,
    valid_from: DateTime<Utc>,
    valid_to: Option<DateTime<Utc>>,
    recorded_at: DateTime<Utc>,
    actor_id: Option<String>,
}

#[derive(Debug, Serialize)]
struct CaseActivityPage {
    events: Vec<CaseActivityItem>,
}

#[get("/cases/{id}/activity")]
pub async fn list_case_activity_handler(
    pool: db::Database,
    auth: AuthMiddleware,
    graph_id: Path<String>,
    page: Paginate,
    sqids: Data<Sqids>,
) -> Result<HttpResponse, AppError> {
    // Decode sqid to internal numeric id
    let ids = sqids.decode(&graph_id);
    let decoded_id = ids.first().ok_or(AppError {
        message: "Invalid graph ID.",
    })?;
    let decoded_id = *decoded_id as i64;

    // Resolve and authorize graph UUID
    let graph = sqlx::query!(
        "SELECT uuid FROM cases WHERE id = $1 AND owner_id = $2",
        decoded_id,
        auth.account_id
    )
    .fetch_one(pool.as_ref())
    .await
    .map_err(|_| AppError {
        message: "We ran into an error getting this case.",
    })?;

    let Some(graph_uuid) = graph.uuid else {
        return Err(AppError { message: "Case has no UUID." });
    };

    // Fetch events across all categories for this graph's stream key
    // ordered newest-first with pagination
    let rows = sqlx::query!(
        r#"
        WITH s AS (
            SELECT stream_id, category
              FROM event_streams
             WHERE key = $1
        )
        SELECT e.seq,
               s.category,
               e.event_type,
               e.payload,
               e.version,
               e.valid_from,
               e.valid_to,
               e.recorded_at,
               e.actor_id
          FROM events e
          JOIN s ON e.stream_id = s.stream_id
         ORDER BY e.seq DESC
         OFFSET $2
         LIMIT $3
        "#,
        graph_uuid.to_string(),
        page.skip,
        page.limit,
    )
    .fetch_all(pool.as_ref())
    .await
    .map_err(|_| AppError {
        message: "We ran into an error listing case activity.",
    })?;

    let events: Vec<CaseActivityItem> = rows
        .into_iter()
        .map(|r| CaseActivityItem {
            seq: r.seq,
            category: r.category,
            event_type: r.event_type,
            payload: r.payload,
            version: r.version,
            valid_from: r.valid_from,
            valid_to: r.valid_to,
            recorded_at: r.recorded_at,
            actor_id: r.actor_id,
        })
        .collect();

    Ok(HttpResponse::Ok().json(CaseActivityPage { events }))
}

#[derive(Debug, Serialize)]
struct CaseStatsResponse {
    entities_count: i64,
    edges_count: i64,
    events_count: i64,
}

#[get("/cases/{id}/stats")]
pub async fn get_case_stats_handler(
    pool: db::Database,
    auth: AuthMiddleware,
    graph_id: Path<String>,
    sqids: Data<Sqids>,
) -> Result<HttpResponse, AppError> {
    // Decode sqid to id and authorize
    let ids = sqids.decode(&graph_id);
    let decoded_id = ids.first().ok_or(AppError {
        message: "Invalid graph ID.",
    })?;
    let decoded_id = *decoded_id as i64;

    let graph = sqlx::query!(
        "SELECT uuid FROM cases WHERE id = $1 AND owner_id = $2",
        decoded_id,
        auth.account_id
    )
    .fetch_one(pool.as_ref())
    .await
    .map_err(|_| AppError {
        message: "We ran into an error getting this case.",
    })?;

    let Some(graph_uuid) = graph.uuid else {
        return Err(AppError { message: "Case has no UUID." });
    };

    // Entities count (current open rows)
    let entities_count = sqlx::query_scalar!(
        r#"SELECT COUNT(*)::BIGINT AS count FROM entities_current WHERE graph_id = $1 AND sys_to IS NULL"#,
        graph_uuid
    )
    .fetch_one(pool.as_ref())
    .await
    .map_err(|_| AppError { message: "We ran into an error counting entities." })?
    .unwrap_or(0);

    // Edges count (current open rows)
    let edges_count = sqlx::query_scalar!(
        r#"SELECT COUNT(*)::BIGINT AS count FROM edges_current WHERE graph_id = $1 AND sys_to IS NULL"#,
        graph_uuid
    )
    .fetch_one(pool.as_ref())
    .await
    .map_err(|_| AppError { message: "We ran into an error counting edges." })?
    .unwrap_or(0);

    // Events count across all categories for this graph key
    let events_count = sqlx::query_scalar!(
        r#"
        WITH s AS (
            SELECT stream_id FROM event_streams WHERE key = $1
        )
        SELECT COUNT(*)::BIGINT AS count
          FROM events e
          JOIN s ON e.stream_id = s.stream_id
        "#,
        graph_uuid.to_string()
    )
    .fetch_one(pool.as_ref())
    .await
    .map_err(|_| AppError { message: "We ran into an error counting events." })?
    .unwrap_or(0);

    Ok(HttpResponse::Ok().json(CaseStatsResponse {
        entities_count,
        edges_count,
        events_count,
    }))
}

// ---- Activity summary (heatmap) ----
use actix_web::web::Query;
use chrono::Duration as ChronoDuration;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct ActivitySummaryQuery {
    pub days: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct ActivityBucket {
    pub date: String, // YYYY-MM-DD
    pub count: i64,
}

#[derive(Debug, Serialize)]
pub struct ActivitySummaryResponse {
    pub start: String, // ISO start date
    pub end: String,   // ISO end date
    pub buckets: Vec<ActivityBucket>,
}

#[get("/cases/{id}/activity/summary")]
pub async fn get_case_activity_summary_handler(
    pool: db::Database,
    auth: AuthMiddleware,
    graph_id: Path<String>,
    q: Query<ActivitySummaryQuery>,
    sqids: Data<Sqids>,
) -> Result<HttpResponse, AppError> {
    // Fixed default window of ~1 year if not provided
    let days = q.days.unwrap_or(365).max(1).min(366 * 2);

    // Decode sqid and authorize access
    let ids = sqids.decode(&graph_id);
    let decoded_id = ids.first().ok_or(AppError {
        message: "Invalid graph ID.",
    })?;
    let decoded_id = *decoded_id as i64;

    let graph = sqlx::query!(
        "SELECT uuid FROM cases WHERE id = $1 AND owner_id = $2",
        decoded_id,
        auth.account_id
    )
    .fetch_one(pool.as_ref())
    .await
    .map_err(|_| AppError { message: "We ran into an error getting this case." })?;

    let Some(graph_uuid) = graph.uuid else {
        return Err(AppError { message: "Case has no UUID." });
    };

    // Compute start and end timestamps (UTC)
    let end_ts = Utc::now();
    let start_ts = end_ts - ChronoDuration::days(days);

    // Aggregate events by day within window
    let rows = sqlx::query!(
        r#"
        WITH s AS (
            SELECT stream_id FROM event_streams WHERE key = $1
        )
        SELECT (e.recorded_at AT TIME ZONE 'UTC')::date AS day,
               COUNT(*)::BIGINT AS count
          FROM events e
          JOIN s ON e.stream_id = s.stream_id
         WHERE e.recorded_at >= $2
           AND e.recorded_at <= $3
         GROUP BY day
         ORDER BY day ASC
        "#,
        graph_uuid.to_string(),
        start_ts,
        end_ts,
    )
    .fetch_all(pool.as_ref())
    .await
    .map_err(|_| AppError { message: "We ran into an error summarizing activity." })?;

    let buckets: Vec<ActivityBucket> = rows
        .into_iter()
        .map(|r| ActivityBucket {
            date: r
                .day
                .map(|d| d.format("%Y-%m-%d").to_string())
                .unwrap_or_else(|| "".to_string()),
            count: r.count.unwrap_or(0),
        })
        .collect();

    Ok(HttpResponse::Ok().json(ActivitySummaryResponse {
        start: start_ts.format("%Y-%m-%d").to_string(),
        end: end_ts.format("%Y-%m-%d").to_string(),
        buckets,
    }))
}
