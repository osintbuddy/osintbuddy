use actix_web::{HttpRequest, HttpResponse, Responder, get, http, post, web};
use argon2::{
    Argon2,
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString, rand_core::OsRng},
};
use chrono::{Duration, prelude::*};
use jsonwebtoken::{EncodingKey, Header, encode};
use serde_json::json;
use sqlx::Row;

use crate::{
    AppState,
    error::{ErrorKind, ErrorResponse},
    jwt_auth,
    models::user::{LoginUserSchema, RegisterUserSchema, TokenClaims, User},
};

#[post("/auth/register")]
async fn register_user_handler(
    body: web::Json<RegisterUserSchema>,
    app: web::Data<AppState>,
) -> impl Responder {
    let exists: bool = match sqlx::query("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)")
        .bind(body.email.to_owned())
        .fetch_one(&app.db)
        .await
    {
        Ok(row) => row.get(0),
        Err(err) => {
            eprintln!("Error checking user exists: {}", err);
            return HttpResponse::Conflict().json(ErrorResponse {
                message: "We ran into an error registering your account. Please try again.",
                kind: ErrorKind::Database,
            });
        }
    };

    if exists {
        return HttpResponse::Conflict().json(ErrorResponse {
            message: "User already exists.",
            kind: ErrorKind::Exists,
        });
    }

    if body.name.to_string().trim().is_empty()
        || body.password.to_string().trim().is_empty() | body.email.to_string().trim().is_empty()
    {
        return HttpResponse::BadRequest().json(ErrorResponse {
            message: "Missing username, password, and or email.",
            kind: ErrorKind::InvalidInput,
        });
    }

    if body.password.to_string().chars().count() < 8 {
        return HttpResponse::BadRequest().json(ErrorResponse {
            message: "The minimum password length is 8 characters. Please try again.",
            kind: ErrorKind::InvalidInput,
        });
    }

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
                Ok(user) => HttpResponse::Ok().json(json!({
                    "user": User::filter_record(&user)
                })),
                Err(err) => {
                    eprintln!("Error creating user: {err}");
                    return HttpResponse::InternalServerError().json(ErrorResponse {
                        kind: ErrorKind::Database,
                        message: "We ran into an error creating this account. Please try again.",
                    });
                }
            }
        }
        Err(err) => {
            eprintln!("Error hashing password: {}", err);
            return HttpResponse::Conflict().json(ErrorResponse {
                message: "Invalid password.",
                kind: ErrorKind::InvalidInput,
            });
        }
    }
}

#[post("/auth/login")]
async fn login_user_handler(
    body: web::Json<LoginUserSchema>,
    app: web::Data<AppState>,
) -> impl Responder {
    let query_result = sqlx::query_as!(User, "SELECT * FROM users WHERE email = $1", body.email)
        .fetch_optional(&app.db)
        .await;

    let query_result = match query_result {
        Ok(query_result) => query_result,
        Err(err) => {
            eprintln!("Error fetching user by email: {err}");
            return HttpResponse::BadRequest().json(ErrorResponse {
                message: "We ran into an error. Please try again.",
                kind: ErrorKind::Database,
            });
        }
    };

    let is_valid = query_result.to_owned().map_or(false, |user| {
        let parsed_hash = PasswordHash::new(&user.password);
        match parsed_hash {
            Ok(hash) => Argon2::default()
                .verify_password(body.password.as_bytes(), &hash)
                .map_or(false, |_| true),
            Err(err) => {
                eprintln!("Error verifying password: {err}");
                false
            }
        }
    });

    if !is_valid {
        return HttpResponse::BadRequest().json(ErrorResponse {
            message: "Invalid email or password",
            kind: ErrorKind::InvalidInput,
        });
    }

    let user = match query_result {
        Some(user) => user,
        None => {
            eprintln!("Error fetching user!");
            return HttpResponse::BadRequest().json(ErrorResponse {
                message: "We ran into an error. Please try again.",
                kind: ErrorKind::Database,
            });
        }
    };

    let now = Utc::now();
    let iat = now.timestamp() as usize;
    let exp = (now + Duration::minutes(60)).timestamp() as usize;
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
        Ok(token) => HttpResponse::Ok().json(json!({"token": token})),
        Err(err) => {
            eprintln!("Error encoding token: {err}");
            return HttpResponse::BadRequest().json(ErrorResponse {
                message: "Invalid email or password.",
                kind: ErrorKind::InvalidInput,
            });
        }
    }
}

#[get("/auth/logout")]
async fn logout_handler(req: HttpRequest, app: web::Data<AppState>) -> impl Responder {
    let key = req
        .headers()
        .get(http::header::AUTHORIZATION)
        .map(|h| {
            h.to_str()
                .unwrap_or("")
                .split_at_checked(7)
                .unwrap_or(("", ""))
                .1
                .to_string()
        })
        .unwrap_or("".to_string());

    app.blacklist.insert(key, true);
    HttpResponse::Ok().json(json!({"message": "You have successfully signed out."}))
}

#[get("/users/me")]
async fn get_me_handler(auth: jwt_auth::JwtMiddleware, app: web::Data<AppState>) -> impl Responder {
    let user = sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", auth.user_id)
        .fetch_one(&app.db)
        .await;
    let user = match user {
        Ok(user) => user,
        Err(err) => {
            eprintln!("Error fetching account information: {err}");
            return HttpResponse::BadRequest().json(ErrorResponse {
                message: "We ran into an error fetching your account information! Please try again.",
                kind: ErrorKind::Database,
            });
        }
    };
    HttpResponse::Ok().json(json!({
        "user": User::filter_record(&user)
    }))
}
