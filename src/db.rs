use crate::{
    config::{self, CFG},
    schemas::errors::{AppError, ErrorKind},
};
use actix_web::{cookie::time::error, web::Data};
use futures_util::{future::BoxFuture, io};
use log::error;
use regex::Regex;
use sqlx::Postgres;
use sqlx::Row;
use sqlx::postgres::{PgPoolOptions, PgRow};
use sqlx::{PgConnection, PgPool, Transaction};
use std::{str::FromStr, string::String};
use tokio::sync::OnceCell;

pub type Database = Data<PgPool>;

pub type PoolResult = Result<PgPool, sqlx::Error>;

pub static DB: OnceCell<PoolResult> = OnceCell::const_new();

pub fn db_pool(attempts: Option<i16>) -> BoxFuture<'static, PgPool> {
    Box::pin(async move {
        let cfg = CFG.get_or_init(config::cfg).await;
        match PgPoolOptions::new()
            .max_connections(128)
            .connect(&cfg.database_url)
            .await
        {
            Ok(pool) => {
                // Run migrations
                if let Err(e) = sqlx::migrate!("./migrations").run(&pool).await {
                    error!("Migration failed: {}", e);
                }
                pool
            }
            Err(err) => {
                let attempts = attempts.unwrap_or(0);
                error!(
                    "Error connecting to pool, {:?} attempts failed. error: {}:",
                    attempts, err
                );
                return db_pool(Some(attempts + 1)).await;
            }
        }
    })
}
// #151345 -> #101c43

pub type PgTx = Transaction<'static, Postgres>;
pub type AgeTx = Result<PgTx, AppError>;

pub async fn age_tx(pool: &PgPool) -> AgeTx {
    let mut tx = pool.begin().await.map_err(|err| {
        log::error!("{err}");
        AppError {
            message: "Error loading Apache Age extension.",
            kind: ErrorKind::Critical,
        }
    })?;
    let _ = sqlx::raw_sql("CREATE EXTENSION IF NOT EXISTS age;")
        .execute(&mut *tx)
        .await;
    let _ = sqlx::raw_sql("LOAD 'age';").execute(&mut *tx).await;
    let _ = sqlx::raw_sql("SET search_path = ag_catalog, \"$user\", public;")
        .execute(&mut *tx)
        .await;
    Ok(tx)
}

// External resources: https://age.apache.org/age-manual/master/intro/types.html#map
// Expected return must include: serde_json::Value
pub async fn with_cypher(
    query: String,
    tx: &mut PgConnection,
) -> Result<Vec<serde_json::Value>, AppError> {
    let objs: Vec<PgRow> = sqlx::raw_sql(query.as_str())
        .fetch_all(tx)
        .await
        .map_err(|err| {
            error!("{err}");
            AppError {
                message: "We ran into a cypher transaction error!",
                kind: ErrorKind::Critical,
            }
        })?;
    let re = Regex::new(r"(::vertex)|(::edge)").unwrap();
    let json_results: Vec<serde_json::Value> = objs
        .iter()
        .map(|row| {
            let mut json_objs: Vec<serde_json::Value> = Vec::new();
            for (i, _) in row.columns().iter().enumerate() {
                // Try different ways to extract the agtype value safely
                let value = match row.try_get::<String, _>(i) {
                    Ok(val) => val,
                    Err(_) => {
                        // If String fails, try &str
                        match row.try_get::<&str, _>(i) {
                            Ok(val) => val.to_string(),
                            Err(e) => {
                                error!("Failed to extract value at column {}: {}", i, e);
                                continue;
                            }
                        }
                    }
                };

                let result = re.replace_all(&value, "").to_string();
                match serde_json::Value::from_str(result.as_str()) {
                    Ok(v) => json_objs.push(v),
                    Err(e) => {
                        error!("Error parsing Age string '{}': {}", result, e);
                        // Continue processing other columns instead of panicking
                        continue;
                    }
                }
            }
            return json_objs;
        })
        .flatten()
        .collect();
    Ok(json_results)
}
