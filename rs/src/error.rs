use core::fmt;
use serde::Serialize;
use serde_json::json;

#[derive(Debug, Serialize)]
#[serde(deny_unknown_fields, rename_all_fields = "lowercase")]
pub enum ErrorKind {
    #[serde(rename = "invalid")]
    InvalidInput,
    Critical,
    #[serde(rename = "data")]
    Database,
    Exists,
}

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub message: &'static str,
    pub kind: ErrorKind,
}

impl fmt::Display for ErrorResponse {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "{}",
            serde_json::to_string(&self).unwrap_or(
                json!({
                    "message": "A critical error has occured.",
                    "kind": "critical".to_string()}
                )
                .to_string()
            )
        )
    }
}
