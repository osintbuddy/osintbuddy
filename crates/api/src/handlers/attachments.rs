use actix_multipart::Multipart;
use actix_web::{HttpResponse, Result, post, get, delete};
use actix_web::web::{Data, Query, Path};
use chrono::Utc;
use futures_util::TryStreamExt as _;
use serde_json::Value as JsonValue;
use sqlx::types::Uuid;
use sqids::Sqids;

use crate::db;
use crate::AppData;
use crate::middleware::auth::AuthMiddleware;
use crate::schemas::attachments::UploadAttachmentResponse;
use common::errors::AppError;
use common::eventstore::{self, AppendEvent};

#[post("/entities/attachments")]
pub async fn upload_entity_attachment_handler(
    mut payload: Multipart,
    pool: db::Database,
    auth: AuthMiddleware,
    app: AppData,
    sqids: Data<Sqids>,
) -> Result<HttpResponse, AppError> {
    let mut graph_id_str: Option<String> = None;
    let mut graph_uuid: Option<Uuid> = None;
    let mut entity_id: Option<Uuid> = None;
    let mut filename: Option<String> = None;
    let mut media_type: Option<String> = None;
    let mut bytes: Vec<u8> = Vec::new();
    let mut meta: JsonValue = JsonValue::Object(Default::default());

    while let Some(field) = payload
        .try_next()
        .await
        .map_err(|_| AppError { message: "Malformed multipart payload." })?
    {
        let mut field = field;
        let name = field.name().to_string();
        match name.as_str() {
            "graph_id" => {
                let mut buf = Vec::new();
                while let Some(chunk) = field.try_next().await.map_err(|_| AppError { message: "Invalid form field graph_id." })? {
                    buf.extend_from_slice(&chunk);
                }
                let s = String::from_utf8(buf).map_err(|_| AppError { message: "graph_id must be UTF-8." })?;
                graph_id_str = Some(s.trim().to_string());
            }
            "entity_id" => {
                let mut buf = Vec::new();
                while let Some(chunk) = field.try_next().await.map_err(|_| AppError { message: "Invalid form field entity_id." })? {
                    buf.extend_from_slice(&chunk);
                }
                let s = String::from_utf8(buf).map_err(|_| AppError { message: "entity_id must be UTF-8." })?;
                entity_id = Uuid::parse_str(s.trim()).ok();
            }
            "meta" => {
                let mut buf = Vec::new();
                while let Some(chunk) = field.try_next().await.map_err(|_| AppError { message: "Invalid form field meta." })? {
                    buf.extend_from_slice(&chunk);
                }
                if !buf.is_empty() {
                    let s = String::from_utf8(buf).map_err(|_| AppError { message: "meta must be UTF-8 JSON." })?;
                    meta = serde_json::from_str(&s).map_err(|_| AppError { message: "meta must be valid JSON." })?;
                }
            }
            "file" => {
                // filename and content-type
                let cd = field.content_disposition();
                if let Some(f) = cd.get_filename() {
                    filename = Some(f.to_string());
                }
                let ct = field.content_type();
                if let Some(ct) = ct {
                    media_type = Some(ct.to_string());
                }
                while let Some(chunk) = field.try_next().await.map_err(|_| AppError { message: "Error reading upload stream." })? {
                    bytes.extend_from_slice(&chunk);
                    let max_mb = app.cfg.upload_max_inline_mb.unwrap_or(10);
                    let max_bytes = (max_mb as usize).saturating_mul(1024 * 1024);
                    if bytes.len() > max_bytes {
                        return Err(AppError { message: "File too large." });
                    }
                }
            }
            _ => {
                // Drain unknown field to keep parser happy
                while let Some(_) = field.try_next().await.map_err(|_| AppError { message: "Invalid multipart." })? {}
            }
        }
    }

    // Resolve graph_id: accept UUID directly or sqid of numeric id
    if let Some(ref gid) = graph_id_str {
        graph_uuid = Uuid::parse_str(gid).ok();
        if graph_uuid.is_none() {
            let decoded = sqids.decode(gid);
            if let Some(numeric_id) = decoded.first() {
                // lookup uuid for this numeric id and owner
                if let Ok(row) = sqlx::query!(
                    r#"SELECT uuid FROM cases WHERE id = $1 AND owner_id = $2"#,
                    *numeric_id as i64,
                    auth.account_id
                )
                .fetch_one(pool.as_ref())
                .await
                {
                    graph_uuid = row.uuid;
                }
            }
        }
    }

    let (graph_uuid, entity_id) = match (graph_uuid, entity_id) {
        (Some(g), Some(e)) => (g, e),
        _ => {
            return Err(AppError { message: "Missing required fields: graph_id and entity_id." });
        }
    };
    let filename = filename.unwrap_or_else(|| "upload".to_string());
    let media_type = media_type.unwrap_or_else(|| "application/octet-stream".to_string());
    let size: i64 = bytes.len() as i64;

    // Insert attachment row
    let (attachment_id, created_at) = sqlx::query_as::<_, (Uuid, chrono::DateTime<Utc>)>(
        r#"
            INSERT INTO entity_attachments(
                graph_id, entity_id, owner_id, filename, media_type, size, bytes, uri, meta
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,NULL,$8)
            RETURNING attachment_id, created_at
        "#
    )
    .bind(graph_uuid)
    .bind(entity_id)
    .bind(auth.account_id)
    .bind(&filename)
    .bind(&media_type)
    .bind(size)
    .bind(bytes)
    .bind(meta)
    .fetch_one(pool.as_ref())
    .await
    .map_err(|_| AppError { message: "Failed to store attachment." })?;

    // Append an event linking the attachment to the entity
    let payload = serde_json::json!({
        "id": entity_id.to_string(),
        "attachment_id": attachment_id.to_string(),
        "filename": filename,
        "media_type": media_type,
        "size": size
    });

    let _ = eventstore::append_event(
        pool.as_ref(),
        AppendEvent {
            category: "entity".to_string(),
            key: graph_uuid.to_string(),
            event_type: "attachment:add".to_string(),
            payload,
            valid_from: Utc::now(),
            valid_to: None,
            correlation_id: None,
            causation_id: None,
            expected_version: None,
            actor_id: Some(auth.account_id.to_string()),
        },
    )
    .await;

    let resp = UploadAttachmentResponse {
        attachment_id: attachment_id.to_string(),
        filename,
        media_type,
        size,
        created_at,
    };

    Ok(HttpResponse::Ok().json(resp))
}

