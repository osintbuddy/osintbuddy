use crate::{
    db,
    middleware::auth::AuthMiddleware,
    schemas::{
        Paginate,
        entities::{
            CreateEntity, DbEntity, DeleteEntity, FavoriteEntityRequest, ListEntitiesResponse,
            UpdateEntity,
        },
        errors::{AppError, ErrorKind},
    },
};
use log::error;
use sqids::Sqids;

use actix_web::{
    HttpResponse, Result, delete, get,
    http::StatusCode,
    patch, post,
    web::{Data, Path},
};

#[post("/entities/")]
async fn create_entity_handler(
    body: CreateEntity,
    pool: db::Database,
    auth: AuthMiddleware,
) -> Result<DbEntity, AppError> {
    let body = body.into_inner().validate()?;
    sqlx::query_as!(
        DbEntity,
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
) -> Result<DbEntity, AppError> {
    sqlx::query_as!(
      DbEntity,
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
    sqlx::query("DELETE FROM entities WHERE id = $1 AND owner_id = $2 RETURNING *")
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
    sqids: Data<Sqids>,
) -> Result<ListEntitiesResponse, AppError> {
    let entities = sqlx::query_as!(
        DbEntity,
        "SELECT * FROM entities WHERE owner_id = $1 OFFSET $2 LIMIT $3",
        auth.account_id,
        page.skip,
        page.limit,
    )
    .fetch_all(pool.as_ref())
    .await
    .map_err(|err| {
        error!("{err}");
        AppError {
            kind: ErrorKind::Database,
            message: "We ran into an error listing your entities.",
        }
    })?;

    let favorites = sqlx::query_scalar!(
        "SELECT entity_id FROM favorite_entities WHERE owner_id = $1",
        auth.account_id
    )
    .fetch_all(pool.as_ref())
    .await
    .map_err(|err| {
        error!("{err}");
        AppError {
            kind: ErrorKind::Database,
            message: "We ran into an error listing your favorite entities.",
        }
    })?;

    // Convert favorite IDs to sqids strings
    let mut entity_favorites = Vec::new();
    for favorite_id in favorites {
        let sqid = sqids.encode(&[favorite_id as u64]).map_err(|err| {
            error!("Error encoding favorite sqid: {err}");
            AppError {
                kind: ErrorKind::Critical,
                message: "We ran into an error encoding favorite ID.",
            }
        })?;
        entity_favorites.push(sqid);
    }

    // Convert entity IDs to sqids strings
    let mut entities_with_sqids: Vec<crate::schemas::entities::EntityWithSqid> = Vec::new();
    for entity in entities {
        let sqid = sqids.encode(&[entity.id as u64]).map_err(|err| {
            error!("Error encoding entity sqid: {err}");
            AppError {
                kind: ErrorKind::Critical,
                message: "We ran into an error encoding entity ID.",
            }
        })?;
        entities_with_sqids.push(crate::schemas::entities::EntityWithSqid {
            id: sqid,
            label: entity.label,
            description: entity.description,
            author: entity.author,
            source: entity.source,
            ctime: entity.ctime,
            mtime: entity.mtime,
        });
    }

    Ok(ListEntitiesResponse {
        entities: entities_with_sqids,
        favorites: entity_favorites,
    })
}

#[get("/entities/{id}")]
async fn get_entity_handler(
    pool: db::Database,
    auth: AuthMiddleware,
    entity_id: Path<String>,
    sqids: Data<Sqids>,
) -> Result<DbEntity, AppError> {
    // Decode sqid to i64
    let entity_ids = sqids.decode(&entity_id);
    let decoded_id = entity_ids.first().ok_or_else(|| {
        error!("Error decoding sqid: {}", entity_id);
        AppError {
            kind: ErrorKind::Invalid,
            message: "Invalid entity ID.",
        }
    })? as &u64;

    sqlx::query_as!(
        DbEntity,
        "SELECT * FROM entities WHERE id = $1 AND owner_id = $2",
        *decoded_id as i64,
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

#[post("/entities/favorite")]
async fn favorite_entity_handler(
    body: FavoriteEntityRequest,
    pool: db::Database,
    auth: AuthMiddleware,
    sqids: Data<Sqids>,
) -> Result<HttpResponse, AppError> {
    // Decode sqid to i64
    let entity_ids = sqids.decode(&body.entity_id);
    let entity_id = entity_ids.first().ok_or_else(|| {
        error!("Error decoding sqid: {}", body.entity_id);
        AppError {
            kind: ErrorKind::Invalid,
            message: "Invalid entity ID.",
        }
    })? as &u64;

    let entity = sqlx::query_as!(
        DbEntity,
        "SELECT * FROM entities WHERE id = $1 AND owner_id = $2",
        *entity_id as i64,
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
    })?;

    if body.is_favorite {
        // Add to favorites
        sqlx::query!(
            "INSERT INTO favorite_entities (owner_id, entity_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            auth.account_id,
            *entity_id as i64
        )
        .execute(pool.as_ref())
        .await
        .map(|_| HttpResponse::Ok().json(entity))
        .map_err(|err| {
            error!("{err}");
            AppError {
                kind: ErrorKind::Database,
                message: "We ran into an error favoriting this entity.",
            }
        })
    } else {
        // Remove from favorites
        sqlx::query!(
            "DELETE FROM favorite_entities WHERE owner_id = $1 AND entity_id = $2",
            auth.account_id,
            *entity_id as i64
        )
        .execute(pool.as_ref())
        .await
        .map(|_| HttpResponse::Ok().json(entity))
        .map_err(|err| {
            error!("{err}");
            AppError {
                kind: ErrorKind::Database,
                message: "We ran into an error unfavoriting this entity.",
            }
        })
    }
}
