use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct UploadAttachmentResponse {
    pub attachment_id: String,
    pub filename: String,
    pub media_type: String,
    pub size: i64,
    pub created_at: DateTime<Utc>,
}
