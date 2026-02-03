# Build Notes

## Summary
- Native build (`cargo build`) succeeds for the Anchor program.
- SBF build via `anchor build` currently fails because the `cargo-build-sbf` binary is not available.
- Attempts to install `cargo-build-sbf` via the official Solana installer fail: `curl` cannot reach `https://release.solana.com/...` from this host (LibreSSL `SSL_ERROR_SYSCALL`).

## Next Steps to Unblock SBF Builds
1. Ensure network access to `https://release.solana.com` (may require firewall/VPN change).
2. Once accessible, install the Solana toolchain which bundles `cargo-build-sbf`:
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/v1.18.1/install)"
   ```
3. Confirm the binary is available:
   ```bash
   which cargo-build-sbf
   cargo-build-sbf --version
   ```
4. Re-run `anchor build` from the repo root.

## Temporary Workaround
Until SBF tooling is installed, use `cargo build` for syntax verification and keep development focused on non-deployment tasks (IDL design, client scaffolding, documentation).
