use log::{debug, error, info};
use serde_json::Value as JsonValue;
use std::time::Duration;
use tokio::process::Command;

#[derive(thiserror::Error, Debug)]
pub enum VmError {
    #[error("unsupported job kind: {0}")]
    Unsupported(String),
    #[error("vm launch error: {0}")]
    Launch(String),
}

// Development: run local `ob` CLI with the job payload.
// Production: placeholder until Firecracker integration is ready.
pub async fn execute_job(payload: &JsonValue) -> Result<Option<JsonValue>, VmError> {
    let cfg = common::config::CFG.get_or_init(common::config::cfg).await;
    let env = cfg.environment.as_str();

    if env.eq_ignore_ascii_case("development") {
        // Call: ob run -T '<payload-json>'
        let payload_s = serde_json::to_string(payload)
            .map_err(|e| VmError::Launch(format!("payload encode error: {}", e)))?;

        info!("executing job via ob CLI (dev)");
        debug!("payload: {}", payload_s);

        let mut cmd = Command::new("ob");
        cmd.arg("run").arg("-T").arg(payload_s);
        let output = cmd
            .output()
            .await
            .map_err(|e| VmError::Launch(e.to_string()))?;

        if output.status.success() {
            // Optionally log stdout for visibility during dev
            if !output.stdout.is_empty() {
                if let Ok(s) = String::from_utf8(output.stdout.clone()) {
                    info!("ob stdout: {}", s.trim());
                }
            }
            if !output.stderr.is_empty() {
                if let Ok(s) = String::from_utf8(output.stderr.clone()) {
                    debug!("ob stderr: {}", s.trim());
                }
            }
            // Try to parse JSON result from stdout (entire body or last JSON-looking chunk)
            let parsed = (|| {
                let s = String::from_utf8(output.stdout.clone()).ok()?;
                // Try entire stdout first
                if let Ok(v) = serde_json::from_str::<JsonValue>(&s) {
                    return Some(v);
                }
                // Heuristic: find first '{' or '[' and parse from there
                if let Some(idx) = s.find('{').or_else(|| s.find('[')) {
                    let tail = &s[idx..];
                    if let Ok(v) = serde_json::from_str::<JsonValue>(tail.trim()) {
                        return Some(v);
                    }
                }
                // Fallback: last non-empty line
                if let Some(last) = s.lines().rev().find(|l| !l.trim().is_empty()) {
                    if let Ok(v) = serde_json::from_str::<JsonValue>(last.trim()) {
                        return Some(v);
                    }
                }
                None
            })();

            Ok(parsed)
        } else {
            let code = output.status.code().unwrap_or(-1);
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);
            error!(
                "ob failed (code={}): {} | {}",
                code,
                stdout.trim(),
                stderr.trim()
            );
            Err(VmError::Launch(format!("ob exit code {}", code)))
        }
    } else {
        // Production path: placeholder until Firecracker integration
        tokio::time::sleep(Duration::from_millis(250)).await;
        Ok(None)
    }
}
