use crate::{
    config::{self, CONFIG},
    schemas::errors::{AppError, ErrorKind},
};
use actix_web::web::Data;
use log::error;
use regex::Regex;
use sqlx::Postgres;
use sqlx::Row;
use sqlx::postgres::{PgPoolOptions, PgRow};
use sqlx::{PgConnection, PgPool, Transaction};
use std::string::String;
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
    let re = Regex::new(r"(::vertex|::edge)").unwrap();
    let json_results = objs
        .iter()
        .map(|row| {
            let mut json_objs: Vec<serde_json::Value> = Vec::new();
            for (i, _) in row.columns().iter().enumerate() {
                let value = row.get::<String, _>(i);
                re.replace_all(&value, "");
                let v = serde_json::Value::from(value);
                json_objs.push(v);
            }
            return json_objs;
        })
        .flatten()
        .collect();
    Ok(json_results)
}
