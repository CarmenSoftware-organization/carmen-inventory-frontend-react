import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { appVersion } from "./scripts/app-version";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    environmentOptions: { jsdom: { url: "http://localhost" } },
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
  // ต้องมีคู่กับ vite.config.ts ไม่งั้นเทสต์ที่ import lib/version.ts จะพังด้วย
  // ReferenceError: __APP_VERSION__ is not defined
  define: {
    __APP_VERSION__: JSON.stringify(appVersion()),
  },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, ".") },
  },
});
