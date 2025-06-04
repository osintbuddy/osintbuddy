use crate::config::{self, CONFIG};
use actix_web::web::Data;
use sqlx::{PgPool, postgres::PgPoolOptions};
use tokio::sync::OnceCell;

pub type Database = Data<PgPool>;

pub type PoolResult = Result<PgPool, sqlx::Error>;

pub static DB: OnceCell<PoolResult> = OnceCell::const_new();

pub async fn get_pool() -> PoolResult {
    let cfg = CONFIG.get_or_init(config::get).await;
    let pool = PgPoolOptions::new()
        .max_connections(128)
        .connect(&cfg.database_url)
        .await?;
    let _ = sqlx::query("CREATE EXTENSION age").execute(&pool).await;
    sqlx::query("LOAD 'age'").execute(&pool).await?;
    sqlx::query("SET search_path = ag_catalog, \"$user\", public")
        .execute(&pool)
        .await?;
    Ok(pool)
}
