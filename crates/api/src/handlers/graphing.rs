use crate::middleware::auth::decode_jwt;
use actix_web::{HttpRequest, HttpResponse, Result, web};
use actix_ws::{Message, Session};
use chrono::Utc;
use common::db::Database;
use common::errors::AppError;
use common::eventstore::{self, AppendEvent};
use common::jobs;
use futures_util::StreamExt;
use futures_util::future::BoxFuture;
use log::{error, info};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use sqids::Sqids;
use sqlx::PgPool;
use std::collections::HashMap;
use std::fmt;
use std::process::Command;
use tokio::process::Command as TokioCommand;
use tokio::time::{Duration, sleep};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateNodeSchema {
    pub label: String,
    pub position: Position,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateEntityPayload {
    #[serde(rename = "createEntity")]
    pub create_node: Value,
    pub id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WebSocketMessage {
    pub action: String,
    pub entity: Option<Value>,
    pub edge: Option<Value>,
    pub token: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WebSocketResponse {
    pub action: String,
    pub nodes: Option<Vec<Value>>,
    pub edges: Option<Vec<Value>>,
    pub message: Option<String>,
    pub node: Option<Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GraphNode {
    pub id: String,
    pub label: String,
    pub position: Position,
    pub properties: Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GraphEdge {
    pub id: String,
    pub source: String,
    pub target: String,
    pub edge_type: String,
}

// Used by client to map plugin transform results to entity layouts (elements)
pub async fn get_entity_blueprints() -> Result<HashMap<String, Value>, AppError> {
    let output = Command::new("ob")
        .args(&["blueprints"])
        .output()
        .map_err(|err| {
            error!("Error running 'ob blueprints': {}", err);
            AppError { message: "" }
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        error!("Command 'ob blueprints' failed: {}", stderr);
        return Err(AppError { message: "" });
    };

    let stdout = String::from_utf8_lossy(&output.stdout);
    let blueprints = serde_json::from_str::<HashMap<String, Value>>(&stdout)
        .map_err(|err| {
            error!("Error parsing entities JSON: {}", err);
            err
        })
        .unwrap_or(HashMap::new());
    Ok(blueprints)
}

// Used to show available plugins on the entities sidebar
pub fn get_available_plugins() -> BoxFuture<'static, Vec<Value>> {
    Box::pin(async move {
        let Ok(output) = Command::new("ob").args(&["ls", "entities"]).output() else {
            sleep(Duration::from_secs(3)).await;
            return get_available_plugins().await;
        };

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            error!("Command 'ob ls entities' failed: {}", stderr);
            sleep(Duration::from_secs(3)).await;
            return get_available_plugins().await;
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let Ok(plugins) = serde_json::from_str::<Vec<Value>>(&stdout) else {
            error!(
                "Error serializing plugins cmd response into JSON: {}",
                stdout
            );
            sleep(Duration::from_secs(3)).await;
            return get_available_plugins().await;
        };

        plugins
    })
}

pub async fn handle_create_entity(
    pool: &PgPool,
    graph_uuid: Uuid,
    event: WebSocketMessage,
    session: &mut Session,
    actor_id: i64,
) {
    // Event validation and error messages
    let Some(mut entity) = event.entity else {
        let message = json!({
            "action": "error",
            "notification": {
                "autoClose": 8000,
                "message": "We ran into an error processing your create:entity payload!",
            },
        })
        .to_string();
        let _ = session.text(message).await;
        return;
    };
    let Some(label) = entity.as_object_mut().and_then(|e| e.remove("label")) else {
        let message = json!({
           "action": "error",
           "notification": {
               "autoClose": 8000,
               "message": "We ran into an error getting your create:entity label!",
           },
        })
        .to_string();
        let _ = session.text(message).await;
        return;
    };
    let Some(label) = label.as_str() else {
        let message = json!({
           "action": "error",
           "notification": {
               "autoClose": 8000,
               "message": "We ran into an error casting your entity label to the required type!",
           },
        })
        .to_string();
        let _ = session.text(message).await;
        return;
    };
    // end validation

    let (x, y, properties) = match entity {
        Value::Object(mut obj) => {
            let x = obj.remove("x").and_then(|v| v.as_f64()).unwrap_or(0.0_f64);
            let y = obj.remove("y").and_then(|v| v.as_f64()).unwrap_or(0.0_f64);
            (x, y, Value::Object(obj))
        }
        _ => (0.0_f64, 0.0_f64, json!({})),
    };

    let mut payload = json!({
        "id":  Uuid::new_v4(),
        "label": label,
        "position": { "x": x, "y": y },
        "data": properties,
    });

    let event = AppendEvent {
        category: "entity".to_string(),
        key: graph_uuid.to_string(),
        event_type: "create".to_string(),
        payload: payload.clone(),
        valid_from: Utc::now(),
        valid_to: None,
        correlation_id: Some(Uuid::new_v4()),
        causation_id: None,
        expected_version: None,
        actor_id: Some(actor_id),
    };

    if let Err(e) = eventstore::append_event(pool, event).await {
        error!("Failed to append entity:create event: {}", e);
    }
    let Some(entity) = payload.as_object_mut() else {
        let message = json!({
           "action": "error",
           "notification": {
               "autoClose": 8000,
               "message": "We ran into an error mutating your entity!",
           },
        })
        .to_string();
        let _ = session.text(message).await;
        return;
    };
    // insert type which is used only in reactflow, don't store this
    entity.insert("type".to_string(), json!("view"));

    let entity_label = entity
        .get("label")
        .cloned()
        .unwrap_or_else(|| json!("unknown"));
    entity.remove("label");
    match entity.get_mut("data") {
        Some(Value::Object(map)) => {
            map.entry("label".to_string()).or_insert(entity_label);
        }
        _ => {
            entity.insert("data".to_string(), json!({ "label": entity_label }));
        }
    };
    let message = json!({
        "action": "created".to_string(),
        "notification": {
            "shouldClose": true,
            "message": format!("Entity created successfully!"),
        },
        "entity": entity
    });
    let _ = session.text(message.to_string()).await;
}

pub async fn handle_create_edge(
    pool: &PgPool,
    graph_uuid: Uuid,
    event: WebSocketMessage,
    session: &mut Session,
    actor_id: i64,
) {
    // Normalize
    let Some(edge) = event.edge else {
        let message = json!({
            "action": "error",
            "notification": {
                "autoClose": 8000,
                "message": "We ran into an error processing your create:edge payload!",
            },
        })
        .to_string();
        let _ = session.text(message).await;
        return;
    };
    let (source, target, data, temp_id) = match &edge.as_object() {
        Some(t) => {
            let (Some(src), Some(dst), Some(data), Some(temp_id)) = (
                t.get("source"),
                t.get("target"),
                t.get("data"),
                t.get("temp_id"),
            ) else {
                return;
            };
            (src, dst, data, temp_id)
        }
        None => {
            let _ = session.text(json!({"action":"error","notification":{"autoClose":8000,"message":"Invalid create:edge payload"}}).to_string()).await;
            return;
        }
    };

    let edge_id = Uuid::new_v4();

    let event = AppendEvent {
        category: "edge".to_string(),
        key: graph_uuid.to_string(),
        event_type: "create".to_string(),
        payload: json!({
            "id": edge_id,
            "source": source,
            "target": target,
            "data": data,
        }),
        valid_from: Utc::now(),
        valid_to: None,
        correlation_id: Some(Uuid::new_v4()),
        causation_id: None,
        expected_version: None,
        actor_id: Some(actor_id),
    };

    if let Err(e) = eventstore::append_event(pool, event).await {
        error!("Failed to append edge:create event: {}", e);
    }

    let message = json!({
        "action": "created",
        "edge": {
            "id": edge_id,
            "source": source,
            "target": target,
            "data": data,
            "temp_id": temp_id
        }
    });
    let _ = session.text(message.to_string()).await;
}

pub async fn handle_delete_edge(
    pool: &PgPool,
    graph_uuid: Uuid,
    event: WebSocketMessage,
    session: &mut Session,
    actor_id: i64,
) {
    let Some(edge) = event.edge else {
        let message = json!({
            "action": "error",
            "notification": {
                "autoClose": 8000,
                "message": "We ran into an error finding your edge payload!",
            },
        });
        let _ = session.text(message.to_string()).await;
        return;
    };

    let ev = AppendEvent {
        category: "edge".to_string(),
        key: graph_uuid.to_string(),
        event_type: "delete".to_string(),
        payload: edge.clone(),
        valid_from: Utc::now(),
        valid_to: None,
        correlation_id: Some(Uuid::new_v4()),
        causation_id: None,
        expected_version: None,
        actor_id: Some(actor_id),
    };

    if let Err(e) = eventstore::append_event(pool, ev).await {
        error!("Failed to append edge:delete: {}", e);
        let message = json!({
            "action": "error",
            "notification": {
                "autoClose": 8000,
                "message": "We ran into an error persisting your edge deletion!",
            },
        });
        let _ = session.text(message.to_string()).await;
    }

    let message = json!({
        "action": "deleted",
        "notification": {"shouldClose": true, "message": "Edge deleted."},
        "edge": edge
    });
    let _ = session.text(message.to_string()).await;
}

pub async fn handle_update_edge(
    pool: &PgPool,
    graph_uuid: Uuid,
    event: WebSocketMessage,
    session: &mut Session,
    actor_id: i64,
) {
    let Some(edge) = event.edge else {
        let message = json!({
            "action": "error",
            "notification": {
                "autoClose": 8000,
                "message": "We ran into an error processing your update:edge payload!",
            },
        });
        let _ = session.text(message.to_string()).await;
        return;
    };

    let payload = edge.clone();

    let ev = AppendEvent {
        category: "edge".to_string(),
        key: graph_uuid.to_string(),
        event_type: "update".to_string(),
        payload,
        valid_from: Utc::now(),
        valid_to: None,
        correlation_id: Some(Uuid::new_v4()),
        causation_id: None,
        expected_version: None,
        actor_id: Some(actor_id),
    };
    if let Err(e) = eventstore::append_event(pool, ev).await {
        error!("Failed to append edge:update: {}", e);
    }

    let message = json!({
        "action": "update",
        // "notification": {"shouldClose": true, "message": "Edge updated."},
        "edge": edge
    });
    let _ = session.text(message.to_string()).await;
}

pub async fn handle_update_entity(
    pool: &PgPool,
    graph_uuid: Uuid,
    event: WebSocketMessage,
    session: &mut Session,
    actor_id: i64,
) {
    let Some(mut entity) = event.entity else {
        return;
    };

    // Normalize x,y -> position if present
    if let Value::Object(ref mut obj) = entity {
        if let (Some(x), Some(y)) = (obj.remove("x"), obj.remove("y")) {
            let pos = json!({"x": x.as_f64().unwrap_or(0.0), "y": y.as_f64().unwrap_or(0.0)});
            obj.insert("position".to_string(), pos);
        }
    }

    let ev = AppendEvent {
        category: "entity".to_string(),
        key: graph_uuid.to_string(),
        event_type: "update".to_string(),
        payload: entity.clone(),
        valid_from: Utc::now(),
        valid_to: None,
        correlation_id: Some(Uuid::new_v4()),
        causation_id: None,
        expected_version: None,
        actor_id: Some(actor_id),
    };
    if let Err(e) = eventstore::append_event(pool, ev).await {
        error!("Failed to append entity:update event: {}", e);
        // TODO: send ws error msg
        return;
    }
    let message = json!({
        "action": "update",
        "entity": entity
    });
    let _ = session.text(message.to_string()).await;
}

pub async fn handle_delete_entity(
    pool: &PgPool,
    graph_uuid: Uuid,
    event: WebSocketMessage,
    session: &mut Session,
    actor_id: i64,
) {
    let Some(entity) = event.entity else {
        return;
    };
    let Some(id_val) = entity.get("id").and_then(|v| v.as_str()) else {
        let _ = session.text(json!({"action":"error","notification":{"autoClose":8000,"message":"Missing entity id for delete."}}).to_string()).await;
        return;
    };
    // Parse the UUID early so we can use it for DB updates
    let id_uuid = match Uuid::parse_str(id_val) {
        Ok(u) => u,
        Err(_) => {
            let _ = session.text(json!({"action":"error","notification":{"autoClose":8000,"message":"Invalid UUID for entity id."}}).to_string()).await;
            return;
        }
    };

    let ev = AppendEvent {
        category: "entity".to_string(),
        key: graph_uuid.to_string(),
        event_type: "delete".to_string(),
        payload: json!({ "id": id_val }),
        valid_from: Utc::now(),
        valid_to: None,
        correlation_id: Some(Uuid::new_v4()),
        causation_id: None,
        expected_version: None,
        actor_id: Some(actor_id),
    };
    if let Err(e) = eventstore::append_event(pool, ev).await {
        error!("Failed to append entity:delete: {}", e);
    }
    if let Err(e) = sqlx::query!(
        r#"
        UPDATE entities_current
        SET sys_to   = now(),
            valid_to = COALESCE(valid_to, now())
        WHERE entity_id = $1
          AND graph_id  = $2
          AND sys_to    IS NULL
        "#,
        id_uuid,
        graph_uuid
    )
    .execute(pool)
    .await
    {
        error!("Failed to soft-delete entity from entities_current: {}", e);
    }
    // also close any incident edges in edges_current
    if let Err(e) = sqlx::query!(
        r#"
        UPDATE edges_current
        SET sys_to   = now(),
            valid_to = COALESCE(valid_to, now())
        WHERE graph_id = $1
          AND sys_to   IS NULL
          AND (src_id = $2 OR dst_id = $2)
        "#,
        graph_uuid,
        id_uuid
    )
    .execute(pool)
    .await
    {
        error!(
            "Failed to soft-delete incident edges from edges_current: {}",
            e
        );
    }

    let message = json!({
        "action": "deleted",
        "notification": {"shouldClose": true, "message": "Entity deleted."},
        "entity": { "id": id_val }
    });
    let _ = session.text(message.to_string()).await;
}

// Read latest materialized entities and edges for the case graph
pub async fn handle_materialized_read(pool: &PgPool, graph_uuid: Uuid, session: &mut Session) {
    let nodes: Vec<Value> = match sqlx::query!(
        r#"
        SELECT doc
        FROM entities_current
        WHERE graph_id = $1
            AND sys_to IS NULL
        ORDER BY sys_from ASC
        "#,
        graph_uuid
    )
    .fetch_all(pool)
    .await
    {
        Ok(rows) => rows
            .into_iter()
            .map(|r| {
                let mut entity_doc = r.doc;
                if let Some(obj) = entity_doc.as_object_mut() {
                    // Surface ReactFlow node type for UI rendering
                    obj.insert("type".to_string(), json!("view"));

                    // Insert the label into the `data` object for ReactFlow consumers
                    let label_value = obj
                        .get("label")
                        .cloned()
                        .unwrap_or_else(|| json!("unknown"));
                    // Remove top-level label as only data properties are visible with Reactflow
                    obj.remove("label");

                    match obj.get_mut("data") {
                        Some(Value::Object(map)) => {
                            map.entry("label".to_string()).or_insert(label_value);
                        }
                        _ => {
                            obj.insert("data".to_string(), json!({ "label": label_value }));
                        }
                    }

                    return json!(obj);
                }
                entity_doc
            })
            .collect(),
        Err(err) => {
            error!("read:graph query failed: {}", err);
            vec![]
        }
    };
    let edges: Vec<Value> = match sqlx::query!(
        r#"
        SELECT edge_id, src_id, dst_id, props
          FROM edges_current
         WHERE graph_id = $1
           AND sys_to IS NULL
         ORDER BY sys_from ASC
        "#,
        graph_uuid
    )
    .fetch_all(pool)
    .await
    {
        Ok(rows) => rows
            .into_iter()
            .map(|r| {
                let mut e = json!({
                    "id": r.edge_id,
                    "source": r.src_id,
                    "target": r.dst_id,
                    "data": r.props,
                    "type": "sfloat",
                    "markerEnd": {
                        "type": "arrowclosed",
                        "color": "#373c83",
                        "width": 16,
                        "height": 16,
                    }
                });
                // surface "type" to top-level if present (React Flow convenience)
                if let Some(t) = r.props.get("type").and_then(|v| v.as_str()) {
                    if let Some(obj) = e.as_object_mut() {
                        obj.insert("type".into(), json!(t));
                    }
                }
                e
            })
            .collect(),
        Err(err) => {
            error!("read:edges query failed: {}", err);
            vec![]
        }
    };

    let message = json!({
        "action": "read",
        "notification": {
            "autoClose": true,
            "message": "Your graph has loaded!",
            "id": "graph"
        },
        "edges": edges,
        "nodes": nodes,
    })
    .to_string();
    let _ = session.text(message).await;
}

pub async fn graphing_websocket_handler(
    req: HttpRequest,
    stream: web::Payload,
    pool: Database,
    graph_id: web::Path<String>,
    sqids: web::Data<Sqids>,
    app: crate::AppData,
) -> Result<HttpResponse, AppError> {
    let Ok((response, mut session, mut msg_stream)) = actix_ws::handle(&req, stream) else {
        return Err(AppError { message: "(1)" });
    };
    // We'll authenticate when we receive the first message
    let mut authenticated = false;
    let mut total_events = 0;
    let mut actor_id_num: Option<i64> = None;

    // Extract and decode graph id from path parameters
    let graph_ids = sqids.decode(&graph_id);
    let decoded_id = match graph_ids.first() {
        Some(id) => id,
        None => {
            let _ = session.text(json!({"action": "deauth"}).to_string());
            let _ = session
                .close(Some(actix_ws::CloseCode::Policy.into()))
                .await;
            return Err(AppError { message: "()" });
        }
    };
    let decoded_id = *decoded_id as i64;
    let deauth_msg = json!({"action": "deauth"});
    actix_web::rt::spawn(async move {
        let mut graph_uuid: Option<Uuid> = None;
        let Ok(blueprints) = get_entity_blueprints().await else {
            error!(
                "Error getting blueprints for graph id `{decoded_id}`. Environment: {}",
                &app.cfg.environment
            );
            return;
        };

        while let Some(Ok(msg)) = msg_stream.next().await {
            match msg {
                Message::Text(text) => {
                    let Ok(event) = serde_json::from_str::<WebSocketMessage>(&text) else {
                        let _ = session.text(deauth_msg.to_string());
                        let _ = session
                            .close(Some(actix_ws::CloseCode::Policy.into()))
                            .await;
                        break;
                    };
                    // if not previously authenticated and msg count not modulo 3
                    // authenticate connection, after initial auth success get graph_uuid
                    if total_events % 3 == 0 || !authenticated {
                        if let Some(token) = &event.token {
                            let Ok(claims) = decode_jwt(token, &app.cfg.jwt_secret) else {
                                break;
                            };
                            let user_ids = sqids.decode(&claims.sub);
                            let Some(decoded_user_id) = user_ids.first() else {
                                // Invalid user ID in token
                                let _ = session.text(deauth_msg.to_string());
                                let _ = session
                                    .close(Some(actix_ws::CloseCode::Policy.into()))
                                    .await;
                                break;
                            };
                            let user_id_i64 = *decoded_user_id as i64;

                            // Get the graph from database to validate access and get UUID
                            let graph = sqlx::query!(
                                "SELECT uuid FROM cases WHERE id = $1 AND owner_id = $2",
                                decoded_id as i64,
                                user_id_i64
                            )
                            .fetch_one(pool.as_ref())
                            .await;
                            let Ok(graph) = graph else {
                                // Graph not found
                                let _ = session.text(json!({"action": "deauth"}).to_string());
                                let _ = session
                                    .close(Some(actix_ws::CloseCode::Policy.into()))
                                    .await;
                                break;
                            };
                            authenticated = true;
                            graph_uuid = graph.uuid;
                            actor_id_num = Some(user_id_i64);
                            let _ = session
                                .text(
                                    json!({
                                        "action": "authenticated".to_string(),
                                        "notification": {
                                            "type": "success",
                                            "autoClose": 4000,
                                            "toastId": "graph",
                                            "message": "Your graph has loaded!",
                                        },
                                        "plugins": get_available_plugins().await,
                                        "blueprints": blueprints,
                                    })
                                    .to_string(),
                                )
                                .await;
                        }
                    }

                    let graph_action = event.action.as_str();
                    let Some(graph_uuid) = graph_uuid else {
                        let _ = session.text(deauth_msg.to_string());

                        let _ = session
                            .close(Some(actix_ws::CloseCode::Policy.into()))
                            .await;
                        return;
                    };
                    let Some(actor_id) = actor_id_num else {
                        let _ = session.text(deauth_msg.to_string());
                        let _ = session
                            .close(Some(actix_ws::CloseCode::Policy.into()))
                            .await;
                        return;
                    };

                    // Handle graph events
                    match graph_action {
                        "update:edge" => {
                            handle_update_edge(&pool, graph_uuid, event, &mut session, actor_id)
                                .await;
                        }
                        "delete:edge" => {
                            handle_delete_edge(&pool, graph_uuid, event, &mut session, actor_id)
                                .await;
                        }
                        "create:edge" => {
                            handle_create_edge(&pool, graph_uuid, event, &mut session, actor_id)
                                .await;
                        }
                        "read:graph" => {
                            handle_materialized_read(&pool, graph_uuid, &mut session).await;
                        }
                        "create:entity" => {
                            handle_create_entity(&pool, graph_uuid, event, &mut session, actor_id)
                                .await;
                        }
                        "update:entity" => {
                            handle_update_entity(&pool, graph_uuid, event, &mut session, actor_id)
                                .await;
                        }
                        "delete:entity" => {
                            handle_delete_entity(&pool, graph_uuid, event, &mut session, actor_id)
                                .await;
                        }
                        "transform:entity" => {
                            println!("HANDSLING 'transform:entity' CASE");
                            handle_transform_entity(
                                &pool,
                                graph_uuid,
                                event,
                                &mut session,
                                actor_id,
                            )
                            .await;
                        }

                        _ => {}
                    }
                    total_events += 1;
                }
                Message::Close(reason) => {
                    info!("WebSocket closed : {:?}", reason);
                    break;
                }
                _ => {}
            }
        }
    });

    Ok(response)
}

// Enqueue a transform job for the worker
async fn handle_transform_entity(
    pool: &PgPool,
    graph_uuid: Uuid,
    event: WebSocketMessage,
    session: &mut Session,
    actor_id: i64,
) {
    println!("handle_transform_entity()");
    let Some(entity) = event.entity else {
        println!("let Some(entity)");
        let _ = session
            .text(
                json!({
                    "action": "error",
                    "notification": {
                        "autoClose": 6000,
                        "message": "Transform request missing entity payload.",
                    },
                })
                .to_string(),
            )
            .await;
        return;
    };

    // Build job payload expected by worker dev runner: `ob run -T '<payload>'`
    let payload = json!({
        "action": "transform:entity",
        "graph_id": graph_uuid,
        "entity": entity,
        "actor_id": actor_id,
    });
    println!("enqueye job()");

    match jobs::enqueue_job(
        pool,
        jobs::NewJob {
            payload,
            priority: None,
            max_attempts: None,
            scheduled_at: None,
        },
    )
    .await
    {
        Ok(job) => {
            // Notify client that the transform has started and provide job ID
            let _ = session
                .text(
                    json!({
                        "action": "transform:started",
                        "job_id": job.job_id,
                        "entity": job.payload["entity"],
                    })
                    .to_string(),
                )
                .await;
            // Stream events for this job until it completes or times out,
            // then persist transform outputs as entity/edge events and emit UI updates.
            stream_job_events(
                pool,
                session,
                job.job_id,
                graph_uuid,
                job.payload["entity"].clone(),
                actor_id,
            )
            .await;
        }
        Err(e) => {
            error!("enqueue transform job failed: {}", e);
            let _ = session
                .text(
                    json!({
                        "action": "error",
                        "notification": {
                            "toastId": entity["id"],
                            "autoClose": 8000,
                            "message": format!("Failed to enqueue transform: {}", e),
                        },
                    })
                    .to_string(),
                )
                .await;
        }
    }
}

async fn stream_job_events(
    pool: &PgPool,
    session: &mut Session,
    job_id: Uuid,
    graph_uuid: Uuid,
    source_entity: Value,
    actor_id: i64,
) {
    println!("stream_job_events()");

    // Ensure stream exists and get its id
    let Ok(stream) = eventstore::ensure_stream(pool, "job", &job_id.to_string()).await else {
        println!("let Ok(stream) RETURNING>?!");
        return;
    };
    println!("let Ok(stream)");

    let mut last_version: i32 = 0;
    let start = std::time::Instant::now();
    let timeout = std::time::Duration::from_secs(60);
    let fallback_delay = std::time::Duration::from_secs(5);
    let mut fallback_attempted = false;
    loop {
        println!("ensure_stream() loop");
        if start.elapsed() > timeout {
            println!("ensure_stream() loop BREAK");

            break;
        }
        let rows = sqlx::query!(
            r#"
            SELECT version, event_type, payload
            FROM events
            WHERE stream_id = $1 AND version > $2
            ORDER BY version ASC
            LIMIT 50
            "#,
            stream.stream_id,
            last_version
        )
        .fetch_all(pool)
        .await;
        println!("{:?}", rows);
        let Ok(rows) = rows else {
            println!("OK(rows)!");
            sleep(Duration::from_millis(250)).await;
            continue;
        };
        if rows.is_empty() {
            println!("is empty!");
            if !fallback_attempted && start.elapsed() > fallback_delay {
                fallback_attempted = true;
                match jobs::get_job(pool, job_id).await {
                    Ok(Some(job)) => {
                        if job.status == "enqueued" && job.lease_owner.is_none() {
                            match inline_job_fallback(pool, job_id, &job.payload).await {
                                Ok(true) => {
                                    info!("inline fallback executed for job {}", job_id);
                                }
                                Ok(false) => {
                                    info!(
                                        "inline fallback skipped for job {} (already claimed)",
                                        job_id
                                    );
                                }
                                Err(err) => {
                                    error!(
                                        "inline job fallback failed for job {}: {}",
                                        job_id, err
                                    );
                                }
                            }
                        }
                    }
                    Ok(None) => {
                        error!(
                            "inline fallback unable to load job {} from database",
                            job_id
                        );
                    }
                    Err(err) => {
                        error!("inline fallback get_job error for {}: {}", job_id, err);
                    }
                }
            }
            sleep(Duration::from_millis(250)).await;
            continue;
        }
        let mut done = false;
        for r in rows {
            println!("ensure_stream() for r in rows");
            last_version = r.version;
            let payload = r.payload;
            let _ = session
                .text(
                    json!({
                        "action": "job:event",
                        "job_id": job_id,
                        "event": payload,
                    })
                    .to_string(),
                )
                .await;

            if payload
                .get("type")
                .and_then(|v| v.as_str())
                .map(|t| t == "result" || t == "error")
                .unwrap_or(false)
            {
                // On result, try to persist transform outputs as entity/edge events
                if payload
                    .get("type")
                    .and_then(|v| v.as_str())
                    .map(|t| t == "result")
                    .unwrap_or(false)
                {
                    if let Some(data) = payload.get("data") {
                        if let Err(e) = persist_transform_outputs(
                            pool,
                            graph_uuid,
                            job_id,
                            &source_entity,
                            data,
                            session,
                            actor_id,
                        )
                        .await
                        {
                            error!("persist transform outputs failed: {}", e);
                        }
                    }
                }
                done = true;
                break;
            }
        }
        if done {
            break;
        }
    }
}

// Persist transform outputs by creating entity and edge events, then notify UI with created entities
async fn persist_transform_outputs(
    pool: &PgPool,
    graph_uuid: Uuid,
    job_id: Uuid,
    source_entity: &Value,
    outputs: &Value,
    session: &mut Session,
    actor_id: i64,
) -> Result<(), sqlx::Error> {
    println!("persist_transform_outputs()");

    // Extract source entity context
    let src_id = source_entity
        .get("id")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok());
    let src_pos = source_entity.get("position");
    let transform_label = source_entity
        .get("transform")
        .and_then(|v| v.as_str())
        .unwrap_or("transform");
    let Some(src_id) = src_id else {
        println!("Some(src_id()");
        return Ok(());
    };
    println!("persist_transform_outputs()");

    // Normalize outputs to an array of objects
    let items: Vec<Value> = match outputs {
        Value::Array(a) => a.clone(),
        Value::Object(_) => vec![outputs.clone()],
        _ => vec![],
    };

    // Compute a simple placement fan-out around the source
    let (base_x, base_y) = if let Some(p) = src_pos.and_then(|p| p.as_object()) {
        (
            p.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0),
            p.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0),
        )
    } else {
        (0.0_f64, 0.0_f64)
    };

    let mut ui_entities: Vec<Value> = vec![];
    let mut ui_edges: Vec<Value> = vec![];

    for (i, mut item) in items.into_iter().enumerate() {
        // Determine label and copy remaining fields as data
        let label_s = item
            .get("label")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown")
            .to_string();
        println!("{}", label_s);
        // Build entity document
        let entity_id = Uuid::new_v4();
        // Arrange entities in rows of 4: increment X across, then Y down by 200.
        let step_x = 460.0_f64;
        let step_y = 260.0_f64;
        let col = (i % 4) as f64;
        let row = (i / 4) as f64;
        let pos = json!({
            "x": base_x + ((col + 1.0) * step_x),
            "y": base_y + (row * step_y),
        });

        // Remove non-data fields
        if let Some(obj) = item.as_object_mut() {
            obj.remove("edge_label");
            obj.remove("label");
        }
        let mut entity_doc = json!({
            "id": entity_id,
            "position": pos,
            "label": label_s,
            "data": {}
        });
        println!("entity-doc: {}", entity_doc);

        if let (Some(dst), Value::Object(src)) = (entity_doc.get_mut("data"), &item) {
            if let Some(dst_obj) = dst.as_object_mut() {
                for (k, v) in src.iter() {
                    dst_obj.insert(k.clone(), v.clone());
                }
                dst_obj.entry("label".to_string()).or_insert(json!(label_s));
            }
        }

        let ev_entity = AppendEvent {
            category: "entity".into(),
            key: graph_uuid.to_string(),
            event_type: "create".into(),
            payload: entity_doc.clone(),
            valid_from: Utc::now(),
            valid_to: None,
            correlation_id: Some(job_id),
            causation_id: None,
            expected_version: None,
            actor_id: Some(actor_id),
        };
        println!("evs aooebd {:?}", ev_entity);
        let _ = eventstore::append_event(pool, ev_entity).await;

        // Append edge:create event from source -> new entity
        let edge_id = Uuid::new_v4();
        let edge_label = transform_label;
        let edge_doc = json!({
            "id": edge_id,
            "source": src_id,
            "target": entity_id,
            "label": edge_label,
            "data": {   }
        });

        let ev_edge = AppendEvent {
            category: "edge".into(),
            key: graph_uuid.to_string(),
            event_type: "create".into(),
            payload: edge_doc,
            valid_from: Utc::now(),
            valid_to: None,
            correlation_id: Some(job_id),
            causation_id: None,
            expected_version: None,
            actor_id: Some(actor_id),
        };
        println!("edfge append {:?}", ev_edge);
        let _ = eventstore::append_event(pool, ev_edge).await;

        // Immediately inform UI about the new entity (ReactFlow node)
        // The projector will handle edges; optionally a later read refresh will include them
        let mut ui_entity = entity_doc.clone();
        if let Some(obj) = ui_entity.as_object_mut() {
            obj.insert("type".to_string(), json!("edit"));
        }
        ui_entities.push(ui_entity);
        ui_edges.push(json!({
            "id": edge_id,
            "source": src_id,
            "target": entity_id,
            "label": edge_label,
            "data": {  },
            "type": "sfloat"
        }));
        // Immediately inform UI about the new edge so it appears without a refresh
    }
    let toast_id = source_entity
        .get("id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| job_id.to_string());

    let mut job_payload = match jobs::get_job(pool, job_id).await {
        Ok(Some(mut job)) => {
            job.status = "completed".to_string();
            serde_json::to_value(job).unwrap_or_else(|_| json!({"job_id": job_id}))
        }
        Ok(None) => json!({"job_id": job_id}),
        Err(err) => {
            error!(
                "failed to load job {} for websocket completion payload: {}",
                job_id, err
            );
            json!({"job_id": job_id})
        }
    };

    if let Some(job_obj) = job_payload.as_object_mut() {
        job_obj.insert("status".into(), json!("completed"));
        job_obj.insert("results_count".into(), json!(ui_entities.len()));
        job_obj.insert("result".into(), outputs.clone());
    }

    let message = json!({
        "action": "transform:completed",
        "notification": {
            "toastId": toast_id,
            "shouldClose": true,
            "message": "Transform completed successfully."
        },
        "job": job_payload,
        "entities": ui_entities,
        "edges": ui_edges,
    });
    println!("sending message: {}", message);

    let _ = session.text(message.to_string()).await;
    Ok(())
}

#[derive(Debug)]
enum InlineFallbackError {
    Sql(sqlx::Error),
    Json(serde_json::Error),
    Io(std::io::Error),
    Command { code: i32, stderr: String },
}

impl fmt::Display for InlineFallbackError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            InlineFallbackError::Sql(err) => write!(f, "sql error: {}", err),
            InlineFallbackError::Json(err) => write!(f, "json error: {}", err),
            InlineFallbackError::Io(err) => write!(f, "io error: {}", err),
            InlineFallbackError::Command { code, stderr } => {
                write!(f, "ob exit code {}: {}", code, stderr)
            }
        }
    }
}

