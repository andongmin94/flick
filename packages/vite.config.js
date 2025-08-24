import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    outDir: "content",
    emptyOutDir: false, // 재빌드 시 content 정리 (bundle, shorts.css 새로 생성)
    sourcemap: false,
    cssCodeSplit: false, // 하나의 CSS (shorts.css) 출력
    rollupOptions: {
      input: { bundle: resolve(__dirname, "src/entry.js") },
      output: {
        entryFileNames: "bundle.js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith(".css"))
            return "shorts.css";
          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },
});
