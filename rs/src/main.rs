use std::env;
use std::time::Duration;

use actix_cors::Cors;
use actix_files::Files;
use actix_web::middleware::Logger;
use actix_web::{App, HttpServer, http::header, web};
use backend::AppState;
use backend::core::{config::get_config, db::establish_pool_connection};
use backend::handlers;
use env_logger::Env;
use moka::sync::Cache;
use sqids::Sqids;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("Starting OSINTBuddy...");
    let cfg = get_config();
    let db = match establish_pool_connection(&cfg.database_url).await {
        Ok(pool) => match sqlx::migrate!().run(&pool).await {
            Ok(_) => pool,
            Err(err) => {
                eprintln!("Error running migrate: {}", err);
                pool
            }
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
                db: db.clone(),
                blacklist: blacklist.clone(),
                id: id.clone(),
            }))
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
            Ok(environment) => {
                if environment != "development".to_string() {
                    true
                } else {
                    false
                }
            }
            Err(_) => false,
        };
        if is_prod {
            let frontend_build_dir = "../frontend/build";
            return app.service(
                Files::new("/", frontend_build_dir)
                    .index_file("index.html")
                    .default_handler(
                        actix_files::NamedFile::open(format!("{}/index.html", frontend_build_dir))
                            .unwrap(),
                    ),
            );
        }
        app
    })
    .bind((web_addr, web_port))?
    .run()
    .await
}
