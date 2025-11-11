pub mod handlers;
pub mod middleware;
mod projector;
pub mod schemas;

use casdoor_rust_sdk::CasdoorConfig;
// Re-export common database module to preserve existing imports
pub use common::db;

use actix_cors::Cors;
use actix_files::{Files, NamedFile};
use actix_web::http::Method;
use actix_web::middleware::Logger;
use actix_web::web::Data;
use actix_web::{App, HttpServer, http::header, web};

use common::config::AppConfig;
use log::info;
use moka::sync::Cache;
use sqids::Sqids;

use std::io;
use std::time::Duration;

#[derive(Debug)]
pub struct AppState {
    pub blacklist: Cache<String, bool>,
    pub cfg: &'static AppConfig,
    pub casdoor_conf: CasdoorConfig,
}

pub type AppData = Data<AppState>;

async fn spa_index() -> actix_web::Result<NamedFile> {
    Ok(NamedFile::open("./frontend/dist/index.html")?)
}

fn abs_path(path: &str) -> Result<String, Box<dyn std::error::Error>> {
    let absolute_path = std::env::current_dir()?.join(path);
    Ok(absolute_path.to_str().unwrap().to_string())
}

pub async fn run(cfg: &'static AppConfig) -> io::Result<()> {
    // TTL jwt token (invalid/expire/unauthorized) cache
    let pool = common::db::db_pool(Some(0)).await;
    info!(
        "OSIB is listening on: http://{}:{}",
        &cfg.backend_addr, &cfg.backend_port
    );
    // Start projector loop in the background
    {
        let projector_pool = pool.clone();
        actix_web::rt::spawn(async move {
            crate::projector::run(projector_pool).await;
        });
    }

    HttpServer::new(move || {
        let sqids = Sqids::builder()
            .alphabet(cfg.sqids_alphabet.chars().collect())
            .build()
            .map_err(|err| std::io::Error::new(io::ErrorKind::Other, err))
            .expect("Fatal error building Sqids!");
        let app_state = AppState {
            cfg,
            casdoor_conf: CasdoorConfig::from_toml(abs_path(&cfg.casdoor_conf).unwrap().as_str())
                .unwrap(),
            blacklist: Cache::builder()
                .max_capacity(64_000)
                .time_to_live(Duration::from_secs(cfg.jwt_maxage * 60))
                .build(),
        };
        // Set payload limit based on configuration (affects multipart and others)
        let max_mb = cfg.upload_max_inline_mb.unwrap_or(100);
        let max_bytes = (max_mb as usize).saturating_mul(1024 * 1024);
        let app = App::new()
            .wrap(Logger::default())
            .app_data(web::Data::new(app_state))
            .app_data(web::Data::new(sqids))
            .app_data(web::Data::new(pool.to_owned()))
            .app_data(web::PayloadConfig::new(max_bytes))
            // .app_data(web::Data::new())
            .wrap(
                Cors::default()
                    .allowed_origin(&cfg.backend_cors)
                    .allowed_methods(vec!["GET", "POST", "PATCH", "DELETE"])
                    .allowed_headers(vec![
                        header::CONTENT_TYPE,
                        header::AUTHORIZATION,
                        header::ACCEPT,
                    ])
                    .supports_credentials(),
            )
            .configure(handlers::config);
        if let Some(serve_build) = cfg.serve_build
            && serve_build
        {
            return app
                .service(Files::new("/", "./frontend/dist/").index_file("index.html"))
                .default_service(web::route().method(Method::GET).to(spa_index));
        };
        app
    })
    .bind((cfg.backend_addr.as_str(), cfg.backend_port))?
    .run()
    .await
}
