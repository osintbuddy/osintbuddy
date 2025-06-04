use crate::{
    config::{self, CONFIG},
    schemas::errors::{AppError, ErrorKind},
};
use actix_web::web::Data;
use log::{error, info};
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
    // let mut tx = pool.begin().await?;

    // tx.commit().await?;

    // Ok(pool)
}
pub type PgTx = Transaction<'static, Postgres>;
pub type AgeTx = Result<PgTx, AppError>;

pub async fn age_tx(pool: &PgPool) -> AgeTx {
    let tx = pool
        .begin()
        .await
        .map(|mut tx| async {
            let _ = sqlx::query("CREATE EXTENSION IF NOT EXISTS age CASCADE")
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
                message: "ugh",
                kind: ErrorKind::Critical,
            }
        })?
        .await;
    Ok(tx)
}

#[derive(Debug, serde::Deserialize)]
pub struct AgeObject {
    pub id: i64,
    pub label: String,
    pub properties: serde_json::Value,
}

pub async fn age_cypher(
    graph_name: &str,
    tx: &mut PgConnection,
    query: &str,
) -> Result<Vec<AgeObject>, AppError> {
    let objs = sqlx::raw_sql(&format!(
        "SELECT * FROM cypher('{}', $$ \
        {query} \
        $$) as (v agtype);",
        graph_name
    ))
    .fetch_all(tx)
    .await
    .map_err(|err| {
        error!("{err}");
        AppError {
            message: "Age transaction error!",
            kind: ErrorKind::Critical,
        }
    })?;

    let objects = objs.iter().map(|r: &PgRow| {
        let vert = r.get::<String, _>("v");
        let mut age_type = 8;
        if vert.ends_with("::edge") {
            age_type = 6
        }
        info!("{vert}");
        serde_json::from_str::<AgeObject>(&vert[0..&vert.len() - age_type].to_string())
            .expect("Should be able to parse Apache Age object!")
    });
    let mut age_objects: Vec<AgeObject> = Vec::new();
    age_objects.extend(objects);
    // info!("Collecting stats for {graph_name}");
    Ok(age_objects)
}
