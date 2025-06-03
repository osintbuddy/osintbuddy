use crate::{
    db,
    middleware::auth::AuthMiddleware,
    schemas::{
        Paginate,
        errors::{AppError, ErrorKind},
        graphs::{CreateGraph, DeleteGraph, Graph, ListGraphs, UpdateGraph},
    },
};
use actix_web::{
    HttpResponse, Result, delete, get,
    http::StatusCode,
    patch, post,
    web::{Json, Path},
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

#[patch("/graphs/")]
async fn update_graph_handler(
    body: UpdateGraph,
    pool: db::Database,
    auth: AuthMiddleware,
) -> Result<Graph, AppError> {
    sqlx::query_as!(
        Graph,
        "UPDATE graphs SET label = $1, description = $2 WHERE  id = $3 AND owner_id = $4 RETURNING *",
        body.label.to_string(),
        body.description.to_string(),
        body.id,
        auth.account_id
    )
    .fetch_one(pool.as_ref())
    .await
    .map_err(|_err| AppError {
        kind: ErrorKind::Database,
        message: "We ran into an error creating this graph.",
    })
}

#[delete("/graphs/")]
async fn delete_graph_handler(
    body: DeleteGraph,
    pool: db::Database,
    auth: AuthMiddleware,
) -> Result<HttpResponse, AppError> {
    sqlx::query("DELETE FROM graphs WHERE id = $1 AND owner_id = $2 RETURNING *")
        .bind(body.id)
        .bind(auth.account_id)
        .execute(pool.as_ref())
        .await
        .map(|_| HttpResponse::build(StatusCode::OK).finish())
        .map_err(|_err| {
            println!("{}", _err);
            AppError {
                kind: ErrorKind::Database,
                message: "We ran into an error deleting this graph.",
            }
        })
}

#[get("/graphs/")]
async fn list_graph_handler(
    pool: db::Database,
    auth: AuthMiddleware,
    page: Paginate,
) -> Result<ListGraphs, AppError> {
    sqlx::query_as!(
        Graph,
        "SELECT * FROM graphs WHERE owner_id = $1 OFFSET $2 LIMIT $3",
        auth.account_id,
        page.skip,
        page.limit,
    )
    .fetch_all(pool.as_ref())
    .await
    .map(|graphs| Json(graphs))
    .map_err(|_err| AppError {
        kind: ErrorKind::Database,
        message: "We ran into an error listing your graphs.",
    })
}

#[get("/graphs/{id}")]
async fn get_graph_handler(
    pool: db::Database,
    auth: AuthMiddleware,
    graph_id: Path<i64>,
) -> Result<Graph, AppError> {
    sqlx::query_as!(
        Graph,
        "SELECT * FROM graphs WHERE id = $1 AND owner_id = $2",
        graph_id.into_inner(),
        auth.account_id
    )
    .fetch_one(pool.as_ref())
    .await
    .map_err(|_err| AppError {
        kind: ErrorKind::Database,
        message: "We ran into an error creating this graph.",
    })
}
