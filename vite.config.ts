import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages project site is served at /neon-scale/.
// Use relative base in dev so local `npm run dev` works at "/".
export default defineConfig(({ command }) => ({
  base: command === "serve" ? "/" : "/neon-scale/",
  plugins: [react()],
  worker: {
    format: "es",
  },
  optimizeDeps: {
    exclude: ["onnxruntime-web"],
  },
  assetsInclude: ["**/*.wasm", "**/*.onnx"],
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  preview: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
}));
