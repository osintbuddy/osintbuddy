pub mod abac;
pub mod handlers;
pub mod middleware;
pub mod models;
pub mod schemas;
mod projector;

// Re-export common database module to preserve existing imports
pub use common::db as db;

use actix_cors::Cors;
use actix_files::{Files, NamedFile};
use actix_web::http::Method;
use actix_web::middleware::Logger;
use actix_web::web::Data;
use actix_web::{App, HttpServer, http::header, web};

use common::config::AppConfig;
use log::{error, info};
use moka::sync::Cache;
use sqids::Sqids;

use std::io;
use std::time::Duration;

use common::config::CFG;

pub struct AppState {
    pub blacklist: Cache<String, bool>,
    pub cfg: &'static AppConfig,
}

pub type AppData = Data<AppState>;

async fn spa_index() -> actix_web::Result<NamedFile> {
    Ok(NamedFile::open("./frontend/dist/index.html")?)
}

pub async fn run() -> io::Result<()> {
    // TTL jwt token (invalid/expire/unauthorized) cache
    let pool = common::db::db_pool(Some(0)).await;
    let cfg = CFG.get_or_init(common::config::cfg).await;
    info!(
        "OSIB is listening on: http://{}:{}",
        &cfg.backend_port, &cfg.backend_addr
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
            blacklist: Cache::builder()
                .max_capacity(64_000)
                .time_to_live(Duration::from_secs(cfg.jwt_maxage * 60))
                .build(),
        };
        let app = App::new()
            .wrap(Logger::default())
            .app_data(web::Data::new(app_state))
            .app_data(web::Data::new(sqids))
            .app_data(web::Data::new(pool.to_owned()))
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
