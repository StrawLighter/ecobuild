#!/usr/bin/env bash
# build-sbf.sh — build the EcoBuild SBF program via Anchor.
#
# Usage:
#   bash scripts/build-sbf.sh
#
# Outputs (under target/deploy/):
#   ecobuild.so              — compiled BPF shared object
#   ecobuild-keypair.json    — program deploy keypair (never commit)
#
# The IDL is also written to target/idl/ecobuild.json.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Ensure Solana / Rust bins are on PATH regardless of how the shell was opened
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
[ -f "$HOME/.cargo/env" ] && . "$HOME/.cargo/env"  # shellcheck disable=SC1090

# ── pre-flight checks ────────────────────────────────────────────────────────
for _cmd in cargo anchor; do
  if ! command -v "$_cmd" >/dev/null 2>&1; then
    echo "[build-sbf] ERROR: '$_cmd' not found.  Run 'scripts/bootstrap-ubuntu.sh' first." >&2
    exit 1
  fi
done

# ── build ────────────────────────────────────────────────────────────────────
echo "[build-sbf] Running anchor build …"
anchor build

# ── verify artifacts ─────────────────────────────────────────────────────────
SO_PATH="$ROOT_DIR/target/deploy/ecobuild.so"
IDL_PATH="$ROOT_DIR/target/idl/ecobuild.json"

if [[ ! -f "$SO_PATH" ]]; then
  echo "[build-sbf] ERROR: expected artifact missing at $SO_PATH" >&2
  exit 1
fi

echo "[build-sbf] Build succeeded."
echo "  SO :  $SO_PATH  ($(du -h "$SO_PATH" | cut -f1))"
if [[ -f "$IDL_PATH" ]]; then
  echo "  IDL:  $IDL_PATH"
fi
echo
echo "[build-sbf] Next:  scripts/deploy-devnet.sh"
