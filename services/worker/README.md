<p>

## OSINTBuddy Worker Service

> AMQP‑backed job worker that launches Firecracker microVMs to execute sandboxed tasks.

> [!CAUTION]
> ⚠️ Experimental (pre‑alpha). Requires KVM. Interfaces and behavior may change.

</p>

<details open="open">
<summary><b>Table of Contents</b></summary>

- [What is this?](#what-is-this)
- [Responsibilities](#responsibilities)
- [Message Format](#message-format)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Runtime Requirements](#runtime-requirements)
- [Troubleshooting](#troubleshooting)
- [Links](#links)

</details>

### What is this?

An async Rust service that consumes jobs from RabbitMQ and spins up ephemeral Firecracker microVMs to process them. It uses `tokio`, `lapin` for AMQP, and `firecracker-rs-sdk` to configure/start the VM.

### Responsibilities

- Connect to AMQP and consume durable messages from `jobs`.
- For each message: configure VM (machine config, boot source, rootfs, optional TAP/vsock), run briefly, then tear down.
- Acknowledge or negatively acknowledge messages based on success/failure.

### Message Format

Jobs are JSON objects published to the `jobs` queue:

```json
{
  "id": "demo-1",            // optional correlation id
  "boot_args": "console=ttyS0", // optional kernel args
  "rootfs": "/artifacts/rootfs.ext4", // optional override
  "kernel": "/artifacts/vmlinux.bin"  // optional override
}
```

### Quick Start

Run the compose worker:

```bash
docker compose up worker
```

Run the worker with Docker directly:

```bash
docker build -f services/worker/Dockerfile -t osib-worker:latest .
docker run --rm \
  --cap-add NET_ADMIN \
  -e AMQP_URL=amqp://guest:guest@rabbitmq:5672// \
  -e RUST_LOG=info \
  -v /dev/kvm:/dev/kvm \
  -v /dev/net/tun:/dev/net/tun \
  -v $PWD/vmlinux.bin:/artifacts/vmlinux.bin:ro \
  -v $PWD/rootfs.ext4:/artifacts/rootfs.ext4:ro \
  osib-worker:latest
```

Run with Cargo _(host)_

```bash
sudo RUST_LOG=info AMQP_URL=amqp://guest:guest@localhost:5672// cargo run -p worker
```

### Configuration

- AMQP_URL: AMQP connection string. Default `amqp://guest:guest@rabbitmq:5672//`.
- FIRECRACKER_BIN: Path to Firecracker binary. Default `/usr/bin/firecracker`.
- KERNEL_IMAGE: Path to kernel image. Default `/artifacts/vmlinux.bin`.
- ROOTFS_IMAGE: Path to rootfs image. Default `/artifacts/rootfs.ext4`.
- BOOT_ARGS: Kernel boot args. Default `console=ttyS0 reboot=k panic=1 pci=off`.
- TAP_NAME: Optional TAP device name to attach (enables guest networking).
- GUEST_MAC: Optional guest MAC address used with TAP.
- ENABLE_VSOCK: Enable vsock device (`true/1/on/yes`).
- VSOCK_DIR: Directory for vsock UDS sockets. Default `/sockets`.
- VSOCK_GUEST_CID: Guest vsock CID. Default `3`.
- RUST_LOG: Log level (e.g., `info`, `debug`).

### Runtime Requirements

- Access to `/dev/kvm`; container runs as `root` in Compose to allow device access.
- If networking is required: `/dev/net/tun` and `--cap-add NET_ADMIN`.
- Kernel/rootfs artifacts must be present at the configured paths.

### Troubleshooting

- Permission denied on `/dev/kvm`: ensure KVM is enabled and passed through; try running as `root` or adjust device permissions.
- AMQP connection failures: verify `rabbitmq` is reachable and `AMQP_URL` is correct.
- Missing artifacts: ensure `vmlinux.bin` and `rootfs.ext4` are mounted to `/artifacts/`.

### Links

- [docker-compose.yml](../../docker-compose.yml)
- [Worker entrypoint](./src/main.rs)
- [OSIB README](../../README.md)
