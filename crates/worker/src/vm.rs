use serde_json::Value as JsonValue;
use std::time::Duration;

#[derive(thiserror::Error, Debug)]
pub enum VmError {
    #[error("unsupported job kind: {0}")]
    Unsupported(String),
    #[error("vm launch error: {0}")]
    Launch(String),
}

// Placeholder: integrate with firecracker later. Keep API stable.
pub async fn execute_job(_payload: &JsonValue) -> Result<(), VmError> {
    // Simulate work; replace with firecracker sandbox launch
    tokio::time::sleep(Duration::from_millis(250)).await;
    Ok(())
}
