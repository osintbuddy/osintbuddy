use actix_web::{HttpRequest, HttpResponse, Responder, body::BoxBody, http::header::ContentType};
use chrono::prelude::*;
use serde::{Deserialize, Serialize};

use super::errors::{AppError, ErrorKind};

#[derive(Serialize)]
pub struct User {
    #[serde(skip_serializing)]
    pub id: i64,
    pub name: String,
    pub email: String,
    #[serde(skip_serializing)]
    pub password: String,
    pub verified: bool,
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

#[derive(Serialize, Deserialize)]
pub struct TokenClaims {
    pub sub: String,
    pub iat: usize,
    pub exp: usize,
}

#[derive(Serialize)]
pub struct Token {
    pub token: String,
}

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

impl RegisterUserSchema {
    pub fn validate(self) -> Result<RegisterUserSchema, AppError> {
        if self.name.trim().is_empty()
            || self.email.trim().is_empty()
            || self.password.trim().is_empty()
        {
            return Err(AppError {
                message: "Missing username, password, and or email.",
                kind: ErrorKind::Invalid,
            }); // Adjust error type as needed
        }
        if self.password.to_string().chars().count() < 8 {
            return Err(AppError {
                message: "The minimum password length is 8 characters.",
                kind: ErrorKind::Invalid,
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

impl LoginUserSchema {
    pub fn validate(self) -> Result<LoginUserSchema, AppError> {
        if self.email.trim().is_empty() || self.password.trim().is_empty() {
            return Err(AppError {
                message: "Missing username or password.",
                kind: ErrorKind::Invalid,
            });
        }
        if self.password.to_string().chars().count() < 8 {
            return Err(AppError {
                message: "The minimum password length is 8 characters.",
                kind: ErrorKind::Invalid,
            });
        }
        Ok(self)
    }
}
