pub mod config;
pub mod db;
pub mod handlers;
pub mod jwt_auth;
pub mod models;
pub mod utils;

use config::OSINTBuddyConfig;
use moka::sync::Cache;
use sqids::Sqids;
use sqlx::PgPool;

pub struct AppState {
    pub blacklist: Cache<String, bool>,
    pub db: PgPool,
    pub id: Sqids,
    pub cfg: OSINTBuddyConfig,
}
