# EcoBuild Verifier Service

Minimal Fastify server that will later host submission verification logic.

## Endpoints
- `GET /health` → `{ ok: true, version, commit }`
- `POST /attest` → `{ message: "not implemented yet" }`

## Local Development
```bash
cd apps/verifier
npm install
npm run dev
```

The service listens on port `3000` by default. Override with `PORT=4000 npm run dev`.
