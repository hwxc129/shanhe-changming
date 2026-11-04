import { build } from "esbuild";
import { zipSync } from "fflate";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { execFileSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "dist-bundles");
const downloads = resolve(root, "public/downloads");
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await mkdir(downloads, { recursive: true });

async function frontend(directory, base, mode) {
  const env = { ...process.env, VITE_OUTPUT_DIR: relative(root, directory), VITE_PAGES_BASE: base, VITE_CANDLE_API_ORIGIN: "", VITE_CANDLE_MODE: mode, VITE_PACKAGE_EDITION: mode };
  execFileSync(process.execPath, [resolve(root, "node_modules/vite/bin/vite.js"), "build", "--config", "vite.pages.config.ts", "--logLevel", "error"], { cwd: root, env, stdio: "inherit" });
  for (const entry of await readdir(resolve(root, "public"))) {
    if (entry !== "downloads") await cp(resolve(root, "public", entry), resolve(directory, entry), { recursive: true });
  }
  execFileSync(process.execPath, [resolve(root, "scripts/finalize-pages.mjs")], { cwd: root, env, stdio: "inherit" });
}

async function archive(directory, target) {
  const entries = {};
  async function walk(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const full = resolve(folder, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) entries[relative(directory, full).replaceAll("\\", "/")] = new Uint8Array(await readFile(full));
    }
  }
  await walk(directory);
  await writeFile(target, zipSync(entries, { level: 6, mtime: new Date("2026-01-01T00:00:00Z") }));
}

const server = resolve(output, "server");
await frontend(resolve(server, "public"), "/", "server");
await build({ entryPoints: [resolve(root, "deploy/server.mjs")], outfile: resolve(server, "server.mjs"), bundle: true, format: "esm", platform: "node", target: "node24", minify: false });
for (const [source, target] of [["Dockerfile", "Dockerfile"], ["compose.yaml", "compose.yaml"], ["server.env.example", ".env.example"], ["服务器版使用说明.md", "README.md"]]) await cp(resolve(root, "deploy", source), resolve(server, target));
await writeFile(resolve(server, ".dockerignore"), "data\n.env\n*.zip\n");
await archive(server, resolve(downloads, "shanhe-server.zip"));

const staticRoot = resolve(output, "static");
await frontend(resolve(staticRoot, "shanhe-changming"), "/shanhe-changming/", "local");
await cp(resolve(root, "deploy/静态版使用说明.txt"), resolve(staticRoot, "使用说明.txt"));
await archive(staticRoot, resolve(downloads, "shanhe-static.zip"));
console.log("已生成独立服务器版与纯静态版下载包；不含任何访客数据。");
