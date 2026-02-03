# Toolchain Status

## Native Build
- `cargo build` succeeds for the Anchor program using the local Rust toolchain.
- Unit tests (`cargo test`) run against native code paths and pass.

## SBF Build
- `anchor build` currently fails because the Solana SBF toolchain (`cargo-build-sbf`) is not installed.
- Attempts to install via the official Solana installer fail and curl reports `LibreSSL SSL_connect: SSL_ERROR_SYSCALL` when reaching `https://release.solana.com`.
- AVM is installed, but `avm install 0.29.0` currently fails because the managed `anchor` binary already exists; leaving the default `avm` shim in place for now.

## How to Run SBF Build Elsewhere
1. On a machine/network with access to `release.solana.com`, install the Solana toolchain (includes `cargo-build-sbf`):
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/v1.18.1/install)"
   ```
2. Install Anchor CLI via AVM:
   ```bash
   cargo install --git https://github.com/coral-xyz/anchor avm --locked
   avm install 0.29.0
   avm use 0.29.0
   ```
3. In the repo root, run `anchor build` to produce the SBF artifacts and IDL.

## Decision
Until network access is resolved, development will target native builds with unit tests. Deployment steps will be executed from an environment where the Solana toolchain can be installed successfully.
