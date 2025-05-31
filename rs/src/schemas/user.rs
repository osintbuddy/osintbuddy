use chrono::prelude::*;
use serde::{Deserialize, Serialize};

use crate::error::{ErrorKind, ErrorResponse};

#[derive(Debug, Deserialize, Serialize)]
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

#[derive(Debug, Serialize, Deserialize)]
pub struct TokenClaims {
    pub sub: String,
    pub iat: usize,
    pub exp: usize,
}

#[derive(Debug, Deserialize)]
pub struct RegisterUserSchema {
    pub name: String,
    pub email: String,
    pub password: String,
}

impl RegisterUserSchema {
    pub fn validate(self) -> Result<RegisterUserSchema, ErrorResponse> {
        if self.name.trim().is_empty()
            || self.email.trim().is_empty()
            || self.password.trim().is_empty()
        {
            return Err(ErrorResponse {
                message: "Missing username, password, and or email.",
                kind: ErrorKind::InvalidInput,
            }); // Adjust error type as needed
        }
        if self.password.to_string().chars().count() < 8 {
            return Err(ErrorResponse {
                message: "The minimum password length is 8 characters. Please try again.",
                kind: ErrorKind::InvalidInput,
            });
        }
        Ok(self)
    }
}

#[derive(Debug, Deserialize)]
pub struct LoginUserSchema {
    pub email: String,
    pub password: String,
}

impl LoginUserSchema {
    pub fn validate(self) -> Result<LoginUserSchema, ErrorResponse> {
        if self.email.trim().is_empty() || self.password.trim().is_empty() {
            return Err(ErrorResponse {
                message: "Missing username or password.",
                kind: ErrorKind::InvalidInput,
            }); // Adjust error type as needed
        }
        if self.password.to_string().chars().count() < 8 {
            return Err(ErrorResponse {
                message: "The minimum password length is 8 characters. Please try again.",
                kind: ErrorKind::InvalidInput,
            });
        }
        Ok(self)
    }
}
