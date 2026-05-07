import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": "http://127.0.0.1:4173",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(currentDir, "src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});

