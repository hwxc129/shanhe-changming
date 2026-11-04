import { mkdir, readFile, writeFile } from "node:fs/promises";
const output = new URL("../dist-pages/", import.meta.url);
const html = await readFile(new URL("index.html", output), "utf8");
for (const page of ["about", "privacy", "festivals", "feedback"]) {
  await mkdir(new URL(page + "/", output), { recursive: true });
  await writeFile(new URL(page + "/index.html", output), html);
}
await writeFile(new URL(".nojekyll", output), "");
console.log("GitHub Pages: 首页、收录说明、隐私、节日与反馈页面已生成。");
