use crate::db::{Database, age_tx, with_cypher};
use crate::schemas::errors::{AppError, ErrorKind};
use actix_web::{Error, HttpRequest, HttpResponse, Result, web};
use actix_ws::{Message, Session};
use futures_util::StreamExt;
use log::{error, info};
use regex::Regex;
use serde::{Deserialize, Serialize};
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
    pub shouldClose: Option<bool>,
    pub notificationId: Option<String>,
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
    pub source_handle: String,
    pub target_handle: String,
    pub edge_type: String,
}

fn dict_to_opencypher(value: &Value) -> String {
    let mut properties = "{".to_string();

    if let Some(obj) = value.as_object() {
        for (k, v) in obj {
            properties.push_str(&format!("{}: ", k));
            match v {
                Value::String(s) => properties.push_str(&format!("'{}', ", s)),
                Value::Object(obj) => {
                    if let Some(dropdown_value) = obj.get("value") {
                        properties.push_str(&format!("'{}', ", dropdown_value));
                    }
                }
                _ => properties.push_str(&format!("{}, ", v)),
            }
        }
    }

    if properties.ends_with(", ") {
        properties.truncate(properties.len() - 2);
    }
    properties.push('}');

    properties
}

pub async fn get_entities() -> Result<Value, reqwest::Error> {
    let client = reqwest::Client::new();
    match client.get("http://127.0.0.1:42562/entities").send().await {
        Ok(response) => response.json().await,
        Err(err) => {
            error!("{err}");
            Err(err)
        }
    }
}

pub async fn get_entity_blueprints() -> Result<HashMap<String, Value>, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let response = client
        .get("http://127.0.0.1:42562/blueprint?label=_osib_all")
        .send()
        .await?;
    info!("RESPONE get_blueprints: {:?}", response);
    let data: Vec<Value> = response.json().await?;
    info!("RESPONE data: {:?}", data);

    let mut blueprints = HashMap::new();

    for blueprint in data {
        if let Some(blueprint_data) = blueprint.get("data") {
            if let Some(label) = blueprint_data.get("label") {
                let snake_case_label = to_snake_case(label.as_str().unwrap_or(""));
                blueprints.insert(snake_case_label, blueprint);
            }
        }
    }
    info!("RESPONE blueprints: {:?}", blueprints);

    Ok(blueprints)
}

pub async fn refresh_entity_plugins() -> Result<Value, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let response = client.get("http://127.0.0.1:42562/refresh").send().await?;

    let entities: Value = response.json().await?;
    Ok(serde_json::json!({
        "status": "success",
        "plugins": entities
    }))
}

pub async fn load_nodes_from_db(
    pool: &PgPool,
    graph_name: String,
) -> Result<(Vec<Value>, Vec<Value>), AppError> {
    let mut tx = age_tx(pool).await?;

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
            "SELECT * FROM cypher('{}', $$ MATCH ()-[e]->() RETURN e $$) as (e agtype)",
            graph_name
        ),
        tx.as_mut(),
    )
    .await?;

    Ok((vertices, edges))
}

pub async fn read_graph(
    pool: &PgPool,
    graph_name: String,
) -> Result<(Vec<Value>, Vec<Value>), AppError> {
    let blueprints = get_entity_blueprints().await.map_err(|err| {
        error!("{err}");
        AppError {
            message: "We ran into an error reading your graph!",
            kind: ErrorKind::Critical,
        }
    })?;
    let Ok(graph_result) = load_nodes_from_db(pool, graph_name).await else {
        return Err(AppError {
            message: "We ran into a cypher transaction error!",
            kind: ErrorKind::Critical,
        });
    };

    let (vertices, edges) = graph_result;
    let mut processed_nodes = Vec::new();
    for vertex in vertices {
        let mut node = vertex.clone();
        if let Some(label) = vertex.get("label").and_then(|l| l.as_str()) {
            if let Some(blueprint) = blueprints.get(&to_snake_case(label)) {
                node = vertex_to_entity(&vertex, blueprint);
            }
        }
        processed_nodes.push(node);
    }

    let processed_edges: Vec<Value> = edges
        .into_iter()
        .map(|e| {
            let id = e.get("id").and_then(|v| v.as_i64()).unwrap_or(0);
            let start_id = e.get("start_id").and_then(|v| v.as_i64()).unwrap_or(0);
            let end_id = e.get("end_id").and_then(|v| v.as_i64()).unwrap_or(0);

            serde_json::json!({
                "id": id.to_string(),
                "source": start_id.to_string(),
                "target": end_id.to_string(),
                "sourceHandle": "r1",
                "targetHandle": "l2",
                "type": "float"
            })
        })
        .collect();

    Ok((processed_nodes, processed_edges))
}

