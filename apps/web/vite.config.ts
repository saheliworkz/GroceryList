import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "BasketWise Grocery Agent",
        short_name: "BasketWise",
        theme_color: "#143c2b",
        background_color: "#f4f0e6",
        display: "standalone",
        icons: []
      }
    })
  ],
  server: { proxy: { "/api": "http://localhost:8080" } }
});