#[derive(serde::Deserialize)]
pub struct ListAttachmentsQuery {
    pub graph_id: String,
    pub entity_id: String,
}

#[derive(serde::Serialize)]
pub struct AttachmentItem {
    pub attachment_id: String,
    pub filename: String,
    pub media_type: String,
    pub size: i64,
    pub created_at: chrono::DateTime<Utc>,
}

#[get("/entities/attachments")]
pub async fn list_entity_attachments_handler(
    pool: db::Database,
    auth: AuthMiddleware,
    app: AppData,
    query: Query<ListAttachmentsQuery>,
    sqids: Data<Sqids>,
) -> Result<HttpResponse, AppError> {
    let mut graph_uuid: Option<Uuid> = None;
    // Accept graph_id as UUID or sqid
    if let Ok(u) = Uuid::parse_str(query.graph_id.as_str()) {
        graph_uuid = Some(u);
    } else {
        let decoded = sqids.decode(&query.graph_id);
        if let Some(numeric_id) = decoded.first() {
            if let Ok(row) = sqlx::query!(
                r#"SELECT uuid FROM cases WHERE id = $1 AND owner_id = $2"#,
                *numeric_id as i64,
                auth.account_id
            )
            .fetch_one(pool.as_ref())
            .await
            {
                graph_uuid = row.uuid;
            }
        }
    }
    let Some(graph_uuid) = graph_uuid else {
        return Err(AppError { message: "Invalid graph id." });
    };
    let Ok(entity_uuid) = Uuid::parse_str(query.entity_id.as_str()) else {
        return Err(AppError { message: "Invalid entity id." });
    };

    let rows = sqlx::query!(
        r#"
        SELECT attachment_id, filename, media_type, size, created_at
        FROM entity_attachments
        WHERE graph_id = $1 AND entity_id = $2 AND owner_id = $3
        ORDER BY created_at DESC
        "#,
        graph_uuid,
        entity_uuid,
        auth.account_id
    )
    .fetch_all(pool.as_ref())
    .await
    .map_err(|_| AppError { message: "Failed to list attachments." })?;

    let items: Vec<AttachmentItem> = rows
        .into_iter()
        .map(|r| AttachmentItem {
            attachment_id: r.attachment_id.to_string(),
            filename: r.filename,
            media_type: r.media_type,
            size: r.size,
            created_at: r.created_at,
        })
        .collect();

    Ok(HttpResponse::Ok().json(items))
}

#[get("/entities/attachments/{attachment_id}")]
pub async fn get_entity_attachment_handler(
    pool: db::Database,
    auth: AuthMiddleware,
    path: Path<String>,
) -> Result<HttpResponse, AppError> {
    let attachment_id = match Uuid::parse_str(path.as_str()) {
        Ok(u) => u,
        Err(_) => return Err(AppError { message: "Invalid attachment id." }),
    };

    let row = sqlx::query!(
        r#"
        SELECT filename, media_type, bytes
        FROM entity_attachments
        WHERE attachment_id = $1 AND owner_id = $2
        "#,
        attachment_id,
        auth.account_id
    )
    .fetch_one(pool.as_ref())
    .await
    .map_err(|_| AppError { message: "Attachment not found." })?;

    let Some(bytes) = row.bytes else {
        return Err(AppError { message: "Attachment stored externally." });
    };

    Ok(HttpResponse::Ok()
        .content_type(row.media_type)
        .append_header((
            actix_web::http::header::CONTENT_DISPOSITION,
            format!("inline; filename=\"{}\"", row.filename.replace('"', "'")),
        ))
        .body(bytes))
}

#[delete("/entities/attachments/{attachment_id}")]
pub async fn delete_entity_attachment_handler(
    pool: db::Database,
    auth: AuthMiddleware,
    path: Path<String>,
) -> Result<HttpResponse, AppError> {
    let attachment_id = match Uuid::parse_str(path.as_str()) {
        Ok(u) => u,
        Err(_) => return Err(AppError { message: "Invalid attachment id." }),
    };

    let res = sqlx::query!(
        r#"DELETE FROM entity_attachments WHERE attachment_id=$1 AND owner_id=$2"#,
        attachment_id,
        auth.account_id
    )
    .execute(pool.as_ref())
    .await
    .map_err(|_| AppError { message: "Failed to delete attachment." })?;

    if res.rows_affected() == 0 {
        return Err(AppError { message: "Attachment not found." });
    }
    Ok(HttpResponse::Ok().finish())
}
