# EcoBuild 60-Second Demo (Local)

This demo runs end-to-end locally without an SBF deploy. It hits the mocked
verifier, then prints the intended on-chain calls in simulation mode.

## 1) Start the verifier
```bash
cd apps/verifier
npm install
npm run dev
```

## 2) Run the demo script
From the repo root:
```bash
./scripts/demo.sh
```

Optional: point at a different verifier URL
```bash
VERIFIER_URL=http://localhost:3000 ./scripts/demo.sh
```

## What you should see
- Attestation request posted to `/attest`
- Printed `attestationId`
- Simulation output for `mint_poc_receipt`
- Simulation output for `contribute_credits`

## Why simulation mode?
SBF builds are blocked on this machine (cannot reach `release.solana.com`).
Native unit tests cover PDA derivation + validation in
`programs/ecobuild/src/lib.rs`.
