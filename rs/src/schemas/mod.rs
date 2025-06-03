use serde::{Deserialize, Serialize};

pub mod errors;
pub mod graphs;
pub mod user;

#[derive(Deserialize, Serialize)]
pub struct Notification {
    pub message: &'static str,
}
