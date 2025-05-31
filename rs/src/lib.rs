pub mod core;
pub mod handlers;
pub mod middleware;
pub mod schemas;

use core::config::OSINTBuddyConfig;
use moka::sync::Cache;
use sqids::Sqids;
use sqlx::PgPool;

pub struct AppState {
    pub blacklist: Cache<String, bool>,
    pub db: PgPool,
    pub id: Sqids,
    pub cfg: OSINTBuddyConfig,
}