impl std::error::Error for InlineFallbackError {}

impl From<sqlx::Error> for InlineFallbackError {
    fn from(value: sqlx::Error) -> Self {
        InlineFallbackError::Sql(value)
    }
}

impl From<serde_json::Error> for InlineFallbackError {
    fn from(value: serde_json::Error) -> Self {
        InlineFallbackError::Json(value)
    }
}

impl From<std::io::Error> for InlineFallbackError {
    fn from(value: std::io::Error) -> Self {
        InlineFallbackError::Io(value)
    }
}

async fn execute_job_payload_inline(payload: &Value) -> Result<Option<Value>, InlineFallbackError> {
    let payload_s = serde_json::to_string(payload)?;
    let mut cmd = TokioCommand::new("ob");
    cmd.arg("run").arg("-T").arg(payload_s);
    let output = cmd.output().await?;

    if !output.status.success() {
        let code = output.status.code().unwrap_or(-1);
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(InlineFallbackError::Command { code, stderr });
    }

    let stdout_bytes = output.stdout;
    if stdout_bytes.is_empty() {
        return Ok(None);
    }

    let stdout_str = String::from_utf8_lossy(&stdout_bytes).to_string();

    let parsed = (|| {
        if let Ok(v) = serde_json::from_str::<Value>(&stdout_str) {
            return Some(v);
        }
        if let Some(idx) = stdout_str.find('{').or_else(|| stdout_str.find('[')) {
            let tail = &stdout_str[idx..];
            if let Ok(v) = serde_json::from_str::<Value>(tail.trim()) {
                return Some(v);
            }
        }
        stdout_str
            .lines()
            .rev()
            .find(|l| !l.trim().is_empty())
            .and_then(|line| serde_json::from_str::<Value>(line.trim()).ok())
    })();

    Ok(parsed)
}

