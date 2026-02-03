# Clean-Machine SBF Runbook (Devnet)

Run these steps on any machine that can reach `https://release.solana.com`.
Every command is copy-pasteable; expected output is shown after each step so you
can verify before continuing.

---

## Prerequisites

| Requirement | Minimum | Why |
|---|---|---|
| OS | macOS 12+ or Ubuntu 22.04+ | Solana CLI binaries are built for these |
| Rust | 1.75+ stable | `cargo build-sbf` (pulled in by Anchor) |
| Node.js | 18 LTS+ | Anchor CLI + JS integration-test harness |
| npm | 9+ | Workspace dev-dependencies |
| Network | HTTPS egress to `release.solana.com` | Solana CLI installer |
| curl | any | Used by installer scripts |

> **On Ubuntu 22.04+** you can run `scripts/bootstrap-ubuntu.sh` to install
> everything in one shot.  See that file for details.

---

## 1. Install Rust

If `rustc` is not already on your PATH:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# Follow the installer prompts (default install is fine)
source "$HOME/.cargo/env"
rustc --version
```

Expected:
```
rustc 1.7x.x (…)
```

---

## 2. Install Solana CLI

```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
solana --version
```

Expected:
```
solana-cli 1.18.x
```

> Add the `export PATH=…` line to `~/.bashrc` / `~/.zshrc` so it persists
> across shells.

---

## 3. Install Anchor CLI

The project pins **anchor-lang 0.29.0**, so install the matching CLI tag:

```bash
cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli --locked
anchor --version
```

Expected:
```
anchor-cli 0.29.0
```

> This compiles Anchor from source.  First run takes several minutes.
> If a different version is already installed, add `--force` to overwrite.

---

## 4. Version sanity check

```bash
rustc  --version   # ≥ 1.75
solana --version   # ≥ 1.18
anchor --version   # 0.29.0
node   --version   # ≥ 18
npm    --version   # ≥ 9
```

All five must succeed before continuing.

---

## 5. Clone the repo + install JS deps

```bash
git clone https://github.com/StrawLighter/ecobuild.git
cd ecobuild
npm install          # installs @coral-xyz/anchor + test harness
```

---

## 6. Configure devnet + wallet

```bash
# Point the CLI at devnet
solana config set --url https://api.devnet.solana.com

# Create a fresh keypair (skip if ~/.config/solana/id.json already exists)
solana-keygen new --outfile ~/.config/solana/id.json

# Verify
solana config get
```

Expected output includes:
```
RPC URL: https://api.devnet.solana.com
Keypair Path: /home/<user>/.config/solana/id.json
```

### Fund the wallet

Devnet lets you airdrop SOL for free:

```bash
solana airdrop 2       # request 2 SOL
solana balance         # should show ≥ 2 SOL
```

> `solana airdrop` is rate-limited on devnet.  If it fails, wait 30 s and retry.

---

## 7. Build SBF artifacts

From the repo root (or run `scripts/build-sbf.sh`):

```bash
anchor build
```

Expected:
```
Compiling ecobuild v0.1.0 (…/programs/ecobuild)
   Finished release [optimized] target(s) in …
```

Artifacts land in `target/deploy/`:

| File | What it is |
|---|---|
| `ecobuild.so` | Compiled BPF shared object |
| `ecobuild-keypair.json` | Program deploy keypair — **never commit** |

The IDL is also generated at `target/idl/ecobuild.json` (used by the JS client).

---

## 8. Deploy to devnet

```bash
anchor deploy --provider.cluster devnet
```

Expected:
```
Deploying workspace: https://api.devnet.solana.com
  Deploying program "ecobuild"…
Program Id: <base58-program-id>
```

> Copy the printed Program Id.  To re-deploy the program at the **same** address
> in the future, keep `target/deploy/ecobuild-keypair.json` around (but never
> commit it — it is already in `.gitignore` via `target/`).

---

## 9. (Optional) Run Anchor integration tests against devnet

```bash
anchor test --skip-local-validator --provider.cluster devnet
```

Expected:
```
  ecobuild
    ✓ initializes a player profile PDA

  1 passing (…)
```

---

## 10. (Optional) Persist devnet in Anchor.toml

If you want `anchor deploy` / `anchor test` to default to devnet without CLI
flags, add a section **locally** (do **not** commit the program ID or keypair):

```toml
[programs.devnet]
ecobuild = "<program-id-from-step-8>"

[provider]
cluster = "Devnet"
wallet = "~/.config/solana/id.json"
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `curl` hangs / times out to `release.solana.com` | Network policy or firewall blocks HTTPS to that IP | Use a different network, a VPN, or a CI runner with unrestricted egress |
| `cargo-build-sbf` not found | Solana CLI is not in PATH | Re-export PATH (see step 2) then retry `anchor build` |
| `insufficient funds` on deploy | Wallet balance < deploy cost (~0.5 SOL) | `solana airdrop 2` (retry after 30 s if rate-limited) |
| `anchor deploy` — `blockhash expired` | Devnet RPC latency / congestion | Wait ≈30 s and re-run the deploy command |
| `anchor test` cannot find the program | Program not deployed or wrong cluster | Confirm `--provider.cluster devnet` and that step 8 succeeded |
| Version mismatch error at build | `anchor-cli` vs `anchor-lang` version skew | The Rust program compiles against `anchor-lang 0.29.0` in Cargo.lock; ensure the CLI is also 0.29.0 (step 3) |
| `cargo install anchor-cli` fails with compile errors | Missing C toolchain | Install `build-essential` (Ubuntu) or Xcode CLI tools (macOS) |
