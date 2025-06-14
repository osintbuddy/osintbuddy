use crate::schemas::{
    IdSchema,
    errors::{AppError, ErrorKind},
};
use actix_web::{
    HttpRequest, HttpResponse, Responder, body::BoxBody, http::header::ContentType, web::Json,
};
use chrono::prelude::*;
use serde::{Deserialize, Serialize};
use sqlx::types::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct Graph {
    pub id: i64,
    #[serde(skip_serializing)]
    pub uuid: Option<Uuid>,
    pub label: String,
    pub description: String,
    #[serde(skip_serializing)]
    pub owner_id: i64,
    pub ctime: Option<DateTime<Utc>>,
    pub mtime: Option<DateTime<Utc>>,
}

impl Responder for Graph {
    type Body = BoxBody;
    fn respond_to(self, _req: &HttpRequest) -> HttpResponse<Self::Body> {
        let body = serde_json::to_string(&self).unwrap();

        // Create response and set content type
        HttpResponse::Ok()
            .content_type(ContentType::json())
            .body(body)
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GraphStats {
    pub graph: Graph,
    pub vertices_count: usize,
    pub edges_count: usize,
    pub degree2_count: usize,
}
impl Responder for GraphStats {
    type Body = BoxBody;
    fn respond_to(self, _req: &HttpRequest) -> HttpResponse<Self::Body> {
        let body = serde_json::to_string(&self).unwrap();

        // Create response and set content type
        HttpResponse::Ok()
            .content_type(ContentType::json())
            .body(body)
    }
}

#[derive(Deserialize)]
pub struct CreateGraphSchema {
    pub label: String,
    pub description: String,
}
pub type CreateGraph = Json<CreateGraphSchema>;

impl CreateGraphSchema {
    pub fn validate(self) -> Result<CreateGraphSchema, AppError> {
        if self.label.trim().is_empty() {
            return Err(AppError {
                message: "Missing graph label.",
                kind: ErrorKind::Invalid,
            }); // Adjust error type as needed
        }
        Ok(self)
    }
}

pub type DeleteGraph = Json<IdSchema>;

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateGraphSchema {
    pub id: i64,
    pub label: String,
    pub description: String,
}
pub type UpdateGraph = Json<UpdateGraphSchema>;

pub type ListGraphs = Json<Vec<Graph>>;
