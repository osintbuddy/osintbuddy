use actix_web::web::Query;
use serde::{Deserialize, Serialize};

pub mod entities;
pub mod errors;
pub mod graphs;
pub mod user;

#[derive(Deserialize, Serialize)]
pub struct Notification {
    pub message: &'static str,
}

#[derive(Deserialize, Serialize)]
pub struct PaginateSchema {
    pub skip: i64,
    pub limit: i64,
}

pub type Paginate = Query<PaginateSchema>;

#[derive(Debug, Serialize, Deserialize)]
pub struct GetSchema {
    pub id: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct IdSchema {
    pub id: i64,
}
