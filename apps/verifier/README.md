# EcoBuild Verifier Service

Fastify service that mocks the verification step for proof-of-collection (PoC)
attestations. It validates incoming payloads, normalizes fields, and returns a
deterministic `attestationId`.

## Endpoints
- `GET /health` → `{ ok: true, version, commit }`
- `POST /attest` → `{ ok, attestationId, normalized, serverTimestamp, signatureStub }`

## Local Development
```bash
cd apps/verifier
npm install
npm run dev
```

The service listens on port `3000` by default. Override with
`PORT=4000 npm run dev`.

## Attestation Validation
- Required fields: `playerPubkey`, `materialType`, `quantity`, `zoneId`,
  `photoHash`, `gps.lat`, `gps.lon`, `timestamp`
- `materialType` must be one of `plastic`, `glass`, `metal`, `paper`
- `quantity` must be greater than 0
- `timestamp` must fall within +/- 10 minutes (default) of server time

Override the time window with `ATTESTATION_TIME_WINDOW_MS`.

## Curl Examples
Happy path:
```bash
curl -s http://localhost:3000/attest \
  -H "content-type: application/json" \
  -d '{
    "playerPubkey": "DemoPlayer1111111111111111111111111111111",
    "materialType": "plastic",
    "quantity": 3,
    "zoneId": "zone-17",
    "photoHash": "photo-hash-abc",
    "gps": { "lat": 37.7749, "lon": -122.4194 },
    "timestamp": 1738598400000
  }'
```
Replace `timestamp` with the current epoch milliseconds to stay within the
validation window.

Failing example (bad material type + missing fields):
```bash
curl -s http://localhost:3000/attest \
  -H "content-type: application/json" \
  -d '{
    "playerPubkey": "",
    "materialType": "wood",
    "quantity": 0,
    "zoneId": "",
    "photoHash": "",
    "gps": { "lat": "nope", "lon": 42 },
    "timestamp": 1738598400000
  }'
```

## Tests
```bash
npm test
```
