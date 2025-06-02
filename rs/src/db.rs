use crate::config::{self, CONFIG};
use actix_web::web::Data;
use sqlx::{PgPool, postgres::PgPoolOptions};
use tokio::sync::OnceCell;

pub type Database = Data<PgPool>;

pub type PoolResult = Result<PgPool, sqlx::Error>;

pub static DB: OnceCell<PoolResult> = OnceCell::const_new();

pub async fn get_pool() -> PoolResult {
    let cfg = CONFIG.get_or_init(config::get).await;
    PgPoolOptions::new()
        .max_connections(128)
        .connect(&cfg.database_url)
        .await
}
