# EcoBuild Demo

The demo runs the full attest → mint → contribute flow.  It supports two modes,
selected via the `SIM_MODE` environment variable:

| Mode | `SIM_MODE` | What happens |
|---|---|---|
| Simulation | `1` *(default)* | Verifier `/attest` runs for real; on-chain calls are printed but **not** sent |
| Devnet | `0` | Verifier `/attest` + live `mint_poc_receipt` + `contribute_credits` on Solana devnet |

---

## Prerequisites

**Both modes:**
- Node.js 18+
- Verifier running locally (see step 1 below)

**`SIM_MODE=0` additionally requires:**
- Solana CLI in PATH
- Anchor CLI v0.29.0 in PATH
- SBF artifacts built — run `scripts/build-sbf.sh` (produces the IDL the client needs)
- A funded devnet wallet at `~/.config/solana/id.json` (or override with `KEYPAIR_PATH=…`)
- Network access to `https://api.devnet.solana.com` (or override with `SOLANA_URL=…`)

> To install the toolchain on Ubuntu 22.04+, run `scripts/bootstrap-ubuntu.sh`.
> To build + deploy, follow `docs/sbf-runbook.md`.

---

## 1. Start the verifier

```bash
cd apps/verifier
npm install
npm run dev
```

Leave this terminal open.

---

## 2. Run the demo

### Simulation mode (default)

```bash
# from repo root
./scripts/demo.sh
# equivalent to:
SIM_MODE=1 ./scripts/demo.sh
```

### Devnet mode (real transactions)

```bash
SIM_MODE=0 ./scripts/demo.sh
```

Override RPC URL or keypair path as needed:

```bash
SOLANA_URL=https://api.devnet.solana.com \
KEYPAIR_PATH=~/.config/solana/id.json \
SIM_MODE=0 ./scripts/demo.sh
```

---

## What you should see

### Simulation mode (`SIM_MODE=1`)
1. Attestation request posted to `/attest`
2. Printed `attestationId`
3. Printed `mint_poc_receipt` inputs + account PDAs
4. Printed `contribute_credits` inputs + account PDAs

### Devnet mode (`SIM_MODE=0`)
1. Attestation request posted to `/attest`
2. Printed `attestationId`
3. `initialize_player` — transaction signature (or "already exists" on repeat runs)
4. `mint_poc_receipt` — transaction signature  *(unique per run because the attestation hash changes)*
5. `create_project_pool` — transaction signature (or "already exists")
6. `contribute_credits` — transaction signature

---

## How `SIM_MODE=0` works internally

| Step | What the script does |
|---|---|
| Pre-flight | Checks that `solana` + `anchor` are on PATH, that `target/idl/ecobuild.json` exists, and that the keypair file is present.  Exits with a clear error if any check fails. |
| Attest | Posts the sample payload (with a fresh `timestamp`) to the local verifier and receives a sha-256 `attestationId`. |
| initialize_player | Calls the on-chain `initialize_player` instruction if the player-profile PDA does not yet exist. |
| mint_poc_receipt | Derives the `poc_receipt` PDA from `[poc, authority, attestationId]` and submits the mint transaction. |
| create_project_pool | Creates a demo project pool (seed = 1, goal = 100 credits) if it does not yet exist. |
| contribute_credits | Contributes `quantity` credits (from the attestation payload) to the pool. |

No secrets are written to disk; the wallet keypair is read from its existing
path and never logged.

---

## Why simulation mode exists

On machines where `release.solana.com` is unreachable (common in corporate
firewalls / network policies), the Solana CLI cannot be installed and SBF
builds are blocked.  Simulation mode lets the demo run and validates the
end-to-end flow up to the on-chain boundary.  All program logic — PDA
derivation, input validation, overflow checks — is still exercised by the
native unit tests in `programs/ecobuild/src/lib.rs`.
