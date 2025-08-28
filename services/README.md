<p>

## OSINTBuddy Services

This document provides an overview of the OSIB backend services and how they fit together.

> [!CAUTION]
> ⚠️ Experimental (pre‑alpha) ⚠️
>
> Interfaces and behavior may change.

</p>

<details open="open">
<summary><b>Table of Contents</b></summary>

- [Overview](#overview)
- [Architecture](#architecture)
- [Services](#services)
- [Quick Start](#quick-start)
- [Message Flow](#message-flow)
- [Artifacts](#artifacts)
- [Links](#links)

</details>

### Overview

This directory contains the Rust service crates that power the OSINTBuddy stack:

- `api`: HTTP+WS API built with actix‑web.
- `worker`: AMQP‑backed worker that launches Firecracker microVMs for sandboxed transform jobs.

See each service README for detailed configuration and usage.

### Architecture

```mermaid
architecture-beta
    group api(cloud)[OSIB Backend]

    service web(server)[TypeScript Preact client] in api
    service db(database)[PostgreSQL 17] in api
    service server(server)[Rust API] in api
    service queue(server)[RabbitMQ] in api
    service worker(server)[Rust Worker] in api
    service vm(server)[Firecracker MicroVMs] in api

    db:L <-- R:server
    web:R <--> L:server
    server:T --> B:queue
    queue:T --> B:worker
    worker:T -- B:vm
```

### Services

- api: Minimal HTTP service exposing `/health` on port `48997`. Designed to grow with backend features.
- worker: Consumes AMQP messages from `jobs`, launches short‑lived Firecracker microVMs to process work.
- rabbitmq: Message broker for job dispatch (`jobs` queue).
- db: PostgreSQL with Apache AGE for graph capabilities.

### Quick Start

Use Docker Compose from the repository root:

```bash
docker compose up api worker queue db
```

Ports (defaults via `.env`):

- Frontend: `55173`
- Backend API: `48997`
- RabbitMQ: `5672`
- Postgres: `55432 -> 5432`

### Message Flow

Jobs are published to `jobs` (RabbitMQ). The worker consumes, configures a microVM (kernel, rootfs, optional networking/vsock), runs briefly, tears down, then ack/nack. See `worker/README.md` for the JSON schema and environment configuration.

### Artifacts

The worker expects kernel and rootfs images mounted in the container:

- Kernel: `./vmlinux.bin` → `/artifacts/vmlinux.bin`
- Rootfs: `./rootfs.ext4` → `/artifacts/rootfs.ext4`

Optional runtime features:

- KVM: `/dev/kvm` device pass‑through (required for Firecracker).
- TAP networking: `/dev/net/tun` + `--cap-add NET_ADMIN` (if `TAP_NAME` is set).
- Vsock: host directory for Unix sockets (default `/sockets`).

### Links

- [API service](./api/README.md)
- [Worker service](./worker/README.md)
- [firecracker/docs/getting-started.md](https://github.com/firecracker-microvm/firecracker/blob/main/docs/getting-started.md)
- [lapin](https://github.com/amqp-rs/lapin)
