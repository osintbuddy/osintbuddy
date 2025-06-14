use std::time::Duration;

use crate::{
    AppData, db,
    middleware::auth::{AuthMiddleware, extract_authorization},
    schemas::{
        Notification,
        errors::{AppError, ErrorKind},
        user::{LoginUser, RegisterUser, Token, TokenClaims, User},
    },
};
use actix_web::{HttpRequest, HttpResponse, Responder, Result, get, post};
use argon2::{
    Argon2, PasswordHash, PasswordVerifier,
    password_hash::{PasswordHasher, SaltString, rand_core::OsRng},
};
use chrono::prelude::*;
use jsonwebtoken::{EncodingKey, Header, encode};
use log::error;
use sqlx::Row;

#[post("/auth/register")]
async fn register_user_handler(body: RegisterUser, pool: db::Database) -> Result<User, AppError> {
    let body = body.into_inner().validate()?;
    let exists = sqlx::query("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)")
        .bind(body.email.to_owned())
        .fetch_one(pool.as_ref())
        .await
        .map(|row| row.get(0))
        .map_err(|err| {
            error!("{err}");
            AppError {
                message: "We ran into an error registering your account.",
                kind: ErrorKind::Database,
            }
        })?;
    if exists {
        return Err(AppError {
            message: "We ran into an error registering your account.",
            kind: ErrorKind::Database,
        });
    };

    let salt = SaltString::generate(&mut OsRng);
    let hashed_password = Argon2::default()
        .hash_password(body.password.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|err| {
            error!("{err}");
            AppError {
                message: "Invalid password.",
                kind: ErrorKind::Invalid,
            }
        })?;

    sqlx::query_as!(
        User,
        "INSERT INTO users (name,email,password) VALUES ($1, $2, $3) RETURNING *",
        body.name.to_string(),
        body.email.to_string().to_lowercase(),
        hashed_password,
    )
    .fetch_one(pool.as_ref())
    .await
    .map_err(|err| {
        error!("{err}");
        AppError {
            kind: ErrorKind::Database,
            message: "We ran into an error creating this account.",
        }
    })
}

#[post("/auth/login")]
async fn login_user_handler(
    body: LoginUser,
    app: AppData,
    pool: db::Database,
) -> Result<Token, AppError> {
    let body = body.into_inner().validate()?;
    let user = sqlx::query_as!(User, "SELECT * FROM users WHERE email = $1", body.email)
        .fetch_optional(pool.as_ref())
        .await
        .map_err(|err| {
            error!("{err}");
            AppError {
                message: "Invalid email or password",
                kind: ErrorKind::Invalid,
            }
        })?
        .ok_or(AppError {
            message: "We ran into an error fetching your account.",
            kind: ErrorKind::Invalid,
        })?;
    let parsed_hash = PasswordHash::new(&user.password).map_err(|err| {
        error!("{err}");
        AppError {
            message: "Invalid email or password",
            kind: ErrorKind::Invalid,
        }
    })?;
    Argon2::default()
        .verify_password(body.password.as_bytes(), &parsed_hash)
        .map_err(|err| {
            error!("{err}");
            AppError {
                message: "Invalid email or password",
                kind: ErrorKind::Invalid,
            }
        })?;
    let now = Utc::now();
    let iat = now.timestamp() as usize;
    let exp = (now + Duration::from_secs(app.cfg.jwt_maxage)).timestamp() as usize;
    let sub = user.id.to_string();

    let claims = TokenClaims {
        sub,
        exp,
        iat,
        roles: vec![String::from("user")],
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(app.cfg.jwt_secret.as_ref()),
    )
    .map(|token| Token { token })
    .map_err(|err| {
        error!("{err}");
        AppError {
            message: "Invalid email or password.",
            kind: ErrorKind::Invalid,
        }
    })
}

#[get("/auth/logout")]
async fn logout_handler(req: HttpRequest, app: AppData) -> impl Responder {
    let token = extract_authorization(&req).to_string();
    app.blacklist.insert(token, true);
    HttpResponse::Ok().json(Notification {
        message: "You have successfully signed out.",
    })
}

#[get("/users/me")]
async fn get_me_handler(auth: AuthMiddleware, pool: db::Database) -> Result<User, AppError> {
    sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", auth.account_id)
        .fetch_one(pool.as_ref())
        .await
        .map_err(|err| {
            error!("{err}");
            AppError {
                message: "We ran into an error fetching your account information!",
                kind: ErrorKind::Database,
            }
        })
}
