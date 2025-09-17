use env_logger::Env;
use log::info;
use std::io;

#[actix_web::main]
async fn main() -> io::Result<()> {
    let cfg: &common::config::AppConfig =
        common::config::CFG.get_or_init(common::config::cfg).await;
    env_logger::init_from_env(Env::default().default_filter_or(&cfg.log_level));
    info!("Starting OSIB, please ensure your database is online to continue.");
    api::run(cfg).await
}
