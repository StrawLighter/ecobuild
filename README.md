<div align="center">

# EcoBuild

**Proof-of-Collection → BrickCredits → Community Builds**

![Solana](https://img.shields.io/badge/Solana-9945FF?logo=solana&logoColor=white)
![Anchor](https://img.shields.io/badge/Anchor-000?logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-5FA04E?logo=nodedotjs&logoColor=white)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/StrawLighter/ecobuild)

</div>

---

> **Status:** 🟢 Live — *Colosseum Agent Hackathon Submission*

## Overview

EcoBuild turns waste collection into a Solana-powered construction economy. Players verify real-world cleanup efforts through proof-of-collection, earn tokenized **BrickCredits**, and direct them toward community building projects orchestrated by autonomous AI agents. Built for the Colosseum Agent Hackathon.

## How It Works

```
🗑️ Collect Waste → 📸 Submit Proof → ✅ AI Verifies → 🧱 Earn BrickCredits → 🏗️ Fund Community Builds
```

## Features

- **Proof-of-Collection** — Submit photo evidence of cleanup efforts verified by AI agents
- **BrickCredits Economy** — SPL tokens minted on verified submissions, burned on project contributions
- **Community Build Projects** — On-chain project pools where players direct credits toward real builds
- **Agent Verification** — Openclaw AI workers handle submission review and on-chain attestation
- **Player Profiles** — Track contributions, credits earned, and projects supported
- **Demo Dashboard** — Real-time visualization of player standings and project progress

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Anchor (Solana) |
| Verification | Node.js agent service |
| Token Economy | SPL Tokens (BrickCredits) |
| Agent Workers | Openclaw framework |
| Frontend | Next.js, React |
| Deployment | Vercel |

## Project Structure

```
ecobuild/
├── programs/        # Anchor programs (player reg, submissions, project vaults)
├── apps/            # Agent and service code (verifier, etc.)
│   └── verifier/    # Attestation service with /health and /attest endpoints
├── scripts/         # Demo helpers
└── docs/            # Architecture + planning docs
```

## Getting Started

```bash
# Build Anchor programs
anchor build

# Start the verifier service
cd apps/verifier
npm install && npm run build && npm start

# Health check
curl http://localhost:3000/health
# → { "ok": true, "version": "0.1.0", "commit": "dev" }
```

## License

MIT

---

<div align="center">
  <sub>Built by <a href="https://github.com/StrawLighter">Orchard 7</a></sub>
</div>
