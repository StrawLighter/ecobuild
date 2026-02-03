# EcoBuild Demo Plan (60 Seconds)

1. **Kickoff (0-10s)** — Show EcoBuild dashboard intro screen highlighting current community build target.
2. **Verifier Ping (10-20s)** — Hit `GET /health` on verifier service to prove backend is live.
3. **Submit Proof (20-30s)** — Trigger mock cleanup submission (POST `/attest`) and narrate how CV + agent pipeline will verify it.
4. **On-Chain Call (30-45s)** — Run CLI script that invokes `initialize_player` (or displays recent material submission) to show Solana interaction.
5. **Dashboard Update (45-55s)** — Refresh dashboard/mock log showing new player profile & material credit.
6. **Impact Recap (55-60s)** — Close with stats overlay: bricks minted, project progress, upcoming features.
