import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
export default defineConfig({
  plugins: [dts({ insertTypesEntry: true }), react()],
  build: {
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs
        drop_debugger: true, // Remove debugger statements
      },
      mangle: true, // Shorten variable names
    },
    lib: {
      name: "figma-viewer",
      entry: {
        "figma-viewer": resolve(__dirname, "src/index.ts"),
        // myComponent: resolve(__dirname, "src/react.tsx"),
      },
      fileName: (format, entryName) => `${entryName}.${format}.js`,
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: ["react", "react-dom"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
  },
});
