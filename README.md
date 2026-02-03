# EcoBuild — Colosseum Agent Hackathon

## Vision
EcoBuild turns waste collection into a Solana-powered construction economy. Players verify cleanup efforts, earn tokenized material credits, and direct them toward community building projects orchestrated by autonomous agents.

## What's in the MVP
- Anchor program that initializes players and records contributions.
- Verification service stub for proof-of-cleanup ingestion.
- Scripts and docs for running the happy-path demo.

## Current Milestone
**Status:** `feat: mocked verifier attest endpoint`
- Anchor workspace includes player/profile init, project pool creation, and credit contribution handlers with helper tests.
- Verifier service exposes `/health` and a mocked `/attest` endpoint with validation + deterministic attestation hashes.
- Demo script placeholder outlines the walkthrough.

## Build & Test Status
- `cargo build` (native) succeeds.
- `anchor build` currently blocked: `cargo-build-sbf` tool is missing and `release.solana.com` is unreachable from this machine. See `docs/build-notes.md` and `docs/toolchain.md` for remediation steps.
- `anchor test` pending until the SBF toolchain is installed (same issue as above).

## How to Run the Health Check
1. Install dependencies and build the verifier:
   ```bash
   cd apps/verifier
   npm install
   npm run build
   npm start
   ```
2. In a separate terminal, call the health endpoint:
   ```bash
   curl http://localhost:3000/health
   ```
   Expected response:
   ```json
   { "ok": true, "version": "0.1.0", "commit": "dev" }
   ```

## Demo (60 Seconds)
Use the local demo script to hit the verifier and show the PoC flow:
`docs/demo-run.md`

## Hackathon Deliverables
- **Solana Program (Anchor)** handling player registration, verified material submissions, and project material vaults.
- **Openclaw Agent Workers** for submission verification, on-chain interactions, allocation logic, and reward issuance.
- **Demo Dashboard** visualizing player standings and real-time project progress.
- **Forum & Project Assets** including ideation posts, progress updates, and submission materials.

## Repository Structure
```
programs/    # Anchor programs
apps/        # Agent and service code (verifier, etc.)
scripts/     # Demo helpers
docs/        # Architecture + planning docs
```

## Open Questions
- Final decision on material token representation (SPL token vs. metadata NFT)
- Choice of CV verification stack for MVP (hosted model vs. stub)
- Integration partners for mock rewards (sponsors, community groups)
