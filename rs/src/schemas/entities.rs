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
pub struct Entity {
    pub id: i64,
    #[serde(skip_serializing)]
    pub uuid: Option<Uuid>,
    pub label: String,
    pub description: String,
    pub author: String,
    pub source: String,
    #[serde(skip_serializing)]
    pub owner_id: i64,
    pub ctime: Option<DateTime<Utc>>,
    pub mtime: Option<DateTime<Utc>>,
}

impl Responder for Entity {
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
pub struct CreateEntitySchema {
    pub label: String,
    pub description: String,
    pub author: String,
    pub source: String,
}
pub type CreateEntity = Json<CreateEntitySchema>;

impl CreateEntitySchema {
    pub fn validate(self) -> Result<CreateEntitySchema, AppError> {
        if self.label.trim().is_empty() {
            return Err(AppError {
                message: "Missing entity label.",
                kind: ErrorKind::Invalid,
            }); // Adjust error type as needed
        }
        Ok(self)
    }
}

pub type DeleteEntity = Json<IdSchema>;

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateEntitySchema {
    pub id: i64,
    pub label: String,
    pub description: String,
    pub author: String,
    pub source: String,
}
pub type UpdateEntity = Json<UpdateEntitySchema>;

pub type ListEntities = Json<Vec<Entity>>;
