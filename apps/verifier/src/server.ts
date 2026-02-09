import crypto from "node:crypto";
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { PublicKey } from "@solana/web3.js";
import {
  initSolanaClient,
  mintBlocks,
  getPlayerStats,
  getGlobalStats,
  wasteTypeToU8,
  PROGRAM_ID,
  globalConfigPda,
  blockMintPda,
} from "./solana-client.js";
import { initVision, classifyImage, type VisionResult } from "./vision.js";

// ── Constants ──────────────────────────────────────────────────────────
const MATERIAL_TYPES = new Set(["plastic", "glass", "metal", "paper"]);
const DEFAULT_TIME_WINDOW_MS = 10 * 60 * 1000;
const MIN_CONFIDENCE = 0.7;

const server = Fastify({
  logger: true,
  bodyLimit: 20 * 1024 * 1024, // 20MB for image uploads
});

// CORS: allow frontend origins (localhost for dev, Vercel for production)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : true; // true = allow all in dev
server.register(cors, { origin: allowedOrigins });

// Register multipart for file uploads
server.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
  },
});

const version = process.env.VERIFIER_VERSION ?? "0.2.0";
const commit = process.env.COMMIT_SHA ?? "dev";

// ── Helpers ────────────────────────────────────────────────────────────
function isValidPubkey(s: string): boolean {
  try {
    new PublicKey(s);
    return true;
  } catch {
    return false;
  }
}

const parseNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

// ── GET /health ────────────────────────────────────────────────────────
server.get("/health", async () => ({
  ok: true,
  version,
  commit,
  programId: PROGRAM_ID.toBase58(),
  globalConfig: globalConfigPda.toBase58(),
  blockMint: blockMintPda.toBase58(),
}));

// ── POST /verify ───────────────────────────────────────────────────────
// Accepts multipart: image file + player_wallet field
server.post("/verify", async (request, reply) => {
  const parts = request.parts();
  let imageBuffer: Buffer | null = null;
  let imageMimeType = "image/jpeg";
  let playerWallet: string | null = null;

  for await (const part of parts) {
    if (part.type === "file" && part.fieldname === "image") {
      imageBuffer = await part.toBuffer();
      imageMimeType = part.mimetype;
    } else if (part.type === "field") {
      if (part.fieldname === "player_wallet") {
        playerWallet = String(part.value).trim();
      }
    }
  }

  // Validate inputs
  const errors: string[] = [];

  if (!imageBuffer || imageBuffer.length === 0) {
    errors.push("image file is required (field name: 'image')");
  }

  if (!playerWallet) {
    errors.push("player_wallet field is required");
  } else if (!isValidPubkey(playerWallet)) {
    errors.push("player_wallet must be a valid Solana public key");
  }

  if (errors.length > 0) {
    reply.code(400);
    return { ok: false, errors };
  }

  // ── Step 1: AI image classification ──────────────────────────────────
  let classification: VisionResult;
  try {
    classification = await classifyImage(imageBuffer!, imageMimeType);
  } catch (err: any) {
    server.log.error({ err }, "Vision classification failed");
    reply.code(500);
    return {
      ok: false,
      error: "Image classification failed",
      detail: err.message,
    };
  }

  server.log.info({ classification }, "Image classified");

  // ── Step 2: Check if waste was detected with enough confidence ───────
  if (!classification.waste_detected || classification.confidence < MIN_CONFIDENCE) {
    reply.code(200);
    return {
      ok: true,
      verified: false,
      classification,
      reason:
        !classification.waste_detected
          ? "No waste detected in image"
          : `Confidence too low (${classification.confidence} < ${MIN_CONFIDENCE})`,
      transaction: null,
    };
  }

  // ── Step 3: Mint BLOCK tokens on-chain ───────────────────────────────
  const blocksToMint = Math.max(
    1,
    Math.round(classification.estimated_weight_lbs)
  );
  const wasteTypeU8 = wasteTypeToU8(classification.waste_type);

  let txSignature: string;
  try {
    txSignature = await mintBlocks(
      new PublicKey(playerWallet!),
      blocksToMint,
      wasteTypeU8
    );
  } catch (err: any) {
    server.log.error({ err }, "Mint transaction failed");
    reply.code(500);
    return {
      ok: false,
      verified: true,
      classification,
      error: "On-chain mint failed",
      detail: err.message,
      transaction: null,
    };
  }

  reply.code(200);
  return {
    ok: true,
    verified: true,
    classification,
    blocksMinted: blocksToMint,
    transaction: txSignature,
    playerWallet,
  };
});

// ── POST /convert ──────────────────────────────────────────────────────
// Burns 10 BLOCK → 1 Brick for the authority wallet
// In production, the player would sign from their own wallet.
// For the hackathon demo, this uses the server's authority keypair.
server.post<{ Body: { player_wallet?: string } }>(
  "/convert",
  async (request, reply) => {
    // For now, convert only works for the authority wallet
    // (because we need the player's private key to sign the burn)
    try {
      const { convertToBrickAsAuthority } = await import(
        "./solana-client.js"
      );
      const tx = await convertToBrickAsAuthority();

      reply.code(200);
      return {
        ok: true,
        transaction: tx,
        blocksConverted: 10,
        bricksReceived: 1,
      };
    } catch (err: any) {
      server.log.error({ err }, "Convert transaction failed");
      reply.code(500);
      return {
        ok: false,
        error: "Convert failed",
        detail: err.message,
      };
    }
  }
);