pub async fn update_node(pool: &PgPool, entity: Value, graph_name: String) {
    if let Ok(mut tx) = age_tx(pool).await {
        for (key, value) in entity.as_object().unwrap() {
            info!("key value, {} {}", key, value);
            let snake_key = to_snake_case(key);
            let query = if entity["value"].is_string() {
                format!(
                    "SELECT * FROM cypher('{}', $$ MATCH (v) WHERE id(v)={} SET v.{} = '{}' $$) as (v agtype)",
                    graph_name, entity["id"], snake_key, value
                )
            } else {
                format!(
                    "SELECT * FROM cypher('{}', $$ MATCH (v) WHERE id(v)={} SET v.{} = {} $$) as (v agtype)",
                    graph_name, entity["id"], snake_key, value
                )
            };
            info!("QUERY {}", query);
            // Execute the update query
            let _result = with_cypher(query, tx.as_mut()).await.map_err(|err| {
                error!("Failed to update node property {}: {}", key, err);
                AppError {
                    message: "Failed to update node position",
                    kind: ErrorKind::Database,
                }
            });
        }
        // Commit all updates in a single transaction
        let _ = tx.commit().await.map_err(|err| {
            error!("Failed to commit node updates: {err}");
            AppError {
                message: "Failed to save node position",
                kind: ErrorKind::Database,
            }
        });
    };
}

pub async fn remove_node(
    pool: &PgPool,
    session: &mut Session,
    node: Value,
    graph_name: String,
) -> Result<(), AppError> {
    if let Some(node_id) = node.get("id").and_then(|v| v.as_str()) {
        let check_edges_query = format!(
            "SELECT * FROM cypher('{}', $$ MATCH (s)-[e]->() WHERE id(s)={} RETURN e $$) as (e agtype)",
            graph_name, node_id
        );

        let mut tx = age_tx(pool).await?;
        let edge_rows = with_cypher(check_edges_query, tx.as_mut()).await?;

        let delete_query = if edge_rows.is_empty() {
            format!(
                "SELECT * FROM cypher('{}', $$ MATCH (v) WHERE id(v)={} DELETE v $$) as (v agtype)",
                graph_name, node_id
            )
        } else {
            format!(
                "SELECT * FROM cypher('{}', $$ MATCH (v) WHERE id(v)={} DETACH DELETE v $$) as (v agtype)",
                graph_name, node_id
            )
        };
        let _ = with_cypher(delete_query, tx.as_mut()).await;
        tx.commit().await.map_err(|err| {
            error!("{err}");
            AppError {
                message: "()",
                kind: ErrorKind::Database,
            }
        })?;

        session
            .text(
                json!({
                    "action": "removeEntity".to_string(),
                    "nodes": null,
                    "edges": null,
                    "detail": null,
                    "message": null,
                    "node": node,
                })
                .to_string(),
            )
            .await
            .map_err(|err| {
                error!("{err}");
                AppError {
                    message: "",
                    kind: ErrorKind::Database,
                }
            })?;
    }

    Ok(())
}

pub async fn save_node_on_drop(
    pool: &PgPool,
    graph_name: String,
    blueprint: &Value,
    label: &str,
) -> Result<Value, AppError> {
    let default_position = serde_json::json!({"x": 0, "y": 0});
    let position = blueprint.get("position").unwrap_or(&default_position);
    let position_props = dict_to_opencypher(position);
    let mut tx = age_tx(pool).await?;
    let Some(created_entity) = with_cypher(
        format!(
            "SELECT * FROM cypher('{}', $$ CREATE (v:{} {}) RETURN v $$) as (v agtype)",
            graph_name,
            to_snake_case(label),
            position_props
        ),
        tx.as_mut(),
    )
    .await?
    .into_iter()
    .next() else {
        error!("Entity drop failed!");
        return Err(AppError {
            message: "",
            kind: ErrorKind::Database,
        });
    };

    // Commit the transaction to save the new entity to the database
    tx.commit().await.map_err(|err| {
        error!("Failed to commit new entity: {err}");
        AppError {
            message: "Failed to save new entity",
            kind: ErrorKind::Database,
        }
    })?;

    let mut result = blueprint.clone();
    result["id"] = created_entity.as_object().unwrap()["id"].clone();
    result["type"] = json!("edit");
    Ok(result)
}

