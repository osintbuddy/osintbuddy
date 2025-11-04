use casdoor_rust_sdk::CasdoorConfig;
use confik::{Configuration, EnvSource};
use log::error;
use tokio::sync::OnceCell;

#[derive(Debug, Configuration, Clone)]
pub struct AppConfig {
    pub environment: String,
    pub log_level: String,
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
    // uploads
    pub upload_max_inline_mb: Option<u64>,

    pub casdoor_conf: String,
}

pub static CFG: OnceCell<AppConfig> = OnceCell::const_new();

pub async fn cfg() -> AppConfig {
    dotenvy::dotenv().ok();

    AppConfig::builder()
        .override_with(EnvSource::new().allow_secrets())
        .try_build()
        .unwrap_or_else(|err| {
            let default_cfg = AppConfig {
                max_connections: 16,
                environment: String::from("development"),
                log_level: String::from("debug"),
                serve_build: Some(false),
                database_url: String::from("postgresql://postgres:password@localhost:55432/app"),
                backend_port: 48997,
                backend_addr: String::from("localhost"),
                backend_cors: String::from("http://localhost:55173"),
                sqids_alphabet: String::from("RQWMLGFATEYHDSIUKXNCOVZJPB"),
                jwt_maxage: 60,
                jwt_secret: String::from(
                    "03d2394fc289b30660772ea8d444540ff64z066631063d823b41444e1bdef086",
                ),
                upload_max_inline_mb: Some(100),
                casdoor_conf: String::from("auth.toml"),
            };
            error!(
                "No `.env` file found, using default configuration: {:?}\nError loading env: {}",
                &default_cfg, err
            );
            default_cfg
        })
}
