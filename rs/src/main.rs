use std::env;
use std::time::Duration;

use actix_cors::Cors;
use actix_files::Files;
use actix_web::middleware::Logger;
use actix_web::{App, HttpServer, http::header, web};
use env_logger::Env;
use moka::sync::Cache;
use osib::AppState;
use osib::handlers;
use osib::{config::get_config, db::establish_pool_connection};
use sqids::Sqids;
use sqlx::PgPool;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("Starting OSINTBuddy...");
    let cfg = get_config();
    let pool: PgPool = match establish_pool_connection(&cfg.database_url).await {
        Ok(pool) => match sqlx::migrate!().run(&pool).await {
            Ok(_) => pool,
            Err(_) => pool,
        },
        Err(err) => {
            eprintln!("Error establishing db pool connection: {}", err);
            std::process::exit(1)
        }
    };
    let blacklist: Cache<String, bool> = Cache::builder()
        .max_capacity(64_000)
        .time_to_live(Duration::from_secs(cfg.jwt_maxage * 60))
        .build();

    let id = match Sqids::builder()
        .alphabet(cfg.sqids_alphabet.chars().collect())
        .build()
    {
        Ok(id) => id,
        Err(err) => {
            eprintln!("Sqids setup failed: {}", err);
            std::process::exit(1)
        }
    };

    let web_addr = cfg.backend_addr.clone();
    let web_port = cfg.backend_port.clone();
    env_logger::init_from_env(Env::default().default_filter_or("debug"));

    HttpServer::new(move || {
        let logger = Logger::default();
        let app = App::new()
            .wrap(logger)
            .app_data(web::Data::new(AppState {
                cfg: cfg.clone(),
                blacklist: blacklist.clone(),
                id: id.clone(),
            }))
            .app_data(web::Data::new(pool.clone()))
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

        let is_prod = match env::var("ENVIRONMENT") {
            Ok(environment) => environment == "production".to_string(),
            Err(_) => false,
        };

        if is_prod {
            let files_service = actix_files::NamedFile::open("../frontend/build/index.html")
                .map(move |file| {
                    Files::new("/", "../frontend/build/index.html")
                        .index_file("index.html")
                        .default_handler(file)
                })
                .unwrap();
            return app.service(files_service);
        }
        app
    })
    .bind(format!("{}:{}", web_addr, web_port))?
    .run()
    .await
}
