use std::env;
use std::time::Duration;

use actix_cors::Cors;
use actix_files::Files;
use actix_web::middleware::Logger;
use actix_web::{App, HttpServer, http::header, web};
use backend::AppState;
use backend::{config::get_config, db::establish_pool_connection, handlers};
use moka::sync::Cache;
use sqids::Sqids;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("Starting OSINTBuddy...");
    let cfg = get_config();

    let pool = match establish_pool_connection(&cfg).await {
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

    println!(
        "Listening on: http://{}:{}/",
        cfg.backend_addr, cfg.backend_port
    );
    let frontend_build_dir = "../frontend/build";
    let web_addr = cfg.backend_addr.clone();
    let web_port = cfg.backend_port.clone();
    let token_blacklist: Cache<String, bool> = Cache::builder()
        .max_capacity(64_000)
        .time_to_live(Duration::from_secs(cfg.jwt_maxage * 60))
        .build();

    HttpServer::new(move || {
        let app = App::new()
            .app_data(web::Data::new(AppState {
                blacklist: token_blacklist.clone(),
                cfg: cfg.clone(),
                db: pool.clone(),
                id: match Sqids::builder()
                    .alphabet(cfg.sqids_alphabet.chars().collect())
                    .build()
                {
                    Ok(id) => id,
                    Err(err) => {
                        eprintln!("Sqids setup failed: {}", err);
                        std::process::exit(1)
                    }
                },
            }))
            .configure(handlers::config)
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
            .wrap(Logger::default());
        match env::var("ENVIRONMENT") {
            Ok(environment) => {
                if environment != "development" {
                    return app.service(
                        Files::new("/", frontend_build_dir)
                            .index_file("index.html")
                            .default_handler(
                                actix_files::NamedFile::open(format!(
                                    "{}/index.html",
                                    frontend_build_dir
                                ))
                                .unwrap(),
                            ),
                    );
                }
                return app;
            }
            Err(_) => {
                return app;
            }
        }
    })
    .bind((web_addr, web_port))?
    .run()
    .await
}
