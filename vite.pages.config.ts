import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  root: resolve(import.meta.dirname, "frontend"),
  base: process.env.VITE_PAGES_BASE || "/shanhe-changming/",
  publicDir: process.env.VITE_PACKAGE_EDITION ? false : resolve(import.meta.dirname, "public"),
  envDir: import.meta.dirname,
  define: {
    "import.meta.env.VITE_CANDLE_API_ORIGIN": JSON.stringify(process.env.VITE_CANDLE_API_ORIGIN ?? "https://shanhe-remembrance-20261103.vkvbb39.chatgpt.site"),
  },
  plugins: [react(), { name: "distribution-csp", transformIndexHtml(html) {
    if (!process.env.VITE_PACKAGE_EDITION) return html;
    return html.replace("connect-src 'self' https://shanhe-remembrance-20261103.vkvbb39.chatgpt.site;", "connect-src 'self';");
  } }],
  build: { outDir: resolve(import.meta.dirname, process.env.VITE_OUTPUT_DIR || "dist-pages"), emptyOutDir: true },
});
