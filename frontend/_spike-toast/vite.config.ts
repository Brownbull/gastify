// Vite config — emitted by /gabe-mockup spike scaffolding.
// gastify React frontend.
//
// Alias `@mockups` points to docs/mockups so we can resolve canonical
// CSS tokens via `@import "@mockups/assets/css/..."` from inside
// src/styles/tokens.css regardless of repo depth.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@mockups": path.resolve(__dirname, "../docs/mockups"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
