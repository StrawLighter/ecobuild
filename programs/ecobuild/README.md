# EcoBuild Solana Program (Anchor)

## Planned Account Layout
- `Config`
- `Player`
- `Submission`
- `Project`
- `ProjectVault`

## Planned Instructions
1. `initialize_config`
2. `register_player`
3. `record_submission`
4. `allocate_material`
5. `update_tier`

Scaffolding with Anchor CLI:
```bash
anchor init ecobuild
```

TODO:
- Define enums for `MaterialType`, `Tier`, `Specialization`.
- Implement conversion + validation logic.
- Emit events for off-chain agents.
```
