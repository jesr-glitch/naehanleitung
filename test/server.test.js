import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, createLimiter } from "../src/server.js";
import { validateInput, SCHEMA } from "../src/analyze.js";

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const RESULT = { merkmale: ["Hemdkragen"], fehler: "", erkannt: "Hemd", beschreibung: "", typ: "oberteil", stoff: "webware" };

async function withServer(opts, fn) {
  const server = createServer(opts);
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await fn(base); } finally { await new Promise((r) => server.close(r)); }
}
const fakeClient = (calls = []) => ({ beta: { messages: { create: async (body) => { calls.push(body); return { stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(RESULT) }] }; } } } });
const post = (base, body) => fetch(`${base}/api/analyze`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

test("ohne API-Schlüssel meldet der Server die Analyse als aus", async () => {
  await withServer({ client: null }, async (base) => {
    assert.deepEqual(await (await fetch(`${base}/api/health`)).json(), { ok: true, analyze: false });
    const r = await post(base, { images: [{ media_type: "image/png", data: PNG }] });
    assert.equal(r.status, 503);
  });
});

test("Analyse schickt Bild, Schema und Fallback an Claude", async () => {
  const calls = [];
  await withServer({ client: fakeClient(calls) }, async (base) => {
    const r = await post(base, { images: [{ media_type: "image/png", data: PNG }], desc: "kariertes Hemd", hint: "eine Bluse oder ein Hemd" });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).result.erkannt, "Hemd");
    const body = calls[0];
    assert.equal(body.model, "claude-opus-5-5");
    assert.equal(body.fallbacks, "default");
    assert.deepEqual(body.output_config.format, { type: "json_schema", schema: SCHEMA });
    assert.equal(body.messages[0].content[0].type, "image");
    assert.match(body.messages[0].content.at(-1).text, /kariertes Hemd/);
  });
});

test("Ablehnung durch Claude wird als refused gemeldet", async () => {
  const client = { beta: { messages: { create: async () => ({ stop_reason: "refusal", content: [] }) } } };
  await withServer({ client }, async (base) => {
    const r = await post(base, { desc: "Hemd" });
    assert.equal(r.status, 422);
    assert.equal((await r.json()).code, "refused");
  });
});

test("ungültige Eingaben werden abgewiesen", () => {
  assert.throws(() => validateInput({}), /Foto oder Beschreibung/);
  assert.throws(() => validateInput({ images: [{ media_type: "image/gif", data: PNG }] }), /Bildformat/);
  assert.throws(() => validateInput({ images: Array(4).fill({ media_type: "image/png", data: PNG }) }), /Höchstens/);
  assert.throws(() => validateInput({ images: [{ media_type: "image/png", data: "<script>" }] }), /Bildformat/);
});

test("Begrenzung pro Stunde und pro Tag", () => {
  let t = 0;
  const lim = createLimiter({ perHour: 2, perDay: 3, now: () => t });
  assert.equal(lim.check("a"), null);
  assert.equal(lim.check("a"), null);
  assert.equal(lim.check("a"), "rate_limited");
  assert.equal(lim.check("b"), null);
  assert.equal(lim.check("c"), "quota");
  t += 86_400_001;
  assert.equal(lim.check("c"), null);
});

test("statische Dateien, Sicherheits-Header, kein Ausbruch aus public/", async () => {
  await withServer({ client: null }, async (base) => {
    const r = await fetch(base + "/");
    assert.equal(r.status, 200);
    assert.match(r.headers.get("content-security-policy"), /default-src 'self'/);
    assert.equal((await fetch(base + "/engine.js")).status, 200);
    assert.equal((await fetch(base + "/vendor/three.min.js")).headers.get("cache-control"), "public, max-age=31536000, immutable");
    assert.notEqual((await fetch(base + "/..%2fpackage.json")).status, 200);
    assert.notEqual((await fetch(base + "/%2e%2e/src/server.js")).status, 200);
  });
});
