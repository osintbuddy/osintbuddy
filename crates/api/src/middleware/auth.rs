use actix_web::error::ErrorUnauthorized;
use actix_web::web::Data;
use actix_web::{Error as ActixWebError, dev::Payload};
use actix_web::{FromRequest, HttpRequest, http};
use casdoor_rust_sdk::{AuthService, CasdoorUser};
use common::errors::AppError;
use log::error;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::future::{Ready, ready};
use std::str::FromStr;
use uuid::Uuid;

use crate::AppState;

#[derive(Debug)]
pub struct AuthMiddleware {
    pub user: User,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    pub owner: String,
    pub name: String,
    pub created_time: String,
    pub updated_time: String,

    pub id: Uuid,
    pub display_name: String,
    pub avatar: String,
    pub avatar_type: String,
    pub permanent_avatar: String,
    pub email: String,
    pub email_verified: bool,
    pub is_default_avatar: bool,
    pub is_online: bool,
    pub is_admin: bool,
    pub is_forbidden: bool,
    pub is_deleted: bool,
    pub properties: HashMap<String, String>,
    pub groups: Vec<String>,
    pub last_signin_wrong_time: String,
    pub signin_wrong_times: i32,
}

impl From<CasdoorUser> for User {
    fn from(user: CasdoorUser) -> Self {
        return Self {
            id: Uuid::from_str(user.id.as_str()).expect("casdoor string id (uuid) is not a uuid!?"),
            owner: user.owner,
            name: user.name,
            created_time: user.created_time,
            updated_time: user.updated_time,
            display_name: user.display_name,
            avatar: user.avatar,
            avatar_type: user.avatar_type,
            permanent_avatar: user.permanent_avatar,
            email: user.email,
            email_verified: user.email_verified,
            is_default_avatar: user.is_default_avatar,
            is_online: user.is_online,
            is_admin: user.is_admin,
            is_forbidden: user.is_forbidden,
            is_deleted: user.is_deleted,
            properties: user.properties,
            groups: user.groups,
            last_signin_wrong_time: user.last_signin_wrong_time,
            signin_wrong_times: user.signin_wrong_times,
        };
    }
}

pub fn get_auth_header(req: &HttpRequest) -> Result<String, AppError> {
    match req.headers().get(http::header::AUTHORIZATION) {
        Some(h) => {
            let Some(h) = h.to_str().ok() else {
                return Err(AppError {
                    message: "Missing token!",
                });
            };
            return Ok(h.replace("Bearer ", ""));
        }
        None => Err(AppError {
            message: "Missing token!",
        }),
    }
}

impl FromRequest for AuthMiddleware {
    type Error = ActixWebError;
    type Future = Ready<Result<Self, Self::Error>>;
    fn from_request(req: &HttpRequest, _: &mut Payload) -> Self::Future {
        let app = req.app_data::<Data<AppState>>();
        let Some(app) = app else {
            return ready(Err(ErrorUnauthorized(AppError {
                message: "An error has occurred on our side, please try again later.",
            })));
        };
        let auth_service = AuthService::new(&app.casdoor_conf);

        let Ok(req_token) = get_auth_header(req) else {
            return ready(Err(ErrorUnauthorized(AppError {
                message: "Unauthorized!",
            })));
        };
        let auth_result = auth_service.parse_jwt_token(req_token.to_owned());

        match auth_result {
            Ok(user) => {
                return ready(Ok(AuthMiddleware {
                    user: User::from(user),
                }));
            }
            Err(err) => {
                error!("authorization middleware error: {}", err);
                return ready(Err(ErrorUnauthorized(AppError {
                    message: "Unauthorized!",
                })));
            }
        }
    }
}
