use crate::db::{Database, age_tx, with_cypher};
use crate::schemas::errors::{AppError, ErrorKind};
use actix_web::{Error, HttpRequest, HttpResponse, Result, web};
use actix_ws::{Message, Session};
use futures_util::StreamExt;
use log::{error, info};
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::{Number, Value, json};
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

pub async fn get_entity_blueprints() -> Result<HashMap<String, Value>, AppError> {
    use std::process::Command;

    let output = Command::new("ob")
        .args(&["blueprints"])
        .output()
        .map_err(|err| {
            error!("Error running 'ob blueprints': {}", err);
            AppError {
                message: "Failed to execute 'ob blueprints' command",
                kind: ErrorKind::Critical,
            }
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        error!("Command 'ob blueprints' failed: {}", stderr);
        return Err(AppError {
            message: "Blueprint retrieval failed",
            kind: ErrorKind::Critical,
        });
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    // Parse the JSON output from the CLI
    let data: Vec<Value> = serde_json::from_str(&stdout).map_err(|err| {
        error!("Error parsing blueprints JSON: {}", err);
        AppError {
            message: "Failed to parse blueprints result",
            kind: ErrorKind::Critical,
        }
    })?;

    let mut blueprints = HashMap::new();

    for blueprint in data {
        if let Some(blueprint_data) = blueprint.get("data") {
            if let Some(label) = blueprint_data.get("label") {
                let snake_case_label = to_snake_case(label.as_str().unwrap_or(""));
                blueprints.insert(snake_case_label, blueprint);
            }
        }
    }
    Ok(blueprints)
}

pub async fn execute_transform(entity: &Value) -> Result<Vec<Value>, AppError> {
    use std::process::Command;

    // Serialize the entity to JSON string for the CLI command
    let entity_json = serde_json::to_string(entity).map_err(|err| {
        error!("Error serializing entity to JSON: {}", err);
        AppError {
            message: "Failed to serialize entity for transform",
            kind: ErrorKind::Critical,
        }
    })?;

    let output = Command::new("ob")
        .args(&["run", "-t", &entity_json])
        .output()
        .map_err(|err| {
            error!("Error running 'ob run -t': {}", err);
            AppError {
                message: "Failed to execute 'ob run -t' command",
                kind: ErrorKind::Critical,
            }
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        error!("Command 'ob run -t' failed: {}", stderr);
        return Err(AppError {
            message: "Transform execution failed",
            kind: ErrorKind::Critical,
        });
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    // Parse the JSON output from the CLI
    let result: Value = serde_json::from_str(&stdout).map_err(|err| {
        error!("Error parsing transform result JSON: {}", err);
        AppError {
            message: "Failed to parse transform result",
            kind: ErrorKind::Critical,
        }
    })?;

    // Extract entities from the result
    if let Some(entities) = result.get("entities") {
        if let Some(entities_array) = entities.as_array() {
            return Ok(entities_array.clone());
        }
    }

    // If result is directly an array of entities
    if let Some(result_array) = result.as_array() {
        return Ok(result_array.clone());
    }

    // If result is a single entity, wrap it in an array
    Ok(vec![result])
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
            let label = e.get("label").and_then(|l| l.as_str()).unwrap_or("");

            serde_json::json!({
                "id": id.to_string(),
                "source": start_id.to_string(),
                "target": end_id.to_string(),
                "sourceHandle": "r1",
                "targetHandle": "l2",
                "type": "float",
                "label": label,
                "markerEnd": {
                    "type": "arrowclosed",
                }
            })
        })
        .collect();

    Ok((processed_nodes, processed_edges))
}

pub async fn update_node(pool: &PgPool, entity: Value, graph_name: String) -> Result<(), AppError> {
    let mut tx = age_tx(pool).await?;
    // Safely get entity object and id
    let entity_obj = entity.as_object().ok_or_else(|| {
        error!("Entity is not a valid JSON object: {}", entity);
        AppError {
            message: "Invalid entity format",
            kind: ErrorKind::Invalid,
        }
    })?;

    let entity_id = entity.get("id").and_then(|id| id.as_i64()).ok_or_else(|| {
        error!("Entity missing valid id field: {}", entity);
        AppError {
            message: "Entity missing valid id",
            kind: ErrorKind::Invalid,
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
                kind: ErrorKind::Database,
            }
        })?;
    }

    // Commit all updates in a single transaction
    tx.commit().await.map_err(|err| {
        error!("Failed to commit node updates: {err}");
        AppError {
            message: "Failed to save node updates",
            kind: ErrorKind::Database,
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
        AppError {
            message: "()",
            kind: ErrorKind::Database,
        }
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
            AppError {
                message: "",
                kind: ErrorKind::Database,
            }
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
    // TODO: Get entities from db when in production environment (app.cfg.environment == "production")
    // and run the plugin system in firecracker VMs
    let entities = {
        use std::process::Command;

        let output = Command::new("ob")
            .args(&["ls", "entities"])
            .output()
            .map_err(|err| {
                error!("Error running 'ob ls entities': {}", err);
                actix_web::error::ErrorBadRequest("Failed to execute 'ob ls entities' command.")
            })?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            error!("Command 'ob ls entities' failed: {}", stderr);
            return Err(actix_web::error::ErrorBadRequest(
                "Command 'ob ls entities' execution failed.",
            ));
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        serde_json::from_str::<Value>(&stdout).map_err(|err| {
            error!("Error parsing entities JSON: {}", err);
            actix_web::error::ErrorBadRequest("Failed to parse entities JSON output.")
        })?
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
                                                "type": "success",
                                                "autoClose": false,
                                                "toastId": "graph",
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
                            "read:graph" => {
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
                            "transform:entity" => {
                                // Execute the transform
                                let entity = event.entity.unwrap_or(json!({}));
                                match execute_transform(&entity).await {
                                    Ok(new_entities) => {
                                        // Create nodes in the graph database and send them back
                                        for new_entity in new_entities {
                                            // Get the entity label and blueprint
                                            if let Some(entity_label) = new_entity
                                                .get("data")
                                                .and_then(|data| data.get("label"))
                                                .and_then(|l| l.as_str())
                                            {
                                                let snake_case_label = to_snake_case(entity_label);

                                                let mut entity_data =
                                                    new_entity.get("data").unwrap().clone();

                                                // Use position from new entity or default position
                                                let position = entity
                                                    .get("position")
                                                    .cloned()
                                                    .unwrap_or(json!({"x": 0, "y": 0}));

                                                entity_data
                                                    .as_object_mut()
                                                    .unwrap()
                                                    .insert("position".to_string(), position);

                                                // Create the node in the graph database with all data
                                                let Ok(saved_entity) = save_node_on_drop(
                                                    &pool,
                                                    graph_name.clone(),
                                                    &entity_data,
                                                    entity_label,
                                                )
                                                .await
                                                else {
                                                    error!(
                                                        "Failed to save node with data: {:?}",
                                                        entity
                                                    );
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
                                                let mut processed_entity = vertex_to_blueprint(
                                                    &saved_entity,
                                                    &entity_data,
                                                );

                                                // Ensure processed entity has valid position for ReactFlow
                                                if processed_entity.get("position").is_none() {
                                                    processed_entity
                                                        .as_object_mut()
                                                        .unwrap()
                                                        .insert(
                                                            "position".to_string(),
                                                            json!({"x": 0.0, "y": 0.0}),
                                                        );
                                                }

                                                // Add the full blueprint data structure
                                                processed_entity["data"] =
                                                    new_entity["data"].clone();

                                                // Save the element data to database properties
                                                if let Some(elements) =
                                                    new_entity["data"]["elements"].as_array()
                                                {
                                                    let entity_id =
                                                        saved_entity["id"].as_i64().unwrap_or(0);
                                                    let mut update_tx =
                                                        age_tx(&pool).await.unwrap();

                                                    for element in elements {
                                                        if let (Some(label), Some(value)) = (
                                                            element
                                                                .get("label")
                                                                .and_then(|l| l.as_str()),
                                                            element.get("value"),
                                                        ) {
                                                            let snake_key = to_snake_case(label);
                                                            let query = if value.is_string() {
                                                                format!(
                                                                    "SELECT * FROM cypher('{}', $$ MATCH (v) WHERE id(v)={} SET v.{} = '{}' $$) as (v agtype)",
                                                                    graph_name,
                                                                    entity_id,
                                                                    snake_key,
                                                                    value
                                                                        .as_str()
                                                                        .unwrap()
                                                                        .replace("'", "''")
                                                                )
                                                            } else {
                                                                format!(
                                                                    "SELECT * FROM cypher('{}', $$ MATCH (v) WHERE id(v)={} SET v.{} = {} $$) as (v agtype)",
                                                                    graph_name,
                                                                    entity_id,
                                                                    snake_key,
                                                                    value
                                                                )
                                                            };
                                                            let _ = with_cypher(
                                                                query,
                                                                update_tx.as_mut(),
                                                            )
                                                            .await;
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
                                                if let Some(edge_label) = new_entity
                                                    .get("edge_label")
                                                    .and_then(|l| l.as_str())
                                                {
                                                    let source_id = entity["id"]
                                                        .as_i64()
                                                        .or_else(|| {
                                                            entity["id"]
                                                                .as_str()
                                                                .and_then(|s| s.parse::<i64>().ok())
                                                        })
                                                        .unwrap_or(0);

                                                    let target_id =
                                                        saved_entity["id"].as_i64().unwrap_or(0);

                                                    let mut edge_tx = age_tx(&pool).await.unwrap();
                                                    let edge_query = format!(
                                                        "SELECT * FROM cypher('{}', $$ MATCH (s), (t) WHERE id(s)={} AND id(t)={} CREATE (s)-[r:{}]->(t) RETURN r $$) as (edge agtype)",
                                                        graph_name,
                                                        source_id,
                                                        target_id,
                                                        edge_label
                                                    );
                                                    let _ =
                                                        with_cypher(edge_query, edge_tx.as_mut())
                                                            .await;
                                                    let _ = edge_tx.commit().await;

                                                    // Add edge data to message
                                                    let edge_data = json!({
                                                        "id": format!("{}_{}", source_id, target_id),
                                                        "source": source_id.to_string(),
                                                        "target": target_id.to_string(),
                                                        "sourceHandle": "r1",
                                                        "targetHandle": "l2",
                                                        "type": "float",
                                                        "label": edge_label,
                                                        "markerEnd": {
                                                            "type": "arrowclosed",
                                                        },
                                                        "style": {
                                                            "strokeWidth": 2,
                                                          },
                                                    });

                                                    message
                                                        .as_object_mut()
                                                        .unwrap()
                                                        .insert("edge".to_string(), edge_data);
                                                }
                                                // Send the created entity back to the client
                                                if let Err(e) =
                                                    session.text(message.to_string()).await
                                                {
                                                    error!(
                                                        "Failed to send created entity message: {}",
                                                        e
                                                    );
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
                                    Err(err) => {
                                        error!("Transform execution failed: {:?}", err);
                                        let _ = session
                                            .text(
                                                json!({
                                                    "action": "error",
                                                    "notification": {
                                                        "autoClose": true,
                                                        "toastId": entity["id"],
                                                        "message":  err.message,
                                                    },
                                                })
                                                .to_string(),
                                            )
                                            .await;
                                    }
                                }
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
                                    let message = json!({
                                        "action": "error",
                                        "notification": {
                                            "shouldClose": true,
                                            "message": format!("Blueprint not found for entity: {} (tried: {}, {}, {})",
                                                entity_label, snake_case_label, entity_label, entity_label.to_lowercase())
                                        },
                                    });
                                    let _ = session.text(message.to_string()).await;
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
        // Handle position data - ensure it has proper x,y structure
        let position = if let Some(pos) = props.get("position") {
            pos.clone()
        } else {
            // Fallback: construct position from x,y properties
            serde_json::json!({
                "x": props.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0),
                "y": props.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0)
            })
        };

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
fn vertex_to_entity(vertex: &Value, blueprint: &Value) -> Value {
    let mut entity = blueprint.clone();
    let vertex_properties = vertex.get("properties").unwrap_or(vertex);

    if let Some(props) = vertex_properties.as_object() {
        // Set position from database
        let position = serde_json::json!({
            "x": props.get("x").unwrap_or(&serde_json::json!(0)),
            "y": props.get("y").unwrap_or(&serde_json::json!(0))
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
                                if let Some(db_value) = props.get(&snake_case_field) {
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

    entity
}
