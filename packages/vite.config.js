import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    outDir: "content",
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(__dirname, "src/entry.js"),
      output: {
        entryFileNames: "bundle.js",
      },
    },
  },
});
