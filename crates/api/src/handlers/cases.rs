use crate::schemas::{Paginate, graphs::DbCase};
use crate::{
    middleware::auth::AuthMiddleware,
    schemas::graphs::{
        CreateGraph, DeleteGraph, FavoriteGraphRequest, Graph, GraphStats, ListGraphsResponse,
        UpdateGraph,
    },
};
use actix_web::web::{Data, Path, Query};
use actix_web::{HttpResponse, Result, delete, get, http::StatusCode, patch, post};
use chrono::{DateTime, Duration as ChronoDuration, Utc};
use common::db;
use common::errors::AppError;
use common::utils::to_snake_case;
use log::error;
use serde::Deserialize;
use serde::Serialize;
use serde_json::Value as JsonValue;
use sqids::Sqids;
use std::collections::{HashMap, HashSet};
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
        DbCase,
        "INSERT INTO cases (label,description,owner_id,org) VALUES ($1, $2, $3, $4) RETURNING *",
        body.label.to_string(),
        body.description.to_string(),
        auth.user.id,
        auth.user.owner
    )
    .fetch_one(pool.as_ref())
    .await
    .map_err(|err| {
        error!("{err}");
        AppError {
            message: "We ran into an error creating this graph.",
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
    // Decode sqid to i64
    let graph_ids = sqids.decode(&body.id);
    let decoded_id = graph_ids.first().ok_or_else(|| {
        error!("Error decoding sqid: {}", body.id);
        AppError {
            message: "Invalid graph ID.",
        }
    })? as &u64;

    sqlx::query_as!(
        DbCase,
        "UPDATE cases SET label = $1, description = $2 WHERE  id = $3 AND owner_id = $4 RETURNING *",
        body.label.to_string(),
        body.description.to_string(),
        *decoded_id as i64,
        auth.user.id
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
        }
    })
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
        .bind(auth.user.id)
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
        DbCase,
        "SELECT * FROM cases WHERE owner_id = $1 OFFSET $2 LIMIT $3",
        auth.user.id,
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
        auth.user.id
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
async fn get_case_handler(
    pool: db::Database,
    auth: AuthMiddleware,
    graph_id: Path<String>,
    sqids: Data<Sqids>,
) -> Result<GraphStats, AppError> {
    let sqids_id = sqids.decode(&graph_id);
    let Some(decoded_id) = sqids_id.first() else {
        return Err(AppError {
            message: "Missing graph id",
        });
    };

    let graph = sqlx::query_as!(
        DbCase,
        "SELECT * FROM cases WHERE id = $1 AND owner_id = $2",
        *decoded_id as i64,
        auth.user.id
    )
    .fetch_one(pool.as_ref())
    .await
    .map_err(|err| {
        error!("{err}");
        AppError {
            message: "We ran into an error getting this graph.",
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
        // TODO: implement projection for these basic case stats
        vertices_count: 0,
        edges_count: 0,
        second_degrees: 0,
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
        DbCase,
        "SELECT * FROM cases WHERE id = $1 AND owner_id = $2",
        *graph_id as i64,
        auth.user.id
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
            auth.user.id,
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
            auth.user.id,
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

#[derive(Debug, Serialize)]
struct CaseActivityItem {
    seq: i64,
    category: String,
    event_type: String,
    payload: JsonValue,
    version: i32,
    valid_from: DateTime<Utc>,
    valid_to: Option<DateTime<Utc>>,
    recorded_at: DateTime<Utc>,
    actor_id: String,
    actor_name: Option<String>,
}

#[derive(Debug, Serialize)]
struct CaseActivityPage {
    events: Vec<CaseActivityItem>,
}

#[get("/cases/{id}/activity")]
pub async fn list_case_activity_handler(
    pool: db::Database,
    auth: AuthMiddleware,
    graph_id: Path<String>,
    page: Paginate,
    sqids: Data<Sqids>,
) -> Result<HttpResponse, AppError> {
    // Decode sqid to internal numeric id
    let ids = sqids.decode(&graph_id);
    let decoded_id = ids.first().ok_or(AppError {
        message: "Invalid graph ID.",
    })?;
    let decoded_id = *decoded_id as i64;

    // Resolve and authorize graph UUID
    let graph = sqlx::query_as!(
        DbCase,
        "SELECT * FROM cases WHERE id = $1 AND owner_id = $2",
        decoded_id,
        auth.user.id
    )
    .fetch_one(pool.as_ref())
    .await
    .map_err(|_| AppError {
        message: "We ran into an error getting this case.",
    })?;

    let Some(graph_uuid) = graph.uuid else {
        return Err(AppError {
            message: "Case has no UUID.",
        });
    };

    // Fetch events across all categories for this graph's stream key
    // ordered newest-first with pagination
    let rows = sqlx::query!(
        r#"
        WITH s AS (
            SELECT stream_id, category
              FROM event_streams
             WHERE key = $1
        )
        SELECT e.seq,
               s.category,
               e.event_type,
               e.payload,
               e.version,
               e.valid_from,
               e.valid_to,
               e.recorded_at,
               e.actor_id,
               u.name as actor_name
          FROM events e
          JOIN s ON e.stream_id = s.stream_id
          LEFT JOIN "user" u ON u.id::uuid = e.actor_id
         ORDER BY e.seq DESC
         OFFSET $2
         LIMIT $3
        "#,
        // notice the actor_id::uuid cast? yeah...
        // TODO: Make a default system user named OSIB for system based events
        graph_uuid.to_string(),
        page.skip,
        page.limit,
    )
    .fetch_all(pool.as_ref())
    .await
    .map_err(|err| {
        error!("{}", err);
        AppError {
            message: "We ran into an error listing case activity.",
        }
    })?;

    let events: Vec<CaseActivityItem> = rows
        .into_iter()
        .map(|r| CaseActivityItem {
            seq: r.seq,
            category: r.category,
            event_type: r.event_type,
            payload: r.payload,
            version: r.version,
            valid_from: r.valid_from,
            valid_to: r.valid_to,
            recorded_at: r.recorded_at,
            actor_id: r.actor_id.into(),
            actor_name: Some(r.actor_name),
        })
        .collect();

    Ok(HttpResponse::Ok().json(CaseActivityPage { events }))
}

#[derive(Debug, Serialize)]
struct CaseStatsResponse {
    entities_count: i64,
    edges_count: i64,
    events_count: i64,
}

#[get("/cases/{id}/stats")]
pub async fn get_case_stats_handler(
    pool: db::Database,
    auth: AuthMiddleware,
    graph_id: Path<String>,
    sqids: Data<Sqids>,
) -> Result<HttpResponse, AppError> {
    // Decode sqid to id and authorize
    let ids = sqids.decode(&graph_id);
    let decoded_id = ids.first().ok_or(AppError {
        message: "Invalid graph ID.",
    })?;
    let decoded_id = *decoded_id as i64;

    let graph = sqlx::query!(
        "SELECT uuid FROM cases WHERE id = $1 AND owner_id = $2",
        decoded_id,
        auth.user.id
    )
    .fetch_one(pool.as_ref())
    .await
    .map_err(|_| AppError {
        message: "We ran into an error getting this case.",
    })?;

    let Some(graph_uuid) = graph.uuid else {
        return Err(AppError {
            message: "Case has no UUID.",
        });
    };

    // Entities count (current open rows)
    let entities_count = sqlx::query_scalar!(
        r#"SELECT COUNT(*)::BIGINT AS count FROM entities_current WHERE graph_id = $1 AND sys_to IS NULL"#,
        graph_uuid
    )
    .fetch_one(pool.as_ref())
    .await
    .map_err(|_| AppError { message: "We ran into an error counting entities." })?
    .unwrap_or(0);

    // Edges count (current open rows)
    let edges_count = sqlx::query_scalar!(
        r#"SELECT COUNT(*)::BIGINT AS count FROM edges_current WHERE graph_id = $1 AND sys_to IS NULL"#,
        graph_uuid
    )
    .fetch_one(pool.as_ref())
    .await
    .map_err(|_| AppError { message: "We ran into an error counting edges." })?
    .unwrap_or(0);

    // Events count across all categories for this graph key
    let events_count = sqlx::query_scalar!(
        r#"
        WITH s AS (
            SELECT stream_id FROM event_streams WHERE key = $1
        )
        SELECT COUNT(*)::BIGINT AS count
          FROM events e
          JOIN s ON e.stream_id = s.stream_id
        "#,
        graph_uuid.to_string()
    )
    .fetch_one(pool.as_ref())
    .await
    .map_err(|_| AppError {
        message: "We ran into an error counting events.",
    })?
    .unwrap_or(0);

    Ok(HttpResponse::Ok().json(CaseStatsResponse {
        entities_count,
        edges_count,
        events_count,
    }))
}

#[derive(Debug, Deserialize)]
pub struct ActivitySummaryQuery {
    pub days: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct ActivityBucket {
    pub date: String, // YYYY-MM-DD
    pub count: i64,
}

#[derive(Debug, Serialize)]
pub struct ActivitySummaryResponse {
    pub start: String, // ISO start date
    pub end: String,   // ISO end date
    pub buckets: Vec<ActivityBucket>,
}

#[get("/cases/{id}/activity/summary")]
pub async fn get_case_activity_summary_handler(
    pool: db::Database,
    auth: AuthMiddleware,
    graph_id: Path<String>,
    q: Query<ActivitySummaryQuery>,
    sqids: Data<Sqids>,
) -> Result<HttpResponse, AppError> {
    // Fixed default window of ~1 year if not provided
    let days = q.days.unwrap_or(365).max(1).min(366 * 2);

    // Decode sqid and authorize access
    let ids = sqids.decode(&graph_id);
    let decoded_id = ids.first().ok_or(AppError {
        message: "Invalid graph ID.",
    })?;
    let decoded_id = *decoded_id as i64;

    let graph = sqlx::query!(
        "SELECT uuid FROM cases WHERE id = $1 AND owner_id = $2",
        decoded_id,
        auth.user.id
    )
    .fetch_one(pool.as_ref())
    .await
    .map_err(|_| AppError {
        message: "We ran into an error getting this case.",
    })?;

    let Some(graph_uuid) = graph.uuid else {
        return Err(AppError {
            message: "Case has no UUID.",
        });
    };

    // Compute start and end timestamps (UTC)
    let end_ts = Utc::now();
    let start_ts = end_ts - ChronoDuration::days(days);

    // Aggregate events by day within window
    let rows = sqlx::query!(
        r#"
        WITH s AS (
            SELECT stream_id FROM event_streams WHERE key = $1
        )
        SELECT (e.recorded_at AT TIME ZONE 'UTC')::date AS day,
               COUNT(*)::BIGINT AS count
          FROM events e
          JOIN s ON e.stream_id = s.stream_id
         WHERE e.recorded_at >= $2
           AND e.recorded_at <= $3
         GROUP BY day
         ORDER BY day ASC
        "#,
        graph_uuid.to_string(),
        start_ts,
        end_ts,
    )
    .fetch_all(pool.as_ref())
    .await
    .map_err(|_| AppError {
        message: "We ran into an error summarizing activity.",
    })?;

    let buckets: Vec<ActivityBucket> = rows
        .into_iter()
        .map(|r| ActivityBucket {
            date: r
                .day
                .map(|d| d.format("%Y-%m-%d").to_string())
                .unwrap_or_else(|| "".to_string()),
            count: r.count.unwrap_or(0),
        })
        .collect();

    Ok(HttpResponse::Ok().json(ActivitySummaryResponse {
        start: start_ts.format("%Y-%m-%d").to_string(),
        end: end_ts.format("%Y-%m-%d").to_string(),
        buckets,
    }))
}

// ---- Chord diagram (entity-type relationships) ----
#[derive(Debug, Serialize)]
struct ChordNode {
    id: String,
    label: String,
    color: String,
}

#[derive(Debug, Serialize)]
struct ChordLink {
    source: String,
    target: String,
    value: i64,
}

#[derive(Debug, Serialize)]
struct ChordResponse {
    nodes: Vec<ChordNode>,
    links: Vec<ChordLink>,
}

fn title_case(s: &str) -> String {
    s.split('_')
        .filter(|p| !p.is_empty())
        .map(|p| {
            let mut c = p.chars();
            match c.next() {
                Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn color_for_type(ty: &str) -> String {
    // Tailwind-esque palette (400-ish)
    const PALETTE: [&str; 14] = [
        "#60a5fa", // sky-400
        "#a78bfa", // violet-400
        "#34d399", // emerald-400
        "#fbbf24", // amber-400
        "#f472b6", // pink-400
        "#22d3ee", // cyan-400
        "#818cf8", // indigo-400
        "#84cc16", // lime-500 (brighter)
        "#fb7185", // rose-400
        "#14b8a6", // teal-500
        "#f59e0b", // orange-500
        "#e879f9", // fuchsia-400
        "#94a3b8", // slate-400
        "#4ade80", // green-400
    ];
    let mut h: u64 = 1469598103934665603; // FNV offset basis
    for b in ty.as_bytes() {
        h ^= *b as u64;
        h = h.wrapping_mul(1099511628211);
    }
    let idx = (h as usize) % PALETTE.len();
    PALETTE[idx].to_string()
}

#[get("/cases/{id}/chord")]
pub async fn get_case_chord_handler(
    pool: db::Database,
    auth: AuthMiddleware,
    graph_id: Path<String>,
    sqids: Data<Sqids>,
) -> Result<HttpResponse, AppError> {
    // Decode sqid to internal numeric id
    let ids = sqids.decode(&graph_id);
    let decoded_id = ids.first().ok_or(AppError {
        message: "Invalid graph ID.",
    })?;
    let decoded_id = *decoded_id as i64;

    // Resolve and authorize graph UUID
    let graph = sqlx::query!(
        "SELECT uuid FROM cases WHERE id = $1 AND owner_id = $2",
        decoded_id,
        auth.user.id
    )
    .fetch_one(pool.as_ref())
    .await
    .map_err(|_| AppError {
        message: "We ran into an error getting this case.",
    })?;

    let Some(graph_uuid) = graph.uuid else {
        return Err(AppError {
            message: "Case has no UUID.",
        });
    };

    // Aggregate edge counts by entity_type(source) -> entity_type(target)
    // Derive a stable type key from `entity_type` (preferred), falling back to data.label/label
    // and capture a human-readable label for display.
    let rows = sqlx::query!(
        r#"
        SELECT
            COALESCE(
                e_src.doc->>'entity_type',
                e_src.doc->'data'->>'label',
                e_src.doc->>'label'
            ) AS src_type,
            COALESCE(
                e_dst.doc->>'entity_type',
                e_dst.doc->'data'->>'label',
                e_dst.doc->>'label'
            ) AS dst_type,
            COALESCE(
                e_src.doc->>'label',
                e_src.doc->'data'->>'label',
                e_src.doc->>'entity_type'
            ) AS src_label,
            COALESCE(
                e_dst.doc->>'label',
                e_dst.doc->'data'->>'label',
                e_dst.doc->>'entity_type'
            ) AS dst_label,
            COUNT(*)::BIGINT AS value
        FROM edges_current ec
        JOIN entities_current e_src
          ON e_src.entity_id = ec.src_id
         AND e_src.graph_id  = ec.graph_id
         AND e_src.sys_to IS NULL
        JOIN entities_current e_dst
          ON e_dst.entity_id = ec.dst_id
         AND e_dst.graph_id  = ec.graph_id
         AND e_dst.sys_to IS NULL
        WHERE ec.graph_id = $1
          AND ec.sys_to IS NULL
        GROUP BY src_type, dst_type, src_label, dst_label
        ORDER BY value DESC
        "#,
        graph_uuid
    )
    .fetch_all(pool.as_ref())
    .await
    .map_err(|_| AppError {
        message: "We ran into an error aggregating chord data.",
    })?;

    // Build links and collect node labels. We normalize type keys for colors,
    // but expose human labels as node ids to match frontend expectations.
    let mut links: Vec<ChordLink> = Vec::new();
    let mut node_labels: HashSet<String> = HashSet::new();
    let mut color_key_for_label: HashMap<String, String> = HashMap::new(); // label -> color_key
    for r in rows {
        let src_type_raw = r.src_type.unwrap_or_default();
        let dst_type_raw = r.dst_type.unwrap_or_default();
        let src_label_raw = r.src_label.unwrap_or_default();
        let dst_label_raw = r.dst_label.unwrap_or_default();

        // Normalize type keys (snake_case) for stable color hashing
        let src_key = if !src_type_raw.is_empty() {
            to_snake_case(&src_type_raw)
        } else {
            String::from("unknown")
        };
        let dst_key = if !dst_type_raw.is_empty() {
            to_snake_case(&dst_type_raw)
        } else {
            String::from("unknown")
        };

        // Human-readable labels (fallback to title-cased keys)
        let src_label = if !src_label_raw.is_empty() {
            src_label_raw.clone()
        } else {
            title_case(&src_key)
        };
        let dst_label = if !dst_label_raw.is_empty() {
            dst_label_raw.clone()
        } else {
            title_case(&dst_key)
        };

        let val = r.value.unwrap_or(0);
        if val <= 0 {
            continue;
        }

        // Track labels and their color keys (first seen wins)
        node_labels.insert(src_label.clone());
        node_labels.insert(dst_label.clone());
        color_key_for_label
            .entry(src_label.clone())
            .or_insert(src_key.clone());
        color_key_for_label
            .entry(dst_label.clone())
            .or_insert(dst_key.clone());

        // Use human labels as node ids in links to align with example response
        links.push(ChordLink {
            source: src_label,
            target: dst_label,
            value: val,
        });
    }

    // If no links, short-circuit with empty response
    if links.is_empty() {
        return Ok(HttpResponse::Ok().json(ChordResponse {
            nodes: vec![],
            links,
        }));
    }

    // Optional: ensure types present even if there are dangling entities with no edges
    // We keep the chord scoped to connected types to avoid clutter.
    let mut nodes: Vec<ChordNode> = node_labels
        .into_iter()
        .map(|label| {
            let color_key = color_key_for_label
                .get(&label)
                .cloned()
                .unwrap_or_else(|| to_snake_case(&label));
            let color = color_for_type(&color_key);
            // Use the human label for both id and label fields (matches example)
            ChordNode {
                id: label.clone(),
                label,
                color,
            }
        })
        .collect();
    // Stable ordering for deterministic layout (by label)
    nodes.sort_by(|a, b| a.label.cmp(&b.label));

    Ok(HttpResponse::Ok().json(ChordResponse { nodes, links }))
}
