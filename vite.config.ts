import fs from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { type Plugin, defineConfig } from "vite";

// Dev-only: เสิร์ฟ config ตาม CONFIG_ENV ที่ /config.json (runtime fetch /config.json เสมอ)
//   CONFIG_ENV=local|dev|uat|prod (default: local) → public/config.<env>.json
//   ใช้ผ่าน `bun run dev:local` / `dev:dev` / `dev:uat` / `dev:prod`
// hooks (configureServer) มีผลเฉพาะ dev server (apply: "serve") — ไม่รันตอน `vite build`
// (deploy แยกจัดการ config.json เอง — ดู emitBuildConfig) แต่ CONFIG_ENV validation ด้านล่าง
// อยู่ใน factory body เอง จึงรันทุกครั้งที่ config โหลด รวมถึงตอน `vite build` ด้วย
const CONFIG_ENVS = ["local", "dev", "uat", "prod"];

function serveEnvConfig(): Plugin {
  const env = process.env.CONFIG_ENV ?? "local";
  if (!CONFIG_ENVS.includes(env)) {
    throw new Error(
      `CONFIG_ENV="${env}" is not a known environment — use one of: ${CONFIG_ENVS.join(", ")}`,
    );
  }
  const file = `config.${env}.json`;
  return {
    name: "serve-env-config",
    apply: "serve", // hooks (configureServer) เท่านั้น — ไม่รันตอน `vite build`
    configureServer(server) {
      const target = path.resolve(import.meta.dirname, "public", file);
      // fail fast ตอน start — ไม่งั้นจบเป็น 404 เงียบ + SPA โชว์
      // "Failed to load application configuration"
      if (!fs.existsSync(target)) {
        throw new Error(
          `${target} not found — copy public/config.sample.json to public/${file} and fill in the values`,
        );
      }
      server.middlewares.use("/config.json", (_req, res) => {
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
    apply: "build", // build เท่านั้น — dev ใช้ serveEnvConfig
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
// ใน public/config.<env>.json — request จะวิ่งผ่าน Vite proxy (เลี่ยงปัญหา CORS ระหว่างรอ backend เปิด CORS)
export default defineConfig(() => ({
  plugins: [
    serveEnvConfig(),
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
