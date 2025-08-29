<p>

## OSIB: API

Lightweight actix‑web service that exposes the backend API for OSINTBuddy.

> [!CAUTION]
> ⚠️ Experimental (pre‑alpha)
>
> Interfaces may drastically change. See the [root README](../../README.md) for project status.

</p>

<details open="open">
<summary><b>Table of Contents</b></summary>

- [What is this?](#what-is-this)
- [Endpoints](#endpoints)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Links](#links)

</details>

### What is this?

This crate provides the HTTP API for the OSINTBuddy stack. It is a minimal Actix‑Web application today with a health probe and is designed to grow as backend features land.

### Endpoints

- GET `/api/health` → `{"message":"pong"}` (liveness)


### Quick Start

Run with Docker Compose _(recommended during development)_:

```bash
docker compose up api
# Health check
curl http://localhost:${BACKEND_PORT-48997}/health
```

Run with Docker directly:

```bash
docker build -f services/api/Dockerfile -t osib-api:latest .
docker run --rm -e RUST_LOG=info -p 48997:48997 osib-api:latest
```

Run with Cargo _(host)_:

```bash
cargo run -p api
curl http://localhost:48997/api/health
```

### Configuration

- **PORT**: fixed at `48997` in the binary/Dockerfile; Compose maps `${BACKEND_PORT:-48997}` → 48997.
- **RUST_LOG**: log level (default `info`). Example: `RUST_LOG=debug`.
- **DATABASE_URL**, **AMQP_URL**: passed through by Compose for setting up queue and postgres connection.

### Development

- [actix-web backend entrypoint](./src/main.rs).

#### Typical workflow:


```bash
sqlx migrate run 
cargo watch -q -c -w services/api -x 'run -p api'
```

### Troubleshooting

- Port already in use: change `${BACKEND_PORT}` in `.env` or stop the conflicting service.
- No logs: set `RUST_LOG=info` (or `debug`).

### Links

- [Compose service](../../docker-compose.yml)
- [actix-web entrypoint](./src/lib.rs)
- [OSIB README](../../README.md)
