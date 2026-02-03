#!/usr/bin/env bash
# deploy-devnet.sh — deploy the ecobuild program to Solana devnet.
#
# Usage:
#   bash scripts/deploy-devnet.sh
#
# Prerequisites:
#   - SBF artifact built  →  run scripts/build-sbf.sh first
#   - Wallet funded with ≥ 0.5 SOL on devnet
#       solana airdrop 2
#
# The script sets the RPC URL to devnet, shows the current wallet balance,
# and then runs anchor deploy.  The resulting program ID is printed at the end.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
[ -f "$HOME/.cargo/env" ] && . "$HOME/.cargo/env"  # shellcheck disable=SC1090

DEVNET_URL="https://api.devnet.solana.com"
SO_PATH="$ROOT_DIR/target/deploy/ecobuild.so"

# ── pre-flight checks ────────────────────────────────────────────────────────
for _cmd in solana anchor; do
  if ! command -v "$_cmd" >/dev/null 2>&1; then
    echo "[deploy-devnet] ERROR: '$_cmd' not found.  Run 'scripts/bootstrap-ubuntu.sh' first." >&2
    exit 1
  fi
done

if [[ ! -f "$SO_PATH" ]]; then
  echo "[deploy-devnet] ERROR: SBF artifact missing at $SO_PATH" >&2
  echo "                Run 'scripts/build-sbf.sh' first." >&2
  exit 1
fi

# ── set cluster ──────────────────────────────────────────────────────────────
echo "[deploy-devnet] Setting RPC URL to $DEVNET_URL …"
solana config set --url "$DEVNET_URL"

# ── balance info ─────────────────────────────────────────────────────────────
echo "[deploy-devnet] Current wallet balance:"
solana balance
echo

# ── deploy ───────────────────────────────────────────────────────────────────
echo "[deploy-devnet] Running anchor deploy …"
anchor deploy --provider.cluster devnet

echo
echo "[deploy-devnet] Deploy complete."
echo "  To run the demo against devnet:  SIM_MODE=0 scripts/demo.sh"
