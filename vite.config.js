import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import packageInfo from "./package.json" with { type: "json" };

export default defineConfig({
  base: "/WorkSphere-HRMS/",

  plugins: [react(), tailwindcss()],

  define: {
    __APP_VERSION__: JSON.stringify(packageInfo.version),
  },

  server: {
    host: true,
    port: 5173,

    // Do not impose a COOP header during local development.
    // Firebase Auth owns the Google auth window/redirect lifecycle.

    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});