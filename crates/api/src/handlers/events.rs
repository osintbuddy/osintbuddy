use actix_web::{post, web, HttpResponse, Responder};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use serde_json::Value as JsonValue;

use common::eventstore::{self, AppendEvent};

#[derive(Deserialize)]
pub struct AppendEventBody {
    pub event_type: String,
    pub payload: JsonValue,
    pub valid_from: Option<DateTime<Utc>>, // default now
    pub valid_to: Option<DateTime<Utc>>,   // default null
    pub expected_version: Option<i32>,
    pub idempotency_key: Option<String>,
    pub correlation_id: Option<uuid::Uuid>,
    pub causation_id: Option<uuid::Uuid>,
}

#[post("/events/{category}/{key}")]
pub async fn append_event_handler(
    pool: web::Data<sqlx::PgPool>,
    path: web::Path<(String, String)>,
    body: web::Json<AppendEventBody>,
) -> impl Responder {
    let (category, key) = path.into_inner();
    let b = body.into_inner();
    let req = AppendEvent {
        category,
        key,
        event_type: b.event_type,
        payload: b.payload,
        valid_from: b.valid_from.unwrap_or_else(|| Utc::now()),
        valid_to: b.valid_to,
        idempotency_key: b.idempotency_key,
        correlation_id: b.correlation_id,
        causation_id: b.causation_id,
        expected_version: b.expected_version,
    };

    match eventstore::append_event(&pool, req).await {
        Ok(ev) => HttpResponse::Ok().json(ev),
        Err(e) => HttpResponse::UnprocessableEntity().json(serde_json::json!({
            "message": format!("append failed: {}", e)
        })),
    }
}

