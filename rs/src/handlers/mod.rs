use actix_web::{HttpResponse, Responder, get, web};
use serde_json::json;

mod graphs;
mod user;

#[get("/status")]
pub async fn healthcheck_handler() -> impl Responder {
    HttpResponse::Ok().json(json!({"status": "success","message": "pong"}))
}

pub fn config(conf: &mut web::ServiceConfig) {
    let scope = web::scope("/api")
        .service(healthcheck_handler)
        .service(user::register_user_handler)
        .service(user::login_user_handler)
        .service(user::logout_handler)
        .service(user::get_me_handler)
        .service(graphs::create_graph_handler);

    conf.service(scope);
}