// /// Handle transform requests using the new plugin engine
// async fn handle_transform_request(
//     session: &mut Session,
//     plugin_engine: &Arc<PluginEngine>,
//     transform_msg: TransformMessage,
//     graph_uuid: sqlx::types::Uuid,
//     user_id: i64,
// ) {
// }

// /// Get plugin statistics via WebSocket
// pub async fn get_plugin_stats(session: &mut Session, engine: &Arc<PluginEngine>) {
//     // Get worker pool stats
//     let worker_stats = engine.get_worker_pool().get_stats().await;

//     // Get registry stats
//     let registry_stats = engine.get_registry().get_stats().await;

//     // Get sandbox stats
//     let sandbox_stats = engine.get_sandbox().get_sandbox_stats().await;

//     let stats_response = json!({
//         "action": "plugin:stats",
//         "data": {
//             "worker_pool": {
//                 "total_workers": worker_stats.total_workers,
//                 "active_workers": worker_stats.active_workers,
//                 "available_permits": worker_stats.available_permits
//             },
//             "registry": {
//                 "total_plugins": registry_stats.total_plugins,
//                 "available_plugins": registry_stats.available_plugins,
//                 "loaded_plugins": registry_stats.loaded_plugins
//             },
//             "sandbox": {
//                 "enabled": sandbox_stats.enabled,
//                 "active_sandboxes": sandbox_stats.active_sandboxes,
//                 "memory_limit_mb": sandbox_stats.total_memory_limit
//             }
//         }
//     });

//     let _ = session.text(stats_response.to_string()).await;
// }

// /// List available plugins via WebSocket
// pub async fn list_available_plugins(session: &mut Session, plugin_engine: &Arc<PluginEngine>) {
//     match plugin_engine.list_plugins().await {
//         Ok(plugins) => {
//             let plugins_response = json!({
//                 "action": "plugins:list",
//                 "data": {
//                     "plugins": plugins.iter().map(|plugin| {
//                         json!({
//                             "id": plugin.id,
//                             "name": plugin.name,
//                             "description": plugin.description,
//                             "author": plugin.author,
//                             "version": plugin.version,
//                             "available": plugin.is_available,
//                             "transforms": plugin.transforms
//                         })
//                     }).collect::<Vec<_>>()
//                 }
//             });

//             let _ = session.text(plugins_response.to_string()).await;
//         }
//         Err(e) => {
//             let error_response = json!({
//                 "action": "plugins:error",
//                 "message": format!("Failed to list plugins: {}", e)
//             });

//             let _ = session.text(error_response.to_string()).await;
//         }
//     }
// }

pub async fn launch_sandbox() {}

