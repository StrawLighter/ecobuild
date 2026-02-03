# Scripts

Utility and automation scripts for EcoBuild.

| Script | Purpose |
|--------|---------|
| `demo.sh` | End-to-end demo: attest → mint → contribute.  Supports `SIM_MODE=1` (print) and `SIM_MODE=0` (devnet). |
| `bootstrap-ubuntu.sh` | Idempotent installer: Rust, Solana CLI, Anchor CLI, Node deps (Ubuntu 22.04+). |
| `build-sbf.sh` | `anchor build` wrapper — produces `target/deploy/ecobuild.so` + IDL. |
| `deploy-devnet.sh` | Sets cluster to devnet and runs `anchor deploy`. |

See [docs/sbf-runbook.md](../docs/sbf-runbook.md) for the full step-by-step
devnet workflow.
