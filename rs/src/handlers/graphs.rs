use actix_web::{Result, post};

use crate::{
    db,
    middleware::auth::AuthMiddleware,
    schemas::{
        errors::{AppError, ErrorKind},
        graphs::{CreateGraph, Graph},
    },
};

#[post("/graphs/")]
async fn create_graph_handler(
    body: CreateGraph,
    pool: db::Database,
    auth: AuthMiddleware,
) -> Result<Graph, AppError> {
    let body = body.into_inner().validate()?;
    sqlx::query_as!(
        Graph,
        "INSERT INTO graphs (label,description,owner_id) VALUES ($1, $2, $3) RETURNING *",
        body.label.to_string(),
        body.description.to_string(),
        auth.account_id
    )
    .fetch_one(pool.as_ref())
    .await
    .map_err(|_err| AppError {
        kind: ErrorKind::Database,
        message: "We ran into an error creating this graph.",
    })
}