pub async fn graphing_websocket_handler(
    req: HttpRequest,
    stream: web::Payload,
    pool: Database,
    graph_id: web::Path<String>,
    sqids: web::Data<Sqids>,
    app: crate::AppData,
) -> Result<HttpResponse, Error> {
    let (response, mut session, mut msg_stream) = actix_ws::handle(&req, stream)?;

    // We'll authenticate when we receive the first message
    let mut authenticated = false;
    let mut graph_uuid: Option<sqlx::types::Uuid> = None;

    // Extract and decode graph UUID from path parameters
    let graph_ids = sqids.decode(&graph_id);
    let decoded_id = *graph_ids
        .first()
        .ok_or_else(|| actix_web::error::ErrorBadRequest("Invalid graph ID"))?;

    let blueprints = match get_entity_blueprints().await {
        Ok(blueprints) => blueprints,
        Err(err) => {
            error!("{err}");
            return Err(actix_web::error::ErrorBadRequest(
                "Error fetching entity blueprints!",
            ));
        }
    };
    let entities = match get_entities().await {
        Ok(entities) => entities,
        Err(err) => {
            error!("{err}");
            return Err(actix_web::error::ErrorBadRequest(
                "Error fetching entity blueprints!",
            ));
        }
    };

    actix_web::rt::spawn(async move {
        while let Some(Ok(msg)) = msg_stream.next().await {
            match msg {
                Message::Text(text) => {
                    if let Ok(event) = serde_json::from_str::<WebSocketMessage>(&text) {
                        // Handle authentication on first message
                        if !authenticated {
                            if let Some(token) = &event.token {
                                let Ok(claims) =
                                    crate::middleware::auth::decode_jwt(token, &app.cfg.jwt_secret)
                                else {
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
                                if let Ok(graph) = sqlx::query!(
                                    "SELECT uuid FROM graphs WHERE id = $1 AND owner_id = $2",
                                    decoded_id as i64,
                                    user_id_i64
                                )
                                .fetch_one(pool.as_ref())
                                .await
                                {
                                    if let Some(uuid) = graph.uuid {
                                        authenticated = true;
                                        graph_uuid = Some(uuid);

                                        // Send authentication success response
                                        let _ = session.text(json!({
                                            "action": "authenticated".to_string(),
                                            "notification": {
                                                "autoClose": false,
                                                "id": "graph",
                                                "message": "Please wait while we load your graph...",
                                            },
                                            "plugins": entities,
                                        }).to_string()).await;
                                    }
                                } else {
                                    // Graph not found or access denied
                                    let _ = session
                                        .close(Some(actix_ws::CloseCode::Policy.into()))
                                        .await;
                                    break;
                                }
                            } else {
                                // No token provided, close connection
                                let _ = session
                                    .close(Some(actix_ws::CloseCode::Policy.into()))
                                    .await;
                                break;
                            }
                            continue;
                        }

                        let graph_action = event.action.as_str();
                        let graph_uuid = graph_uuid.unwrap();
                        let graph_name = format!("g_{}", graph_uuid.simple().to_string());
                        match graph_action {
                            "update:entity" => {
                                update_node(
                                    pool.as_ref(),
                                    event.entity.unwrap_or(json!({})),
                                    graph_name,
                                )
                                .await;
                            }
                            "delete:node" => {
                                let _ = remove_node(
                                    pool.as_ref(),
                                    &mut session,
                                    event.entity.unwrap_or(json!({})),
                                    graph_name,
                                )
                                .await;
                            }
                            "read:graph" => {
                                info!("read:graph executing...");
                                if let Ok(graph_action) =
                                    read_graph(pool.as_ref(), graph_name).await
                                {
                                    let (nodes, edges) = graph_action;
                                    let message = json!({
                                        "action": "read",
                                        "notification": {
                                            "autoClose": true,
                                            "message": "Your graph has been loaded!",
                                            "id": "graph"
                                        },
                                        "nodes": nodes,
                                        "edges": edges,
                                    })
                                    .to_string();
                                    let _ = session.text(message).await;
                                };
                            }
                            "transform:node" => {
                                let message = json!({
                                    "action": "loading".to_string(),
                                    "notification": {
                                        "shouldClose": true,
                                        "message": null,
                                    },
                                })
                                .to_string();
                                let _ = session.text(message).await;
                            }
                            "create:entity" => {
                                let entity = event.entity.unwrap_or(json!({}));
                                // Get blueprint for the entity label

                                let entity_label = entity["label"].as_str().unwrap_or("");
                                let snake_case_label = to_snake_case(entity_label);
                                let blueprint = blueprints
                                    .get(&snake_case_label)
                                    .or_else(|| blueprints.get(entity_label))
                                    .or_else(|| blueprints.get(&entity_label.to_lowercase()));

                                let Some(blueprint) = blueprint else {
                                    let _ = session
                                        .text(
                                            json!({
                                                "action": "error",
                                                "notification": {
                                                    "shouldClose": true,
                                                    "message": format!("Blueprint not found for entity: {} (tried: {}, {}, {})", 
                                                        entity_label, snake_case_label, entity_label, entity_label.to_lowercase())
                                                },
                                            })
                                            .to_string(),
                                        )
                                        .await;
                                    continue;
                                };
                                let mut blueprint_with_position = blueprint.clone();
                                blueprint_with_position.as_object_mut().unwrap().insert(
                                    "position".to_string(),
                                    serde_json::to_value(&entity["position"]).unwrap(),
                                );

                                // Create the node in the graph database
                                if let Ok(raw_result) = save_node_on_drop(
                                    &pool,
                                    graph_name,
                                    &blueprint_with_position,
                                    entity["label"].as_str().unwrap(),
                                )
                                .await
                                {
                                    let processed_entity = vertex_to_blueprint(
                                        &raw_result,
                                        &blueprint_with_position.clone(),
                                    );
                                    let _ = session
                            .text(
                                json!({
                                    "action": "created".to_string(),
                                    "notification": {
                                        "shouldClose": true,
                                        "message": "todo {} entity created successfully!",
                                    },
                                    "entity": processed_entity
                                })
                                .to_string(),
                            )
                            .await;
                                }
                            }
                            _ => {}
                        }
                    }
                }
                Message::Close(reason) => {
                    println!("WebSocket closed: {:?}", reason);
                    break;
                }
                _ => {}
            }
        }
    });

    Ok(response)
}

fn to_camel_case(value: &str) -> String {
    let value = value.replace(' ', "_");
    let value = value.to_lowercase();
    let value_list: Vec<&str> = value.split('_').collect();

    if value_list.is_empty() {
        return String::new();
    }

    let mut result = value_list[0].to_string();
    for part in &value_list[1..] {
        if !part.is_empty() {
            let mut chars = part.chars();
            if let Some(first) = chars.next() {
                result.push(first.to_uppercase().next().unwrap_or(first));
                result.push_str(&chars.collect::<String>());
            }
        }
    }

    result
}

fn to_snake_case(name: &str) -> String {
    // First convert hyphens and dots to underscores and convert to camel case
    let name = to_camel_case(&name.replace('-', "_").replace('.', "_"));

    // Apply regex transformations
    let re1 = Regex::new(r"(.)([A-Z][a-z]+)").unwrap();
    let name = re1.replace_all(&name, "${1}_${2}");

    let re2 = Regex::new(r"__([A-Z])").unwrap();
    let name = re2.replace_all(&name, "_${1}");

    let re3 = Regex::new(r"([a-z0-9])([A-Z])").unwrap();
    let name = re3.replace_all(&name, "${1}_${2}");

    name.to_lowercase()
}

fn vertex_to_blueprint(vertex: &Value, blueprint: &Value) -> Value {
    let mut entity = blueprint.clone();
    let vertex_properties = vertex.get("properties").unwrap_or(vertex);

    if let Some(props) = vertex_properties.as_object() {
        let position = props.get("position").unwrap();
        entity
            .as_object_mut()
            .unwrap()
            .insert("position".to_string(), position.to_owned());
    }

    if let Some(id) = vertex.get("id") {
        entity
            .as_object_mut()
            .unwrap()
            .insert("id".to_string(), serde_json::Value::String(id.to_string()));
    }

    entity.as_object_mut().unwrap().insert(
        "type".to_string(),
        serde_json::Value::String("view".to_string()),
    );

    entity
}
fn vertex_to_entity(vertex: &Value, blueprint: &Value) -> Value {
    let mut entity = blueprint.clone();
    let vertex_properties = vertex.get("properties").unwrap_or(vertex);

    if let Some(props) = vertex_properties.as_object() {
        //  GETTING THESE PROPS FOR POSITON {"whois_data": String(""), "x": Number(3071.6780521686483), "y": Number(792.6372059945251)}
        let position = serde_json::json!({
            "x": props.get("x").unwrap_or(&serde_json::json!(0)),
            "y": props.get("y").unwrap_or(&serde_json::json!(0))
        });

        entity
            .as_object_mut()
            .unwrap()
            .insert("position".to_string(), position);
    }

    if let Some(id) = vertex.get("id") {
        entity
            .as_object_mut()
            .unwrap()
            .insert("id".to_string(), serde_json::Value::String(id.to_string()));
    }

    entity.as_object_mut().unwrap().insert(
        "type".to_string(),
        serde_json::Value::String("view".to_string()),
    );

    entity
}
