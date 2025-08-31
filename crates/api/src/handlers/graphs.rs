use crate::{
    middleware::auth::AuthMiddleware,
    schemas::{
        Paginate,
        graphs::{
            CreateGraph, DbGraph, DeleteGraph, FavoriteGraphRequest, Graph, GraphStats,
            ListGraphsResponse, UpdateGraph,
        },
    },
};
use common::db::{self, age_tx, with_cypher};
use common::errors::AppError;
use actix_web::{
    HttpResponse, Result, delete, get,
    http::StatusCode,
    patch, post,
    web::{Data, Path},
};
use log::error;
use sqids::Sqids;
use std::string::String;

#[post("/graphs")]
async fn create_graph_handler(
    body: CreateGraph,
    pool: db::Database,
    auth: AuthMiddleware,
    sqids: Data<Sqids>,
) -> Result<Graph, AppError> {
    let body = body.into_inner().validate()?;
    let graph = sqlx::query_as!(
        DbGraph,
        "INSERT INTO cases (label,description,visibility,owner_id,org_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        body.label.to_string(),
        body.description.to_string(),
        "private",
        auth.account_id,
        auth.org_id
    )
    .fetch_one(pool.as_ref())
    .await
    .map_err(|err| {
        error!("{err}");
        AppError {
            message: "We ran into an error creating this graph.",
        }
    })?;
    let graph_name = graph
        .uuid
        .map(|uuid| format!("g_{}", uuid.as_simple().to_string()))
        .ok_or(AppError {
            message: "We ran into a missing graph id error!",
        })?;
    let mut tx = age_tx(pool.as_ref()).await?;

    sqlx::raw_sql(
        format!("SELECT create_graph('{}')", graph_name)
            .to_string()
            .as_str(),
    )
    .execute(tx.as_mut())
    .await
    .map_err(|err| {
        error!("Error creating age graph: {err}");
        AppError {
            message: "We ran into an error creating your Age graph.",
        }
    })?;

    tx.commit().await.map_err(|err| {
        error!("Error committing age graph transaction: {err}");
        AppError {
            message: "We ran into an error committing the age graph transaction.",
        }
    })?;

    Ok(Graph {
        id: sqids
            .encode(&[graph.id as u64])
            .expect("Error encoding sqids!"),
        label: graph.label,
        description: graph.description,
        mtime: graph.mtime,
        ctime: graph.ctime,
    })
}

#[patch("/graphs")]
async fn update_graph_handler(
    body: UpdateGraph,
    pool: db::Database,
    auth: AuthMiddleware,
    sqids: Data<Sqids>,
) -> Result<Graph, AppError> {
    sqlx::query_as!(
        DbGraph,
        "UPDATE cases SET label = $1, description = $2 WHERE  id = $3 AND owner_id = $4 RETURNING *",
        body.label.to_string(),
        body.description.to_string(),
        body.id,
        auth.account_id
    )
    .fetch_one(pool.as_ref())
    .await
    .map(|g| Graph {
        id: sqids
            .encode(&[g.id as u64])
            .expect("Error encoding sqids!"),
        label: g.label,
        description: g.description,
        mtime: g.mtime,
        ctime: g.ctime
    })
    .map_err(|err| {
        error!("{err}");
        AppError {
        message: "We ran into an error updating this graph.",
    }})
}

#[delete("/graphs")]
async fn delete_graph_handler(
    body: DeleteGraph,
    pool: db::Database,
    auth: AuthMiddleware,
    sqids: Data<Sqids>,
) -> Result<HttpResponse, AppError> {
    // Decode sqid to i64
    let graph_ids = sqids.decode(&body.id);
    let decoded_id = graph_ids.first().ok_or_else(|| {
        error!("Error decoding sqid: {}", body.id);
        AppError {
            message: "Invalid graph ID.",
        }
    })? as &u64;

    sqlx::query("DELETE FROM graphs WHERE id = $1 AND owner_id = $2 RETURNING *")
        .bind(*decoded_id as i64)
        .bind(auth.account_id)
        .execute(pool.as_ref())
        .await
        .map(|_| HttpResponse::build(StatusCode::OK).finish())
        .map_err(|err| {
            error!("{err}");
            AppError {
                message: "We ran into an error deleting this graph.",
            }
        })
}

