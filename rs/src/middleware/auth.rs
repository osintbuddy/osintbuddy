use std::future::{Ready, ready};

use crate::AppData;
use crate::schemas::errors::{AppError, ErrorKind};
use crate::schemas::user::TokenClaims;
use actix_web::error::ErrorUnauthorized;
use actix_web::{Error as ActixWebError, dev::Payload};
use actix_web::{FromRequest, HttpRequest, http};
use jsonwebtoken::{DecodingKey, Validation, decode};

#[derive(Debug)]
pub struct AuthMiddleware {
    pub account_id: i64,
    pub roles: Vec<String>,
}

pub fn extract_authorization(req: &HttpRequest) -> &str {
    req.headers()
        .get(http::header::AUTHORIZATION)
        .map(|r| r.to_str().unwrap_or(""))
        .unwrap_or("")
        .split_at_checked(7)
        .unwrap_or(("", ""))
        .1
}

impl FromRequest for AuthMiddleware {
    type Error = ActixWebError;
    type Future = Ready<Result<Self, Self::Error>>;
    fn from_request(req: &HttpRequest, _: &mut Payload) -> Self::Future {
        let token = extract_authorization(req);
        if token.trim().is_empty() {
            return ready(Err(ErrorUnauthorized(AppError {
                message: "There was an error authenticating your account.",
                kind: ErrorKind::Invalid,
            })));
        }

        let app = req.app_data::<AppData>();
        let Some(app) = app else {
            return ready(Err(ErrorUnauthorized(AppError {
                message: "An exception has occured, please try again later.",
                kind: ErrorKind::Critical,
            })));
        };

        // if a user signed out with their JWT (aka blacklisted that token)
        let is_blacklisted = app.blacklist.get(token).unwrap_or(false);
        if is_blacklisted {
            return ready(Err(ErrorUnauthorized(AppError {
                message: "Invalid token.",
                kind: ErrorKind::Invalid,
            })));
        }

        let claims = decode::<TokenClaims>(
            &token,
            &DecodingKey::from_secret(app.cfg.jwt_secret.as_ref()),
            &Validation::default(),
        )
        .map(|token_data| token_data.claims);
        let Ok(claims) = claims else {
            return ready(Err(ErrorUnauthorized(AppError {
                message: "Invalid token.",
                kind: ErrorKind::Invalid,
            })));
        };

        match claims.sub.parse::<i64>() {
            Ok(user_id) => ready(Ok(AuthMiddleware {
                account_id: user_id,
                roles: claims.roles,
            })),
            Err(_) => ready(Err(ErrorUnauthorized(AppError {
                message: "Invalid token.",
                kind: ErrorKind::Invalid,
            }))),
        }
    }
}
