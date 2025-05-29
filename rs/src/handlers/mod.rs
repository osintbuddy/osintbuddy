use actix_web::{HttpResponse, Responder, get, web};
use serde_json::json;

mod entities;
mod graphing;
mod graphs;
mod user;

#[get("/status")]
async fn status_handler() -> impl Responder {
    HttpResponse::Ok().json(json!({"status": "success","message": "pong"}))
}

pub fn config(conf: &mut web::ServiceConfig) {
    let scope = web::scope("/api").service(status_handler);

    conf.service(scope);
}