#[get("/graphs")]
async fn list_graph_handler(
    pool: db::Database,
    auth: AuthMiddleware,
    page: Paginate,
    sqids: Data<Sqids>,
) -> Result<ListGraphsResponse, AppError> {
    let graphs = sqlx::query_as!(
        DbGraph,
        "SELECT * FROM cases WHERE owner_id = $1 OFFSET $2 LIMIT $3",
        auth.account_id,
        page.skip,
        page.limit,
    )
    .fetch_all(pool.as_ref())
    .await
    .map_err(|err| {
        error!("{err}");
        AppError {
            message: "We ran into an error listing your graphs.",
        }
    })?;

    let favorites = sqlx::query_scalar!(
        "SELECT case_id FROM favorite_cases WHERE owner_id = $1",
        auth.account_id
    )
    .fetch_all(pool.as_ref())
    .await
    .map_err(|err| {
        error!("{err}");
        AppError {
            message: "We ran into an error listing your favorite graphs.",
        }
    })?;

    // Convert graph IDs to sqids strings
    let mut graphs_with_sqids: Vec<Graph> = Vec::new();
    for graph in graphs {
        let sqid = sqids.encode(&[graph.id as u64]).map_err(|err| {
            error!("Error encoding sqid: {err}");
            AppError {
                message: "We ran into an error encoding graph ID.",
            }
        })?;
        graphs_with_sqids.push(Graph {
            id: sqid,
            label: graph.label,
            description: graph.description,
            ctime: graph.ctime,
            mtime: graph.mtime,
        });
    }

    // Convert favorite IDs to sqids strings
    let mut graph_favorites = Vec::new();
    for favorite_id in favorites {
        let sqid = sqids.encode(&[favorite_id as u64]).map_err(|err| {
            error!("Error encoding favorite sqid: {err}");
            AppError {
                message: "We ran into an error encoding favorite ID.",
            }
        })?;
        graph_favorites.push(sqid);
    }

    Ok(ListGraphsResponse {
        graphs: graphs_with_sqids,
        favorites: graph_favorites,
    })
}

#[get("/graphs/{id}")]
async fn get_graph_handler(
    pool: db::Database,
    auth: AuthMiddleware,
    graph_id: Path<String>,
    sqids: Data<Sqids>,
) -> Result<GraphStats, AppError> {
    let graph_ids = sqids.decode(&graph_id);
    let decoded_id = graph_ids.first().ok_or_else(|| {
        error!("Error decoding sqid: {}", graph_id);
        AppError {
            message: "Invalid graph ID.",
        }
    })? as &u64;

    let graph = sqlx::query_as!(
        DbGraph,
        "SELECT * FROM cases WHERE id = $1 AND owner_id = $2",
        *decoded_id as i64,
        auth.account_id
    )
    .fetch_one(pool.as_ref())
    .await
    .map_err(|err| {
        error!("{err}");
        AppError {
            message: "We ran into an error getting this graph.",
        }
    })?;

    let graph_name: String = graph
        .uuid
        .map(|uuid| format!("g_{}", uuid.as_simple().to_string()))
        .ok_or(AppError {
            message: "We ran into a missing graph id error!",
        })?;
    let mut tx = age_tx(pool.as_ref()).await?;
    let vertices = with_cypher(
        format!(
            "SELECT * FROM cypher('{}', $$ MATCH (v) RETURN v $$) as (v agtype)",
            graph_name
        ),
        tx.as_mut(),
    )
    .await?;
    let edges = with_cypher(
        format!(
            "SELECT * FROM cypher('{}', $$ MATCH (v)-[e]->() RETURN e $$) as (e agtype)",
            graph_name
        ),
        tx.as_mut(),
    )
    .await?;
    let second_degrees = with_cypher(
        format!(
            "SELECT * FROM cypher('{}', $$ MATCH ()-[]->(a)-[]->(v) RETURN v $$) as (v agtype)",
            graph_name
        ),
        tx.as_mut(),
    )
    .await?;
    tx.commit().await.map_err(|err| {
        error!("{err}");
        AppError {
            message: "We ran into an error commiting the age transaction!",
        }
    })?;

    Ok(GraphStats {
        graph: Graph {
            id: graph_id.to_string(),
            label: graph.label,
            description: graph.description,
            ctime: graph.ctime,
            mtime: graph.mtime,
        },
        vertices_count: vertices.len(),
        edges_count: edges.len(),
        second_degrees: second_degrees.len(),
    })
}

#[post("/graphs/favorite")]
async fn favorite_graph_handler(
    body: FavoriteGraphRequest,
    pool: db::Database,
    auth: AuthMiddleware,
    sqids: Data<Sqids>,
) -> Result<HttpResponse, AppError> {
    // Decode sqid to i64
    let graph_ids = sqids.decode(&body.graph_id);
    let graph_id = graph_ids.first().ok_or_else(|| {
        error!("Error decoding sqid: {}", body.graph_id);
        AppError {
            message: "Invalid graph ID.",
        }
    })? as &u64;

    let graph = sqlx::query_as!(
        DbGraph,
        "SELECT * FROM cases WHERE id = $1 AND owner_id = $2",
        *graph_id as i64,
        auth.account_id
    )
    .fetch_one(pool.as_ref())
    .await
    .map_err(|err| {
        error!("{err}");
        AppError {
            message: "We ran into an error getting this graph.",
        }
    })?;

    if body.is_favorite {
        // Add to favorites
        sqlx::query!(
            "INSERT INTO favorite_cases (owner_id, case_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            auth.account_id,
            *graph_id as i64
        )
        .execute(pool.as_ref())
        .await
        .map(|_| HttpResponse::Ok().json(graph))
        .map_err(|err| {
            error!("{err}");
            AppError {
                message: "We ran into an error favoriting this graph.",
            }
        })
    } else {
        // Remove from favorites
        sqlx::query!(
            "DELETE FROM favorite_cases WHERE owner_id = $1 AND case_id = $2",
            auth.account_id,
            *graph_id as i64
        )
        .execute(pool.as_ref())
        .await
        .map(|_| HttpResponse::Ok().json(graph))
        .map_err(|err| {
            error!("{err}");
            AppError {
                message: "We ran into an error unfavoriting this graph.",
            }
        })
    }
}
