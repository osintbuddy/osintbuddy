use actix_web::{
    HttpRequest, HttpResponse, Responder, body::BoxBody, http::header::ContentType, web::Json,
};
use chrono::prelude::*;
use common::errors::AppError;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Organization {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub website: Option<String>,
    pub contact_email: Option<String>,
    pub subscription_level: String,
    pub max_users: i32,
    pub max_cases: i32,
    pub max_entities: i32,
    pub can_export: bool,
    pub can_share: bool,
    pub ctime: Option<DateTime<Utc>>,
    pub mtime: Option<DateTime<Utc>>,
}

impl Responder for Organization {
    type Body = BoxBody;

    fn respond_to(self, _req: &HttpRequest) -> HttpResponse<Self::Body> {
        let body = serde_json::to_string(&self).unwrap();

        HttpResponse::Ok()
            .content_type(ContentType::json())
            .body(body)
    }
}

#[derive(Deserialize)]
pub struct CreateOrganizationSchema {
    pub name: String,
    pub description: Option<String>,
    pub website: Option<String>,
    pub contact_email: Option<String>,
}

pub type CreateOrganization = Json<CreateOrganizationSchema>;

impl CreateOrganizationSchema {
    pub fn validate(self) -> Result<CreateOrganizationSchema, AppError> {
        if self.name.trim().is_empty() {
            return Err(AppError {
                message: "Organization name is required.",
            });
        }
        if self.name.len() > 255 {
            return Err(AppError {
                message: "Organization name must be 255 characters or less.",
            });
        }
        if let Some(ref email) = self.contact_email {
            if !email.contains('@') {
                return Err(AppError {
                    message: "Invalid contact email address.",
                });
            }
        }
        Ok(self)
    }
}

#[derive(Deserialize)]
pub struct UpdateOrganizationSchema {
    pub name: String,
    pub description: Option<String>,
    pub website: Option<String>,
    pub contact_email: Option<String>,
}

pub type UpdateOrganization = Json<UpdateOrganizationSchema>;

impl UpdateOrganizationSchema {
    pub fn validate(self) -> Result<UpdateOrganizationSchema, AppError> {
        if self.name.trim().is_empty() {
            return Err(AppError {
                message: "Organization name is required.",
            });
        }
        if self.name.len() > 255 {
            return Err(AppError {
                message: "Organization name must be 255 characters or less.",
            });
        }
        if let Some(ref email) = self.contact_email {
            if !email.contains('@') {
                return Err(AppError {
                    message: "Invalid contact email address.",
                });
            }
        }
        Ok(self)
    }
}
