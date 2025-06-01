use chrono::prelude::*;
use serde::{Deserialize, Serialize};

use super::error::{ErrorKind, ErrorResponse};

#[derive(Debug, Deserialize, Serialize)]
pub struct Graph {
    #[serde(skip_serializing)]
    pub id: i64,
    pub uuid: i64,
    pub label: String,
    pub description: String,
    pub owner_id: i64,
    pub ctime: Option<DateTime<Utc>>,
    pub mtime: Option<DateTime<Utc>>,
}
