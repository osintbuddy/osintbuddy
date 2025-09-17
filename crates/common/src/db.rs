use crate::config::{self, CFG};
use actix_web::web::Data;
use futures_util::future::BoxFuture;
use log::{error, info};

use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;
use tokio::sync::OnceCell;

pub type Database = Data<PgPool>;

pub type PoolResult = Result<PgPool, sqlx::Error>;

pub static DB: OnceCell<PoolResult> = OnceCell::const_new();

pub fn db_pool(attempts: Option<i16>) -> BoxFuture<'static, PgPool> {
    Box::pin(async move {
        let cfg = CFG.get_or_init(config::cfg).await;
        // debug!("Connecting to PostgreSQL using URI: {}", &cfg.database_url);
        info!("Attempting PostgreSQL connection.");
        match PgPoolOptions::new()
            .max_connections(128)
            .connect(&cfg.database_url)
            .await
        {
            Ok(pool) => {
                info!("PostgreSQL connection success!");
                pool
            }
            Err(err) => {
                let attempts = attempts.unwrap_or(0);
                error!(
                    "Error connecting to postgres pool, {:?} attempts failed. error: {}:",
                    attempts, err
                );
                return db_pool(Some(attempts + 1)).await;
            }
        }
    })
}
