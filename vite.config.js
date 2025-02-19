import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve("/index.html"),
      },
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  optimizeDeps: {
    include: ["pdfjs-dist"],
  },
  resolve: {
    alias: {
      "pdfjs-dist/build/pdf.worker": "pdfjs-dist/build/pdf.worker.entry",
    },
  },
});
