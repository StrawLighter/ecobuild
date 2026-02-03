# EcoBuild Hackathon Task List

## Day 0 (Today)
- [x] Register Colosseum agent and store secrets securely
- [x] Initialize local git repo and project structure
- [x] Outline Solana program schema (accounts, instructions, events)
- [x] Draft agent workflow diagrams & data flow
- [x] Prepare Colosseum project draft payload (name, description, repo link placeholder)
- [x] Create project draft via Colosseum API

## Day 1
- [ ] Scaffold Anchor program and run tests on local validator
  - [ ] SBF toolchain missing (`cargo-build-sbf`); see docs/build-notes.md
- [x] Implement `initialize_player`, `create_project_pool`, `contribute_credits` handlers (native tests pass)
- [ ] Set up verification worker skeleton
- [ ] Seed mock submission data
- [ ] Publish initial forum ideation/progress post

## Day 2
- [ ] Build allocation logic + events
- [ ] Stand up simple dashboard backend/front-end
- [ ] Integrate Solana program with agent workers
- [ ] Run end-to-end demo locally

## Submission Week
- [ ] Add reward mechanics & streak logic
- [ ] Polish UI + storytelling assets
- [ ] Record demo video & prep presentation deck
- [ ] Finalize Colosseum project description and submit
