ARG RUST_VERSION=1.84
ARG DEBIAN_DIST=bookworm

FROM rust:${RUST_VERSION}-${DEBIAN_DIST} AS builder
WORKDIR /app
ENV RUSTUP_TOOLCHAIN=${RUST_VERSION}

RUN apt-get update && apt-get install -y --no-install-recommends \
      pkg-config ca-certificates && \
    rm -rf /var/lib/apt/lists/* && \
    # Install nightly Rust for edition 2024 support
    rustup install nightly && \
    rustup default nightly
# Pre-cache dependencies
COPY Cargo.toml Cargo.lock ./
COPY services/worker/Cargo.toml services/worker/Cargo.toml
COPY services/api/Cargo.toml services/api/Cargo.toml
# Create dummy source files for dependency caching
RUN mkdir -p services/worker/src services/api/src && \
    echo "fn main() {}" > services/worker/src/main.rs && \
    echo "fn main() {}" > services/api/src/main.rs
RUN cargo +nightly fetch

# Build
COPY services ./services
RUN cargo +nightly build --release -p worker

FROM debian:${DEBIAN_DIST}-slim AS runtime
WORKDIR /app
ENV RUST_LOG=info \
    APP_USER=app

RUN --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt \
    apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates tzdata && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/worker /usr/local/bin/worker
# Run as root to allow /dev/kvm and TAP management; tighten via compose if desired.
USER root

# Firecracker typically needs /dev/kvm access; compose will pass this device in.
# Note: This image does not install the firecracker binary. Provide it via bind mount
# or set FIRECRACKER_BIN to a path available in the container.
ENTRYPOINT ["/usr/local/bin/worker"]
