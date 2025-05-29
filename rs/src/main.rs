use actix_cors::Cors;
use actix_web::middleware::Logger;
use actix_web::{App, HttpServer, http::header, web};
use backend::AppState;
use backend::{config::get_config, handlers};
use sqids::Sqids;
use sqlx::postgres::PgPoolOptions;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("Starting OSINTBuddy...");
    let cfg = get_config();

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
            println!("Database connection success!");
            pool
        }
        Err(err) => {
            println!("{} connection failed: {:?}", postgresql_dsn, err);
            std::process::exit(1);
        }
    };

    match sqlx::migrate!().run(&pool).await {
        Ok(_) => println!("Database migration success!"),
        Err(error) => println!("migration failed: {}", error),
    };

    println!(
        "Backend listening on: http://{}:{}/api\nFrontend listening on: {}",
        cfg.backend_addr, cfg.backend_port, cfg.backend_cors
    );
    let web_addr = cfg.backend_addr.clone();
    let web_port = cfg.backend_port.clone();

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
                cfg: cfg.clone(),
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
    .bind((web_addr, web_port))?
    .run()
    .await
}
