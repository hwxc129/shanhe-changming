import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, access } from "node:fs/promises";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const config = join(root, "dist/server/wrangler.json");
await access(config).catch(() => { throw new Error("请先运行 npm run build，再运行 npm run test:http。"); });
await mkdir(join(root, ".wrangler"), { recursive: true });
const isolated = await mkdtemp(join(root, ".wrangler/http-test-"));
const cli = ["--import", join(root, "scripts/sites-env.mjs"), join(root, "node_modules/wrangler/bin/wrangler.js")];
const environment = { ...process.env, WRANGLER_SEND_METRICS: "false", CI: "true" };
function launch(args, extra = {}) {
  const child = spawn(process.execPath, args, { cwd: root, env: { ...environment, ...extra }, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  const capture = chunk => { log = (log + chunk).slice(-6000); };
  child.stdout.on("data", capture); child.stderr.on("data", capture);
  const done = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal, log }));
  });
  return { child, done };
}
async function unusedPort() {
  const server = createServer();
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
let service;
try {
  const migration = launch([...cli, "d1", "execute", "DB", "--local", "--config", config,
    "--persist-to", isolated, "--file", join(root, "drizzle/0000_stiff_iron_fist.sql")]);
  const migrated = await migration.done;
  if (migrated.code !== 0) throw new Error("测试数据库初始化失败：\n" + migrated.log);
  const port = await unusedPort();
  const origin = `http://127.0.0.1:${port}`;
  service = launch([...cli, "dev", "--local", "--config", config, "--persist-to", isolated,
    "--ip", "127.0.0.1", "--port", String(port), "--inspector-port", "0", "--log-level", "error"]);
  const deadline = Date.now() + 30_000;
  let ready = false;
  while (Date.now() < deadline && service.child.exitCode === null) {
    try { ready = (await fetch(origin + "/api/v1/candles/stats", { signal: AbortSignal.timeout(1000) })).ok; } catch { /* Wait for this owned test server. */ }
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (!ready) throw new Error("独立测试服务未能启动。");
  const empty = await (await fetch(origin + "/api/v1/candles/stats")).json();
  if (empty.total_count !== 0) throw new Error("独立测试数据库不是空库，拒绝执行写入测试。");
  const check = await launch([join(root, "tests/http-check.mjs")], {
    TEST_ORIGIN: origin, MEMORIAL_ISOLATED_TEST: "yes",
  }).done;
  if (check.code !== 0) throw new Error(check.log);
  process.stdout.write(check.log);
} finally {
  if (service && service.child.exitCode === null) {
    service.child.kill("SIGTERM");
    const stopped = await Promise.race([service.done.then(() => true), new Promise(resolve => setTimeout(() => resolve(false), 5000))]);
    if (!stopped) { service.child.kill("SIGKILL"); await service.done; }
  }
  await rm(isolated, { recursive: true, force: true });
}
