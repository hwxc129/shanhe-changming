import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  root: resolve(import.meta.dirname, "frontend"),
  base: process.env.VITE_PAGES_BASE || "/shanhe-changming/",
  publicDir: resolve(import.meta.dirname, "public"),
  envDir: import.meta.dirname,
  define: {
    "import.meta.env.VITE_CANDLE_API_ORIGIN": JSON.stringify(process.env.VITE_CANDLE_API_ORIGIN || "https://shanhe-remembrance-20261103.vkvbb39.chatgpt.site"),
  },
  plugins: [react()],
  build: { outDir: resolve(import.meta.dirname, "dist-pages"), emptyOutDir: true },
});
