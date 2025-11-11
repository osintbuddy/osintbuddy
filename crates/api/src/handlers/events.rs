use actix_web::{HttpResponse, Responder, post, web};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use serde_json::{Value as JsonValue, json};

use crate::middleware::auth::AuthMiddleware;
use common::eventstore::{self, AppendEvent};

#[derive(Deserialize)]
pub struct AppendEventBody {
    pub event_type: String,
    pub payload: JsonValue,
    pub valid_from: Option<DateTime<Utc>>, // default now
    pub valid_to: Option<DateTime<Utc>>,   // default null
    pub expected_version: Option<i32>,
    pub correlation_id: Option<uuid::Uuid>,
    pub causation_id: Option<uuid::Uuid>,
}

#[post("/events/{category}/{key}")]
pub async fn append_event_handler(
    pool: web::Data<sqlx::PgPool>,
    path: web::Path<(String, String)>,
    body: web::Json<AppendEventBody>,
    auth: AuthMiddleware,
) -> impl Responder {
    let (category, key) = path.into_inner();
    let b = body.into_inner();

    // If client didn’t provide expected_version, we’ll enforce OCC server-side:
    let expected_version = match b.expected_version {
        Some(v) => Some(v),
        None => eventstore::current_version(&pool, &category, &key)
            .await
            .ok(),
    };

    let req = AppendEvent {
        category,
        key,
        event_type: b.event_type,
        payload: b.payload,
        valid_from: b.valid_from.unwrap_or_else(|| Utc::now()),
        valid_to: b.valid_to,
        correlation_id: b.correlation_id,
        causation_id: b.causation_id,
        expected_version,
        actor_id: auth.user.id.into(),
    };

    match eventstore::append_event(&pool, req).await {
        Ok(ev) => HttpResponse::Ok().json(ev),
        Err(_) => HttpResponse::UnprocessableEntity().json(json!({
            "message": "version conflict. append failed!",
        })),
    }
}
