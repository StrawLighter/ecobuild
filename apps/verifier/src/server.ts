import crypto from "node:crypto";
import Fastify from "fastify";

const MATERIAL_TYPES = new Set(["plastic", "glass", "metal", "paper"]);
const DEFAULT_TIME_WINDOW_MS = 10 * 60 * 1000;

const server = Fastify({
  logger: true,
});

const version = process.env.VERIFIER_VERSION ?? "0.1.0";
const commit = process.env.COMMIT_SHA ?? "dev";

server.get("/health", async () => ({
  ok: true,
  version,
  commit,
}));

type AttestationPayload = {
  playerPubkey: string;
  materialType: string;
  quantity: number;
  zoneId: string;
  photoHash: string;
  gps: {
    lat: number;
    lon: number;
  };
  timestamp: number;
};

const parseNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const normalizePayload = (payload: AttestationPayload) => ({
  playerPubkey: payload.playerPubkey.trim(),
  materialType: payload.materialType.trim().toLowerCase(),
  quantity: payload.quantity,
  zoneId: payload.zoneId.trim(),
  photoHash: payload.photoHash.trim(),
  gps: {
    lat: payload.gps.lat,
    lon: payload.gps.lon,
  },
  timestamp: payload.timestamp,
});

const toAttestationId = (normalized: ReturnType<typeof normalizePayload>) =>
  crypto.createHash("sha256").update(JSON.stringify(normalized)).digest("hex");

server.post<{ Body: AttestationPayload }>("/attest", async (request, reply) => {
  const requestId = request.id;
  const body = request.body;
  const errors: string[] = [];

  if (!body || typeof body !== "object") {
    errors.push("body is required");
  }

  const playerPubkey =
    typeof body?.playerPubkey === "string" ? body.playerPubkey : "";
  const materialType =
    typeof body?.materialType === "string" ? body.materialType : "";
  const zoneId = typeof body?.zoneId === "string" ? body.zoneId : "";
  const photoHash = typeof body?.photoHash === "string" ? body.photoHash : "";

  if (!playerPubkey.trim()) {
    errors.push("playerPubkey is required");
  }
  if (!materialType.trim()) {
    errors.push("materialType is required");
  }
  if (!zoneId.trim()) {
    errors.push("zoneId is required");
  }
  if (!photoHash.trim()) {
    errors.push("photoHash is required");
  }

  const quantity = parseNumber(body?.quantity);
  if (quantity === null) {
    errors.push("quantity must be a number");
  } else if (quantity <= 0) {
    errors.push("quantity must be greater than 0");
  }

  const lat = parseNumber(body?.gps?.lat);
  const lon = parseNumber(body?.gps?.lon);
  if (lat === null || lon === null) {
    errors.push("gps.lat and gps.lon must be numbers");
  }

  const timestamp = parseNumber(body?.timestamp);
  if (timestamp === null) {
    errors.push("timestamp must be a number");
  }

  const normalizedMaterialType = materialType.trim().toLowerCase();
  if (materialType.trim() && !MATERIAL_TYPES.has(normalizedMaterialType)) {
    errors.push("materialType must be one of plastic, glass, metal, paper");
  }

  const timeWindowMs = parseNumber(process.env.ATTESTATION_TIME_WINDOW_MS);
  const allowedWindow = timeWindowMs ?? DEFAULT_TIME_WINDOW_MS;
  const serverTimestamp = Date.now();
  if (timestamp !== null) {
    const delta = Math.abs(serverTimestamp - timestamp);
    if (delta > allowedWindow) {
      errors.push("timestamp is outside the allowed window");
    }
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
    gps: {
      lat: lat ?? 0,
      lon: lon ?? 0,
    },
    timestamp: timestamp ?? serverTimestamp,
  });
  const attestationId = toAttestationId(normalized);

  server.log.info(
    { requestId, attestationId },
    "attestation accepted (mocked)"
  );

  reply.code(200);
  return {
    ok: true,
    attestationId,
    normalized,
    serverTimestamp,
    signatureStub: "mock-signature",
  };
});

const port = Number(process.env.PORT ?? 3000);

if (import.meta.url === `file://${process.argv[1]}`) {
  server
    .listen({ port, host: "0.0.0.0" })
    .then(() => {
      server.log.info(`Verifier listening on port ${port}`);
    })
    .catch((err) => {
      server.log.error(err, "Failed to start verifier");
      process.exit(1);
    });
}

export default server;
