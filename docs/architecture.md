# EcoBuild Architecture Overview

## High-Level Flow
1. **Submission Intake**: Players capture cleanup proof (photo + metadata) via the EcoBuild app. Submissions are queued for verification.
2. **Verification Agent** (Openclaw worker):
   - Validates GPS & timestamp.
   - Runs image classification / anomaly checks (stubbed model for MVP).
   - On success, constructs and submits a Solana transaction to record the material contribution and mint corresponding credits.
3. **Solana Program** maintains on-chain state:
   - Player profile PDA: tier, specialization, streaks, cumulative stats.
   - Project vault PDA: material balances per project.
   - Submission record PDA: ensures idempotency & audit trail.
4. **Allocation Agent** monitors program events:
   - Aggregates materials toward active project demand curves.
   - Triggers progress updates and leaderboard recalculations.
5. **Reward Agent** issues in-app rewards and partner perks based on milestones.
6. **Dashboard** queries Solana state (via Helius/Triton RPC) and renders player standings, project timelines, and material flow visualizations.

## Solana Program Sketch (Anchor)
- **Accounts**
  - `Config`: admin keys, material conversion rates, verification authority.
  - `Player`: seeds `["player", authority.key()]`, stores identity + stats.
  - `Submission`: seeds `["submission", player.key(), submission_id]`, stores hash of proof, material type, quantity.
  - `Project`: seeds `["project", project_id]`, holds metadata + material targets.
  - `ProjectVault`: seeds `["project", project_id, material_type]`, tracks allocated totals.

- **Instructions**
  1. `register_player(authority, specialization)`
  2. `record_submission(player, submission_id, material_type, quantity, project_option)`
  3. `allocate_material(project, material_type, quantity)` — internal agent call to move credits into vaults.
  4. `update_tier(player, new_tier)` — gated by config authority, computed agent-side.

- **Events**
  - `SubmissionRecorded { player, material_type, quantity }`
  - `MaterialAllocated { project, material_type, quantity }`
  - `TierChanged { player, tier }`

## Agent Components
- **Verification Worker**
  - Input queue: HTTP endpoint or file watcher for new submissions.
  - Uses CV service to tag materials & detect fraud.
  - On approval, signs Solana tx via AgentWallet, invoking `record_submission`.
  - On rejection, notifies user with reason.

- **Allocation Worker**
  - Listens to submission events (WebSocket, RPC logs).
  - Applies demand heuristics to distribute materials across `ProjectVault`s.
  - Publishes updates to dashboard backend.

- **Reward Worker**
  - Runs scheduled jobs to compute streaks, rare finds, and sponsor rewards.
  - Maintains off-chain datastore for coupon fulfillment and prevents reuse.

## Demo Dashboard
- **Backend**: lightweight API (FastAPI/Express) to aggregate Solana state and agent metrics.
- **Frontend**: Svelte/Next dashboard with sections for:
  - Player leaderboard and tier progression.
  - Project progress bars with material breakdown.
  - Recent submissions feed with photos (mocked for demo).

## Data Model Considerations
- Material tokenization: start with SPL token mints per material type to keep MVP straightforward. Consider compressed NFTs for high-resolution provenance later.
- Proof storage: store original submission metadata off-chain (e.g., Supabase/Arweave), reference hash in `Submission` PDA for integrity.
- Governance: `Config` authority remains with hackathon agent for demo; roadmap includes multisig/community voting.
