# EcoBuild Verifier Service

Minimal Fastify server that will host submission verification logic.

## Endpoints
- `GET /health` → `{ ok: true, version, commit }`
- `POST /attest` → Validates payload, emits mocked approval artifact `{ ok, attestationId, normalized, serverTimestamp, signatureStub }`

## Local Development
```bash
cd apps/verifier
npm install
npm run dev
```

The service listens on port `3000` by default. Override with `PORT=4000 npm run dev`.

## Example: Mocked Attestation
```bash
curl -X POST http://localhost:3000/attest \
  -H "Content-Type: application/json" \
  -d '{
    "playerPubkey": "Player123",
    "materialType": "plastic",
    "quantity": 12,
    "zoneId": "Zone-1",
    "photoHash": "abc123",
    "gps": {"lat": 40.7128, "lon": -74.0060},
    "timestamp": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)'""
  }'
```
