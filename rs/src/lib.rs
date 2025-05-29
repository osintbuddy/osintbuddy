pub mod config;
pub mod handlers;
pub mod jwt_auth;
pub mod models;
pub mod schemas;

use config::OSINTBuddyConfig;
use sqids::Sqids;
use sqlx::{Postgres, pool::Pool};

pub struct AppState {
    pub db: Pool<Postgres>,
    pub id: Sqids,
    pub cfg: OSINTBuddyConfig,
}
