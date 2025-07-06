use crate::db::Database;
use crate::middleware::auth::AuthMiddleware;
use actix_web::{Error, HttpRequest, HttpResponse, Result, web};
use actix_ws::{Message, Session};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqids::Sqids;
use sqlx::{PgPool, Row, types::Uuid};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

type GraphUsers = Arc<RwLock<HashMap<String, Arc<RwLock<Session>>>>>;

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
pub struct WebSocketMessage {
    pub action: String,
    pub node: Option<Value>,
    pub viewport: Option<Value>,
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

pub async fn get_blueprints() -> Result<HashMap<String, Value>, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let response = client
        .get("http://plugins:42562/blueprint?label=_osib_all")
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
    let response = client.get("http://plugins:42562/refresh").send().await?;

    let entities: Value = response.json().await?;
    Ok(serde_json::json!({
        "status": "success",
        "plugins": entities
    }))
}

pub async fn load_nodes_from_db(
    pool: &PgPool,
    graph_uuid: &Uuid,
    _viewport: Option<&Value>,
) -> Result<(Vec<Value>, Vec<Value>), sqlx::Error> {
    let vertices_query = format!(
        "SELECT * FROM cypher('g_{}', $$ MATCH (v) RETURN v $$) as (v agtype)",
        graph_uuid.simple()
    );

    let edges_query = format!(
        "SELECT * FROM cypher('g_{}', $$ MATCH ()-[e]->() RETURN e $$) as (e agtype)",
        graph_uuid.simple()
    );

    let vertex_rows = sqlx::query(&vertices_query).fetch_all(pool).await?;

    let mut vertices = Vec::new();
    for row in vertex_rows {
        let vertex_str: String = row.get(0);
        let cleaned = vertex_str.replace("::vertex", "");
        if let Ok(vertex) = serde_json::from_str::<Value>(&cleaned) {
            vertices.push(vertex);
        }
    }

    let edge_rows = sqlx::query(&edges_query).fetch_all(pool).await?;

    let mut edges = Vec::new();
    for row in edge_rows {
        let edge_str: String = row.get(0);
        let cleaned = edge_str.replace("::edge", "");
        if let Ok(edge) = serde_json::from_str::<Value>(&cleaned) {
            edges.push(edge);
        }
    }

    Ok((vertices, edges))
}

pub async fn read_graph(
    pool: &PgPool,
    session: &mut Session,
    viewport_event: Option<&Value>,
    project_uuid: &Uuid,
    is_initial_read: bool,
) -> Result<(), Box<dyn std::error::Error>> {
    let blueprints = get_blueprints().await?;
    let (vertices, edges) = load_nodes_from_db(pool, project_uuid, viewport_event).await?;

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

    let response = WebSocketResponse {
        action: if is_initial_read {
            "isInitialRead"
        } else {
            "read"
        }
        .to_string(),
        nodes: Some(processed_nodes),
        edges: Some(processed_edges),
        detail: None,
        message: None,
        node: None,
    };

    let message = serde_json::to_string(&response)?;
    session.text(message).await?;

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

pub async fn websocket_handler(
    req: HttpRequest,
    stream: web::Payload,
    pool: Database,
    _graph_users: web::Data<GraphUsers>,
    auth: AuthMiddleware,
    graph_id: web::Path<String>,
    sqids: web::Data<Sqids>,
) -> Result<HttpResponse, Error> {
    let (response, mut session, mut msg_stream) = actix_ws::handle(&req, stream)?;

    // Extract user ID from auth middleware
    let _user_id = auth.account_id.to_string();

    // Extract and decode graph UUID from path parameters
    let graph_ids = sqids.decode(&graph_id);
    let decoded_id = graph_ids
        .first()
        .ok_or_else(|| actix_web::error::ErrorBadRequest("Invalid graph ID"))?
        as &u64;

    // Get the graph from database to validate access and get UUID
    let graph = sqlx::query!(
        "SELECT uuid FROM graphs WHERE id = $1 AND owner_id = $2",
        *decoded_id as i64,
        auth.account_id
    )
    .fetch_one(pool.as_ref())
    .await
    .map_err(|_| actix_web::error::ErrorNotFound("Graph not found or access denied"))?;

    let graph_uuid = graph
        .uuid
        .ok_or_else(|| actix_web::error::ErrorInternalServerError("Graph UUID not found"))?;

    actix_web::rt::spawn(async move {
        while let Some(Ok(msg)) = msg_stream.next().await {
            match msg {
                Message::Text(text) => {
                    if let Ok(event) = serde_json::from_str::<WebSocketMessage>(&text) {
                        let action_parts: Vec<&str> = event.action.split(':').collect();
                        if action_parts.len() < 2 {
                            continue;
                        }

                        let action = action_parts[0];
                        let target = action_parts[1];

                        match (action, target) {
                            ("update", "node") => {
                                if let Some(node) = &event.node {
                                    let _ = update_node(pool.as_ref(), node, &graph_uuid).await;
                                }
                            }
                            ("delete", "node") => {
                                if let Some(node) = &event.node {
                                    let _ =
                                        remove_node(pool.as_ref(), &mut session, node, &graph_uuid)
                                            .await;
                                }
                            }
                            ("read", "graph") => {
                                let _ = read_graph(
                                    pool.as_ref(),
                                    &mut session,
                                    event.viewport.as_ref(),
                                    &graph_uuid,
                                    false,
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
                            ("initial", "graph") => {
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

                                let _ = read_graph(
                                    pool.as_ref(),
                                    &mut session,
                                    event.viewport.as_ref(),
                                    &graph_uuid,
                                    true,
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
                            ("transform", "node") => {
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
