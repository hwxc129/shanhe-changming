import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { mkdir, realpath, stat } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { openCandleDatabase } from "./sqlite.mjs";
import { createCandleService, AppError, json, routeError } from "../lib/candle-core.ts";
import { CATALOG_RELEASE } from "../lib/catalog.ts";

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const origin = new URL(process.env.PUBLIC_ORIGIN || `http://localhost:${port}`);
if (!["https:", "http:"].includes(origin.protocol) || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) throw new Error("PUBLIC_ORIGIN应填写完整网站域名，不含路径或账号信息。");
const publicRoot = await realpath(resolve(root, "public"));
const dbPath = resolve(process.env.DATA_FILE || resolve(root, "data/candles.sqlite"));
await mkdir(dirname(dbPath), { recursive: true });
const database = openCandleDatabase(dbPath);
const service = createCandleService({ database: () => database, siteOrigin: () => origin.origin, publicOrigin: () => null });
const secureHeaders = {
  "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()", "X-Frame-Options": "SAMEORIGIN",
};
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".webm": "video/webm", ".mp4": "video/mp4", ".mp3": "audio/mpeg", ".txt": "text/plain; charset=utf-8", ".json": "application/json; charset=utf-8", ".zip": "application/zip" };

async function boundedBody(incoming) {
  return new Promise((resolveBody, reject) => {
    const chunks = []; let bytes = 0;
    const onData = chunk => {
      bytes += chunk.length;
      if (bytes > 25_000) { incoming.removeListener("data", onData); incoming.resume(); reject(new AppError(413, "提交内容过长。")); }
      else chunks.push(chunk);
    };
    incoming.on("data", onData);
    incoming.once("end", () => resolveBody(Buffer.concat(chunks)));
    incoming.once("error", reject);
    incoming.once("aborted", () => reject(new AppError(400, "提交已中断。")));
  });
}

async function api(request) {
  const url = new URL(request.url); const path = url.pathname;
  if (path === "/api/v1/candles/stats" && request.method === "GET") return json(await service.candleStats());
  if (path === "/api/v1/candles/me" && request.method === "GET") return json(await service.candleState(request), 200, { "Cache-Control": "private, no-store", Vary: "Cookie" });
  if (path === "/api/v1/visitors" && request.method === "POST") { service.assertSameOrigin(request); return service.issueVisitor(request); }
  if (path === "/api/v1/candles" && request.method === "POST") { service.assertSameOrigin(request); const body = await service.bodyJson(request); return json(await service.lightCandle(request, String(body?.idempotency_key || ""))); }
  if (path === "/api/v1/events") {
    if (request.method !== "GET") return json({ error: "目录只读。" }, 405, { Allow: "GET" });
    const q = url.searchParams;
    if (q.get("release") && q.get("release") !== CATALOG_RELEASE) return json({ error: "目录版本不匹配，请重新载入。" }, 409);
    try { return json(await service.publicCatalog(q.get("q") || "", q.get("period") || "all", q.get("cursor") || "", Number(q.get("limit")) || 12, q.get("category") || "all", q.get("year") || "all", q.get("area") || "all")); }
    catch (error) { if (error instanceof RangeError) return json({ error: error.message }, 409); throw error; }
  }
  const known = ["/api/v1/candles/stats", "/api/v1/candles/me", "/api/v1/candles", "/api/v1/visitors"];
  return json({ error: known.includes(path) ? "请求方法不支持。" : "页面不存在。" }, known.includes(path) ? 405 : 404);
}

async function staticFile(request) {
  if (!["GET", "HEAD"].includes(request.method)) return json({ error: "请求方法不支持。" }, 405);
  let path;
  try { path = decodeURIComponent(new URL(request.url).pathname); } catch { return json({ error: "页面不存在。" }, 404); }
  if (path.includes("\\") || path.includes("\0") || path.split("/").some(part => part === ".." || part.startsWith("."))) return json({ error: "页面不存在。" }, 404);
  let file = resolve(publicRoot, "." + path);
  try {
    let info = await stat(file);
    if (info.isDirectory()) { file = resolve(file, "index.html"); info = await stat(file); }
    const actual = await realpath(file);
    if (!actual.startsWith(publicRoot + sep) || !info.isFile()) throw new Error();
    const headers = { "Content-Type": types[extname(file)] || "application/octet-stream", "Cache-Control": extname(file) === ".html" ? "no-cache" : "public, max-age=3600", "Accept-Ranges": "bytes" };
    let start = 0; let end = info.size - 1; let status = 200;
    const range = request.headers.get("range");
    if (range) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(range);
      if (!match || Number(match[1]) >= info.size || (match[2] && Number(match[2]) < Number(match[1]))) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
      start = Number(match[1]); end = match[2] ? Math.min(end, Number(match[2])) : end; status = 206;
      headers["Content-Range"] = `bytes ${start}-${end}/${info.size}`;
    }
    headers["Content-Length"] = String(end - start + 1);
    return new Response(request.method === "HEAD" ? null : Readable.toWeb(createReadStream(actual, { start, end })), { status, headers });
  } catch { return json({ error: "页面不存在。" }, 404); }
}

const server = createServer({ maxHeaderSize: 16_384 }, async (incoming, outgoing) => {
  let response;
  try {
    const hosts = new Set([origin.host, `127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`]);
    if (!hosts.has(incoming.headers.host)) throw new AppError(403, "请通过配置的网站地址访问。");
    const url = new URL(incoming.url || "/", origin.origin);
    if (url.origin !== origin.origin) throw new AppError(403, "访问地址无效。");
    const headers = new Headers();
    for (const [key, value] of Object.entries(incoming.headers)) if (value && key !== "cf-connecting-ip") headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    headers.set("cf-connecting-ip", incoming.socket.remoteAddress || "local");
    const method = incoming.method || "GET";
    const body = ["GET", "HEAD"].includes(method) ? undefined : await boundedBody(incoming);
    const request = new Request(url, { method, headers, body });
    response = url.pathname === "/healthz" && method === "GET" ? json({ ready: true, catalog_release: CATALOG_RELEASE })
      : url.pathname.startsWith("/api/") ? await api(request) : await staticFile(request);
  } catch (error) {
    if (error instanceof AppError && error.status === 413) outgoing.setHeader("Connection", "close");
    response = routeError(error);
  }
  try {
    for (const [key, value] of Object.entries(secureHeaders)) outgoing.setHeader(key, value);
    response.headers.forEach((value, key) => outgoing.setHeader(key, value));
    outgoing.statusCode = response.status;
    if (response.body) await pipeline(Readable.fromWeb(response.body), outgoing); else outgoing.end();
  } catch { outgoing.destroy(); }
});
server.requestTimeout = 15_000; server.headersTimeout = 10_000; server.maxHeadersCount = 40;
server.listen(port, process.env.HOST || "0.0.0.0", () => console.log(`山河长明已启动：${origin.origin}`));
function stop() { server.close(() => { database.close(); process.exit(0); }); setTimeout(() => process.exit(1), 5000).unref(); }
process.once("SIGTERM", stop); process.once("SIGINT", stop);
