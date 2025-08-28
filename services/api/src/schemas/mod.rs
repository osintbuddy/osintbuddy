use actix_web::{
    HttpRequest, HttpResponse, Responder, body::BoxBody, http::header::ContentType, web::Query,
};
use serde::{Deserialize, Serialize};

pub mod entities;
pub mod errors;
pub mod graphs;
pub mod organization;
pub mod user;

#[derive(Deserialize, Serialize)]
pub struct Notification {
    pub message: &'static str,
}

impl Responder for Notification {
    type Body = BoxBody;
    fn respond_to(self, _req: &HttpRequest) -> HttpResponse<Self::Body> {
        let body = serde_json::to_string(&self).unwrap();

        // Create response and set content type
        HttpResponse::Ok()
            .content_type(ContentType::json())
            .body(body)
    }
}

#[derive(Deserialize, Serialize)]
pub struct PaginateSchema {
    pub skip: i64,
    pub limit: i64,
}

pub type Paginate = Query<PaginateSchema>;

#[derive(Debug, Serialize, Deserialize)]
pub struct IdSchema {
    pub id: String,
}
