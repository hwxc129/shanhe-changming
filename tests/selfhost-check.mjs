import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, dirname } from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { request as httpRequest } from "node:http";
import { unzipSync } from "fflate";

const root = resolve(import.meta.dirname, "..");
const temp = await mkdtemp(resolve(tmpdir(), "shanhe-selfhost-test-"));
const entries = unzipSync(await readFile(resolve(root, "public/downloads/shanhe-server.zip")));
for (const [path, data] of Object.entries(entries)) {
  assert.ok(!path.startsWith("/") && !path.split("/").includes(".."));
  assert.ok(!path.includes("node_modules") && !/\.(sqlite|db)$/.test(path));
  const target = resolve(temp, path); await mkdir(dirname(target), { recursive: true }); await writeFile(target, data);
}
const reserve = createServer(); await new Promise(resolveReady => reserve.listen(0, "127.0.0.1", resolveReady));
const port = reserve.address().port; await new Promise(resolveClosed => reserve.close(resolveClosed));
const origin = `http://127.0.0.1:${port}`;
let child; let stopped; let log = "";
async function start() {
  child = spawn(process.execPath, [resolve(temp, "server.mjs")], { cwd: temp, env: { ...process.env, PORT: String(port), HOST: "127.0.0.1", PUBLIC_ORIGIN: origin, DATA_FILE: resolve(temp, "test-data/candles.sqlite") }, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", data => { log = (log + data).slice(-3000); }); child.stderr.on("data", data => { log = (log + data).slice(-3000); });
  stopped = new Promise(resolveStopped => child.once("close", resolveStopped));
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline && child.exitCode === null) {
    try { if ((await fetch(origin + "/healthz", { signal: AbortSignal.timeout(500) })).ok) return; } catch {}
    await new Promise(resolveWait => setTimeout(resolveWait, 100));
  }
  throw new Error("Standalone package startup failed: " + log);
}
async function stop() { if (child?.exitCode === null) { child.kill("SIGTERM"); await stopped; } }
async function req(path, options = {}) {
  const response = await fetch(origin + path, { ...options, signal: AbortSignal.timeout(10000), headers: { Origin: origin, ...options.headers } });
  const content = await response.text(); let data; try { data = JSON.parse(content); } catch { data = content; }
  return { status: response.status, headers: response.headers, data };
}
try {
  await start();
  assert.equal((await req("/api/v1/candles/stats")).data.total_count, 0);
  assert.equal((await req("/")).status, 200);
  assert.equal((await req("/share/")).status, 200);
  const identity = await req("/api/v1/visitors", { method: "POST" });
  const cookie = identity.headers.get("set-cookie").split(";")[0];
  const headers = { Cookie: cookie, "Content-Type": "application/json" };
  const concurrent = await Promise.all(Array.from({ length: 50 }, () => req("/api/v1/candles", { method: "POST", headers, body: JSON.stringify({ idempotency_key: crypto.randomUUID() }) })));
  assert.ok(concurrent.every(row => row.status === 200));
  assert.equal(concurrent.filter(row => row.data.result === "created").length, 1);
  assert.equal((await req("/api/v1/candles/me", { headers })).data.browser_total_count, 1);
  assert.equal((await req("/api/v1/candles/me")).data.browser_total_count, 0);
  assert.equal((await req("/api/v1/visitors", { method: "POST", headers: { Origin: "https://foreign.invalid" } })).status, 403);
  for (const path of ["/admin", "/admin/events", "/api/admin", "/api/v1/corrections", "/data/candles.sqlite", "/.env", "/%2e%2e%2fserver.mjs"]) assert.equal((await req(path)).status, 404, path);
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) assert.equal((await req("/api/v1/events", { method })).status, 405);
  assert.equal((await req("/api/v1/events?limit=60")).data.total, 187);
  assert.equal((await req("/api/v1/candles", { method: "POST", headers, body: JSON.stringify({ oversized: "中".repeat(9000) }) })).status, 413);
  assert.equal((await req("/api/v1/candles/stats")).status, 200);
  const range = await req("/audio/shanhe-changming.mp3", { headers: { Range: "bytes=0-31" } });
  assert.equal(range.status, 206); assert.equal(range.headers.get("content-length"), "32");
  const wrongHost = await new Promise((resolveStatus, reject) => {
    const call = httpRequest(origin + "/healthz", { headers: { Host: "foreign.invalid" } }, response => { response.resume(); response.on("end", () => resolveStatus(response.statusCode)); });
    call.on("error", reject); call.end();
  });
  assert.equal(wrongHost, 403);
  await stop(); await start();
  assert.equal((await req("/api/v1/candles/me", { headers })).data.browser_total_count, 1);
  assert.equal((await req("/api/v1/candles/stats")).data.total_count, 1);
  console.log(JSON.stringify({ selfhostArchive: "passed", concurrentRequests: 50, browserCount: "isolated", restartPersistence: "passed", csrf: "blocked", oversizedBody: 413, mediaRange: 206, privateFiles: "blocked", node: process.version, dockerRuntime: "not-tested" }));
} finally { await stop(); await rm(temp, { recursive: true, force: true }); }
