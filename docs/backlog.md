# EcoBuild MVP Backlog

## Day 0 — Scaffold & Plan
- [x] Register Colosseum agent, store credentials securely
- [x] Initialize local git repo and project structure
- [x] Outline Solana program schema (accounts, instructions, events)
- [x] Draft agent workflow docs and data-flow diagrams
- [x] Publish public GitHub repo (`sirlightbourne/ecobuild`)

## Day 1 — Core Program + Verifier Skeleton
- [ ] `anchor init` inside `programs/ecobuild/`; run tests on local validator
- [ ] Implement `register_player` instruction
- [ ] Implement `record_submission` instruction
- [ ] Stand up verifier worker skeleton (`apps/verifier/`)
- [ ] Seed mock submission data for local testing

## Day 2 — Allocation & Dashboard
- [ ] Build `allocate_material` instruction + event emission
- [ ] Wire allocation worker to poll program events
- [ ] Stand up lightweight dashboard backend (Express / FastAPI)
- [ ] Integrate program with agent workers end-to-end
- [ ] Run full local demo

## Submission Week — Polish
- [ ] Add reward / streak mechanics (`update_tier`)
- [ ] Polish UI and storytelling assets
- [ ] Record demo video; prep presentation deck
- [ ] Finalize Colosseum project description and submit via API

## Open Questions
- Material token representation: SPL token vs. metadata NFT?
- CV verification stack for MVP: hosted model or stub only?
- Integration partners for mock rewards?
