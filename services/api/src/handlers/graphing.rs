use crate::db::{Database, age_tx, with_cypher};
use crate::middleware::auth::decode_jwt;
use crate::schemas::errors::AppError;
use actix_web::{HttpRequest, HttpResponse, Result, web};
use actix_ws::{Message, Session};
use futures_util::StreamExt;
use futures_util::future::BoxFuture;
use log::{error, info};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::process::Command;
use tokio::time::{Duration, sleep};
use uuid::Uuid;

use serde_json::{Map, Value, json};
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
    pub edge_type: String,
}

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

pub async fn execute_transform(
    graph_name: &str,
    entity: &mut Value,
    session: &mut Session,
    pool: &Database,
) {
    use std::process::Command;

    // Serialize the entity to JSON string for the CLI command (used in dev env)
    let Ok(entity_json) = serde_json::to_string(entity) else {
        error!("Error serializing entity': {}", entity);
        return;
    };

    // TODO: Handle through RabbitMQ and Firecracker when ENVIRONMENT="production"
    let output = match Command::new("ob")
        .args(&["run", "-t", &entity_json])
        .output()
    {
        Ok(dev_output) => dev_output,
        Err(err) => {
            error!("Error running transform': {}", err);
            let error_msg = json!({
                "todo": "me"
            });
            let _ = session.text(error_msg.to_string()).await;
            return;
        }
    };

    if !output.status.success() {
        error!("Command 'ob run -t' failed: {:?}", output.stderr);
    }

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    // Parse the JSON output from the CLI
    let Ok(result) = serde_json::from_str::<Value>(&stdout) else {
        error!("Serializing ob run command failed: {:?}", stdout);
        return;
    };
    info!("result {:?}", result);
    info!("entity {:?} ", entity);
    info!("ret result");
    // If result is a single entity, wrap it in an array
    let results = vec![result];

    // Create nodes in the graph database and send them back
    for new_entity in results {
        // Get the entity label and blueprint
        if let Some(entity_label) = new_entity
            .get("data")
            .and_then(|data| data.get("label"))
            .and_then(|l| l.as_str())
        {
            let snake_case_label = to_snake_case(entity_label);

            let mut entity_data = new_entity.get("data").unwrap().clone();

            // Use position from new entity or default position
            let position = entity
                .get("position")
                .cloned()
                .unwrap_or(json!({"x": 0, "y": 0}));

            if let Some(x) = position["x"].as_f64() {
                entity["position"]["x"] = Value::from(x + 500.0)
            }
            if let Some(y) = position["y"].as_f64() {
                entity["position"]["y"] = Value::from(y + 500.0)
            }
            entity_data
                .as_object_mut()
                .unwrap()
                .insert("position".to_string(), position);

            // Create the node in the graph database with all data
            let Ok(saved_entity) =
                save_node_on_drop(&pool, graph_name.to_owned(), &entity_data, entity_label).await
            else {
                error!("Failed to save node with data: {:?}", entity);
                let message = json!({
                    "action": "error",
                    "notification": {
                        "autoClose": true,
                        "toastId": entity["id"],
                        "message": format!("Failed to create {}:", entity_label),
                        "type": "error",
                    },
                });
                let _ = session.text(message.to_string()).await;
                continue;
            };

            // Create the full blueprint entity structure for the frontend
            let mut processed_entity = vertex_to_blueprint(&saved_entity, &entity_data);

            // Add the full blueprint data structure
            processed_entity["data"] = new_entity["data"].clone();

            // Save the element data to database properties
            if let Some(elements) = new_entity["data"]["elements"].as_array() {
                let entity_id = saved_entity["id"].as_i64().unwrap_or(0);
                let mut update_tx = age_tx(&pool).await.unwrap();

                for element in elements {
                    if let (Some(label), Some(value)) = (
                        element.get("label").and_then(|l| l.as_str()),
                        element.get("value"),
                    ) {
                        let snake_key = to_snake_case(label);
                        let query = if value.is_string() {
                            format!(
                                "SELECT * FROM cypher('{}', $$ MATCH (v) WHERE id(v)={} SET v.{} = '{}' $$) as (v agtype)",
                                graph_name,
                                entity_id,
                                snake_key,
                                value.as_str().unwrap().replace("'", "''")
                            )
                        } else {
                            format!(
                                "SELECT * FROM cypher('{}', $$ MATCH (v) WHERE id(v)={} SET v.{} = {} $$) as (v agtype)",
                                graph_name, entity_id, snake_key, value
                            )
                        };
                        let _ = with_cypher(query, update_tx.as_mut()).await;
                    }
                }
                let _ = update_tx.commit().await;
            }

            // Create edge if edge_label is present and send to UI
            let mut message = json!({
                "action": "created",
                "entity": processed_entity,
                "notification": {
                    "toastId": entity["id"],
                    "message": format!("{} entity created successfully!", entity_label),
                    "type": "success",
                    "autoClose": 5000,
                }
            });

            // Add edge data if edge_label is present
            if let Some(edge_label) = new_entity.get("edge_label").and_then(|l| l.as_str()) {
                let source_id = entity["id"]
                    .as_i64()
                    .or_else(|| entity["id"].as_str().and_then(|s| s.parse::<i64>().ok()))
                    .unwrap_or(0);

                let target_id = saved_entity["id"].as_i64().unwrap_or(0);

                let mut edge_tx = age_tx(&pool).await.unwrap();
                let edge_query = format!(
                    "SELECT * FROM cypher('{}', $$ MATCH (s), (t) WHERE id(s)={} AND id(t)={} CREATE (s)-[r:{}]->(t) RETURN r $$) as (edge agtype)",
                    graph_name, source_id, target_id, edge_label
                );
                let _ = with_cypher(edge_query, edge_tx.as_mut()).await;
                let _ = edge_tx.commit().await;

                // Add edge data to message
                let edge_data = json!({
                    "id": format!("{}_{}", source_id, target_id),
                    "source": source_id.to_string(),
                    "target": target_id.to_string(),
                    "type": "sfloat",
                    "label": edge_label,
                    "markerEnd": {
                        "type": "arrowclosed",
                        "width": 18,
                        "height": 18,
                    },
                });

                message
                    .as_object_mut()
                    .unwrap()
                    .insert("edge".to_string(), edge_data);
            }
            // Send the created entity back to the client
            if let Err(e) = session.text(message.to_string()).await {
                error!("Failed to send created entity message: {}", e);
            }
        }
    }
    // Send final success notification to update the loading toast
    let message = json!({
        "action": "loading",
        "notification": {
            "toastId": entity["id"],
            "autoClose": true,
            "type": "success",
            "isLoading": false,
            "message": "Transform completed successfully!",
        },
    });
    let _ = session.text(message.to_string()).await;
}

