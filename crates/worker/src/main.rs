use env_logger::Env;
use log::info;

mod poller;
mod vm;

#[tokio::main]
async fn main() {
    env_logger::init_from_env(Env::default().default_filter_or("info"));

    let cfg = common::config::CFG.get_or_init(common::config::cfg).await;
    let pool = common::db::db_pool(Some(0)).await;

    let owner = cfg
        .worker_owner
        .clone()
        .unwrap_or_else(|| hostname::get().unwrap_or_default().to_string_lossy().to_string());
    let lease_secs = cfg.worker_lease_seconds.unwrap_or(300);
    let batch = cfg.worker_batch.unwrap_or(8);
    let tick = cfg.worker_tick_ms.unwrap_or(500);

    info!("OSIB worker starting: owner={} lease={}s batch={} tick={}ms", owner, lease_secs, batch, tick);

    poller::run_loop(pool, owner, lease_secs, batch, tick).await;
}
