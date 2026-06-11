import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Dev mode: เซ็ต VITE_DEV_PROXY_TARGET=https://<uat-backend> แล้วใช้ BACKEND_URL=""
// ใน public/config.json — request จะวิ่งผ่าน Vite proxy (เลี่ยงปัญหา CORS ระหว่างรอ backend เปิด CORS)
export default defineConfig(({ mode }) => ({
  plugins: [
    react({ babel: { plugins: ["babel-plugin-react-compiler"] } }),
    tailwindcss(),
  ],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, ".") },
  },
  server: {
    port: 3000,
    proxy: process.env.VITE_DEV_PROXY_TARGET
      ? {
          "/api": {
            target: process.env.VITE_DEV_PROXY_TARGET,
            changeOrigin: true,
          },
        }
      : undefined,
  },
}));
