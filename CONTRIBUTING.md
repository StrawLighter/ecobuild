# EcoBuild Repository Guidelines

1. **Protect Secrets**
   - Never commit credentials or private keys.
   - `secrets/` is gitignored—keep all sensitive material there or in external secret managers.

2. **Optimize for Demo Flow**
   - Ship the clean, reliable “happy path” first.
   - Extra features only land after the core end-to-end demo works.

3. **Commit Rhythm**
   - Keep changes small, reviewable, and well-described.
   - Commit early, commit often; avoid mega-commits.

4. **Documentation after Milestones**
   - Update README, architecture docs, and write a short demo note whenever a milestone is reached.

5. **Credentials & Permissions**
   - Stop and ask before proceeding if an action requires new credentials or elevated permissions.
