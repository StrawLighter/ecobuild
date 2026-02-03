# EcoBuild Agent Workflow Details

## Verification Agent
- **Trigger**: New submission payload posted to `/api/submissions` endpoint (mock service for demo).
- **Steps**:
  1. Validate schema (player wallet, material type, quantity estimate, GPS, photo URL).
  2. Run CV check (stub: random approval with deterministic seed, attach confidence score).
  3. Compute submission hash (e.g., SHA-256 of canonicalized payload).
  4. Check against local cache to avoid duplicate processing.
  5. Build Anchor client call `record_submission` with:
     - `submission_id` (UUID)
     - `material_type` (enum)
     - `quantity` (u64 grams)
     - `project_option` (optional project id to earmark)
  6. Sign transaction via AgentWallet; submit to Solana.
  7. Persist result (success/failure + tx signature) in off-chain datastore.
  8. Emit webhook/event for dashboard refresh.

## Allocation Agent
- **Trigger**: Polls Solana logs for `SubmissionRecorded` events every N seconds.
- **Steps**:
  1. Fetch outstanding project demand curves from config.
  2. For each new submission, determine target project (priority: player earmark > highest deficit > global campaign).
  3. Compute allocation amount (may split across projects if required).
  4. Submit `allocate_material` instruction transactions.
  5. Update cached project progress metrics.
  6. Notify dashboard + reward agent of milestones.

## Reward Agent
- **Trigger**: Scheduled (cron style) + event-driven (allocation milestones).
- **Steps**:
  1. Evaluate streaks per player, update tiers if thresholds met (calls `update_tier`).
  2. Grant badge NFTs via Metaplex Candy Machine stub (optional for MVP).
  3. Issue partner rewards (demo: write coupon codes to mock API).
  4. Log all reward actions for audit.

## Dashboard Sync Agent
- **Trigger**: Runs every 30s.
- **Steps**:
  1. Pull aggregated stats from Solana program (RPC batch requests).
  2. Combine with off-chain submission records + reward logs.
  3. Serve API endpoints consumed by the frontend.

## Reliability Notes
- Implement idempotent processing with submission UUID + cache.
- Use exponential backoff for RPC failures.
- Maintain local queue (SQLite/Redis) so network outages don't drop submissions.
