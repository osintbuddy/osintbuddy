use env_logger::Env;
use firecracker_rs_sdk::firecracker::FirecrackerOption;
use firecracker_rs_sdk::models::{
    BootSource, Drive, MachineConfiguration, NetworkInterface, Vsock,
};
use futures_util::StreamExt as _;
use lapin::{Channel, Connection, ConnectionProperties, options::*, types::FieldTable};
use log::{error, info, warn};
use uuid::Uuid;

#[derive(Debug, serde::Deserialize)]
struct JobMessage {
    // job identifier; opaque to worker, used in logs
    id: Option<String>,
    // optional override boot args
    boot_args: Option<String>,
    // optional override rootfs path
    rootfs: Option<String>,
    // optional override kernel path
    kernel: Option<String>,
}

fn amqp_url() -> String {
    std::env::var("AMQP_URL").unwrap_or_else(|_| "amqp://guest:guest@queue:5672//".to_string())
}

fn env_or_default(key: &str, default: &str) -> String {
    std::env::var(key).unwrap_or_else(|_| default.to_string())
}

async fn handle_delivery(channel: &Channel, delivery: lapin::message::Delivery) -> Result<(), ()> {
    let job: JobMessage = match serde_json::from_slice(&delivery.data) {
        Ok(j) => j,
        Err(e) => {
            warn!("invalid job payload; acking. error={}", e);
            channel
                .basic_ack(delivery.delivery_tag, BasicAckOptions::default())
                .await
                .ok();
            return Ok(());
        }
    };

    let id = job
        .id
        .unwrap_or_else(|| format!("job-{}", Uuid::new_v4().to_string()));

    let firecracker_bin = env_or_default("FIRECRACKER_BIN", "/usr/bin/firecracker");
    let kernel = job
        .kernel
        .unwrap_or_else(|| env_or_default("KERNEL_IMAGE", "/artifacts/vmlinux.bin"));
    let rootfs = job
        .rootfs
        .unwrap_or_else(|| env_or_default("ROOTFS_IMAGE", "/artifacts/rootfs.ext4"));
    let boot_args = job
        .boot_args
        .unwrap_or_else(|| env_or_default("BOOT_ARGS", "console=ttyS0 reboot=k panic=1 pci=off"));

    let api_sock = format!("/tmp/firecracker-{}.sock", Uuid::new_v4());
    info!(
        "starting microVM for {} (kernel={}, rootfs={})",
        &id, kernel, rootfs
    );

    // Run blocking Firecracker SDK calls off the async executor
    let result = tokio::task::spawn_blocking(async move || -> Result<(), ()> {
        let instance = FirecrackerOption::new(&firecracker_bin)
            .api_sock(&api_sock)
            .id(&id)
            .build();

        let mut instance = instance.unwrap();
        let _ = instance.start_vmm().await;

        let _ = instance
            .put_machine_configuration(&MachineConfiguration {
                cpu_template: None,
                smt: Some(false),
                mem_size_mib: 1024,
                track_dirty_pages: None,
                vcpu_count: 2,
                huge_pages: None,
            })
            .await;

        let _ = instance.put_guest_boot_source(&BootSource {
            boot_args: Some(boot_args.clone()),
            initrd_path: None,
            kernel_image_path: kernel.into(),
        });

        // Optional network: TAP/veth
        if let Ok(tap_name) = std::env::var("TAP_NAME") {
            let guest_mac = std::env::var("GUEST_MAC").ok();
            let net = NetworkInterface {
                iface_id: "eth0".into(),
                host_dev_name: tap_name.into(),
                guest_mac,
                rx_rate_limiter: None,
                tx_rate_limiter: None,
            };
            let _ = instance.put_guest_network_interface_by_id(&net);
        }

        // Optional vsock support
        let enable_vsock = std::env::var("ENABLE_VSOCK")
            .map(|v| matches!(v.as_str(), "1" | "true" | "TRUE" | "yes" | "on"))
            .unwrap_or(false);
        if enable_vsock {
            let vsock_dir = env_or_default("VSOCK_DIR", "/sockets");
            let uds_path = format!("{}/vsock-{}.sock", vsock_dir, Uuid::new_v4());
            let guest_cid: u32 = env_or_default("VSOCK_GUEST_CID", "3").parse().unwrap_or(3);
            let vsock = Vsock {
                vsock_id: String::from("vsock0").into(),
                guest_cid,
                uds_path: uds_path.clone().into(),
            };
            let _ = instance.put_guest_vsock(&vsock);
        }

        let _ = instance
            .put_guest_drive_by_id(&Drive {
                drive_id: "rootfs".into(),
                partuuid: None,
                is_root_device: true,
                cache_type: None,
                is_read_only: false,
                path_on_host: rootfs.clone().into(),
                rate_limiter: None,
                io_engine: None,
                socket: None,
            })
            .await;

        let _ = instance.start();

        // In a real worker, you'd now communicate with the VM, run tasks, etc.
        // For this integration, keep it alive briefly, then stop.
        std::thread::sleep(std::time::Duration::from_secs(5));
        let _ = instance.stop();
        let _ = std::fs::remove_file(&api_sock);
        Ok(())
    })
    .await;

    channel
        .basic_ack(delivery.delivery_tag, BasicAckOptions::default())
        .await;
    // match result {
    //     Ok(_) => {
    //         channel
    //             .basic_ack(delivery.delivery_tag, BasicAckOptions::default())
    //             .await
    //             .context("acking message")?;
    //     }
    //     Err(err) => {
    //         error!("vm error: {}", err);
    //         channel
    //             .basic_nack(
    //                 delivery.delivery_tag,
    //                 BasicNackOptions {
    //                     requeue: false,
    //                     multiple: false,
    //                 },
    //             )
    //             .await
    //             .ok();
    //     }
    // }

    Ok(())
}

#[tokio::main]
async fn main() {
    env_logger::init_from_env(Env::default().default_filter_or("info"));
    let url = amqp_url();
    info!("worker connecting to {}", url);

    let conn = match Connection::connect(&url, ConnectionProperties::default()).await {
        Ok(c) => c,
        Err(e) => {
            error!("amqp connection error: {}", e);
            return;
        }
    };

    let channel = match conn.create_channel().await {
        Ok(ch) => ch,
        Err(e) => {
            error!("channel error: {}", e);
            return;
        }
    };

    channel
        .queue_declare(
            "jobs",
            QueueDeclareOptions {
                durable: true,
                ..Default::default()
            },
            FieldTable::default(),
        )
        .await
        .ok();

    let mut consumer = channel
        .basic_consume(
            "jobs",
            "worker",
            BasicConsumeOptions::default(),
            FieldTable::default(),
        )
        .await
        .expect("create consumer");

    info!("worker initialized; awaiting messages from 'jobs'");
    while let Some(delivery) = consumer.next().await {
        match delivery {
            Ok(delivery) => {
                if let Err(e) = handle_delivery(&channel, delivery).await {
                    error!("delivery handling error: {:?}", e);
                }
            }
            Err(e) => {
                error!("consumer error: {}", e);
            }
        }
    }
}
