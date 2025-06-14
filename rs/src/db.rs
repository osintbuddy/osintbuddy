use crate::{
    config::{self, CONFIG},
    schemas::errors::{AppError, ErrorKind},
};
use actix_web::web::Data;
use log::error;
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
    let tx = pool
        .begin()
        .await
        .map(|mut tx| async {
            let _ = sqlx::query("CREATE EXTENSION IF NOT EXISTS age")
                .execute(&mut *tx)
                .await;
            let _ = sqlx::query("LOAD 'age'").execute(&mut *tx).await;
            let _ = sqlx::query("SET search_path = ag_catalog, \"$user\", public")
                .execute(&mut *tx)
                .await;
            tx
        })
        .map_err(|err| {
            log::error!("{err}");
            AppError {
                message: "Error loading Apache Age extension.",
                kind: ErrorKind::Critical,
            }
        })?
        .await;
    Ok(tx)
}

#[derive(Debug, serde::Deserialize)]
pub struct AgeVertex {
    pub id: i64,
    pub label: String,
    pub properties: serde_json::Value,
}

pub struct AgeEdge {
    pub id: i64,
    pub label: String,
    pub properties: serde_json::Value,
    pub start_id: i64,
    pub end_id: i64,
}

// External resources: https://age.apache.org/age-manual/master/intro/types.html#map
// Expected return must include: WITH <age_map> AS return_var
// E.g.
// "query... WITH <age_map> AS <return_var> RETURN <return_var>"
//
// "MATCH (v)-[e] WITH {id: id(e), label: label(e), start_id: start_id(e), end_id: end_id(e)} AS e, v
//  WITH {id: id(v), label: label(v), properties: properties(v)} AS v, e
//  RETURN e, v"
pub async fn with_cypher(
    graph_name: &str,
    tx: &mut PgConnection,
    query: &str,
    query_as: &str,
) -> Result<Vec<serde_json::Value>, AppError> {
    let query_params: Vec<&str> = query_as.split(",").collect();
    let query_cast =
        query_params
            .clone()
            .into_iter()
            .fold(String::new(), |mut acc, cypher_ret_value| {
                let b = format!(
                    "CAST(CAST({} AS VarChar) AS JSON), ",
                    cypher_ret_value.replace("agtype", "").trim()
                )
                .to_string();
                acc.reserve(&b.len() + 1);
                acc.push_str(&b);
                acc
            });
    // Remove trailing comma from SQL CASTs seen above
    let query_cast = query_cast[0..query_cast.len() - 2].to_string();

    let objs: Vec<PgRow> = sqlx::raw_sql(&format!(
        "SELECT {query_cast} FROM cypher('{graph_name}', $$ {query} $$) as ({query_as})"
    ))
    .fetch_all(tx)
    .await
    .map_err(|err| {
        error!("{err}");
        AppError {
            message: "We ran into an OpenCypher select transaction error!",
            kind: ErrorKind::Critical,
        }
    })?;
    let columns = query_params
        .iter()
        .map(|a| a.replace("agtype", "").trim().to_owned());
    let mut age_objects: Vec<serde_json::Value> = Vec::new();
    columns.into_iter().for_each(|col| {
        age_objects.extend(
            objs.iter()
                .map(|row| row.get::<serde_json::Value, _>(col.as_str()))
                .collect::<Vec<serde_json::Value>>(),
        );
    });
    Ok(age_objects)
}
