use core::fmt;
use std::future::{Ready, ready};

use crate::AppState;
use crate::models::user::TokenClaims;
use actix_web::error::{ErrorInternalServerError, ErrorUnauthorized};
use actix_web::{Error as ActixWebError, dev::Payload};
use actix_web::{FromRequest, HttpRequest, http, web};
use jsonwebtoken::{DecodingKey, Validation, decode};

use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub message: String,
    pub kind: String,
}

impl fmt::Display for ErrorResponse {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "{}",
            serde_json::to_string(&self).unwrap_or("unknown error!".to_string())
        )
    }
}

pub struct JwtMiddleware {
    pub user_id: i64,
    pub token: String,
}

impl FromRequest for JwtMiddleware {
    type Error = ActixWebError;
    type Future = Ready<Result<Self, Self::Error>>;
    fn from_request(req: &HttpRequest, _: &mut Payload) -> Self::Future {
        match req.headers().get(http::header::AUTHORIZATION).map(|h| {
            h.to_str()
                .unwrap_or("")
                .split_at_checked(7)
                .unwrap_or(("", ""))
                .1
                .to_string()
        }) {
            Some(token) => {
                if token.trim().is_empty() {
                    return ready(Err(ErrorUnauthorized(ErrorResponse {
                        message: "There was an error authenticating your account. Please login and try again.".to_string(),
                        kind: "missing".to_string(),
                    })));
                }
                let app = match req.app_data::<web::Data<AppState>>() {
                    Some(app) => app,
                    None => {
                        return ready(Err(ErrorInternalServerError(ErrorResponse {
                            message: "An exception has occurred, please try again later."
                                .to_string(),
                            kind: "fatal".to_string(),
                        })));
                    }
                };
                // if a user signed out with their JWT (aka blacklisted that token)
                let is_blacklisted = app.blacklist.get(&token).unwrap_or(false);
                if is_blacklisted {
                    return ready(Err(ErrorUnauthorized(ErrorResponse {
                        message: "Invalid token.".to_string(),
                        kind: "invalid".to_string(),
                    })));
                }

                let claims = match decode::<TokenClaims>(
                    &token,
                    &DecodingKey::from_secret(app.cfg.jwt_secret.as_ref()),
                    &Validation::default(),
                ) {
                    Ok(token_data) => token_data.claims,
                    Err(err) => {
                        eprintln!("Decoding JWT error: {err}");
                        return ready(Err(ErrorUnauthorized(ErrorResponse {
                            message: "Invalid token.".to_string(),
                            kind: "invalid".to_string(),
                        })));
                    }
                };
                match claims.sub.parse::<i64>() {
                    Ok(user_id) => ready(Ok(JwtMiddleware { user_id, token })),
                    Err(err) => {
                        eprintln!("Casting claims user_id<i64> error: {err}");
                        ready(Err(ErrorUnauthorized(ErrorResponse {
                            message: "Invalid token.".to_string(),
                            kind: "invalid".to_string(),
                        })))
                    }
                }
            }
            None => ready(Err(ErrorUnauthorized(ErrorResponse {
                message: "There was an error authenticating your account. Please sign in again."
                    .to_string(),
                kind: "fatal".to_string(),
            }))),
        }
    }
}
