use common::jobs;
use log::{error, info, warn};
use sqlx::PgPool;
use std::time::Duration;

use crate::vm;

pub async fn run_loop(pool: PgPool, owner: String, lease_secs: i32, batch: i64, tick_ms: u64) {
    info!(
        "Worker poller started owner={} lease={}s batch={} tick={}ms",
        owner, lease_secs, batch, tick_ms
    );
    loop {
        match jobs::lease_jobs(&pool, &owner, lease_secs, batch).await {
            Ok(mut leased) if leased.is_empty() => {
                tokio::time::sleep(Duration::from_millis(tick_ms)).await;
            }
            Ok(mut leased) => {
                info!("leased {} job(s)", leased.len());
                for job in leased.drain(..) {
                    let pool_clone = pool.clone();
                    let owner_clone = owner.clone();
                    tokio::spawn(async move {
                        if let Err(e) = jobs::start_job(&pool_clone, job.job_id, &owner_clone).await
                        {
                            error!("start_job failed {}: {}", job.job_id, e);
                            return;
                        }
                        // TODO: Remove kind field, all jobs will be of one kind for now (Python)
                        // Execute using firecracker VM stub
                        // let res = vm::execute_job(&job.kind, &job.payload).await;
                        // match res {
                        //     Ok(_) => {
                        //         if let Err(e) = jobs::complete_job(&pool_clone, job.job_id, &owner_clone).await {
                        //             error!("complete_job error {}: {}", job.job_id, e);
                        //         }
                        //     }
                        //     Err(e) => {
                        //         warn!("job failed {}: {}", job.job_id, e);
                        //         // simple backoff: 10s
                        //         let _ = jobs::fail_job(&pool_clone, job.job_id, &owner_clone, 10).await;
                        //     }
                        // }
                    });
                }
            }
            Err(e) => {
                error!("lease_jobs error: {}", e);
                tokio::time::sleep(Duration::from_millis(1000)).await;
            }
        }
    }
}
