import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import server from "../src/server.js";

const hashPayload = (payload: Record<string, unknown>) =>
  crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");

test("attest accepts valid payload and returns deterministic hash", async () => {
  await server.ready();
  const timestamp = Date.now();
  const payload = {
    playerPubkey: "TestPlayer1111111111111111111111111111111",
    materialType: "Plastic",
    quantity: 4,
    zoneId: "zone-17",
    photoHash: "photo-hash-abc",
    gps: { lat: 37.7749, lon: -122.4194 },
    timestamp,
  };

  const response = await server.inject({
    method: "POST",
    url: "/attest",
    payload,
  });

  assert.equal(response.statusCode, 200);
  const body = response.json();
  const normalized = {
    playerPubkey: payload.playerPubkey,
    materialType: "plastic",
    quantity: payload.quantity,
    zoneId: payload.zoneId,
    photoHash: payload.photoHash,
    gps: payload.gps,
    timestamp: payload.timestamp,
  };

  assert.equal(body.ok, true);
  assert.equal(body.attestationId, hashPayload(normalized));
  assert.equal(body.normalized.materialType, "plastic");
  assert.equal(body.normalized.quantity, 4);
});

test("attest rejects invalid payload", async () => {
  await server.ready();
  const response = await server.inject({
    method: "POST",
    url: "/attest",
    payload: {
      playerPubkey: "",
      materialType: "wood",
      quantity: 0,
      zoneId: "",
      photoHash: "",
      gps: { lat: "nope", lon: 42 },
      timestamp: Date.now(),
    },
  });

  assert.equal(response.statusCode, 400);
  const body = response.json();
  assert.equal(body.ok, false);
  assert.ok(Array.isArray(body.errors));
  assert.ok(body.errors.length > 0);
});

test.after(async () => {
  await server.close();
});
