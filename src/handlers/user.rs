use std::time::Duration;

use crate::{
    AppData, db,
    middleware::auth::{AuthMiddleware, get_header_auth},
    schemas::{
        Notification,
        errors::{AppError, ErrorKind},
        organization::Organization,
        user::{LoginUser, LogoutUser, RefreshClaims, RegisterUser, Token, TokenClaims, User},
    },
};
use actix_web::{HttpRequest, Responder, Result, get, post, web::Data};
use argon2::{
    Argon2, PasswordHash, PasswordVerifier,
    password_hash::{PasswordHasher, SaltString, rand_core::OsRng},
};
use chrono::prelude::*;
use jsonwebtoken::{EncodingKey, Header, encode, DecodingKey, Validation};
use log::{error, info};
use sqids::Sqids;
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
            message: "We ran into an error registering your account. Please sign in or try again.",
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

    // Use a transaction to ensure atomicity of org + user creation
    let mut tx = pool.begin().await.map_err(|err| {
        error!("{err}");
        AppError {
            kind: ErrorKind::Database,
            message: "We ran into an error starting the registration transaction.",
        }
    })?;

    // Create organization with user's name (no unique constraint, so no conflicts)
    let organization = sqlx::query_as!(
        Organization,
        "INSERT INTO organizations (name, description, subscription_level) VALUES ($1, $2, $3) RETURNING *",
        body.name.to_string(),
        format!("{}'s Organization", body.name),
        "trial"
    )
    .fetch_one(&mut *tx)
    .await
    .map_err(|err| {
        error!("{err}");
        AppError {
            kind: ErrorKind::Database,
            message: "We ran into an error creating your organization.",
        }
    })?;

    // Create user with the new organization ID
    let user = sqlx::query_as!(
        User,
        "INSERT INTO users (name,email,password,user_type,org_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        body.name.to_string(),
        body.email.to_string().to_lowercase(),
        hashed_password,
        "standard",
        organization.id
    )
    .fetch_one(&mut *tx)
    .await
    .map_err(|err| {
        error!("{err}");
        AppError {
            kind: ErrorKind::Database,
            message: "We ran into an error creating this account.",
        }
    })?;

    // Commit the transaction
    tx.commit().await.map_err(|err| {
        error!("{err}");
        AppError {
            kind: ErrorKind::Database,
            message: "We ran into an error completing your registration.",
        }
    })?;

    Ok(user)
}

#[post("/auth/login")]
async fn login_user_handler(
    body: LoginUser,
    app: AppData,
    pool: db::Database,
    sqids: Data<Sqids>,
) -> Result<Token, AppError> {
    let body = body.into_inner().validate()?;
    
    // Fetch user and organization information in a single query
    let user_org_info = sqlx::query!(
        r#"
        SELECT 
            u.id, u.name, u.email, u.password, u.verified, u.user_type, u.org_id, u.ctime, u.mtime,
            o.subscription_level, o.max_graphs, o.max_entities, o.can_export, o.can_share
        FROM users u 
        JOIN organizations o ON u.org_id = o.id 
        WHERE u.email = $1
        "#,
        body.email
    )
    .fetch_optional(pool.as_ref())
    .await
    .map_err(|err| {
        error!("{err}");
        AppError {
            message: "Invalid email or password.",
            kind: ErrorKind::Invalid,
        }
    })?
    .ok_or(AppError {
        message: "We ran into an error authenticating you. Please try again later.",
        kind: ErrorKind::Invalid,
    })?;
    let parsed_hash = PasswordHash::new(&user_org_info.password).map_err(|err| {
        error!("{err}");
        AppError {
            message: "Invalid email or password.",
            kind: ErrorKind::Invalid,
        }
    })?;
    Argon2::default()
        .verify_password(body.password.as_bytes(), &parsed_hash)
        .map_err(|err| {
            error!("{err}");
            AppError {
                message: "Invalid email or password.",
                kind: ErrorKind::Invalid,
            }
        })?;
    let now = Utc::now();
    let iat = now.timestamp() as usize;
    let exp = (now + Duration::from_secs(app.cfg.jwt_maxage * 60)).timestamp() as usize;
    // default maxage of  15s * 60 * 24 = 21600 or 6hour exp for refresh
    let rexp = (now + Duration::from_secs(app.cfg.jwt_maxage * 60 * 24)).timestamp() as usize;
    let token_type = String::from("bearer");
    let sub = sqids.encode(&[user_org_info.id as u64]).map_err(|err| {
        error!("Error encoding sub with sqids: {err}");
        AppError {
            kind: ErrorKind::Critical,
            message: "Invalid login.",
        }
    })?;

    let refresh_claims = RefreshClaims {
        iat,
        sub: sub.clone(),
        exp: rexp,
    };
    let claims = TokenClaims {
        sub,
        exp,
        iat,
        email: user_org_info.email,
        name: user_org_info.name,
        user_type: user_org_info.user_type,
        org_id: user_org_info.org_id,
        org_subscription_level: user_org_info.subscription_level,
        org_max_graphs: user_org_info.max_graphs,
        org_max_entities: user_org_info.max_entities,
        org_can_export: user_org_info.can_export,
        org_can_share: user_org_info.can_share,
        // valid users will always have ctime and mtime
        ctime: user_org_info.ctime.unwrap(),
        mtime: user_org_info.mtime.unwrap(),
    };
    let refresh_token = encode(
        &Header::default(),
        &refresh_claims,
        &EncodingKey::from_secret(app.cfg.jwt_secret.as_ref()),
    )
    .map_err(|err| {
        error!("{err}");
        AppError {
            message: "Invalid login.",
            kind: ErrorKind::Invalid,
        }
    })?;

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(app.cfg.jwt_secret.as_ref()),
    )
    .map(|access_token| Token {
        access_token,
        refresh_token,
        token_type,
    })
    .map_err(|err| {
        error!("{err}");
        AppError {
            message: "Invalid login.",
            kind: ErrorKind::Invalid,
        }
    })
}

