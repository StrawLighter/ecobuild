#!/usr/bin/env bash
# bootstrap-ubuntu.sh — idempotent installer for the full EcoBuild dev stack
#                       on Ubuntu 22.04+ (or any recent Debian-based distro).
#
# Usage:
#   bash scripts/bootstrap-ubuntu.sh
#
# What it installs (all user-local, no sudo required except the system-package
# check at the top):
#   - Node.js 20 LTS   (via nvm)
#   - Rust stable      (via rustup)
#   - Solana CLI stable (via release.solana.com)
#   - Anchor CLI v0.29.0
#   - npm workspace deps  (npm install)
#
# Re-running is safe; every step checks whether the tool is already present.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ── colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log_info() { echo -e "${GREEN}[bootstrap]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[bootstrap]${NC} $*"; }
log_err()  { echo -e "${RED}[bootstrap]${NC} $*" >&2; }

ANCHOR_TARGET_VERSION="0.29.0"

# ── 0. System-package guard ─────────────────────────────────────────────────
# curl and a C compiler are prerequisites for everything else.
log_info "Checking system packages …"
_missing_sys=0
for _pkg in curl build-essential; do
  if ! dpkg -s "$_pkg" >/dev/null 2>&1; then
    log_warn "  '$_pkg' not installed.  Run:  sudo apt-get install -y $_pkg"
    _missing_sys=1
  fi
done
if [[ $_missing_sys -eq 1 ]]; then
  log_err "Install the missing packages above, then re-run this script."
  exit 1
fi

# ── 1. Node.js via nvm ──────────────────────────────────────────────────────
log_info "Checking Node.js …"
export NVM_DIR="$HOME/.nvm"
# source nvm if already installed
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

if ! command -v nvm >/dev/null 2>&1; then
  log_info "Installing nvm …"
  # nvm installer is idempotent; it also appends to ~/.bashrc itself
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  \. "$NVM_DIR/nvm.sh"
fi

if ! command -v node >/dev/null 2>&1 || [ "$(node -e 'console.log(Number(process.versions.node.split(".")[0]))')" -lt 18 ]; then
  log_info "Installing Node.js 20 LTS …"
  nvm install 20 --alias default 2>&1 | tail -3
else
  log_info "Node.js $(node --version) — OK"
fi

# ── 2. Rust via rustup ──────────────────────────────────────────────────────
log_info "Checking Rust …"
if [ -f "$HOME/.cargo/env" ]; then
  # shellcheck source=/dev/null
  . "$HOME/.cargo/env"
fi
if ! command -v rustc >/dev/null 2>&1; then
  log_info "Installing Rust stable …"
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  # shellcheck source=/dev/null
  . "$HOME/.cargo/env"
else
  log_info "Rust $(rustc --version) — OK"
fi

# ── 3. Solana CLI ────────────────────────────────────────────────────────────
log_info "Checking Solana CLI …"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
if ! command -v solana >/dev/null 2>&1; then
  log_info "Installing Solana CLI …"
  sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
  export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
else
  log_info "Solana CLI $(solana --version) — OK"
fi

# ── 4. Anchor CLI ────────────────────────────────────────────────────────────
log_info "Checking Anchor CLI …"
if ! command -v anchor >/dev/null 2>&1; then
  log_info "Installing Anchor CLI v${ANCHOR_TARGET_VERSION} …"
  cargo install --git https://github.com/coral-xyz/anchor \
    --tag "v${ANCHOR_TARGET_VERSION}" anchor-cli --locked
else
  _installed="$(anchor --version | awk '{print $NF}')"
  if [[ "$_installed" == "$ANCHOR_TARGET_VERSION" ]]; then
    log_info "Anchor CLI v${_installed} — OK"
  else
    log_warn "Anchor CLI v${_installed} found (need v${ANCHOR_TARGET_VERSION}).  Re-installing …"
    cargo install --git https://github.com/coral-xyz/anchor \
      --tag "v${ANCHOR_TARGET_VERSION}" anchor-cli --locked --force
  fi
fi

# ── 5. npm workspace deps ────────────────────────────────────────────────────
log_info "Running npm install …"
cd "$ROOT_DIR"
npm install

# ── summary ──────────────────────────────────────────────────────────────────
echo
log_info "=== Version summary ==="
echo "  node   $(node   --version)"
echo "  npm    $(npm    --version)"
echo "  rustc  $(rustc  --version)"
echo "  solana $(solana --version)"
echo "  anchor $(anchor --version)"
echo
log_info "Bootstrap complete."
log_info "Next steps:"
log_info "  • Fund a wallet:       solana airdrop 2"
log_info "  • Build SBF:          scripts/build-sbf.sh"
log_info "  • Deploy to devnet:   scripts/deploy-devnet.sh"
log_info "  • Or follow:          docs/sbf-runbook.md"
