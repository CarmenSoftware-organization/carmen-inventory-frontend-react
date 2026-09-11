import fs from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { type Plugin, defineConfig } from "vite";
import { appVersion } from "./scripts/app-version";

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
//
// ลำดับการหา config: public/<BUILD_CONFIG_FILE> → env var APP_CONFIG_JSON
// APP_CONFIG_JSON มีไว้ให้ CI/CD ที่ clone จาก git แล้วไม่มีไฟล์ config (public/config*.json
// ถูก gitignore) — เช่น Vercel ที่รัน `bun run build` เปล่า ๆ ค่าเป็น JSON ทั้งก้อน
// เหมือนเนื้อไฟล์ public/config.<env>.json ไม่ใช่แยกทีละคีย์ คีย์ใหม่ของ RuntimeConfig
// จะได้ไม่ต้องตามเพิ่มตัวแปรใน dashboard
function emitBuildConfig(): Plugin {
  const file = process.env.BUILD_CONFIG_FILE ?? "config.prod.json";
  return {
    name: "emit-build-config",
    apply: "build", // build เท่านั้น — dev ใช้ serveEnvConfig
    generateBundle() {
      const target = path.resolve(import.meta.dirname, "public", file);
      // fail fast ตอน build — ไม่งั้น rollup โยน ENOENT ดิบ ๆ ไม่บอกวิธีแก้
      // (public/config.<env>.json ถูก gitignore ไว้ — clone ใหม่ไม่มีไฟล์นี้จนกว่าจะสร้างเอง)
      const source = fs.existsSync(target)
        ? fs.readFileSync(target, "utf8")
        : configFromEnv(file);
      this.emitFile({ type: "asset", fileName: "config.json", source });
    },
  };
}

// อ่าน config จาก APP_CONFIG_JSON — validate ตอน build ไม่ใช่ปล่อยให้ SPA พังตอน boot
// (config ที่ผิดรูปจบเป็นหน้า "Failed to load application configuration" ใน production)
function configFromEnv(file: string): string {
  const raw = process.env.APP_CONFIG_JSON;
  if (!raw) {
    throw new Error(
      `public/${file} not found — copy public/config.sample.json to public/${file} and fill in the values, or set APP_CONFIG_JSON to that same JSON (CI/CD เช่น Vercel)`,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `APP_CONFIG_JSON is not valid JSON: ${(error as Error).message}`,
    );
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(
      "APP_CONFIG_JSON must be a JSON object — see public/config.sample.json",
    );
  }
  const missing = ["BACKEND_URL", "X_APP_ID"].filter(
    (key) => typeof (parsed as Record<string, unknown>)[key] !== "string",
  );
  if (missing.length > 0) {
    throw new Error(
      `APP_CONFIG_JSON is missing required string key(s): ${missing.join(", ")} — see public/config.sample.json`,
    );
  }
  return raw;
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
  // เวอร์ชันที่ footer แสดง มาจาก package.json ที่เดียว — ฉีดเข้า bundle ตอน build
  // แทน literal ใน lib/version.ts ที่ต้องแก้มือ (ของเดิมค้างตั้งแต่ 2026-05-27)
  // bump ด้วย `bun run build:bump`
  define: {
    __APP_VERSION__: JSON.stringify(appVersion()),
  },
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
          // (xlsx/recharts/@xyflow) ไม่ต้องแยก เพราะ lazy route แยก chunk ให้แล้ว
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
