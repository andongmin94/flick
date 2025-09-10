import { defineConfig } from "vite";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  build: {
    outDir: "content",
    emptyOutDir: false,
    rollupOptions: {
      input: path.resolve(__dirname, "src/entry.ts"),
      output: {
        entryFileNames: "bundle.js",
        assetFileNames: (assetInfo) => {
          if (/\.css$/i.test(assetInfo.name || "")) return "bundle.css";
          return assetInfo.name || "[name]";
        },
      },
    },
  },
});
