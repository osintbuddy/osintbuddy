use crate::middleware::auth::decode_jwt;
use actix_web::{HttpRequest, HttpResponse, Result, web};
use actix_ws::Message;
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
pub async fn append_create_entity_event(
    pool: &PgPool,
    graph_uuid: Uuid,
    entity_payload: Value,
    label: &str,
) -> Result<Value, AppError> {
    // Extract position and remaining properties from payload
    let (x, y, properties) = match entity_payload {
        Value::Object(mut obj) => {
            let x = obj.remove("x").and_then(|v| v.as_f64()).unwrap_or(0.0_f64);
            let y = obj.remove("y").and_then(|v| v.as_f64()).unwrap_or(0.0_f64);
            (x, y, Value::Object(obj))
        }
        _ => (0.0_f64, 0.0_f64, json!({})),
    };

    // Create a new entity id to track within the graph
    let entity_id = Uuid::new_v4();

    // Build domain event payload
    let payload = json!({
        "entity": {
            "id": entity_id,
            "label": label,
            "position": { "x": x, "y": y },
            "properties": properties,
        }
    });

    // Append to event store on the graph stream
    let req = AppendEvent {
        category: "entity".to_string(),
        key: graph_uuid.to_string(),
        event_type: "entity:create".to_string(),
        payload: payload.clone(),
        valid_from: Utc::now(),
        valid_to: None,
        idempotency_key: None,
        correlation_id: Some(Uuid::new_v4()),
        causation_id: None,
        expected_version: None,
    };

    if let Err(e) = eventstore::append_event(pool, req).await {
        error!("Failed to append entity:create event: {}", e);
    }

    // Return the created entity document for immediate UI usage
    Ok(payload.get("entity").cloned().unwrap_or_else(|| json!({})))
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
                    // if not previously authenticated in and msg count not modulo 3, authenticate connection, after auth success, set graph_uuid
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
                    info!("Executing action {graph_action} on {:?}!", graph_uuid);
                    let Some(graph_uuid) = graph_uuid else {
                        let _ = session
                            .close(Some(actix_ws::CloseCode::Policy.into()))
                            .await;
                        break;
                    };
                    // TODO: make an enum for this later... ignore that work for now though
                    match graph_action {
                        "update:edge" => {
                            let message = json!({
                                "action": "created".to_string(),
                                "notification": {
                                    "shouldClose": true,
                                    "message": "todo!",
                                },
                                "entity": {}
                            });
                            let _ = session.text(message.to_string()).await;
                        }
                        "delete:edge" => {
                            let message = json!({
                                "action": "created".to_string(),
                                "notification": {
                                    "shouldClose": true,
                                    "message": "todo!",
                                },
                                "entity": {}
                            });
                            let _ = session.text(message.to_string()).await;
                        }
                        "create:edge" => {
                            let message = json!({
                                "action": "created".to_string(),
                                "notification": {
                                    "shouldClose": true,
                                    "message": "todo!",
                                },
                                "entity": {}
                            });
                            let _ = session.text(message.to_string()).await;
                        }
                        "read:graph" => {
                            // TODO: Read from materialized view of entities/edges since this is the initial load read action
                            let message = json!({
                                "action": "read",
                                "notification": {
                                    "autoClose": true,
                                    "message": "Your graph has been loaded!",
                                    "id": "graph"
                                },
                                "edges": [],
                                "nodes":  [],
                            })
                            .to_string();
                            let _ = session.text(message).await;
                        }
                        "update:entity" => {
                            // TODO:We will do this later,  ignore me for now
                            // if let Err(err) = update_node(
                            //     pool.as_ref(),
                            //     event.entity.unwrap_or(json!({})),
                            //     graph_name,
                            // )
                            // .await
                            // {
                            //     error!("Failed to update entity: {:?}", err);
                            //     let message = json!({
                            //         "action": "error",
                            //         "notification": {
                            //             "autoClose": true,
                            //             "message": format!("Update failed: {}", err.message),
                            //         },
                            //     });
                            //     let _ = session.text(message.to_string()).await;
                            // }
                        }
                        "delete:entity" => {
                            // TODO:We will do this later,  ignore me for now
                            // let _ = remove_node(
                            //     pool.as_ref(),
                            //     &mut session,
                            //     event.entity.unwrap_or(json!({})),
                            //     graph_name,
                            // )
                            // .await;
                        }
                        "transform:entity" => {
                            // TODO: We will do this later, ignore me for now
                            // let mut entity = event.entity.unwrap_or(json!({}));
                            // let _ =
                            //     execute_transform(&graph_name, &mut entity, &mut session, &pool)
                            //         .await;
                        }
                        "create:entity" => {
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
                                break;
                            };
                            info!("Payload for create:entity: {entity}");

                            // Pop entity label
                            let Some(label) =
                                entity.as_object_mut().and_then(|e| e.remove("label"))
                            else {
                                let message = json!({
                                        "action": "error",
                                        "notification": {
                                            "autoClose": 8000,
                                            "message": "We ran into an error getting your create:entity label!",
                                        },
                                     })
                                     .to_string();
                                let _ = session.text(message).await;
                                break;
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
                                break;
                            };

                            info!("entity after pop {entity}");

                            // Create the node in the graph database
                            if let Ok(raw_result) = append_create_entity_event(
                                &pool,
                                graph_uuid,
                                entity,
                                &to_snake_case(label),
                            )
                            .await
                            {
                                let message = json!({
                                    "action": "created".to_string(),
                                    "notification": {
                                        "shouldClose": true,
                                        "message": format!("{label} entity created successfully!"),
                                    },
                                    "entity": raw_result
                                });
                                let _ = session.text(message.to_string()).await;
                            }
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
