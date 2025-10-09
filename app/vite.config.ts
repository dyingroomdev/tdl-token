import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@sdk": path.resolve(__dirname, "../sdk"),
    },
  },
  server: {
    port: 5173,
  },
});
