# syntax=docker/dockerfile:1.7

ARG RUST_VERSION=1.84
ARG DEBIAN_DIST=bookworm

FROM rust:${RUST_VERSION}-${DEBIAN_DIST} AS builder
WORKDIR /app
ENV RUSTUP_TOOLCHAIN=${RUST_VERSION}

# System deps for common crates (openssl/sqlx, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
      pkg-config libssl-dev ca-certificates tzdata && \
    rm -rf /var/lib/apt/lists/* && \
    rustup install nightly && \
    rustup default nightly && \
    cargo install cargo-watch

# Pre-cache dependencies
COPY Cargo.toml Cargo.lock ./
COPY services/api/Cargo.toml services/api/Cargo.toml
COPY services/worker/Cargo.toml services/worker/Cargo.toml
RUN mkdir -p services/worker/src services/api/src && \
    echo "fn main() {}" > services/worker/src/main.rs && \
    echo "fn main() {}" > services/api/src/main.rs
RUN cargo +nightly fetch

# Build
COPY services/api ./services/api
COPY services/api/api-dev.sh ./

EXPOSE 48997
ENTRYPOINT [ "sh", "-c", "./api-dev.sh" ]
