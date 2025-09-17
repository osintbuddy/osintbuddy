
## OSINTBuddy Worker Service

AMQP‑backed job worker that launches Firecracker microVMs to execute sandboxed tasks.


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

An async Rust service that consumes PostgreSQL jobs and spins up ephemeral Firecracker microVMs to process them *(production)* or the local Python virtual environment *(development)*. It uses `tokio` and `firecracker-rs-sdk` to configure/start the VM.

### Status

> [!CAUTION]
> ⚠️ Experimental (pre‑alpha) ⚠️
>
> Currently requires KVM. Interfaces and behavior may change.


### Quick Start

Run with Cargo:

```bash
cargo run -p worker
```

### Links

- [docker-compose.yml](../../docker-compose.yml)
- [Worker entrypoint](./src/main.rs)
- [osib readme](../../README.md)
