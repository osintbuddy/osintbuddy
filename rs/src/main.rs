use std::time::Duration;

use actix_cors::Cors;
use actix_session::SessionMiddleware;
use actix_session::storage::CookieSessionStore;
use actix_web::cookie::Key;
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
        "Backend listening on: http://{}:{}/api\nFrontend listening on: {}",
        cfg.backend_addr, cfg.backend_port, cfg.backend_cors
    );
    let web_addr = cfg.backend_addr.clone();
    let web_port = cfg.backend_port.clone();
    let token_blacklist: Cache<String, bool> = Cache::builder()
        .max_capacity(64_000)
        .time_to_live(Duration::from_secs(60 * 60))
        .build();
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
            .wrap(SessionMiddleware::new(
                CookieSessionStore::default(),
                Key::generate(),
            ))
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
            .wrap(cors)
            .wrap(Logger::default())
    })
    .bind((web_addr, web_port))?
    .run()
    .await
}
