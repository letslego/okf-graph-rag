import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  // GitHub project pages: https://letslego.github.io/okf-graph-rag/
  base: process.env.VITE_BASE || "/",
  publicDir: "public",
  build: {
    outDir: "dist/web",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
});
