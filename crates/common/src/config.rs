use confik::{Configuration, EnvSource};
use log::error;
use tokio::sync::OnceCell;

#[derive(Debug, Configuration, Clone)]
pub struct AppConfig {
    pub environment: String,
    pub backend_addr: String,
    pub backend_port: u16,
    pub backend_cors: String,
    pub jwt_maxage: u64,
    pub max_connections: u32,
    #[confik(secret)]
    pub jwt_secret: String,

    #[confik(secret)]
    pub database_url: String,

    #[confik(secret)]
    pub sqids_alphabet: String,
    pub serve_build: Option<bool>,
    pub amqp_url: String,
}

pub static CFG: OnceCell<AppConfig> = OnceCell::const_new();

pub async fn cfg() -> AppConfig {
    dotenvy::dotenv().ok();
    AppConfig::builder()
        .override_with(EnvSource::new().allow_secrets())
        .try_build()
        .unwrap_or_else(|err| {
            let default_cfg = AppConfig {
                amqp_url: String::from("amqp://guest:guest@queue:5672//"),
                max_connections: 16,
                environment: String::from("development"),
                serve_build: Some(false),
                database_url: String::from("postgresql://postgres:password@db:55432/app"),
                backend_port: 48997,
                backend_addr: String::from("localhost"),
                backend_cors: String::from("http://localhost:5173"),
                sqids_alphabet: String::from("RQWMLGFATEYHDSIUKXNCOVZJPB"),
                jwt_maxage: 60,
                jwt_secret: String::from(
                    "03d2394fc289b30660772ea8d444540ff64z066631063d823b41444e1bdef086",
                ),
            };
            error!(
                "No `.env` file found, using default configuration: {:?}\nerror loading env: {}",
                &default_cfg, err
            );
            default_cfg
        })
}

