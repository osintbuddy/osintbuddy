pub mod config;
pub mod db;
pub mod handlers;
pub mod middleware;
pub mod schemas;
pub mod utils;

use config::OSINTBuddyConfig;
use moka::sync::Cache;
use sqids::Sqids;

pub struct AppState {
    pub blacklist: Cache<String, bool>,
    pub id: Sqids,
    pub cfg: OSINTBuddyConfig,
}
