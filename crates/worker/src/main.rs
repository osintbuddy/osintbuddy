use env_logger::Env;
use log::{info};



#[tokio::main]
async fn main() {
    env_logger::init_from_env(Env::default().default_filter_or("info"));
   
    info!("OSIB worker is now running...");
}