async fn append_job_event(
    pool: &PgPool,
    job_id: Uuid,
    payload: Value,
    actor_id: Option<i64>,
) -> Result<(), InlineFallbackError> {
    let actor_id = actor_id.unwrap_or(0);
    eventstore::append_event(
        pool,
        AppendEvent {
            category: "job".into(),
            key: job_id.to_string(),
            event_type: "job:event".into(),
            payload,
            valid_from: Utc::now(),
            valid_to: None,
            correlation_id: None,
            causation_id: None,
            expected_version: None,
            actor_id: Some(actor_id),
        },
    )
    .await?;
    Ok(())
}

async fn inline_job_fallback(
    pool: &PgPool,
    job_id: Uuid,
    job_payload: &Value,
) -> Result<bool, InlineFallbackError> {
    const OWNER: &str = "inline-fallback";

    let actor_id = Some(
        job_payload
            .get("actor_id")
            .and_then(|v| v.as_i64())
            .unwrap_or(0),
    );

    if !jobs::try_claim_job(pool, job_id, OWNER).await? {
        return Ok(false);
    }

    jobs::start_job(pool, job_id, OWNER).await?;

    append_job_event(
        pool,
        job_id,
        json!({
            "type": "progress",
            "data": { "note": "inline fallback executing" }
        }),
        actor_id,
    )
    .await?;

    match execute_job_payload_inline(job_payload).await {
        Ok(Some(result)) => {
            append_job_event(
                pool,
                job_id,
                json!({
                    "type": "result",
                    "data": result
                }),
                actor_id,
            )
            .await?;
            jobs::complete_job(pool, job_id, OWNER).await?;
        }
        Ok(None) => {
            append_job_event(
                pool,
                job_id,
                json!({
                    "type": "error",
                    "data": { "message": "inline fallback produced no data" }
                }),
                actor_id,
            )
            .await?;
            jobs::fail_job(pool, job_id, OWNER, 10).await?;
        }
        Err(err) => {
            append_job_event(
                pool,
                job_id,
                json!({
                    "type": "error",
                    "data": { "message": err.to_string() }
                }),
                actor_id,
            )
            .await?;
            jobs::fail_job(pool, job_id, OWNER, 10).await?;
        }
    }

    Ok(true)
}
