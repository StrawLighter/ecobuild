# Verifier Worker

Off-chain worker that reviews EcoBuild material-collection submissions.

## Responsibilities
- Receive submission payloads (photo hash, GPS, material type, quantity).
- Run validation checks (stub / manual-review mode for MVP).
- On approval, sign and broadcast an attestation to the Solana program via `record_submission`.
- On rejection, return a signed denial with reason.

## MVP Mode
Manual review is the default. The worker exposes a local HTTP endpoint; a human operator ACKs or rejects each submission before the on-chain transaction is built.

## Setup (later)
```bash
npm install
cp .env.example .env   # fill in RPC_URL and AGENT_WALLET
npm run dev
```