// ── GET /stats/:wallet ─────────────────────────────────────────────────
server.get<{ Params: { wallet: string } }>(
  "/stats/:wallet",
  async (request, reply) => {
    const { wallet } = request.params;

    if (!isValidPubkey(wallet)) {
      reply.code(400);
      return { ok: false, error: "Invalid wallet address" };
    }

    const stats = await getPlayerStats(new PublicKey(wallet));
    if (!stats) {
      reply.code(404);
      return {
        ok: false,
        error: "Player profile not found. Initialize player first.",
      };
    }

    return { ok: true, ...stats };
  }
);

// ── GET /stats (global) ────────────────────────────────────────────────
server.get("/global-stats", async (_request, reply) => {
  const stats = await getGlobalStats();
  if (!stats) {
    reply.code(404);
    return {
      ok: false,
      error: "GlobalConfig not initialized. Run initialize_config first.",
    };
  }
  return { ok: true, ...stats };
});

// ── Legacy POST /attest (kept for backward compatibility) ──────────────
type AttestationPayload = {
  playerPubkey: string;
  materialType: string;
  quantity: number;
  zoneId: string;
  photoHash: string;
  gps: { lat: number; lon: number };
  timestamp: number;
};

const normalizePayload = (payload: AttestationPayload) => ({
  playerPubkey: payload.playerPubkey.trim(),
  materialType: payload.materialType.trim().toLowerCase(),
  quantity: payload.quantity,
  zoneId: payload.zoneId.trim(),
  photoHash: payload.photoHash.trim(),
  gps: { lat: payload.gps.lat, lon: payload.gps.lon },
  timestamp: payload.timestamp,
});

const toAttestationId = (normalized: ReturnType<typeof normalizePayload>) =>
  crypto.createHash("sha256").update(JSON.stringify(normalized)).digest("hex");

server.post<{ Body: AttestationPayload }>("/attest", async (request, reply) => {
  const requestId = request.id;
  const body = request.body;
  const errors: string[] = [];

  if (!body || typeof body !== "object") errors.push("body is required");

  const playerPubkey =
    typeof body?.playerPubkey === "string" ? body.playerPubkey : "";
  const materialType =
    typeof body?.materialType === "string" ? body.materialType : "";
  const zoneId = typeof body?.zoneId === "string" ? body.zoneId : "";
  const photoHash = typeof body?.photoHash === "string" ? body.photoHash : "";

  if (!playerPubkey.trim()) errors.push("playerPubkey is required");
  if (!materialType.trim()) errors.push("materialType is required");
  if (!zoneId.trim()) errors.push("zoneId is required");
  if (!photoHash.trim()) errors.push("photoHash is required");

  const quantity = parseNumber(body?.quantity);
  if (quantity === null) errors.push("quantity must be a number");
  else if (quantity <= 0) errors.push("quantity must be greater than 0");

  const lat = parseNumber(body?.gps?.lat);
  const lon = parseNumber(body?.gps?.lon);
  if (lat === null || lon === null)
    errors.push("gps.lat and gps.lon must be numbers");

  const timestamp = parseNumber(body?.timestamp);
  if (timestamp === null) errors.push("timestamp must be a number");

  const normalizedMaterialType = materialType.trim().toLowerCase();
  if (materialType.trim() && !MATERIAL_TYPES.has(normalizedMaterialType))
    errors.push("materialType must be one of plastic, glass, metal, paper");

  const timeWindowMs = parseNumber(process.env.ATTESTATION_TIME_WINDOW_MS);
  const allowedWindow = timeWindowMs ?? DEFAULT_TIME_WINDOW_MS;
  const serverTimestamp = Date.now();
  if (timestamp !== null) {
    if (Math.abs(serverTimestamp - timestamp) > allowedWindow)
      errors.push("timestamp is outside the allowed window");
  }

  if (errors.length > 0) {
    server.log.warn({ requestId, errors }, "attestation rejected");
    reply.code(400);
    return { ok: false, errors, serverTimestamp };
  }

  const normalized = normalizePayload({
    playerPubkey,
    materialType: normalizedMaterialType,
    quantity: quantity ?? 0,
    zoneId,
    photoHash,
    gps: { lat: lat ?? 0, lon: lon ?? 0 },
    timestamp: timestamp ?? serverTimestamp,
  });
  const attestationId = toAttestationId(normalized);

  server.log.info({ requestId, attestationId }, "attestation accepted");
  reply.code(200);
  return { ok: true, attestationId, normalized, serverTimestamp };
});

// ── Start server ───────────────────────────────────────────────────────
const port = Number(process.env.PORT ?? 3000);

async function start() {
  try {
    // Initialize subsystems
    initVision();
    await initSolanaClient();

    await server.listen({ port, host: "0.0.0.0" });
    server.log.info(`EcoBuild Verifier v${version} listening on port ${port}`);
  } catch (err) {
    server.log.error(err, "Failed to start verifier");
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export default server;
export { start };
