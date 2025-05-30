use actix_web::{
    HttpRequest, HttpResponse, Responder,
    cookie::{Cookie, time::Duration as ActixWebDuration},
    get, http, post, web,
};
use argon2::{
    Argon2,
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString, rand_core::OsRng},
};
use chrono::{Duration, prelude::*};
use jsonwebtoken::{EncodingKey, Header, encode};
use serde_json::json;
use sqlx::Row;

use crate::{
    AppState, jwt_auth,
    models::user::{LoginUserSchema, RegisterUserSchema, TokenClaims, User},
};

#[post("/auth/register")]
async fn register_user_handler(
    body: web::Json<RegisterUserSchema>,
    app: web::Data<AppState>,
) -> impl Responder {
    let exists: bool = sqlx::query("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)")
        .bind(body.email.to_owned())
        .fetch_one(&app.db)
        .await
        .unwrap()
        .get(0);

    if exists {
        return HttpResponse::Conflict().json(
            serde_json::json!({"status": "fail","message": "User with that email already exists"}),
        );
    }

    let salt = SaltString::generate(&mut OsRng);
    let hashed_password = Argon2::default()
        .hash_password(body.password.as_bytes(), &salt)
        .expect("Error while hashing password")
        .to_string();
    let query_result = sqlx::query_as!(
        User,
        "INSERT INTO \"users\" (name,email,password) VALUES ($1, $2, $3) RETURNING *",
        body.name.to_string(),
        body.email.to_string().to_lowercase(),
        hashed_password
    )
    .fetch_one(&app.db)
    .await;

    match query_result {
        Ok(user) => {
            let user_response = serde_json::json!({"status": "success","data": serde_json::json!({
                "user": User::filter_record(&user)
            })});

            return HttpResponse::Ok().json(user_response);
        }
        Err(e) => {
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({"status": "error","message": format!("{:?}", e)}));
        }
    }
}

#[post("/auth/login")]
async fn login_user_handler(
    body: web::Json<LoginUserSchema>,
    app: web::Data<AppState>,
) -> impl Responder {
    let query_result =
        sqlx::query_as!(User, "SELECT * FROM \"users\" WHERE email = $1", body.email)
            .fetch_optional(&app.db)
            .await
            .unwrap();

    let is_valid = query_result.to_owned().map_or(false, |user| {
        let parsed_hash = PasswordHash::new(&user.password).unwrap();
        Argon2::default()
            .verify_password(body.password.as_bytes(), &parsed_hash)
            .map_or(false, |_| true)
    });

    if !is_valid {
        return HttpResponse::BadRequest()
            .json(json!({"status": "fail", "message": "Invalid email or password"}));
    }

    let user = query_result.unwrap();

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
    )
    .unwrap();

    HttpResponse::Ok().json(json!({"token": token}))
}

#[get("/auth/logout")]
async fn logout_handler(req: HttpRequest, app: web::Data<AppState>) -> impl Responder {
    let key = req
        .headers()
        .get(http::header::AUTHORIZATION)
        .map(|h| h.to_str().unwrap().split_at(7).1.to_string())
        .unwrap_or("".to_string());

    app.blacklist.insert(key, true);
    HttpResponse::Ok().json(json!({"message": "You have successfully signed out."}))
}

#[get("/users/me")]
async fn get_me_handler(auth: jwt_auth::JwtMiddleware, app: web::Data<AppState>) -> impl Responder {
    let user = sqlx::query_as!(User, "SELECT * FROM \"users\" WHERE id = $1", auth.user_id)
        .fetch_one(&app.db)
        .await
        .unwrap();

    HttpResponse::Ok().json(serde_json::json!({
        "user": User::filter_record(&user)
    }))
}
