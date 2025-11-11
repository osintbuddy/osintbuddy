use crate::schemas::user::Token;
use crate::schemas::{Notification, user::LogoutUser};
use crate::{AppData, AppState};
use actix_web::{
    Responder, Result, post,
    rt::task,
    web::{Data, Query, Redirect},
};
use casdoor_rust_sdk::AuthService;
use common::errors::AppError;
use serde::Deserialize;

#[post("/auth/register")]
async fn register_user_handler(app: AppData) -> impl Responder {
    let auth_service = AuthService::new(&app.casdoor_conf);
    let redirect_url = auth_service.get_signup_url_enable_password();
    Redirect::to(redirect_url)
}

#[post("/auth/login")]
async fn login_user_handler(app: Data<AppState>) -> impl Responder {
    let auth_service = AuthService::new(&app.casdoor_conf);
    let redirect_url = auth_service.get_signin_url("http://localhost:55173/callback".to_string());
    Redirect::to(redirect_url)
}

#[post("/auth/logout")]
async fn logout_handler(body: LogoutUser, app: AppData) -> impl Responder {
    app.blacklist.insert(body.token.to_string(), true);

    Notification {
        message: "You have successfully signed out.",
    }
}

#[derive(Deserialize)]
struct CallbackState {
    code: String,
}

#[post("/auth/sign-in")]
async fn callback(query: Query<CallbackState>, app: Data<AppState>) -> Result<Token, AppError> {
    let CallbackState { code } = query.into_inner();

    let token = task::spawn_blocking(move || -> Result<String, AppError> {
        let auth_service = AuthService::new(&app.casdoor_conf);
        let token = auth_service.get_auth_token(code).map_err(|err| {
            log::error!("get_auth_token() error: {err}");
            AppError {
                message: "The OSINTBuddy authentication services are currently down.",
            }
        })?;

        Ok(token)
    })
    .await
    .map_err(|join_err| {
        log::error!("callback spawn_blocking join error: {join_err}");
        AppError {
            message: "The OSINTBuddy authentication services are currently down.",
        }
    })??;

    Ok(Token { token })
}
