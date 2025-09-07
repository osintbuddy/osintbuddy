use crate::middleware::auth::decode_jwt;
use actix_web::{HttpRequest, HttpResponse, Result, web};
use actix_ws::{Message, Session};
use common::db::Database;
use common::errors::AppError;
use common::utils::to_snake_case;
use futures_util::StreamExt;
use futures_util::future::BoxFuture;
use log::{error, info};
use serde::{Deserialize, Serialize};
use std::process::Command;
use tokio::time::{Duration, sleep};
use uuid::Uuid;

use chrono::Utc;
use common::eventstore::{self, AppendEvent};
use serde_json::{Value, json};
use sqids::Sqids;
use sqlx::PgPool;
use std::collections::HashMap;

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

// Sent on successful auth response, this is used to map plugin transform results to entity layouts (elements)
pub async fn get_entity_blueprints() -> Result<HashMap<String, Value>, AppError> {
    let output = Command::new("ob")
        .args(&["blueprints"])
        .output()
        .map_err(|err| {
            error!("Error running 'ob ls entities': {}", err);
            AppError { message: "" }
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        error!("Command 'ob ls entities' failed: {}", stderr);
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

// Sent on successful auth response, this is used to show available plugins on the entities sidebar
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

// TODO: update this function so it appends events to the sql schema correctly, schema can be found at crates/migrations/20250529170043_init.up.sql
pub async fn handle_create_entity(
    pool: &PgPool,
    graph_uuid: Uuid,
    event: WebSocketMessage,
    session: &mut Session,
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
    info!("Payload for create:entity: {entity}");

    // Pop entity label
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
    // END event validation and error messages

    info!("entity after pop {entity}");
    // Extract position and remaining properties from payload
    let (x, y, mut properties) = match entity {
        Value::Object(mut obj) => {
            let x = obj.remove("x").and_then(|v| v.as_f64()).unwrap_or(0.0_f64);
            let y = obj.remove("y").and_then(|v| v.as_f64()).unwrap_or(0.0_f64);
            (x, y, Value::Object(obj))
        }
        _ => (0.0_f64, 0.0_f64, json!({})),
    };

    if let Some(props_obj) = properties.as_object_mut() {
        props_obj.insert("label".to_string(), json!(to_snake_case(label)));
    }

    // Create a new entity id to track within the graph
    let entity_id = Uuid::new_v4();

    // Build domain event payload
    let mut payload = json!({
        "id": entity_id,
        "position": { "x": x, "y": y },
        "data": properties,
    });

    // Append to event store on the graph stream
    let event = AppendEvent {
        category: "entity".to_string(),
        key: graph_uuid.to_string(),
        event_type: "create".to_string(),
        payload: payload.clone(),
        valid_from: Utc::now(),
        valid_to: None,
        idempotency_key: None,
        correlation_id: Some(Uuid::new_v4()),
        causation_id: None,
        expected_version: None,
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
    // insert type which is used only in reactflow, no need to store this inside db
    entity.insert("type".to_string(), json!("view"));

    // Return the created entity document for immediate UI usage
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
) {
    let Some(mut edge) = event.entity else {
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

    // Extract source, target, and kind; treat remaining fields as properties
    let (source, target, kind, properties) = match edge {
        Value::Object(mut obj) => {
            let source = obj
                .remove("source")
                .and_then(|v| v.as_str().map(|s| s.to_string()));
            let target = obj
                .remove("target")
                .and_then(|v| v.as_str().map(|s| s.to_string()));
            // Support a few possible field names for edge kind/type
            let kind = obj
                .remove("kind")
                .and_then(|v| v.as_str().map(|s| s.to_string()))
                .or_else(|| {
                    obj.remove("edge_type")
                        .and_then(|v| v.as_str().map(|s| s.to_string()))
                })
                .or_else(|| {
                    obj.remove("edgeType")
                        .and_then(|v| v.as_str().map(|s| s.to_string()))
                })
                .or_else(|| {
                    obj.remove("type")
                        .and_then(|v| v.as_str().map(|s| s.to_string()))
                })
                .unwrap_or_else(|| "relates_to".to_string());

            match (source, target) {
                (Some(src), Some(dst)) => (src, dst, kind, Value::Object(obj)),
                _ => {
                    let message = json!({
                        "action": "error",
                        "notification": {
                            "autoClose": 8000,
                            "message": "Missing required edge fields: source and/or target.",
                        },
                    })
                    .to_string();
                    let _ = session.text(message).await;
                    return;
                }
            }
        }
        _ => {
            let message = json!({
                "action": "error",
                "notification": {
                    "autoClose": 8000,
                    "message": "Invalid create:edge payload format.",
                },
            })
            .to_string();
            let _ = session.text(message).await;
            return;
        }
    };

    // Create a new edge id
    let edge_id = Uuid::new_v4();

    // Build domain event payload
    let payload = json!({
        "id": edge_id,
        "source": source,
        "target": target,
        "kind": kind,
        "data": properties,
    });

    // Append to event store on the graph stream
    let event = AppendEvent {
        category: "edge".to_string(),
        key: graph_uuid.to_string(),
        event_type: "create".to_string(),
        payload: payload.clone(),
        valid_from: Utc::now(),
        valid_to: None,
        idempotency_key: None,
        correlation_id: Some(Uuid::new_v4()),
        causation_id: None,
        expected_version: None,
    };

    if let Err(e) = eventstore::append_event(pool, event).await {
        error!("Failed to append edge:create event: {}", e);
    }

    // Return the created edge document for immediate UI usage
    let message = json!({
        "action": "created".to_string(),
        "notification": {
            "shouldClose": true,
            "message": "Edge created successfully!",
        },
        "entity": payload
    });
    let _ = session.text(message.to_string()).await;
}

pub async fn handle_delete_edge(
    pool: &PgPool,
    graph_uuid: Uuid,
    event: WebSocketMessage,
    session: &mut Session,
) {
    let Some(entity) = event.entity else {
        let _ = session
            .text(
                json!({
                    "action": "error",
                    "notification": {
                        "autoClose": 8000,
                        "message": "We ran into an error processing your delete:edge payload!",
                    },
                })
                .to_string(),
            )
            .await;
        return;
    };

    // Expect an id field to identify the edge to delete
    let Some(id_val) = entity.get("id").and_then(|v| v.as_str()) else {
        let _ = session
            .text(
                json!({
                    "action": "error",
                    "notification": {
                        "autoClose": 8000,
                        "message": "Missing edge id for delete.",
                    },
                })
                .to_string(),
            )
            .await;
        return;
    };

    let payload = json!({ "id": id_val });

    let ev = AppendEvent {
        category: "edge".to_string(),
        key: graph_uuid.to_string(),
        event_type: "delete".to_string(),
        payload: payload.clone(),
        valid_from: Utc::now(),
        valid_to: None,
        idempotency_key: None,
        correlation_id: Some(Uuid::new_v4()),
        causation_id: None,
        expected_version: None,
    };

    if let Err(e) = eventstore::append_event(pool, ev).await {
        error!("Failed to append edge:delete: {}", e);
    }

    let _ = session
        .text(
            json!({
                "action": "deleted",
                "notification": {"shouldClose": true, "message": "Edge deleted."},
                "entity": payload
            })
            .to_string(),
        )
        .await;
}

pub async fn handle_update_edge(
    pool: &PgPool,
    graph_uuid: Uuid,
    event: WebSocketMessage,
    session: &mut Session,
) {
    let Some(mut entity) = event.entity else {
        let _ = session
            .text(
                json!({
                    "action": "error",
                    "notification": {
                        "autoClose": 8000,
                        "message": "We ran into an error processing your update:edge payload!",
                    },
                })
                .to_string(),
            )
            .await;
        return;
    };

    // Support two shapes:
    // 1) { id, source?, target?, kind?, properties? }
    // 2) { oldEdge: { id, kind? }, newConnection: { source, target } }
    let mut payload = json!({});

    if let Some(obj) = entity.as_object() {
        if obj.contains_key("oldEdge") && obj.contains_key("newConnection") {
            // ReactFlow reconnect shape
            let id = obj
                .get("oldEdge")
                .and_then(|v| v.get("id"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let source = obj
                .get("newConnection")
                .and_then(|v| v.get("source"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let target = obj
                .get("newConnection")
                .and_then(|v| v.get("target"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let kind = obj
                .get("oldEdge")
                .and_then(|v| {
                    v.get("kind").or_else(|| {
                        v.get("edge_type")
                            .or_else(|| v.get("edgeType").or_else(|| v.get("type")))
                    })
                })
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            match (id, source, target) {
                (Some(id), Some(source), Some(target)) => {
                    let mut p = serde_json::Map::new();
                    p.insert("id".to_string(), json!(id));
                    p.insert("source".to_string(), json!(source));
                    p.insert("target".to_string(), json!(target));
                    if let Some(k) = kind {
                        p.insert("kind".to_string(), json!(k));
                    }
                    payload = Value::Object(p);
                }
                _ => {
                    let _ = session
                        .text(
                            json!({
                                "action": "error",
                                "notification": {
                                    "autoClose": 8000,
                                    "message": "Invalid update:edge payload (missing id/source/target).",
                                },
                            })
                            .to_string(),
                        )
                        .await;
                    return;
                }
            }
        } else {
            // Generic update shape
            let Some(id_val) = obj.get("id").and_then(|v| v.as_str()) else {
                let _ = session
                    .text(
                        json!({
                            "action": "error",
                            "notification": {
                                "autoClose": 8000,
                                "message": "Missing edge id for update.",
                            },
                        })
                        .to_string(),
                    )
                    .await;
                return;
            };

            // Allow updating source/target/kind/properties; pass through provided fields
            let mut m = serde_json::Map::new();
            m.insert("id".to_string(), json!(id_val));
            if let Some(v) = obj.get("source").and_then(|v| v.as_str()) {
                m.insert("source".to_string(), json!(v));
            }
            if let Some(v) = obj.get("target").and_then(|v| v.as_str()) {
                m.insert("target".to_string(), json!(v));
            }
            if let Some(v) = obj
                .get("kind")
                .or_else(|| {
                    obj.get("edge_type")
                        .or_else(|| obj.get("edgeType").or_else(|| obj.get("type")))
                })
                .and_then(|v| v.as_str())
            {
                m.insert("kind".to_string(), json!(v));
            }
            if let Some(props) = obj.get("data") {
                m.insert("data".to_string(), props.clone());
            }
            payload = Value::Object(m);
        }
    } else {
        let _ = session
            .text(
                json!({
                    "action": "error",
                    "notification": {
                        "autoClose": 8000,
                        "message": "Invalid update:edge payload format.",
                    },
                })
                .to_string(),
            )
            .await;
        return;
    }

    // Append update event
    let ev = AppendEvent {
        category: "edge".to_string(),
        key: graph_uuid.to_string(),
        event_type: "update".to_string(),
        payload: payload.clone(),
        valid_from: Utc::now(),
        valid_to: None,
        idempotency_key: None,
        correlation_id: Some(Uuid::new_v4()),
        causation_id: None,
        expected_version: None,
    };
    if let Err(e) = eventstore::append_event(pool, ev).await {
        error!("Failed to append edge:update: {}", e);
    }

    // Ack response
    let _ = session
        .text(
            json!({
                "action": "updated",
                "notification": {"shouldClose": true, "message": "Edge updated."},
                "entity": payload
            })
            .to_string(),
        )
        .await;
}

pub async fn handle_update_entity(
    pool: &PgPool,
    graph_uuid: Uuid,
    event: WebSocketMessage,
    session: &mut Session,
) {
    let Some(mut entity) = event.entity else {
        return;
    };
    // Ensure payload has id
    let Some(id_val) = entity.get("id").and_then(|v| v.as_str()) else {
        let _ = session.text(json!({"action":"error","notification":{"autoClose":8000,"message":"Missing entity id for update."}}).to_string()).await;
        return;
    };

    // Normalize x,y -> position if present
    if let Value::Object(ref mut obj) = entity {
        if let (Some(x), Some(y)) = (obj.remove("x"), obj.remove("y")) {
            let pos = json!({"x": x.as_f64().unwrap_or(0.0), "y": y.as_f64().unwrap_or(0.0)});
            obj.insert("position".to_string(), pos);
        }
    }

    // Append update event
    let ev = AppendEvent {
        category: "entity".to_string(),
        key: graph_uuid.to_string(),
        event_type: "update".to_string(),
        payload: entity.clone(),
        valid_from: Utc::now(),
        valid_to: None,
        idempotency_key: None,
        correlation_id: Some(Uuid::new_v4()),
        causation_id: None,
        expected_version: None,
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

    let payload = json!({ "entity": {"id": id_val} });
    let ev = AppendEvent {
        category: "entity".to_string(),
        key: graph_uuid.to_string(),
        event_type: "delete".to_string(),
        payload: payload.clone(),
        valid_from: Utc::now(),
        valid_to: None,
        idempotency_key: None,
        correlation_id: Some(Uuid::new_v4()),
        causation_id: None,
        expected_version: None,
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

    info!("payload: {:?}", payload);
    let message = json!({
        "action": "deleted",
        "notification": {"shouldClose": true, "message": "Entity deleted."},
        "entity": payload.get("entity").cloned().unwrap_or_else(|| json!({}))
    });
    let _ = session.text(message.to_string()).await;
}

pub async fn handle_materialized_read(pool: &PgPool, graph_uuid: Uuid, session: &mut Session) {
    // Read latest materialized entities for this graph from entities_current
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
                    obj.insert("type".to_string(), json!("view"));
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

    let message = json!({
        "action": "read",
        "notification": {
            "autoClose": true,
            "message": "Your graph has loaded!",
            "id": "graph"
        },
        "edges": [],
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

    // Extract and decode graph id from path parameters
    let graph_ids = sqids.decode(&graph_id);
    let decoded_id = match graph_ids.first() {
        Some(id) => id,
        None => {
            let _ = session
                .close(Some(actix_ws::CloseCode::Policy.into()))
                .await;
            return Err(AppError { message: "()" });
        }
    };
    let decoded_id = *decoded_id as i64;

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
                        break;
                    };
                    // if not previously authenticated and msg count not modulo 3 (aka check for JWT expiry)
                    // authenticate connection, after initial auth success get graph_uuid
                    if total_events % 3 == 0 || !authenticated {
                        if let Some(token) = &event.token {
                            let Ok(claims) = decode_jwt(token, &app.cfg.jwt_secret) else {
                                let _ = session
                                    .close(Some(actix_ws::CloseCode::Policy.into()))
                                    .await;
                                break;
                            };
                            let user_ids = sqids.decode(&claims.sub);
                            let Some(decoded_user_id) = user_ids.first() else {
                                // Invalid user ID in token
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
                                let _ = session
                                    .close(Some(actix_ws::CloseCode::Policy.into()))
                                    .await;
                                break;
                            };
                            authenticated = true;
                            graph_uuid = graph.uuid;
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
                        let _ = session
                            .close(Some(actix_ws::CloseCode::Policy.into()))
                            .await;
                        return;
                    };

                    // Handle graph events
                    match graph_action {
                        "update:edge" => {
                            handle_update_edge(&pool, graph_uuid, event, &mut session).await;
                        }
                        "delete:edge" => {
                            handle_delete_edge(&pool, graph_uuid, event, &mut session).await;
                        }
                        "create:edge" => {
                            handle_create_edge(&pool, graph_uuid, event, &mut session).await;
                        }
                        "read:graph" => {
                            handle_materialized_read(&pool, graph_uuid, &mut session).await;
                        }
                        "create:entity" => {
                            handle_create_entity(&pool, graph_uuid, event, &mut session).await;
                        }
                        "update:entity" => {
                            handle_update_entity(&pool, graph_uuid, event, &mut session).await;
                        }
                        "delete:entity" => {
                            handle_delete_entity(&pool, graph_uuid, event, &mut session).await;
                        }
                        "transform:entity" => {
                            // TODO
                            // let mut entity = event.entity.unwrap_or(json!({}));
                            // let _ =
                            //     execute_transform(&pool, &graph_uuid, event, &mut session)
                            //         .await;
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
