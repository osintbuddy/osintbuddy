pub mod config;
pub mod db;
pub mod handlers;
pub mod middleware;
pub mod schemas;

// use actix_web::cookie::time::error;
use actix_web::web::Data;
use config::AppConfig;
use moka::sync::Cache;
use sqids::Sqids;
use std::io;
use std::time::Duration;

use actix_cors::Cors;
use actix_files::Files;
use actix_web::middleware::Logger;
use actix_web::{App, HttpServer, http::header, web};
use log::info;

use crate::config::CONFIG;
use crate::db::DB;

pub struct AppState {
    pub blacklist: Cache<String, bool>,
    pub id: Sqids,
    pub cfg: AppConfig,
}

pub type AppData = Data<AppState>;

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

    let blacklist: Cache<String, bool> = Cache::builder()
        .max_capacity(64_000)
        .time_to_live(Duration::from_secs(config.jwt_maxage * 60))
        .build();
    let id = Sqids::builder()
        .alphabet(config.sqids_alphabet.chars().collect())
        .build()
        .map_err(|err| std::io::Error::new(io::ErrorKind::Other, err))?;

    let web_addr = config.backend_addr.clone();
    let web_port = config.backend_port.clone();
    info!("Listening on: http://{web_addr}:{web_port}");

    HttpServer::new(move || {
        let app = App::new()
            .wrap(Logger::default())
            .app_data(web::Data::new(AppState {
                cfg: config.clone(),
                blacklist: blacklist.clone(),
                id: id.clone(),
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
            let default_build = config
                .build_dir
                .clone()
                .unwrap_or("../frontend/build/".to_string());
            return app.service(
                Files::new("/", &default_build)
                    .index_file("index.html")
                    .default_handler(
                        actix_files::NamedFile::open(default_build)
                            .expect("Frontend build dir should be valid!"),
                    ),
            );
        }
        app
    })
    .bind((web_addr, web_port))?
    .run()
    .await
}
