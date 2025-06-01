use std::time::Duration;

use actix_web::{HttpRequest, HttpResponse, Responder, Result, get, http, post, web};
use argon2::{
    Argon2,
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString, rand_core::OsRng},
};
use chrono::prelude::*;
use jsonwebtoken::{EncodingKey, Header, encode};
use serde_json::json;
use sqlx::Row;

use crate::{
    AppState,
    middleware::jwt_auth,
    schemas::{
        errors::{AppError, ErrorKind},
        user::{LoginUserSchema, RegisterUserSchema, Token, TokenClaims, User},
    },
};

#[post("/auth/register")]
async fn register_user_handler(
    body: web::Json<RegisterUserSchema>,
    app: web::Data<AppState>,
) -> Result<User, AppError> {
    let body = match body.into_inner().validate() {
        Ok(body) => body,
        Err(err) => return Err(err),
    };
    match sqlx::query("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)")
        .bind(body.email.to_owned())
        .fetch_one(&app.db)
        .await
    {
        Ok(row) => {
            if row.get(0) {
                return Err(AppError {
                    message: "User already exists.",
                    kind: ErrorKind::Exists,
                });
            }
        }
        Err(err) => {
            eprintln!("Error checking user exists: {}", err);
            return Err(AppError {
                message: "We ran into an error registering your account.",
                kind: ErrorKind::Database,
            });
        }
    };

    let salt = SaltString::generate(&mut OsRng);
    let hashed_password = Argon2::default().hash_password(body.password.as_bytes(), &salt);

    match hashed_password {
        Ok(hashed_password) => {
            let query_result = sqlx::query_as!(
                User,
                "INSERT INTO users (name,email,password) VALUES ($1, $2, $3) RETURNING *",
                body.name.to_string(),
                body.email.to_string().to_lowercase(),
                hashed_password.to_string()
            )
            .fetch_one(&app.db)
            .await;

            match query_result {
                Ok(user) => Ok(user),
                Err(err) => {
                    eprintln!("Error creating user: {err}");
                    return Err(AppError {
                        kind: ErrorKind::Database,
                        message: "We ran into an error creating this account.",
                    });
                }
            }
        }
        Err(err) => {
            eprintln!("Error hashing password: {}", err);
            return Err(AppError {
                message: "Invalid password.",
                kind: ErrorKind::BadClientData,
            });
        }
    }
}

#[post("/auth/login")]
async fn login_user_handler(
    body: web::Json<LoginUserSchema>,
    app: web::Data<AppState>,
) -> Result<Token, AppError> {
    let body = match body.into_inner().validate() {
        Ok(body) => body,
        Err(err) => return Err(err),
    };

    let query_result = sqlx::query_as!(User, "SELECT * FROM users WHERE email = $1", body.email)
        .fetch_optional(&app.db)
        .await;

    let user_option = match query_result {
        Ok(user_option) => user_option,
        Err(err) => {
            eprintln!("Error fetching user by email: {err}");
            return Err(AppError {
                message: "We ran into an error.",
                kind: ErrorKind::Database,
            });
        }
    };
    user_option.as_ref().map(|user| {
        let parsed_hash = PasswordHash::new(&user.password);
        match parsed_hash {
            Ok(hash) => match Argon2::default().verify_password(body.password.as_bytes(), &hash) {
                Ok(_) => Ok(()),
                Err(err) => {
                    eprintln!("Error verifying hash: {err}");
                    return Err(AppError {
                        message: "Invalid email or password",
                        kind: ErrorKind::BadClientData,
                    });
                }
            },
            Err(err) => {
                eprintln!("Error verifying password: {err}");
                return Err(AppError {
                    message: "Invalid email or password",
                    kind: ErrorKind::BadClientData,
                });
            }
        }
    });

    let user = match user_option {
        Some(value) => value,
        None => {
            eprintln!("Error fetching user!");
            return Err(AppError {
                message: "We ran into an error.",
                kind: ErrorKind::Database,
            });
        }
    };

    let now = Utc::now();
    let iat = now.timestamp() as usize;
    let exp = (now + Duration::from_secs(app.cfg.jwt_maxage)).timestamp() as usize;
    let claims: TokenClaims = TokenClaims {
        sub: user.id.to_string(),
        exp,
        iat,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(app.cfg.jwt_secret.as_ref()),
    );

    match token {
        Ok(token) => Ok(Token { token }),
        Err(err) => {
            eprintln!("Error encoding token: {err}");
            return Err(AppError {
                message: "Invalid email or password.",
                kind: ErrorKind::BadClientData,
            });
        }
    }
}

#[get("/auth/logout")]
async fn logout_handler(req: HttpRequest, app: web::Data<AppState>) -> impl Responder {
    req.headers()
        .get(http::header::AUTHORIZATION)
        .map(|h| {
            h.to_str()
                .unwrap_or("")
                .split_at_checked(7)
                .unwrap_or(("", ""))
                .1
                .to_string()
        })
        .and_then(|key| Some(app.blacklist.insert(key, true)));

    HttpResponse::Ok().json(json!({"message": "You have successfully signed out."}))
}

#[get("/users/me")]
async fn get_me_handler(
    auth: jwt_auth::JwtMiddleware,
    app: web::Data<AppState>,
) -> Result<User, AppError> {
    let query_result = sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", auth.user_id)
        .fetch_one(&app.db)
        .await;
    match query_result {
        Ok(user) => return Ok(user),
        Err(err) => {
            eprintln!("Error fetching account information: {err}");
            return Err(AppError {
                message: "We ran into an error fetching your account information!",
                kind: ErrorKind::Database,
            });
        }
    };
}
