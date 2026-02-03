#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERIFIER_URL="${VERIFIER_URL:-http://localhost:3000}"
SAMPLE_JSON="${ROOT_DIR}/apps/verifier/examples/attest.sample.json"

if [[ ! -f "${SAMPLE_JSON}" ]]; then
  echo "Missing sample payload at ${SAMPLE_JSON}" >&2
  exit 1
fi

if ! command -v node >/dev/null; then
  echo "Node.js is required for this demo script." >&2
  exit 1
fi

echo "EcoBuild 60s Demo (local)"
echo "Using verifier: ${VERIFIER_URL}"

if ! curl -sf "${VERIFIER_URL}/health" >/dev/null; then
  echo "Verifier is not running. Start it with:"
  echo "  cd apps/verifier && npm install && npm run dev"
  exit 1
fi

echo
echo "A) Attest pickup via verifier"
tmp_payload="$(mktemp)"
SAMPLE_JSON_PATH="${SAMPLE_JSON}" TMP_PAYLOAD_PATH="${tmp_payload}" node -e "
const fs = require('fs');
const payload = JSON.parse(fs.readFileSync(process.env.SAMPLE_JSON_PATH, 'utf8'));
payload.timestamp = Date.now();
fs.writeFileSync(process.env.TMP_PAYLOAD_PATH, JSON.stringify(payload));
"

attest_response="$(curl -s "${VERIFIER_URL}/attest" \
  -H 'content-type: application/json' \
  --data @"${tmp_payload}")"
rm -f "${tmp_payload}"

echo "Verifier response:"
echo "${attest_response}"

attestation_id="$(node -e "console.log(JSON.parse(process.argv[1]).attestationId || '')" "${attest_response}")"

if [[ -z "${attestation_id}" ]]; then
  echo "No attestationId returned. Check verifier logs." >&2
  exit 1
fi

echo "Attestation ID: ${attestation_id}"

echo
echo "B) Mint PoC receipt (simulation mode)"
echo "SBF/validator builds are blocked on this machine, so we print the intended Anchor call."
echo "Anchor instruction: mint_poc_receipt"
echo "Inputs:"
echo "  attestation_id: ${attestation_id}"
echo "  photo_hash: see payload photoHash"
echo "  zone_id: zone-17"
echo "  material_type: plastic (0)"
echo "  quantity: 3"
echo "  timestamp: now"
echo "Accounts:"
echo "  authority: <demo wallet>"
echo "  player_profile PDA: [player, authority]"
echo "  poc_receipt PDA: [poc, authority, attestation_id]"
echo "Unit tests: programs/ecobuild/src/lib.rs (seed derivation + validation)"

echo
echo "C) Contribute credits (simulation mode)"
echo "Anchor instruction: contribute_credits"
echo "Inputs:"
echo "  amount: 3"
echo "Accounts:"
echo "  authority: <demo wallet>"
echo "  player_profile PDA: [player, authority]"
echo "  project_pool PDA: [project, authority, project_seed]"
echo "Unit tests: programs/ecobuild/src/lib.rs (credit contribution + overflow checks)"

echo
echo "Demo complete."
