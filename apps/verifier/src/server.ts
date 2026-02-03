import Fastify from "fastify";
import { createHash, randomUUID } from "crypto";

const server = Fastify({
  logger: true,
});

const version = process.env.VERIFIER_VERSION ?? "0.1.0";
const commit = process.env.COMMIT_SHA ?? "dev";
const maxTimeDriftMs = Number(process.env.MAX_TIME_DRIFT_MS ?? 10 * 60 * 1000);

type AttestRequestBody = {
  playerPubkey: string;
  materialType: string;
  quantity: number;
  zoneId: string;
  photoHash: string;
  gps: {
    lat: number;
    lon: number;
  };
  timestamp: string;
};

type NormalizedAttestation = {
  playerPubkey: string;
  materialType: "plastic" | "glass" | "metal" | "paper";
  quantity: number;
  zoneId: string;
  photoHash: string;
  gps: {
    lat: number;
    lon: number;
  };
  timestamp: string;
};

server.get("/health", async () => ({
  ok: true,
  version,
  commit,
}));

server.post<{ Body: AttestRequestBody }>("/attest", async (request, reply) => {
  const requestId = randomUUID();

  let normalized: NormalizedAttestation;
  try {
    normalized = normalizeBody(request.body);
    validateTimestampWithinDrift(normalized.timestamp, maxTimeDriftMs);
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid payload";
    request.log.warn({ requestId, error: message }, "attestation rejected");
    return reply.status(400).send({ ok: false, error: message });
  }

  const attestationId = createHash("sha256")
    .update(JSON.stringify(normalized))
    .digest("hex");

  const serverTimestamp = new Date().toISOString();

  request.log.info({ requestId, attestationId }, "attestation recorded");

  return {
    ok: true,
    attestationId,
    normalized,
    serverTimestamp,
    signatureStub: "TODO-SIGNATURE",
  };
});

function normalizeBody(body: Partial<AttestRequestBody>): NormalizedAttestation {
  if (!body) {
    throw new Error("missing body");
  }

  const requiredFields: (keyof AttestRequestBody)[] = [
    "playerPubkey",
    "materialType",
    "quantity",
    "zoneId",
    "photoHash",
    "gps",
    "timestamp",
  ];

  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null) {
      throw new Error(`missing field: ${field}`);
    }
  }

  const material = String(body.materialType).toLowerCase();
  if (!isSupportedMaterial(material)) {
    throw new Error(`unsupported materialType: ${body.materialType}`);
  }

  const quantity = Number(body.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("quantity must be greater than zero");
  }

  if (typeof body.gps !== "object" || body.gps === null) {
    throw new Error("missing gps");
  }

  const lat = Number((body.gps as AttestRequestBody["gps"]).lat);
  const lon = Number((body.gps as AttestRequestBody["gps"]).lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error("gps coordinates must be numbers");
  }

  const timestampIso = new Date(body.timestamp as string);
  if (Number.isNaN(timestampIso.getTime())) {
    throw new Error("timestamp must be a valid ISO string");
  }

  return {
    playerPubkey: String(body.playerPubkey).trim(),
    materialType: material as NormalizedAttestation["materialType"],
    quantity,
    zoneId: String(body.zoneId).trim(),
    photoHash: String(body.photoHash).trim().toLowerCase(),
    gps: {
      lat,
      lon,
    },
    timestamp: timestampIso.toISOString(),
  };
}

function validateTimestampWithinDrift(timestampIso: string, maxDriftMsValue: number) {
  const ts = new Date(timestampIso).getTime();
  const now = Date.now();
  const drift = Math.abs(now - ts);
  if (drift > maxDriftMsValue) {
    throw new Error("timestamp outside allowable window");
  }
}

function isSupportedMaterial(
  material: string
): material is NormalizedAttestation["materialType"] {
  return ["plastic", "glass", "metal", "paper"].includes(material);
}

export default server;
