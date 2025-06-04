use crate::{
    db,
    middleware::auth::AuthMiddleware,
    schemas::{
        Paginate,
        entities::{CreateEntity, DeleteEntity, Entity, ListEntities, UpdateEntity},
        errors::{AppError, ErrorKind},
    },
};
use log::error;

use actix_web::{
    HttpResponse, Result, delete, get,
    http::StatusCode,
    patch, post,
    web::{Json, Path},
};

#[post("/entities/")]
async fn create_entity_handler(
    body: CreateEntity,
    pool: db::Database,
    auth: AuthMiddleware,
) -> Result<Entity, AppError> {
    let body = body.into_inner().validate()?;
    sqlx::query_as!(
        Entity,
        "INSERT INTO entities (label,description,author,source,owner_id) VALUES ($1, $2, $3,$4,$5) RETURNING *",
        body.label.to_string(),
        body.description.to_string(),
        body.author.to_string(),
        body.source.to_string(),
        auth.account_id
    )
    .fetch_one(pool.as_ref())
    .await
    .map_err(|err| {
        error!("{err}");
        AppError {
            kind: ErrorKind::Database,
            message: "We ran into an error creating this entity.",
        }
    })
}

#[patch("/entities/")]
async fn update_entity_handler(
    body: UpdateEntity,
    pool: db::Database,
    auth: AuthMiddleware,
) -> Result<Entity, AppError> {
    sqlx::query_as!(
      Entity,
      "UPDATE entities SET label = $1, description = $2, author = $3, source = $4 WHERE  id = $5 AND owner_id = $6 RETURNING *",
      body.label.to_string(),
      body.description.to_string(),
      body.author.to_string(),
      body.source.to_string(),
      body.id,
      auth.account_id
  )
  .fetch_one(pool.as_ref())
  .await
  .map_err(|err| {
    error!("{err}");
    AppError {
      kind: ErrorKind::Database,
      message: "We ran into an error updating this entity.",
  }})
}

#[delete("/entities/")]
async fn delete_entity_handler(
    body: DeleteEntity,
    pool: db::Database,
    auth: AuthMiddleware,
) -> Result<HttpResponse, AppError> {
    sqlx::query("DELETE FROM graphs WHERE id = $1 AND owner_id = $2 RETURNING *")
        .bind(body.id)
        .bind(auth.account_id)
        .execute(pool.as_ref())
        .await
        .map(|_| HttpResponse::build(StatusCode::OK).finish())
        .map_err(|err| {
            error!("{err}");
            AppError {
                kind: ErrorKind::Database,
                message: "We ran into an error deleting this entity.",
            }
        })
}

#[get("/entities/")]
async fn list_entities_handler(
    pool: db::Database,
    auth: AuthMiddleware,
    page: Paginate,
) -> Result<ListEntities, AppError> {
    sqlx::query_as!(
        Entity,
        "SELECT * FROM entities WHERE owner_id = $1 OFFSET $2 LIMIT $3",
        auth.account_id,
        page.skip,
        page.limit,
    )
    .fetch_all(pool.as_ref())
    .await
    .map(|entities| Json(entities))
    .map_err(|err| {
        error!("{err}");
        AppError {
            kind: ErrorKind::Database,
            message: "We ran into an error listing your entities.",
        }
    })
}

#[get("/entities/{id}")]
async fn get_entity_handler(
    pool: db::Database,
    auth: AuthMiddleware,
    entity_id: Path<i64>,
) -> Result<Entity, AppError> {
    sqlx::query_as!(
        Entity,
        "SELECT * FROM entities WHERE id = $1 AND owner_id = $2",
        entity_id.into_inner(),
        auth.account_id
    )
    .fetch_one(pool.as_ref())
    .await
    .map_err(|err| {
        error!("{err}");
        AppError {
            kind: ErrorKind::Database,
            message: "We ran into an error getting this entity.",
        }
    })
}
