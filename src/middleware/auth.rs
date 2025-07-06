use std::future::{Ready, ready};

use crate::AppData;
use crate::schemas::errors::{AppError, ErrorKind};
use crate::schemas::user::TokenClaims;
use actix_web::error::ErrorUnauthorized;
use actix_web::web::Data;
use actix_web::{Error as ActixWebError, dev::Payload};
use actix_web::{FromRequest, HttpRequest, http};
use jsonwebtoken::{DecodingKey, Validation, decode};
use log::error;
use sqids::Sqids;

pub fn verify_jwt_token(token: &str, secret: &str) -> Result<TokenClaims, AppError> {
    decode::<TokenClaims>(
        token,
        &DecodingKey::from_secret(secret.as_ref()),
        &Validation::default(),
    )
    .map(|token_data| token_data.claims)
    .map_err(|_| AppError {
        message: "Invalid token. Please sign in again.",
        kind: ErrorKind::Invalid,
    })
}

#[derive(Debug)]
pub struct AuthMiddleware {
    pub account_id: i64,
    pub user_type: String,
    pub org_id: i64,
    pub org_subscription_level: String,
    pub org_max_graphs: i32,
    pub org_max_entities: i32,
    pub org_can_export: bool,
    pub org_can_share: bool,
}

pub fn get_header_auth(req: &HttpRequest) -> Result<&str, AppError> {
    req.headers()
        .get(http::header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| AppError {
            kind: ErrorKind::Unauthorized,
            message: "Missing token!",
        })
}

impl FromRequest for AuthMiddleware {
    type Error = ActixWebError;
    type Future = Ready<Result<Self, Self::Error>>;
    fn from_request(req: &HttpRequest, _: &mut Payload) -> Self::Future {
        let Ok(auth_result) = get_header_auth(req) else {
            return ready(Err(ErrorUnauthorized(AppError {
                message: "Missing token.",
                kind: ErrorKind::Critical,
            })));
        };
        let Some(token) = auth_result.strip_prefix("Bearer ") else {
            return ready(Err(ErrorUnauthorized(AppError {
                message: "Missing bearer token.",
                kind: ErrorKind::Critical,
            })));
        };

        if token.trim().is_empty() {
            return ready(Err(ErrorUnauthorized(AppError {
                message: "Missing token.",
                kind: ErrorKind::Invalid,
            })));
        }

        let app = req.app_data::<AppData>();
        let Some(app) = app else {
            return ready(Err(ErrorUnauthorized(AppError {
                message: "An error has occured on our side, please try again later.",
                kind: ErrorKind::Critical,
            })));
        };

        // if a user signed out with their JWT (aka blacklisted that token)
        let is_blacklisted = app.blacklist.get(token).unwrap_or(false);
        if is_blacklisted {
            return ready(Err(ErrorUnauthorized(AppError {
                message: "Invalid token. Please sign in again.",
                kind: ErrorKind::Invalid,
            })));
        }

        let claims = decode::<TokenClaims>(
            token,
            &DecodingKey::from_secret(app.cfg.jwt_secret.as_ref()),
            &Validation::default(),
        )
        .map(|token_data| token_data.claims)
        .map_err(|err| error!("{err}"));

        let Ok(claims) = claims else {
            return ready(Err(ErrorUnauthorized(AppError {
                message: "Invalid token. Please sign in again.",
                kind: ErrorKind::Invalid,
            })));
        };

        let sqids = req.app_data::<Data<Sqids>>();
        let Some(sqids) = sqids else {
            return ready(Err(ErrorUnauthorized(AppError {
                message: "An error has occured on our side. Invalid token.",
                kind: ErrorKind::Critical,
            })));
        };

        let user_ids = sqids.decode(&claims.sub);
        if user_ids.is_empty() {
            return ready(Err(ErrorUnauthorized(AppError {
                message: "Invalid token.",
                kind: ErrorKind::Invalid,
            })));
        }

        let user_id = user_ids.first().ok_or_else(|| AppError {
            message: "Invalid token.",
            kind: ErrorKind::Invalid,
        });

        match user_id {
            Ok(id) => ready(Ok(AuthMiddleware {
                account_id: *id as i64,
                user_type: claims.user_type,
                org_id: claims.org_id,
                org_subscription_level: claims.org_subscription_level,
                org_max_graphs: claims.org_max_graphs,
                org_max_entities: claims.org_max_entities,
                org_can_export: claims.org_can_export,
                org_can_share: claims.org_can_share,
            })),
            Err(_) => ready(Err(ErrorUnauthorized(AppError {
                message: "Invalid token.",
                kind: ErrorKind::Invalid,
            }))),
        }
    }
}
