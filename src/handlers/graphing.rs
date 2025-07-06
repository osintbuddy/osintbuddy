use crate::db::{Database, age_tx, with_cypher};
use crate::schemas::errors::{AppError, ErrorKind};
use actix_web::{Error, HttpRequest, HttpResponse, Result, web};
use actix_ws::{Message, Session};
use futures_util::StreamExt;
use log::{error, info};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use sqids::Sqids;
use sqlx::{PgPool, Row, types::Uuid};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

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
    #[serde(rename = "createNode")]
    pub create_node: CreateNodeSchema,
    pub hid: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WebSocketMessage {
    pub action: String,
    pub node: Option<Value>,
    pub entity: Option<CreateEntityPayload>,
    pub viewport: Option<Value>,
    pub token: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WebSocketResponse {
    pub action: String,
    pub nodes: Option<Vec<Value>>,
    pub edges: Option<Vec<Value>>,
    pub detail: Option<bool>,
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

pub async fn get_blueprints() -> Result<HashMap<String, Value>, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let response = client
        .get("http://127.0.0.1:42562/blueprint?label=_osib_all")
        .send()
        .await?;

    let data: Vec<Value> = response.json().await?;
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
    _viewport: Option<&Value>,
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
            "SELECT * FROM cypher('{}', $$ MATCH (v)-[e]->() RETURN e $$) as (e agtype)",
            graph_name
        ),
        tx.as_mut(),
    )
    .await?;

    Ok((vertices, edges))
}

pub async fn read_graph(
    pool: &PgPool,
    session: &mut Session,
    viewport_event: Option<&Value>,
    graph_name: String,
) -> Result<(), AppError> {
    let blueprints = get_blueprints().await.map_err(|err| {
        error!("{err}");
        AppError {
            message: "We ran into an error reading your graph!",
            kind: ErrorKind::Critical,
        }
    })?;
    let Ok(graph_result) = load_nodes_from_db(pool, graph_name, viewport_event).await else {
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

    let response = json!({
        "action": "isInitialRead".to_string(),
        "nodes": processed_nodes,
        "edges": processed_edges,
        "detail": null,
        "message": null,
        "node": null,
    })
    .to_string();
    session.text(response).await.map_err(|err| {
        error!("{err}");
        AppError {
            message: "We ran into an error reading your graph!",
            kind: ErrorKind::Critical,
        }
    })?;
    Ok(())
}

pub async fn update_node(
    pool: &PgPool,
    node: &Value,
    graph_uuid: &Uuid,
) -> Result<(), sqlx::Error> {
    if let Some(vertex_id) = node.get("id").and_then(|v| v.as_str()) {
        for (key, value) in node.as_object().unwrap() {
            if key == "id" {
                continue;
            }

            let snake_key = to_snake_case(key);
            let query = if value.is_string() {
                format!(
                    "SELECT * FROM cypher('g_{}', $$ MATCH (v) WHERE id(v)={} SET v.{} = '{}' $$) as (v agtype)",
                    graph_uuid.simple(),
                    vertex_id,
                    snake_key,
                    value.as_str().unwrap_or("")
                )
            } else {
                format!(
                    "SELECT * FROM cypher('g_{}', $$ MATCH (v) WHERE id(v)={} SET v.{} = {} $$) as (v agtype)",
                    graph_uuid.simple(),
                    vertex_id,
                    snake_key,
                    value
                )
            };

            sqlx::query(&query).execute(pool).await?;
        }
    }

    Ok(())
}

pub async fn remove_node(
    pool: &PgPool,
    session: &mut Session,
    node: &Value,
    graph_uuid: &Uuid,
) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(node_id) = node.get("id").and_then(|v| v.as_str()) {
        let check_edges_query = format!(
            "SELECT * FROM cypher('g_{}', $$ MATCH (s)-[e]->() WHERE id(s)={} RETURN e $$) as (e agtype)",
            graph_uuid.simple(),
            node_id
        );

        let edge_rows = sqlx::query(&check_edges_query).fetch_all(pool).await?;

        let delete_query = if edge_rows.is_empty() {
            format!(
                "SELECT * FROM cypher('g_{}', $$ MATCH (v) WHERE id(v)={} DELETE v $$) as (v agtype)",
                graph_uuid.simple(),
                node_id
            )
        } else {
            format!(
                "SELECT * FROM cypher('g_{}', $$ MATCH (v) WHERE id(v)={} DETACH DELETE v $$) as (v agtype)",
                graph_uuid.simple(),
                node_id
            )
        };

        sqlx::query(&delete_query).execute(pool).await?;

        let response = WebSocketResponse {
            action: "removeEntity".to_string(),
            nodes: None,
            edges: None,
            detail: None,
            message: None,
            node: Some(node.clone()),
        };

        let message = serde_json::to_string(&response)?;
        session.text(message).await?;
    }

    Ok(())
}

