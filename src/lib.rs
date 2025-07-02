pub mod config;
pub mod db;
pub mod handlers;
pub mod middleware;
pub mod schemas;

// use actix_web::cookie::time::error;
use actix_cors::Cors;
use actix_files::{Files, NamedFile};
use actix_web::http::Method;
use actix_web::middleware::Logger;
use actix_web::web::Data;
use actix_web::{App, HttpServer, http::header, web};
use config::AppConfig;
use log::info;
use moka::sync::Cache;
use sqids::Sqids;
use std::io;
use std::time::Duration;

use crate::config::CONFIG;
use crate::db::DB;
pub struct AppState {
    pub blacklist: Cache<String, bool>,
    pub id: Sqids,
    pub cfg: AppConfig,
}

pub type AppData = Data<AppState>;

async fn spa_index() -> actix_web::Result<NamedFile> {
    info!("handling spa");
    Ok(NamedFile::open("../frontend/dist/index.html".to_string())?)
}

pub async fn run() -> std::io::Result<()> {
    let config = CONFIG.get_or_init(config::get).await;
    let pool = DB
        .get_or_init(db::get_pool)
        .await
        .as_ref()
        .map_err(|err| io::Error::new(io::ErrorKind::NotConnected, err))?;

    sqlx::migrate!("./migrations")
        .run(pool)
        .await
        .map_err(|err| io::Error::new(io::ErrorKind::InvalidData, err))?;

    let web_addr = config.backend_addr.clone();
    let web_port = config.backend_port.clone();
    info!("Listening on: http://{web_addr}:{web_port}");

    HttpServer::new(move || {
        let app = App::new()
            .wrap(Logger::default())
            .app_data(web::Data::new(AppState {
                cfg: config.clone(),
                blacklist: Cache::builder()
                    .max_capacity(64_000)
                    .time_to_live(Duration::from_secs(config.jwt_maxage * 60))
                    .build(),
                id: Sqids::builder()
                    .alphabet(config.sqids_alphabet.chars().collect())
                    .build()
                    .map_err(|err| std::io::Error::new(io::ErrorKind::Other, err))
                    .expect("Fatal error building Sqids!"),
            }))
            .app_data(web::Data::new(pool.clone()))
            .wrap(
                Cors::default()
                    .allowed_origin(&config.backend_cors)
                    .allowed_methods(vec!["GET", "POST", "PATCH", "DELETE"])
                    .allowed_headers(vec![
                        header::CONTENT_TYPE,
                        header::AUTHORIZATION,
                        header::ACCEPT,
                    ])
                    .supports_credentials(),
            )
            .configure(handlers::config);

        if config.build_dir.clone().is_some() {
            let default_build = &config
                .build_dir
                .clone()
                .unwrap_or("../frontend/dist/".to_string());
            return app
                .service(Files::new("/", &default_build).index_file("index.html"))
                .default_service(web::route().method(Method::GET).to(spa_index));
        }
        app
    })
    .bind((web_addr, web_port))?
    .run()
    .await
}
