use actix_web::{HttpResponse, Responder, post, web};
use common::jobs::{self, NewJob};
use serde::Deserialize;
use serde_json::Value as JsonValue;

#[derive(Deserialize)]
pub struct EnqueueJobBody {
    pub payload: JsonValue,
    pub priority: Option<i32>,
    pub max_attempts: Option<i32>,
    pub scheduled_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[post("/jobs")]
pub async fn enqueue_job_handler(
    pool: web::Data<sqlx::PgPool>,
    body: web::Json<EnqueueJobBody>,
) -> impl Responder {
    let b = body.into_inner();
    let req = NewJob {
        payload: b.payload,
        priority: b.priority,
        max_attempts: b.max_attempts,
        scheduled_at: b.scheduled_at,
    };
    match jobs::enqueue_job(&pool, req).await {
        Ok(job) => HttpResponse::Ok().json(job),
        Err(e) => HttpResponse::UnprocessableEntity().json(serde_json::json!({
            "message": format!("enqueue failed: {}", e)
        })),
    }
}
