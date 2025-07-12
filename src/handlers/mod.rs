use actix_web::{HttpResponse, Responder, get, web};

use crate::schemas::Notification;

mod entities;
mod graphing;
mod graphs;
mod organization;
mod user;

#[get("/status")]
pub async fn healthcheck_handler() -> impl Responder {
    HttpResponse::Ok().json(Notification { message: "pong" })
}

pub fn config(conf: &mut web::ServiceConfig) {
    let scope = web::scope("/api")
        .service(healthcheck_handler)
        .service(user::register_user_handler)
        .service(user::login_user_handler)
        .service(user::logout_handler)
        .service(user::refresh_handler)
        .service(user::get_me_handler)
        .service(graphs::create_graph_handler)
        .service(graphs::update_graph_handler)
        .service(graphs::delete_graph_handler)
        .service(graphs::list_graph_handler)
        .service(graphs::get_graph_handler)
        .service(graphs::favorite_graph_handler)
        .service(entities::create_entity_handler)
        .service(entities::update_entity_handler)
        .service(entities::delete_entity_handler)
        .service(entities::list_entities_handler)
        .service(entities::get_entity_handler)
        .service(entities::favorite_entity_handler)
        .service(entities::get_entity_transforms)
        .service(entities::get_entity_details)
        .service(entities::get_entities_from_plugins)
        .service(organization::get_my_organization_handler)
        .service(organization::update_my_organization_handler)
        .service(organization::delete_my_organization_handler)
        .route(
            "/graph/{id}/ws",
            web::get().to(graphing::graphing_websocket_handler),
        );

    conf.service(scope);
}
