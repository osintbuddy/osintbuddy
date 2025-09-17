# syntax=docker/dockerfile:1.7

ARG RUST_VERSION=1.84
ARG DEBIAN_DIST=bookworm

FROM rust:${RUST_VERSION}-${DEBIAN_DIST} AS builder
WORKDIR /app
ENV RUSTUP_TOOLCHAIN=${RUST_VERSION}

# System deps for common crates (openssl/sqlx, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
      pkg-config libssl-dev ca-certificates && \
    rm -rf /var/lib/apt/lists/* && \
    rustup install nightly && \
    rustup default nightly

# Pre-cache dependencies
COPY Cargo.toml Cargo.lock ./
COPY services/api/Cargo.toml services/api/Cargo.toml
COPY services/worker/Cargo.toml services/worker/Cargo.toml
RUN mkdir -p services/worker/src services/api/src && \
    echo "fn main() {}" > services/worker/src/main.rs && \
    echo "fn main() {}" > services/api/src/main.rs
RUN cargo +nightly fetch

# Build
COPY services ./services
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/app/target \
    cargo +nightly build --release -p api && \
    cp /app/target/release/api /app/api

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

COPY --from=builder /app/api /usr/local/bin/api
USER ${APP_USER}
EXPOSE 48997
ENTRYPOINT ["/usr/local/bin/api"]
