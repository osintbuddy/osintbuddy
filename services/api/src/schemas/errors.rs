use actix_web::{
    HttpResponse, error,
    http::{StatusCode, header::ContentType},
};
use core::fmt;
use serde::Serialize;
use serde_json::json;

#[derive(Debug, Serialize)]
#[serde(deny_unknown_fields, rename_all = "snake_case")]
#[derive(Debug, Serialize)]
pub struct AppError {
    pub message: &'static str,
}

impl error::ResponseError for AppError {
    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(self.status_code())
            .insert_header(ContentType::json())
            .body(self.to_string())
    }

    fn status_code(&self) -> StatusCode {
        StatusCode::UNPROCESSABLE_ENTITY
    }
}

impl fmt::Display for AppError {
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
