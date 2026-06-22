import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@shared": path.resolve(dirname, "../shared"),
      "@design-system": path.resolve(dirname, "src/design-system"),
      "@features": path.resolve(dirname, "src/features"),
      "@lib": path.resolve(dirname, "src/lib"),
    },
  },
  server: {
    fs: {
      // tokens live one level up (shared/design-tokens.ts)
      allow: [path.resolve(dirname, "..")],
    },
  },
});