pub async fn save_node_on_drop(
    pool: &PgPool,
    node_label: &str,
    blueprint: &Value,
    graph_uuid: &Uuid,
) -> Result<Value, Box<dyn std::error::Error>> {
    let default_position = serde_json::json!({"x": 0, "y": 0});
    let position = blueprint.get("position").unwrap_or(&default_position);
    let position_props = dict_to_opencypher(position);

    let query = format!(
        "SELECT * FROM cypher('g_{}', $$ CREATE (v:{} {}) RETURN v $$) as (v agtype)",
        graph_uuid.simple(),
        to_snake_case(node_label),
        position_props
    );

    let row = sqlx::query(&query).fetch_one(pool).await?;
    let vertex_str: String = row.get(0);
    let cleaned = vertex_str.replace("::vertex", "");
    let vertex_properties: Value = serde_json::from_str(&cleaned)?;

    let mut result = blueprint.clone();
    result.as_object_mut().unwrap().insert(
        "id".to_string(),
        serde_json::Value::String(vertex_properties.get("id").unwrap().to_string()),
    );
    result.as_object_mut().unwrap().insert(
        "type".to_string(),
        serde_json::Value::String("edit".to_string()),
    );

    Ok(result)
}

// Websocket sessions store
type GraphUsers = Arc<RwLock<HashMap<String, Arc<RwLock<Session>>>>>;

pub async fn websocket_handler(
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
                                    session
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
                                        let auth_response = WebSocketResponse {
                                            action: "authenticated".to_string(),
                                            nodes: None,
                                            edges: None,
                                            detail: None,
                                            message: Some("Authentication successful".to_string()),
                                            node: None,
                                        };
                                        if let Ok(message) = serde_json::to_string(&auth_response) {
                                            let _ = session.text(message).await;
                                        }
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
                            "update:node" => {
                                if let Some(node) = &event.node {
                                    let _ = update_node(pool.as_ref(), node, &graph_uuid).await;
                                }
                            }
                            "delete:node" => {
                                if let Some(node) = &event.node {
                                    let _ =
                                        remove_node(pool.as_ref(), &mut session, node, &graph_uuid)
                                            .await;
                                }
                            }
                            "read:graph" => {
                                let _ = read_graph(
                                    pool.as_ref(),
                                    &mut session,
                                    event.viewport.as_ref(),
                                    graph_name,
                                )
                                .await;
                                let response = WebSocketResponse {
                                    action: "isLoading".to_string(),
                                    nodes: None,
                                    edges: None,
                                    detail: Some(false),
                                    message: Some("Success! You've been reconnected!".to_string()),
                                    node: None,
                                };
                                if let Ok(message) = serde_json::to_string(&response) {
                                    let _ = session.text(message).await;
                                }
                            }
                            "initial:graph" => {
                                let _ = read_graph(
                                    pool.as_ref(),
                                    &mut session,
                                    event.viewport.as_ref(),
                                    graph_name,
                                )
                                .await;

                                let success_response = WebSocketResponse {
                                    action: "isLoading".to_string(),
                                    nodes: None,
                                    edges: None,
                                    detail: Some(false),
                                    message: Some(
                                        "Success! Your graph environment is ready for use."
                                            .to_string(),
                                    ),
                                    node: None,
                                };
                                if let Ok(message) = serde_json::to_string(&success_response) {
                                    let _ = session.text(message).await;
                                }
                            }
                            "transform:node" => {
                                let loading_response = WebSocketResponse {
                                    action: "isLoading".to_string(),
                                    nodes: None,
                                    edges: None,
                                    detail: Some(true),
                                    message: None,
                                    node: None,
                                };
                                if let Ok(message) = serde_json::to_string(&loading_response) {
                                    let _ = session.text(message).await;
                                }
                            }
                            "create:entity" => {
                                if let Some(entity_data) = &event.entity {
                                    // Get blueprint for the entity label
                                    if let Ok(blueprints) = get_blueprints().await {
                                        let snake_case_label =
                                            to_snake_case(&entity_data.create_node.label);

                                        if let Some(blueprint) = blueprints.get(&snake_case_label) {
                                            let mut blueprint_with_position = blueprint.clone();
                                            blueprint_with_position
                                                .as_object_mut()
                                                .unwrap()
                                                .insert(
                                                    "position".to_string(),
                                                    serde_json::to_value(
                                                        &entity_data.create_node.position,
                                                    )
                                                    .unwrap(),
                                                );

                                            // Create the node in the graph database
                                            if let Ok(raw_result) = save_node_on_drop(
                                                pool.as_ref(),
                                                &entity_data.create_node.label,
                                                &blueprint_with_position,
                                                &graph_uuid,
                                            )
                                            .await
                                            {
                                                // Process the created node through vertex_to_entity to format it correctly for ReactFlow
                                                let processed_node =
                                                    vertex_to_entity(&raw_result, blueprint);

                                                // Send the created node back to frontend
                                                let response = WebSocketResponse {
                                                    action: "entityCreated".to_string(),
                                                    nodes: None,
                                                    edges: None,
                                                    detail: None,
                                                    message: None,
                                                    node: Some(processed_node),
                                                };
                                                if let Ok(message) =
                                                    serde_json::to_string(&response)
                                                {
                                                    let _ = session.text(message).await;
                                                }
                                            }
                                        }
                                    }
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

fn to_snake_case(s: &str) -> String {
    let mut result = String::new();
    let mut prev_char_was_uppercase = false;

    for (i, c) in s.chars().enumerate() {
        if c.is_uppercase() {
            if i > 0 && !prev_char_was_uppercase {
                result.push('_');
            }
            result.push(c.to_lowercase().next().unwrap());
            prev_char_was_uppercase = true;
        } else {
            result.push(c);
            prev_char_was_uppercase = false;
        }
    }

    result
}

fn vertex_to_entity(vertex: &Value, blueprint: &Value) -> Value {
    let mut entity = blueprint.clone();
    let vertex_properties = vertex.get("properties").unwrap_or(vertex);

    if let Some(props) = vertex_properties.as_object() {
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
