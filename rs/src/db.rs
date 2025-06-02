use crate::utils;
use actix_web::web::Data;
use sqlx::{PgPool, postgres::PgPoolOptions};

pub type Database = Data<PgPool>;
pub async fn establish_pool_connection(database_url: &str) -> Result<PgPool, sqlx::Error> {
    utils::retry!(
        async {
            println!("Attempting to establish db pool connection...");
            PgPoolOptions::new()
                .max_connections(128)
                .connect(database_url)
                .await
        }
        .await,
        4,
        5000
    )
}
