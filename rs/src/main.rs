use std::env;
use std::io::ErrorKind;
use std::time::Duration;

use actix_cors::Cors;
use actix_files::Files;
use actix_web::middleware::Logger;
use actix_web::{App, HttpServer, http::header, web};
use env_logger::Env;
use moka::sync::Cache;
use osib::AppState;
use osib::config::{self, CONFIG};

use osib::db::{self, DB};
use osib::handlers;
use sqids::Sqids;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("Starting OSINTBuddy...");
    let config = CONFIG.get_or_init(config::get).await;
    let pool = DB
        .get_or_init(db::get_pool)
        .await
        .as_ref()
        .map_err(|err| std::io::Error::new(ErrorKind::NotConnected, err))?;

    sqlx::migrate!()
        .run(pool)
        .await
        .map_err(|err| std::io::Error::new(ErrorKind::InvalidData, err))?;

    let blacklist: Cache<String, bool> = Cache::builder()
        .max_capacity(64_000)
        .time_to_live(Duration::from_secs(config.jwt_maxage * 60))
        .build();
    let id = Sqids::builder()
        .alphabet(config.sqids_alphabet.chars().collect())
        .build()
        .map_err(|err| std::io::Error::new(ErrorKind::Other, err))?;

    let web_addr = config.backend_addr.clone();
    let web_port = config.backend_port.clone();
    env_logger::init_from_env(Env::default().default_filter_or("debug"));

    HttpServer::new(move || {
        let logger = Logger::default();
        let app = App::new()
            .wrap(logger)
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

        let is_prod = env::var("ENVIRONMENT")
            .map(|environment| environment == "production".to_string())
            .unwrap_or(false);

        if is_prod {
            let build_dir = "../frontend/build/index.html";
            let ui_service = actix_files::NamedFile::open(build_dir)
                .map(|file| {
                    Files::new("/", build_dir)
                        .index_file("index.html")
                        .default_handler(file)
                })
                .unwrap();
            return app.service(ui_service);
        }
        app
    })
    .bind(format!("{}:{}", web_addr, web_port))?
    .run()
    .await
}
