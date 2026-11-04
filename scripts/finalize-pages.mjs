import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const output = pathToFileURL(resolve(import.meta.dirname, "..", process.env.VITE_OUTPUT_DIR || "dist-pages") + "/");
const html = await readFile(new URL("index.html", output), "utf8");
for (const page of ["about", "privacy", "festivals", "feedback", "share"]) {
  await mkdir(new URL(page + "/", output), { recursive: true });
  await writeFile(new URL(page + "/index.html", output), html);
}
await writeFile(new URL(".nojekyll", output), "");
console.log("GitHub Pages: 首页、收录说明、隐私、节日与反馈页面已生成。");