pub async fn load_nodes_from_db(
    pool: &PgPool,
    graph_name: &str,
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

pub async fn read_graph(graph_name: &str, session: &mut Session, pool: &Database) {
    let Ok(graph) = load_nodes_from_db(pool, &graph_name).await else {
        error!("Unable to load graph from PostgreSQL!");
        return;
    };

    let (vertices, edges) = graph;
    info!("reading verts!!!!! {:?}", vertices);

    let edges: Vec<Value> = edges
        .into_iter()
        .map(|mut edge| {
            if let Some(edge) = edge.as_object_mut() {
                // Change id, start/end ids for ReactFlow compatibility
                if let Some(id) = edge.get("id").and_then(|v| v.as_i64()) {
                    edge.insert("id".to_string(), Value::String(id.to_string()));
                }
                if let Some(start_id) = edge.get("start_id").and_then(|v| v.as_i64()) {
                    edge.insert("source".to_string(), Value::String(start_id.to_string()));
                    edge.remove("start_id");
                }
                if let Some(end_id) = edge.get("end_id").and_then(|v| v.as_i64()) {
                    edge.insert("target".to_string(), Value::String(end_id.to_string()));
                    edge.remove("end_id");
                }
                edge.insert("type".to_string(), json!("sfloat"));
            };

            edge
        })
        .collect();
    let vertices: Vec<Value> = vertices
        .into_iter()
        .map(|mut vert| {
            let Some(v) = vert.as_object_mut() else {
                return vert;
            };

            // Handle ID conversion
            if let Some(id) = v.get("id").and_then(|id| id.as_i64()) {
                v.insert("id".to_string(), json!(id.to_string()));
            }

            // Extract x and y from properties object and move to vertex root level
            let mut x_value = None;
            let mut y_value = None;

            if let Some(properties) = v.get_mut("properties").and_then(|p| p.as_object_mut()) {
                x_value = properties.remove("x");
                y_value = properties.remove("y");
            }
            v.insert("type".to_string(), json!("view"));

            // Create position object at root level
            let mut position = json!({});
            if let Some(position_obj) = position.as_object_mut() {
                if let Some(x) = x_value {
                    position_obj.insert("x".to_string(), x);
                }
                if let Some(y) = y_value {
                    position_obj.insert("y".to_string(), y);
                }
            }
            v.insert("position".to_string(), position);

            // Rename the properties key to data for frontend compatibility and include label
            if let Some(mut properties) = v.remove("properties") {
                // Move label from vertex root to data object
                if let Some(label) = v.remove("label") {
                    properties
                        .as_object_mut()
                        .unwrap()
                        .insert("label".to_string(), label);
                }
                v.insert("data".to_string(), properties);
            }

            vert
        })
        .collect();
    let message = json!({
        "action": "read",
        "notification": {
            "autoClose": true,
            "message": "Your graph has been loaded!",
            "id": "graph"
        },
        "edges": edges,
        "nodes":  vertices,
    })
    .to_string();
    info!("SENDING! {}", message);
    let _ = session.text(message).await;
}

pub async fn update_node(pool: &PgPool, entity: Value, graph_name: String) -> Result<(), AppError> {
    let mut tx = age_tx(pool).await?;
    // Safely get entity object and id
    let entity_obj = entity.as_object().ok_or_else(|| {
        error!("Entity is not a valid JSON object: {}", entity);
        AppError {
            message: "Invalid entity format",
        }
    })?;

    let entity_id = entity.get("id").and_then(|id| id.as_i64()).ok_or_else(|| {
        error!("Entity missing valid id field: {}", entity);
        AppError {
            message: "Entity missing valid id",
        }
    })?;

    for (key, value) in entity_obj {
        // Skip system fields that shouldn't be updated
        if key == "id" || key == "type" || key == "label" {
            continue;
        }
        let snake_key = to_snake_case(key);

        // Use safe cypher query with proper escaping
        let query = if value.is_string() {
            format!(
                "SELECT * FROM cypher('{}', $$ MATCH (v) WHERE id(v)={} SET v.{} = '{}' $$) as (v agtype)",
                graph_name,
                entity_id,
                snake_key,
                value.as_str().unwrap().replace("'", "''") // Escape single quotes
            )
        } else {
            format!(
                "SELECT * FROM cypher('{}', $$ MATCH (v) WHERE id(v)={} SET v.{} = {} $$) as (v agtype)",
                graph_name, entity_id, snake_key, value
            )
        };
        // Execute the update query using the cypher helper
        with_cypher(query, tx.as_mut()).await.map_err(|err| {
            error!("Failed to update node property {}: {}", key, err);
            AppError {
                message: "Failed to update node property",
            }
        })?;
    }

    // Commit all updates in a single transaction
    tx.commit().await.map_err(|err| {
        error!("Failed to commit node updates: {err}");
        AppError {
            message: "Failed to save node updates",
        }
    })?;

    Ok(())
}

pub async fn remove_node(
    pool: &PgPool,
    session: &mut Session,
    node: Value,
    graph_name: String,
) -> Result<(), AppError> {
    let node_id: i64 = node["id"].as_i64().unwrap_or(0);
    let check_in_edges_query = format!(
        "SELECT * FROM cypher('{}', $$ MATCH (v)-[e]->() WHERE id(v)={} RETURN e $$) as (e agtype)",
        graph_name, node_id
    );
    let check_out_edges_query = format!(
        "SELECT * FROM cypher('{}', $$ MATCH ()-[e]->(v) WHERE id(v)={} RETURN e $$) as (e agtype)",
        graph_name, node_id
    );
    let mut tx = age_tx(pool).await?;
    let in_edge_rows = with_cypher(check_in_edges_query, tx.as_mut()).await?;
    let edge_rows = with_cypher(check_out_edges_query, tx.as_mut()).await?;
    info!("edge rows: {:?}", edge_rows);
    let delete_query = if edge_rows.is_empty() && in_edge_rows.is_empty() {
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
        AppError { message: "()" }
    })?;
    session
        .text(
            json!({
                "action": "removeEntity".to_string(),
                "entity": node,
            })
            .to_string(),
        )
        .await
        .map_err(|err| {
            error!("{err}");
            AppError { message: "" }
        })?;

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
        return Err(AppError { message: "" });
    };

    // Commit the transaction to save the new entity to the database
    tx.commit().await.map_err(|err| {
        error!("Failed to commit new entity: {err}");
        AppError {
            message: "Failed to save new entity",
        }
    })?;

    let mut result = blueprint.clone();
    result["id"] = created_entity.as_object().unwrap()["id"].clone();
    result["type"] = json!("edit");
    Ok(result)
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
    let mut blueprints: Option<HashMap<String, Value>> = None;

    // Extract and decode graph UUID from path parameters
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
            error!("Error getting blueprints, environment: {}", {
                &app.cfg.environment
            });
            return;
        };
        while let Some(Ok(msg)) = msg_stream.next().await {
            match msg {
                Message::Text(text) => {
                    let Ok(event) = serde_json::from_str::<WebSocketMessage>(&text) else {
                        break;
                    };
                    info!("!authenticated ::{} ", !authenticated);
                    info!("!{} % 6 == 0  :: {}", total_events, total_events % 6 == 0);
                    // if not previously authenticated in and msg count not modulo 6, authenticate connection
                    if total_events % 6 == 0 || !authenticated {
                        info!("Authenticating!!");
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
                                // Graph not found or access denied
                                let _ = session
                                    .close(Some(actix_ws::CloseCode::Policy.into()))
                                    .await;
                                break;
                            };
                            authenticated = true;
                            graph_uuid = graph.uuid;
                            // TODO: Load entities from db when in production environment (app.cfg.environment == "production")
                            // and run the plugin system in firecracker VMs
                            let Ok(mut blueprints) = get_entity_blueprints().await else {
                                error!("Error getting development blueprints!");
                                break;
                            };
                            let _ = session
                                .text(
                                    json!({
                                        "action": "authenticated".to_string(),
                                        "notification": {
                                            "type": "success",
                                            "autoClose": false,
                                            "toastId": "graph",
                                            "message": "Please wait while we load your graph...",
                                        },
                                        "plugins": get_available_plugins().await,
                                        "blueprints": blueprints,
                                    })
                                    .to_string(),
                                )
                                .await;
                        }
                    }

                    info!("GRAPH_UUID, {:?}", graph_uuid);
                    let graph_action = event.action.as_str();
                    let graph_name = format!("g_{}", graph_uuid.unwrap().simple().to_string());
                    info!("Executing graph_action!");
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
                            read_graph(&graph_name, &mut session, &pool).await;
                        }
                        "update:entity" => {
                            if let Err(err) = update_node(
                                pool.as_ref(),
                                event.entity.unwrap_or(json!({})),
                                graph_name,
                            )
                            .await
                            {
                                error!("Failed to update entity: {:?}", err);
                                let message = json!({
                                    "action": "error",
                                    "notification": {
                                        "autoClose": true,
                                        "message": format!("Update failed: {}", err.message),
                                    },
                                });
                                let _ = session.text(message.to_string()).await;
                            }
                        }
                        "delete:entity" => {
                            let _ = remove_node(
                                pool.as_ref(),
                                &mut session,
                                event.entity.unwrap_or(json!({})),
                                graph_name,
                            )
                            .await;
                        }
                        "transform:entity" => {
                            // Execute the transform
                            let mut entity = event.entity.unwrap_or(json!({}));
                            let _ =
                                execute_transform(&graph_name, &mut entity, &mut session, &pool)
                                    .await;
                        }
                        "create:entity" => {
                            let entity = event.entity.unwrap_or(json!({}));
                            // Get blueprint for the entity label

                            let entity_label = entity["label"].as_str().unwrap_or("");
                            let snake_case_label = to_snake_case(entity_label);
                            let Some(blueprint) = blueprints.get(&snake_case_label) else {
                                // TODO: Send error msg
                                break;
                            };
                            let mut blueprint_with_position = blueprint.clone();
                            let position = serde_json::to_value(&entity["position"]).unwrap();
                            blueprint_with_position
                                .as_object_mut()
                                .unwrap()
                                .insert("position".to_string(), position);

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
                                let message = json!({
                                    "action": "created".to_string(),
                                    "notification": {
                                        "shouldClose": true,
                                        "message": "{} entity created successfully!",
                                    },
                                    "entity": processed_entity
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

fn vertex_to_blueprint(vertex: &Value, blueprint: &Value) -> Value {
    let mut entity = blueprint.clone();

    if let Some(properties) = vertex.get("properties").unwrap_or(vertex).as_object() {
        if let Some(position) = properties.get("position") {
            entity
                .as_object_mut()
                .unwrap()
                .insert("position".to_string(), position.to_owned());
        };
    }

    if let Some(id) = vertex.get("id") {
        entity
            .as_object_mut()
            .unwrap()
            .insert("id".to_string(), id.to_owned());
    }

    entity
        .as_object_mut()
        .unwrap()
        .insert("type".to_string(), json!("edit"));

    entity
}
fn vertex_to_entity(vertex: &mut Map<String, Value>, blueprint: &Value) -> Value {
    let mut entity = blueprint.clone();
    if let Some(vertex_properties) = vertex.get("properties") {
        if let Some(properties) = vertex_properties.as_object() {
            // Set position from database
            let position = json!({
                "x": properties.get("x").unwrap_or(&json!(0)),
                "y": properties.get("y").unwrap_or(&json!(0))
            });

            entity
                .as_object_mut()
                .unwrap()
                .insert("position".to_string(), position);

            // Map database properties to blueprint elements
            if let Some(data) = entity.get_mut("data") {
                if let Some(elements) = data.get_mut("elements") {
                    if let Some(elements_array) = elements.as_array_mut() {
                        for element in elements_array {
                            if let Some(element_obj) = element.as_object_mut() {
                                // Clone the label string to avoid borrow conflicts
                                if let Some(label_str) = element_obj
                                    .get("label")
                                    .and_then(|l| l.as_str())
                                    .map(|s| s.to_string())
                                {
                                    // Convert element label to snake_case to match database field
                                    let snake_case_field = to_snake_case(&label_str);

                                    // Look for the value in database properties
                                    if let Some(db_value) = properties.get(&snake_case_field) {
                                        // Update the element's value with database data
                                        element_obj.insert("value".to_string(), db_value.clone());
                                    }
                                }
                            }
                        }
                    }
                }
            }
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
    };

    entity
}
