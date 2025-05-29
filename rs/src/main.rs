use actix_cors::Cors;
use actix_web::middleware::Logger;
use actix_web::{App, HttpServer, http::header, web};
use confik::{Configuration as _, EnvSource};
use dotenvy;
use sqids::Sqids;
use sqlx::{Postgres, pool::Pool, postgres::PgPoolOptions};

use crate::config::OSINTBuddyConfig;

mod config;
mod handlers;
mod schemas;

pub struct AppState {
    db: Pool<Postgres>,
    id: Sqids,
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("Starting OSINTBuddy...");
    dotenvy::dotenv().ok();
    let cfg = OSINTBuddyConfig::builder()
        .override_with(EnvSource::new().allow_secrets())
        .try_build()
        .unwrap_or_else(|err| {
            println!("Using default config! Error loading env: {}", err);
            OSINTBuddyConfig::default()
        });

    let postgresql_dsn = format!(
        "postgresql://{}:{}@{}:{}/{}",
        cfg.postgres_user,
        cfg.postgres_password,
        cfg.postgres_addr,
        cfg.postgres_port,
        cfg.postgres_db
    );
    let pool = match PgPoolOptions::new()
        .max_connections(64)
        .connect(&postgresql_dsn)
        .await
    {
        Ok(pool) => {
            println!("Connected to the database!");
            pool
        }
        Err(err) => {
            println!("Failed to connect to {}: {:?}", postgresql_dsn, err);
            std::process::exit(1);
        }
    };

    println!(
        "backend: http://{}:{}/api\nfrontend: {}",
        cfg.backend_addr, cfg.backend_port, cfg.backend_cors
    );
    HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin(&cfg.backend_cors)
            .allowed_methods(vec!["GET", "POST", "PATCH", "DELETE"])
            .allowed_headers(vec![
                header::CONTENT_TYPE,
                header::AUTHORIZATION,
                header::ACCEPT,
            ])
            .supports_credentials();
        App::new()
            .app_data(web::Data::new(AppState {
                db: pool.clone(),
                id: Sqids::builder()
                    .alphabet(cfg.sqids_alphabet.chars().collect())
                    .build()
                    .unwrap(),
            }))
            .configure(handlers::config)
            .wrap(cors)
            .wrap(Logger::default())
    })
    .bind((cfg.backend_addr, cfg.backend_port))?
    .run()
    .await
}
