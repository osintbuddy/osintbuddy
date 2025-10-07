use crate::schemas::IdSchema;
use actix_web::{
    HttpRequest, HttpResponse, Responder, body::BoxBody, http::header::ContentType, web::Json,
};
use chrono::prelude::*;
use common::errors::AppError;
use serde::{Deserialize, Serialize};
use sqlx::types::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct DbGraph {
    #[serde(skip_serializing)]
    pub id: i64,
    #[serde(skip_serializing)]
    pub uuid: Option<Uuid>,
    pub label: String,
    pub description: String,
    pub visibility: String,
    pub org_id: Option<i64>,
    #[serde(skip_serializing)]
    pub owner_id: i64,
    pub ctime: Option<DateTime<Utc>>,
    pub mtime: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Graph {
    pub id: String,
    pub label: String,
    pub description: String,
    pub ctime: Option<DateTime<Utc>>,
    pub mtime: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FavoriteGraph {
    pub graph_id: i64,
    pub owner_id: i64,
}

#[derive(Deserialize)]
pub struct FavoriteGraphSchema {
    pub graph_id: String,
    pub is_favorite: bool,
}
pub type FavoriteGraphRequest = Json<FavoriteGraphSchema>;

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
    pub second_degrees: usize,
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
            }); // Adjust error type as needed
        }
        Ok(self)
    }
}

pub type DeleteGraph = Json<IdSchema>;

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateGraphSchema {
    // Accept sqid string from clients; decode in handler
    pub id: String,
    pub label: String,
    pub description: String,
}
pub type UpdateGraph = Json<UpdateGraphSchema>;

#[derive(Debug, Serialize, Deserialize)]
pub struct ListGraphsResponse {
    pub graphs: Vec<Graph>,
    pub favorites: Vec<String>,
}

impl Responder for ListGraphsResponse {
    type Body = BoxBody;
    fn respond_to(self, _req: &HttpRequest) -> HttpResponse<Self::Body> {
        let body = serde_json::to_string(&self).unwrap();

        HttpResponse::Ok()
            .content_type(ContentType::json())
            .body(body)
    }
}

pub type ListGraphs = Json<Vec<DbGraph>>;
