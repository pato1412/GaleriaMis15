import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// URL del backend durante desarrollo (subida y galeria de fotos)
const BACKEND_URL = "http://localhost:4000";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"],
      manifest: {
        name: "Mis 15 Delfi",
        short_name: "Mis 15 Delfi",
        description: "Subí tus fotos de la fiesta de 15 de Delfi ✨",
        start_url: "/",
        display: "standalone",
        background_color: "#E8E8E8",
        theme_color: "#FF69B4",
        orientation: "portrait",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Cache-first para assets propios, pero nunca cachear /api ni /uploads
        // para que la galeria siempre muestre fotos frescas
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/uploads"),
            handler: "NetworkFirst",
            options: { cacheName: "fotos-fiesta" },
          },
        ],
        navigateFallbackDenylist: [/^\/api/, /^\/uploads/],
      },
    }),
  ],
  server: {
    host: true,
    proxy: {
      "/api": { target: BACKEND_URL, changeOrigin: true },
      "/uploads": { target: BACKEND_URL, changeOrigin: true },
    },
  },
});
