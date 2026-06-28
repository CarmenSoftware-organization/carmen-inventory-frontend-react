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

// Build-time: SPA fetch /config.json ตอน boot เสมอ แต่ public/ ไม่มี config.json
// (มีแต่ config.prod/local/sample.json) → ต้อง emit dist/config.json ตอน build
// ไม่งั้น deploy (เช่น Vercel) จะ 404 แล้ว SPA โชว์ "Failed to load application configuration".
// ใช้ config.prod.json เป็น default; override ได้ด้วย BUILD_CONFIG_FILE=config.<name>.json
function emitBuildConfig(): Plugin {
  const file = process.env.BUILD_CONFIG_FILE ?? "config.prod.json";
  return {
    name: "emit-build-config",
    apply: "build", // build เท่านั้น — dev ใช้ serveLocalConfig
    generateBundle() {
      const source = fs.readFileSync(
        path.resolve(import.meta.dirname, "public", file),
        "utf8",
      );
      this.emitFile({ type: "asset", fileName: "config.json", source });
    },
  };
}

// Dev mode: เซ็ต VITE_DEV_PROXY_TARGET=https://<uat-backend> แล้วใช้ BACKEND_URL=""
// ใน public/config.json — request จะวิ่งผ่าน Vite proxy (เลี่ยงปัญหา CORS ระหว่างรอ backend เปิด CORS)
export default defineConfig(() => ({
  plugins: [
    serveLocalConfig(),
    emitBuildConfig(),
    react({ babel: { plugins: ["babel-plugin-react-compiler"] } }),
    tailwindcss(),
  ],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, ".") },
  },
  build: {
    rollupOptions: {
      output: {
        // แยก vendor ที่เสถียร (react ecosystem / tanstack) ออกจาก shared chunk
        // เพื่อ caching ที่ดีขึ้น — deploy โค้ดแอปใหม่ผู้ใช้เก่าไม่ต้องโหลด vendor
        // ซ้ำ ไม่ลด first-load bytes แต่ลด re-download ตอนอัปเดต
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (
            /[\\/]node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/.test(
              id,
            )
          ) {
            return "react-vendor";
          }
          if (id.includes("/@tanstack/")) {
            return "tanstack";
          }
          // แยก vendor หนักที่หลาย route ใช้ร่วมกัน ออกจาก shared (router) chunk
          // — ทั้งหมดเสถียร เปลี่ยนไม่บ่อย จึง cache ได้ยาว lib ที่ใช้ route เดียว
          // (xlsx/recharts/@xyflow/monaco) ไม่ต้องแยก เพราะ lazy route แยก chunk ให้แล้ว
          if (id.includes("/lucide-react/")) {
            return "icons";
          }
          if (
            /[\\/](radix-ui|@radix-ui|@base-ui|cmdk|sonner|next-themes)[\\/]/.test(
              id,
            )
          ) {
            return "ui-vendor";
          }
          if (/[\\/](react-hook-form|@hookform|zod)[\\/]/.test(id)) {
            return "form-vendor";
          }
          if (/[\\/](date-fns|react-day-picker)[\\/]/.test(id)) {
            return "date-vendor";
          }
        },
      },
    },
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
