use env_logger::Env;
use log::info;

mod poller;
mod vm;

#[tokio::main]
async fn main() {
    env_logger::init_from_env(Env::default().default_filter_or("info"));

    let cfg = common::config::CFG.get_or_init(common::config::cfg).await;
    let pool = common::db::db_pool(Some(0)).await;

    let owner = hostname::get()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let lease_secs = cfg.worker_lease_seconds;
    let batch = cfg.worker_batch;
    let tick = cfg.worker_tick_ms;

    info!(
        "OSIB worker starting: owner={} lease={}s batch={} tick={}ms",
        owner, lease_secs, batch, tick
    );

    poller::run_loop(pool, owner, lease_secs, batch, tick).await;
}
