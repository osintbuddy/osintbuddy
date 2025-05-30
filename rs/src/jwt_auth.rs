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
struct ErrorResponse {
    message: String,
}

impl fmt::Display for ErrorResponse {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", serde_json::to_string(&self).unwrap())
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
        match req
            .headers()
            .get(http::header::AUTHORIZATION)
            .map(|h| h.to_str().unwrap().split_at(7).1.to_string())
        {
            Some(token) => {
                if token.trim().is_empty() {
                    return ready(Err(ErrorUnauthorized(ErrorResponse {
                        message: "You are not logged in, please provide a token".to_string(),
                    })));
                }
                let app = match req.app_data::<web::Data<AppState>>() {
                    Some(app) => app,
                    None => {
                        return ready(Err(ErrorInternalServerError(ErrorResponse {
                            message: "An exception has occurred, please try again later."
                                .to_string(),
                        })));
                    }
                };

                // if a user signed out with their JWT (aka blacklisted that token)
                let is_blacklisted = app.blacklist.get(&token).unwrap_or(false);
                if is_blacklisted {
                    return ready(Err(ErrorUnauthorized(ErrorResponse {
                        message: "Invalid token".to_string(),
                    })));
                }

                let claims = match decode::<TokenClaims>(
                    &token,
                    &DecodingKey::from_secret(app.cfg.jwt_secret.as_ref()),
                    &Validation::default(),
                ) {
                    Ok(token_data) => token_data.claims,
                    Err(_) => {
                        return ready(Err(ErrorUnauthorized(ErrorResponse {
                            message: "Invalid token".to_string(),
                        })));
                    }
                };
                match claims.sub.parse::<i64>() {
                    Ok(user_id) => ready(Ok(JwtMiddleware { user_id, token })),
                    Err(_) => ready(Err(ErrorUnauthorized(ErrorResponse {
                        message: "Invalid token".to_string(),
                    }))),
                }
            }
            None => ready(Err(ErrorInternalServerError(ErrorResponse {
                message: "You are not signed in. Please login and try again.".to_string(),
            }))),
        }
    }
}
