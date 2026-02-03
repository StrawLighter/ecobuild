#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERIFIER_URL="${VERIFIER_URL:-http://localhost:3000}"
SIM_MODE="${SIM_MODE:-1}"
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
if [[ "${SIM_MODE}" == "1" ]]; then
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
else
  echo "B) Mint PoC receipt + C) Contribute credits (devnet — real transactions)"

  # ── pre-flight checks ──────────────────────────────────────────────────────
  _missing=0
  for _cmd in solana anchor; do
    if ! command -v "$_cmd" >/dev/null 2>&1; then
      echo "  ERROR: '$_cmd' not found in PATH." >&2
      echo "         Run 'scripts/bootstrap-ubuntu.sh' first." >&2
      _missing=1
    fi
  done

  IDL_PATH="${ROOT_DIR}/target/idl/ecobuild.json"
  if [[ ! -f "$IDL_PATH" ]]; then
    echo "  ERROR: IDL not found at $IDL_PATH" >&2
    echo "         Run 'scripts/build-sbf.sh' to generate it." >&2
    _missing=1
  fi

  KEYPAIR_PATH="${KEYPAIR_PATH:-$HOME/.config/solana/id.json}"
  if [[ ! -f "$KEYPAIR_PATH" ]]; then
    echo "  ERROR: Keypair not found at $KEYPAIR_PATH" >&2
    echo "         Create one with:  solana-keygen new --outfile $KEYPAIR_PATH" >&2
    _missing=1
  fi

  if [[ $_missing -eq 1 ]]; then
    echo "Aborting — pre-flight checks failed." >&2
    exit 1
  fi

  SOLANA_URL="${SOLANA_URL:-https://api.devnet.solana.com}"
  echo "  RPC:     $SOLANA_URL"
  echo "  Wallet:  $KEYPAIR_PATH"
  echo "  IDL:     $IDL_PATH"
  echo

  # ── execute on-chain transactions via inline Anchor client ─────────────────
  ATTEST_RESPONSE="$attest_response" \
  KEYPAIR_PATH="$KEYPAIR_PATH" \
  SOLANA_URL="$SOLANA_URL" \
  IDL_PATH="$IDL_PATH" \
  node <<'ECOBUILD_TX'
const anchor = require("@coral-xyz/anchor");
const fs     = require("fs");
const crypto = require("crypto");

// ── load config ──────────────────────────────────────────────────────────────
const idl        = JSON.parse(fs.readFileSync(process.env.IDL_PATH, "utf8"));
const keypairRaw = JSON.parse(fs.readFileSync(process.env.KEYPAIR_PATH, "utf8"));
const wallet     = new anchor.Wallet(
  anchor.web3.Keypair.fromSecretKey(new Uint8Array(keypairRaw))
);
const connection = new anchor.web3.Connection(process.env.SOLANA_URL, "finalized");
const provider   = new anchor.AnchorProvider(connection, wallet, { commitment: "finalized" });
anchor.setProvider(provider);

const program   = new anchor.Program(idl, provider);
const authority = wallet.publicKey;

// ── parse verifier response ──────────────────────────────────────────────────
const resp          = JSON.parse(process.env.ATTEST_RESPONSE);
const attestationId = Buffer.from(resp.attestationId, "hex");          // 32 bytes (sha256 hex → raw)
const photoHash     = crypto.createHash("sha256")
                        .update(resp.normalized.photoHash).digest();    // 32 bytes
const zoneId        = resp.normalized.zoneId;
const materialMap   = { plastic: 0, glass: 1, metal: 2, paper: 3 };
const materialType  = materialMap[resp.normalized.materialType];
const quantity      = new anchor.BN(resp.normalized.quantity);
const timestamp     = new anchor.BN(Math.floor(Date.now() / 1000));

// ── derive PDAs ──────────────────────────────────────────────────────────────
const [playerPda] = anchor.web3.PublicKey.findProgramAddressSync(
  [Buffer.from("player"), authority.toBuffer()],
  program.programId
);
const [pocPda] = anchor.web3.PublicKey.findProgramAddressSync(
  [Buffer.from("poc"), authority.toBuffer(), attestationId],
  program.programId
);
const projectSeed = new anchor.BN(1);
const [poolPda] = anchor.web3.PublicKey.findProgramAddressSync(
  [Buffer.from("project"), authority.toBuffer(), projectSeed.toArrayLike(Buffer, "le", 8)],
  program.programId
);

(async () => {
  // B-1) initialize_player  (skip if already on-chain)
  if (!(await connection.getAccountInfo(playerPda))) {
    const tx = await program.methods
      .initializePlayer()
      .accounts({ authority, playerProfile: playerPda })
      .rpc();
    console.log("  initialize_player tx:", tx);
  } else {
    console.log("  initialize_player: already exists — skipping");
  }

  // B-2) mint_poc_receipt
  const mintTx = await program.methods
    .mintPocReceipt(
      [...attestationId],
      [...photoHash],
      zoneId,
      materialType,
      quantity,
      timestamp
    )
    .accounts({
      authority,
      playerProfile: playerPda,
      pocReceipt:    pocPda,
    })
    .rpc();
  console.log("  mint_poc_receipt tx:", mintTx);

  // C-1) create_project_pool  (skip if already on-chain)
  if (!(await connection.getAccountInfo(poolPda))) {
    const tx = await program.methods
      .createProjectPool(projectSeed, "Demo Pool", new anchor.BN(100))
      .accounts({ authority, projectPool: poolPda })
      .rpc();
    console.log("  create_project_pool tx:", tx);
  } else {
    console.log("  create_project_pool: already exists — skipping");
  }

  // C-2) contribute_credits
  const creditsTx = await program.methods
    .contributeCredits(quantity)
    .accounts({
      authority,
      playerProfile: playerPda,
      projectPool:   poolPda,
    })
    .rpc();
  console.log("  contribute_credits tx:", creditsTx);

  console.log("\n  All transactions confirmed on devnet.");
})();
ECOBUILD_TX
fi

echo
echo "Demo complete."
