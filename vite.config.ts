import fs from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { type Plugin, defineConfig } from "vite";

// Dev-only: เสิร์ฟ config ตามโหมดที่ /config.json (runtime fetch /config.json เสมอ)
//   `bun run dev`  (USE_LOCAL_CONFIG=1) → public/config.local.json (local backend)
//   `bun run prod`                      → public/config.prod.json  (remote backend)
// ไม่มีผลตอน `vite build` (deploy แยกจัดการ config.json เอง)
function serveLocalConfig(): Plugin {
  const file =
    process.env.USE_LOCAL_CONFIG === "1" ? "config.local.json" : "config.prod.json";
  return {
    name: "serve-local-config",
    apply: "serve", // dev server เท่านั้น — ไม่มีผลตอน `vite build`
    configureServer(server) {
      server.middlewares.use("/config.json", (_req, res, next) => {
        const target = path.resolve(import.meta.dirname, "public", file);
        if (!fs.existsSync(target)) return next();
        res.setHeader("Content-Type", "application/json");
        res.end(fs.readFileSync(target));
      });
    },
  };
}

// Dev mode: เซ็ต VITE_DEV_PROXY_TARGET=https://<uat-backend> แล้วใช้ BACKEND_URL=""
// ใน public/config.json — request จะวิ่งผ่าน Vite proxy (เลี่ยงปัญหา CORS ระหว่างรอ backend เปิด CORS)
export default defineConfig(() => ({
  plugins: [
    serveLocalConfig(),
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
            secure: false,
          },
        }
      : undefined,
  },
}));