#[post("/auth/logout")]
async fn logout_handler(body: LogoutUser, app: AppData) -> impl Responder {
    app.blacklist.insert(body.access_token.to_string(), true);
    app.blacklist.insert(body.refresh_token.to_string(), true);

    Notification {
        message: "You have successfully signed out.",
    }
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

#[post("/auth/refresh")]
async fn refresh_handler(
    req: HttpRequest,
    app: AppData,
    pool: db::Database,
    sqids: Data<Sqids>,
) -> Result<Token, AppError> {
    let refresh_token = get_header_auth(&req).map_err(|_| AppError {
        message: "Missing refresh token",
        kind: ErrorKind::Invalid,
    })?;

    if app.blacklist.contains_key(refresh_token) {
        return Err(AppError {
            message: "Invalid refresh token",
            kind: ErrorKind::Invalid,
        });
    }

    let claims = jsonwebtoken::decode::<RefreshClaims>(
        &refresh_token,
        &DecodingKey::from_secret(app.cfg.jwt_secret.as_ref()),
        &Validation::default(),
    )
    .map_err(|_| AppError {
        message: "Invalid refresh token",
        kind: ErrorKind::Invalid,
    })?
    .claims;

    let user_ids = sqids.decode(&claims.sub);
    if user_ids.is_empty() {
        return Err(AppError {
            message: "Invalid refresh token",
            kind: ErrorKind::Invalid,
        });
    }

    let user_id = user_ids.first().ok_or(AppError {
        message: "Invalid refresh token",
        kind: ErrorKind::Invalid,
    })?;

    // Fetch user and organization information for refresh
    let user_org_info = sqlx::query!(
        r#"
        SELECT 
            u.id, u.name, u.email, u.password, u.verified, u.user_type, u.org_id, u.ctime, u.mtime,
            o.subscription_level, o.max_graphs, o.max_entities, o.can_export, o.can_share
        FROM users u 
        JOIN organizations o ON u.org_id = o.id 
        WHERE u.id = $1
        "#,
        *user_id as i64
    )
    .fetch_optional(pool.as_ref())
    .await
    .map_err(|err| {
        error!("{err}");
        AppError {
            message: "Invalid refresh token",
            kind: ErrorKind::Invalid,
        }
    })?
    .ok_or(AppError {
        message: "Invalid refresh token",
        kind: ErrorKind::Invalid,
    })?;

    let now = Utc::now();
    let iat = now.timestamp() as usize;
    let exp = (now + Duration::from_secs(app.cfg.jwt_maxage * 60)).timestamp() as usize;
    let rexp = (now + Duration::from_secs(app.cfg.jwt_maxage * 60 * 24)).timestamp() as usize;
    let token_type = String::from("bearer");
    let sub = sqids.encode(&[user_org_info.id as u64]).map_err(|err| {
        error!("Error encoding sub with sqids: {err}");
        AppError {
            kind: ErrorKind::Critical,
            message: "Invalid refresh token.",
        }
    })?;

    let refresh_claims = RefreshClaims {
        iat,
        sub: sub.clone(),
        exp: rexp,
    };

    let token_claims = TokenClaims {
        sub,
        exp,
        iat,
        email: user_org_info.email,
        name: user_org_info.name,
        user_type: user_org_info.user_type,
        org_id: user_org_info.org_id,
        org_subscription_level: user_org_info.subscription_level,
        org_max_graphs: user_org_info.max_graphs,
        org_max_entities: user_org_info.max_entities,
        org_can_export: user_org_info.can_export,
        org_can_share: user_org_info.can_share,
        ctime: user_org_info.ctime.unwrap(),
        mtime: user_org_info.mtime.unwrap(),
    };

    let new_refresh_token = encode(
        &Header::default(),
        &refresh_claims,
        &EncodingKey::from_secret(app.cfg.jwt_secret.as_ref()),
    )
    .map_err(|err| {
        error!("{err}");
        AppError {
            message: "Error generating refresh token",
            kind: ErrorKind::Critical,
        }
    })?;

    encode(
        &Header::default(),
        &token_claims,
        &EncodingKey::from_secret(app.cfg.jwt_secret.as_ref()),
    )
    .map(|access_token| Token {
        access_token,
        refresh_token: new_refresh_token,
        token_type,
    })
    .map_err(|err| {
        error!("{err}");
        AppError {
            message: "Error generating access token",
            kind: ErrorKind::Critical,
        }
    })
}
