# syntax=docker/dockerfile:1.7

ARG RUST_VERSION=nightly
ARG DEBIAN_DIST=bookworm

FROM rust:${RUST_VERSION}-${DEBIAN_DIST} AS builder
WORKDIR /app
ENV RUSTUP_TOOLCHAIN=${RUST_VERSION}

# System deps for common crates (openssl/sqlx, etc.)
RUN --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt \
    apt-get update && apt-get install -y --no-install-recommends \
      pkg-config libssl-dev ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Pre-cache dependencies
COPY Cargo.toml Cargo.lock ./
COPY services/api/Cargo.toml services/api/Cargo.toml
COPY services/worker/Cargo.toml services/worker/Cargo.toml
RUN cargo fetch

# Build
COPY services ./services
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/app/target \
    cargo build --release -p api

FROM debian:${DEBIAN_DIST}-slim AS runtime
WORKDIR /app
ENV RUST_LOG=info \
    APP_USER=app

RUN --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt \
    apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates tzdata && \
    rm -rf /var/lib/apt/lists/* && \
    useradd -r -s /usr/sbin/nologin ${APP_USER}

COPY --from=builder /app/target/release/api /usr/local/bin/api
USER ${APP_USER}
EXPOSE 48997
ENTRYPOINT ["/usr/local/bin/api"]
