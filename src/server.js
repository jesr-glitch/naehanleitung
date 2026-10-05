// Fadenlauf-Server: liefert die App aus und stellt /api/analyze bereit.
// Ohne Abhängigkeiten außer dem Anthropic-SDK. Start: node src/server.js
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { analyzeGarment, validateInput, AnalyzeError } from "./analyze.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "..");
const PUBLIC = path.join(ROOT, "public");
const ENGINE = path.join(here, "engine.js");

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8",
};

const CSP = [
  "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'", "img-src 'self' blob: data:",
  "font-src 'self'", "connect-src 'self'", "worker-src 'self'", "manifest-src 'self'",
  "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "object-src 'none'",
].join("; ");

function securityHeaders(res) {
  res.setHeader("Content-Security-Policy", CSP);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

// Einfache Begrenzung im Speicher: pro IP und Stunde sowie insgesamt pro Tag (Kostenbremse).
export function createLimiter({ perHour, perDay, now = () => Date.now() }) {
  const hits = new Map();
  let day = { start: now(), count: 0 };
  return {
    check(ip) {
      const t = now();
      if (t - day.start > 86_400_000) day = { start: t, count: 0 };
      if (perDay && day.count >= perDay) return "quota";
      const list = (hits.get(ip) || []).filter((x) => t - x < 3_600_000);
      if (perHour && list.length >= perHour) { hits.set(ip, list); return "rate_limited"; }
      list.push(t); hits.set(ip, list); day.count++;
      if (hits.size > 10_000) for (const [k, v] of hits) if (!v.some((x) => t - x < 3_600_000)) hits.delete(k);
      return null;
    },
  };
}

async function readJson(req, limit) {
  let size = 0; const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw new AnalyzeError("image_rejected", 413, "Anfrage zu groß");
    chunks.push(c);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new AnalyzeError("invalid_request", 400, "Ungültiges JSON"); }
}

function clientIp(req, trustProxy) {
  if (trustProxy) { const f = req.headers["x-forwarded-for"]; if (f) return String(f).split(",")[0].trim(); }
  return req.socket.remoteAddress || "unknown";
}

function mapSdkError(err) {
  if (err instanceof AnalyzeError) return err;
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError)
    return new AnalyzeError("not_configured", 503, "Server-Schlüssel ungültig");
  if (err instanceof Anthropic.RateLimitError) return new AnalyzeError("busy", 503, "Gerade ausgelastet");
  if (err instanceof Anthropic.BadRequestError) return new AnalyzeError("image_rejected", 400, "Anfrage abgelehnt");
  if (err instanceof Anthropic.APIConnectionError) return new AnalyzeError("upstream_error", 502, "Keine Verbindung zu Claude");
  if (err instanceof Anthropic.APIError) return new AnalyzeError("upstream_error", 502, `Claude-Fehler ${err.status ?? ""}`.trim());
  return new AnalyzeError("upstream_error", 500, "Unbekannter Fehler");
}

async function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === "/") rel = "/index.html";
  const file = rel === "/engine.js" ? ENGINE : path.join(PUBLIC, path.normalize(rel).replace(/^([/\\])+/, ""));
  if (file !== ENGINE && !file.startsWith(PUBLIC + path.sep)) { res.writeHead(403).end(); return; }
  let data;
  try { data = await fs.readFile(file); }
  catch { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Nicht gefunden"); return; }
  const ext = path.extname(file);
  const immutable = rel.startsWith("/vendor/") || rel.startsWith("/fonts/");
  res.writeHead(200, {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Cache-Control": immutable ? "public, max-age=31536000, immutable" : ext === ".html" || rel === "/sw.js" ? "no-cache" : "public, max-age=3600",
  });
  res.end(req.method === "HEAD" ? undefined : data);
}

export function createServer({
  client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null,
  perHour = Number(process.env.ANALYZE_PER_HOUR || 20),
  perDay = Number(process.env.ANALYZE_PER_DAY || 500),
  trustProxy = process.env.TRUST_PROXY === "1",
  bodyLimit = 20 * 1024 * 1024,
} = {}) {
  const limiter = createLimiter({ perHour, perDay });
  return http.createServer(async (req, res) => {
    securityHeaders(res);
    const { pathname } = new URL(req.url, "http://x");
    try {
      if (pathname === "/api/health") return sendJson(res, 200, { ok: true, analyze: !!client });
      if (pathname === "/api/analyze") {
        if (req.method !== "POST") return sendJson(res, 405, { code: "invalid_request" });
        if (!client) return sendJson(res, 503, { code: "not_configured", message: "Foto-Analyse ist nicht eingerichtet" });
        const input = validateInput(await readJson(req, bodyLimit));
        const limited = limiter.check(clientIp(req, trustProxy));
        if (limited) return sendJson(res, 429, { code: limited });
        const ac = new AbortController();
        res.on("close", () => { if (!res.writableEnded) ac.abort(); });
        const result = await analyzeGarment(client, input, { signal: ac.signal });
        return sendJson(res, 200, { result });
      }
      if (req.method !== "GET" && req.method !== "HEAD") return sendJson(res, 405, { code: "invalid_request" });
      return await serveStatic(req, res, pathname);
    } catch (err) {
      const e = mapSdkError(err);
      if (e.status >= 500) console.error(`[analyze] ${e.code}: ${err.message}`);
      if (!res.headersSent) sendJson(res, e.status || 500, { code: e.code, message: e.message });
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  const server = createServer();
  server.listen(port, () => {
    console.log(`Fadenlauf läuft auf http://localhost:${port}`);
    if (!process.env.ANTHROPIC_API_KEY) console.warn("ANTHROPIC_API_KEY fehlt: Foto-Analyse ist aus, Standardschnitte funktionieren.");
  });
}
