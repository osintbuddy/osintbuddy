pub mod config;
pub mod db;
pub mod handlers;
pub mod middleware;
pub mod schemas;

use actix_web::web::Data;
use config::AppConfig;
use moka::sync::Cache;
use sqids::Sqids;

pub struct AppState {
    pub blacklist: Cache<String, bool>,
    pub id: Sqids,
    pub cfg: AppConfig,
}

pub type AppData = Data<AppState>;
