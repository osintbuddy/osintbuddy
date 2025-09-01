use actix_web::{
    HttpRequest, HttpResponse, Responder, body::BoxBody, http::header::ContentType, web::Json,
};
use chrono::prelude::*;
use serde::{Deserialize, Serialize};

use common::errors::AppError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    #[serde(skip_serializing)]
    pub id: i64,
    pub name: String,
    pub email: String,
    #[serde(skip_serializing)]
    pub password: String,
    pub verified: bool,
    pub user_type: String,
    pub org_id: i64,
    pub ctime: Option<DateTime<Utc>>,
    pub mtime: Option<DateTime<Utc>>,
}

impl Responder for User {
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
pub struct TokenClaims {
    pub sub: String,
    pub iat: usize,
    pub exp: usize,
    pub email: String,
    pub name: String,
    pub user_type: String,
    pub org_id: i64,
    pub org_subscription_level: String,
    pub org_max_cases: i32,
    pub org_max_entities: i32,
    pub org_can_export: bool,
    pub org_can_share: bool,
    pub ctime: DateTime<Utc>,
    pub mtime: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RefreshClaims {
    pub sub: String,
    pub iat: usize,
    pub exp: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Token {
    pub access_token: String,
    pub refresh_token: String,
    pub token_type: String,
}
pub type LogoutUser = Json<Token>;

impl Responder for Token {
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
pub struct RegisterUserSchema {
    pub name: String,
    pub email: String,
    pub password: String,
}

pub type RegisterUser = Json<RegisterUserSchema>;

impl RegisterUserSchema {
    pub fn validate(self) -> Result<RegisterUserSchema, AppError> {
        if self.name.trim().is_empty()
            || self.email.trim().is_empty()
            || self.password.trim().is_empty()
        {
            return Err(AppError {
                message: "Missing username, password, and or email.",
            }); // Adjust error type as needed
        }
        if self.password.to_string().chars().count() < 8 {
            return Err(AppError {
                message: "Passwords must be a minimum of 8 characters.",
            });
        }
        Ok(self)
    }
}

#[derive(Deserialize)]
pub struct LoginUserSchema {
    pub email: String,
    pub password: String,
}

pub type LoginUser = Json<LoginUserSchema>;

impl LoginUserSchema {
    pub fn validate(self) -> Result<LoginUserSchema, AppError> {
        if self.email.trim().is_empty() || self.password.trim().is_empty() {
            return Err(AppError {
                message: "Missing username or password.",
            });
        }
        if self.password.to_string().chars().count() < 8 {
            return Err(AppError {
                message: "Passwords must be a minimum of 8 characters.",
            });
        }
        Ok(self)
    }
}
