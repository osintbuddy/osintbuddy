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

fn normalize_edge_create(
    event: &serde_json::Value,
) -> Option<(String, String, serde_json::Value, String)> {
    // returns (source, target, props_json, ui_edge_id)
    // Shape A: { entity: { id, source, target, ... } }  (legacy)
    if let Some(obj) = event.get("entity").and_then(|v| v.as_object()) {
        let src = obj.get("source")?.as_str()?.to_string();
        let dst = obj.get("target")?.as_str()?.to_string();
        let mut props = obj.clone();
        props.remove("id");
        props.remove("source");
        props.remove("target");
        let ui_id = obj
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string();
        return Some((src, dst, serde_json::Value::Object(props), ui_id));
    }
    // Shape B: edgesChange array: { edge: [ { type: "replace"|"add", item: { id, source, target, ... } } ] }
    if let Some(arr) = event.get("edge").and_then(|v| v.as_array()) {
        // prefer last replace/add with item
        for ch in arr.iter().rev() {
            if let (Some("replace") | Some("add"), Some(item)) =
                (ch.get("type").and_then(|v| v.as_str()), ch.get("item"))
            {
                let src = item.get("source")?.as_str()?.to_string();
                let dst = item.get("target")?.as_str()?.to_string();
                let ui_id = item
                    .get("id")
                    .and_then(|v| v.as_str())
                    .unwrap_or_default()
                    .to_string();
                let mut m = item.as_object()?.clone();
                m.remove("id");
                m.remove("source");
                m.remove("target");
                return Some((src, dst, serde_json::Value::Object(m), ui_id));
            }
        }
    }
    None
}

// Used by client to map plugin transform results to entity layouts (elements)
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
    // insert type which is used only in reactflow, don't store this
    entity.insert("type".to_string(), json!("view"));

    // Return for immediate UI usage
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
    let (source, target, props, ui_edge_id) = match normalize_edge_create(&edge) {
        Some(t) => t,
        None => {
            // try legacy straight-through (your existing branch)
            // ... (omit for brevity) ...
            let _ = session.text(json!({"action":"error","notification":{"autoClose":8000,"message":"Invalid create:edge payload"}}).to_string()).await;
            return;
        }
    };

    // TODO: Remove markerEnd
    // let props = props.remove("markerEnd")

    // Build domain event payload
    let payload = json!({
        "id": ui_edge_id,
        "source": source,
        "target": target,
        // TODO: Extract label from properties and store as label here
        // "label"
        "data": props,
    });

    // Append to event store on the graph stream
    let event = AppendEvent {
        category: "edge".to_string(),
        key: graph_uuid.to_string(),
        event_type: "create".to_string(),
        payload: payload.clone(),
        valid_from: Utc::now(),
        valid_to: None,
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
        "edge": payload
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
    let Some(entity) = event.entity else {
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
    // 1) { id, source?, target?, properties? }
    // 2) { oldEdge: { id }, newConnection: { source, target } }
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
                        let _ = session.text(json!({"action": "deauth"}).to_string());
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
                                let _ = session.text(json!({"action": "deauth"}).to_string());
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
                            // TODO: Create job for worker -> firecracker flow
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
