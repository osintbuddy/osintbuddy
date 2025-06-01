use sqlx::{PgPool, postgres::PgPoolOptions};

use crate::core::utils;

pub async fn establish_pool_connection(database_url: &str) -> Result<PgPool, sqlx::Error> {
    utils::retry!(
        async {
            println!("Attempting to establish db pool connection...");
            PgPoolOptions::new()
                .max_connections(64)
                .connect(database_url)
                .await
        }
        .await,
        4,
        5000
    )
}
