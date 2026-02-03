# EcoBuild Agent Services

| Service | Language | Purpose |
|---------|----------|---------|
| `verification-worker` | TypeScript (Node) | Validate submissions and invoke Solana program |
| `allocation-worker` | TypeScript (Node) | Distribute materials across projects |
| `dashboard-sync` | TypeScript (Node) | Expose REST endpoints for frontend |

## Tech Stack
- Openclaw SDK for task orchestration
- Anchor client / @coral-xyz/anchor for program interactions
- Helius RPC for log subscriptions
- Supabase (or SQLite) as lightweight off-chain store

## Setup Tasks
1. Configure `.env` with Colosseum API key (if needed), RPC endpoint, AgentWallet credentials.
2. Implement submission ingestion queue (Express endpoint or file drop watcher).
3. Wire up Anchor client for Solana transactions.
4. Create integration tests with local validator.
