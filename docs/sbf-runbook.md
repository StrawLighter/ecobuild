# Clean Machine SBF Runbook (Devnet)

Use this on a clean machine that can reach `https://release.solana.com`.
It installs Solana + Anchor, builds SBF artifacts, and deploys to devnet.

## Prereqs
- macOS or Linux
- Rust toolchain installed (`rustup`)
- Node.js 18+ (for Anchor CLI)
- Network access to `release.solana.com`

## 1) Install Solana CLI
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
solana --version
```
Expected:
```
solana-cli <version>
```

## 2) Install Anchor
```bash
cargo install --git https://github.com/coral-xyz/anchor --tag v0.32.1 anchor-cli --locked
anchor --version
```
Expected:
```
anchor-cli 0.32.1
```

## 3) Configure devnet + wallet
```bash
solana config set --url https://api.devnet.solana.com
solana-keygen new --outfile ~/.config/solana/id.json
solana config get
```
Expected output includes:
- `RPC URL: https://api.devnet.solana.com`
- `Keypair Path: ~/.config/solana/id.json`

Fund the wallet:
```bash
solana airdrop 2
solana balance
```
Expected:
```
2 SOL
```

## 4) Build SBF artifacts
From repo root:
```bash
anchor build
```
Expected:
```
Finished release [optimized] target(s) ...
```
Artifacts will appear under `target/deploy/`.

## 5) Deploy to devnet
```bash
anchor deploy --provider.cluster devnet
```
Expected:
```
Deploying workspace: https://api.devnet.solana.com
Program Id: <program-id>
```

## 6) (Optional) Run Anchor tests against devnet
```bash
anchor test --skip-local-validator --provider.cluster devnet
```
Expected:
```
✔ tests passed
```

## Troubleshooting
- `release.solana.com` unreachable:
  - Try a different network, VPN, or CI runner with egress allowed.
- `cargo-build-sbf` missing:
  - Re-run `anchor build` after confirming Solana CLI is installed and in PATH.
- `insufficient funds`:
  - Run `solana airdrop 2` again.
- `anchor deploy` fails with blockhash:
  - Retry; devnet can be flaky.
