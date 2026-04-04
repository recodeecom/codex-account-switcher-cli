import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import type { Plugin } from "vite";
import type { PluginContext } from "rollup";
import { defineConfig } from "vitest/config";

const proxyTarget = process.env.API_PROXY_TARGET || "http://localhost:2455";
const packageJson = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version?: string };
const appVersion = packageJson.version ?? "0.0.0";

function appVersionAssetPlugin(version: string): Plugin {
  return {
    name: "app-version-asset",
    generateBundle(this: PluginContext) {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ version }, null, 2),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), appVersionAssetPlugin(appVersion)],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  resolve: {
    alias: {
      "@": path.resolve(path.dirname(fileURLToPath(import.meta.url)), "./src"),
    },
  },
  server: {
    proxy: {
      "/api": proxyTarget,
      "/v1": proxyTarget,
      "/backend-api": proxyTarget,
      "/health": proxyTarget,
    },
  },
  build: {
    outDir: "../app/static",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-charts": ["recharts"],
          "vendor-ui": ["radix-ui"],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    exclude: ["screenshots/**", "node_modules/**"],
    fileParallelism: false,
    testTimeout: 15_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
});
