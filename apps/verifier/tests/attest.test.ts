import { test } from "node:test";
import assert from "node:assert/strict";
import server from "../src/server.js";

test("POST /attest happy path", async () => {
  await server.ready();

  const timestamp = new Date().toISOString();
  const response = await server.inject({
    method: "POST",
    url: "/attest",
    payload: {
      playerPubkey: "Player123",
      materialType: "plastic",
      quantity: 12,
      zoneId: "Zone-1",
      photoHash: "ABCDEF",
      gps: { lat: 40.7128, lon: -74.006 },
      timestamp,
    },
  });

  assert.equal(response.statusCode, 200);
  const body = response.json() as Record<string, unknown>;
  assert.equal(body.ok, true);
  assert.match(String(body.attestationId), /^[a-f0-9]{64}$/);
  assert.equal((body.normalized as Record<string, unknown>).materialType, "plastic");
});

test("POST /attest rejects unsupported material", async () => {
  await server.ready();

  const response = await server.inject({
    method: "POST",
    url: "/attest",
    payload: {
      playerPubkey: "Player123",
      materialType: "wood",
      quantity: 5,
      zoneId: "Zone-1",
      photoHash: "abc",
      gps: { lat: 0, lon: 0 },
      timestamp: new Date().toISOString(),
    },
  });

  assert.equal(response.statusCode, 400);
  const body = response.json() as Record<string, unknown>;
  assert.equal(body.ok, false);
  assert.ok(String(body.error).includes("unsupported materialType"));
});
