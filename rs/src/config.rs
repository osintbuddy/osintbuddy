use confik::{Configuration, EnvSource};

#[derive(Debug, Configuration, Clone)]
pub struct OSINTBuddyConfig {
    pub debug: bool,
    pub backend_addr: String,
    pub backend_port: u16,
    pub postgres_addr: String,
    pub postgres_user: String,
    pub postgres_db: String,
    pub postgres_port: u16,
    pub backend_cors: String,
    pub jwt_expired_in: String,
    pub jwt_maxage: u16,

    #[confik(secret)]
    pub jwt_secret: String,

    #[confik(secret)]
    pub postgres_password: String,

    #[confik(secret)]
    pub sqids_alphabet: String,
}

impl Default for OSINTBuddyConfig {
    fn default() -> OSINTBuddyConfig {
        OSINTBuddyConfig {
            postgres_user: String::from("postgres"),
            postgres_db: String::from("app"),
            postgres_addr: String::from("127.0.0.1"),
            postgres_password: String::from("password"),
            postgres_port: 55432,
            backend_port: 48997,
            backend_addr: String::from("127.0.0.1"),
            backend_cors: String::from("http://localhost:5173"),
            sqids_alphabet: String::from("RQWMLGFATEYHDSIUKXNCOVZJPB"),
            jwt_expired_in: String::from("60m"),
            jwt_maxage: 60,
            jwt_secret: String::from(
                "03d2394fc289b30660772ea8d444540ff64c066631063d823b41444e1bdef086",
            ),
            debug: true,
        }
    }
}

/// The possible runtime environments for OSINTBuddy.

pub fn get_config() -> OSINTBuddyConfig {
    dotenvy::dotenv().ok();

    OSINTBuddyConfig::builder()
        .override_with(EnvSource::new().allow_secrets())
        .try_build()
        .unwrap_or_else(|err| {
            println!("Using default config! Error loading env: {}", err);
            OSINTBuddyConfig::default()
        })
}
