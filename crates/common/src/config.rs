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

    // worker + firecracker tuning
    pub worker_owner: Option<String>,
    pub worker_lease_seconds: Option<i32>,
    pub worker_batch: Option<i64>,
    pub worker_tick_ms: Option<u64>,
    pub firecracker_bin: Option<String>,
    pub firecracker_vmroot: Option<String>,
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
                serve_build: Some(false),
                database_url: String::from("postgresql://postgres:password@localhost:55432/app"),
                backend_port: 48997,
                backend_addr: String::from("localhost"),
                backend_cors: String::from("http://localhost:5173"),
                sqids_alphabet: String::from("RQWMLGFATEYHDSIUKXNCOVZJPB"),
                jwt_maxage: 60,
                jwt_secret: String::from(
                    "03d2394fc289b30660772ea8d444540ff64z066631063d823b41444e1bdef086",
                ),
                worker_owner: None,
                worker_lease_seconds: Some(300),
                worker_batch: Some(8),
                worker_tick_ms: Some(500),
                firecracker_bin: Some(String::from("/usr/local/bin/firecracker")),
                firecracker_vmroot: Some(String::from("/var/lib/osib/vms")),
            };
            error!(
                "No `.env` file found, using default configuration: {:?}\nerror loading env: {}",
                &default_cfg, err
            );
            default_cfg
        })
}
