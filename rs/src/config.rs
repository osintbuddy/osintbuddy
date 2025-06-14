use confik::{Configuration, EnvSource};
use tokio::sync::OnceCell;

#[derive(Debug, Configuration, Clone)]
pub struct AppConfig {
    pub backend_addr: String,
    pub backend_port: u16,
    pub backend_cors: String,
    pub jwt_maxage: u64,
    #[confik(secret)]
    pub jwt_secret: String,

    #[confik(secret)]
    pub database_url: String,

    #[confik(secret)]
    pub sqids_alphabet: String,
    pub build_dir: Option<String>,
}

pub static CONFIG: OnceCell<AppConfig> = OnceCell::const_new();

pub async fn get() -> AppConfig {
    dotenvy::dotenv().ok();
    AppConfig::builder()
        .override_with(EnvSource::new().allow_secrets())
        .try_build()
        .unwrap_or_else(|err| {
            println!("Using default config! Error loading env: {}", err);
            AppConfig {
                build_dir: None,
                database_url: String::from("postgresql://postgres:password@127.0.0.1:55432/app"),
                backend_port: 48997,
                backend_addr: String::from("127.0.0.1"),
                backend_cors: String::from("http://localhost:5173"),
                sqids_alphabet: String::from("RQWMLGFATEYHDSIUKXNCOVZJPB"),
                jwt_maxage: 60,
                jwt_secret: String::from(
                    "03d2394fc289b30660772ea8d444540ff64z066631063d823b41444e1bdef086",
                ),
            }
        })
}
