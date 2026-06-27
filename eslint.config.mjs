import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "public", ".remember"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs["recommended-latest"],
      reactRefresh.configs.vite,
    ],
    languageOptions: { globals: globals.browser },
    rules: {
      // อนุญาต underscore-prefixed args/vars ที่ตั้งใจไม่ใช้ (เช่น mock mutationFn _data/_id)
      // — ตรงกับ convention ของโค้ดเดิมที่ port มาจาก Next app
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // react-refresh/only-export-components เป็น HMR-only hint ไม่ใช่ correctness rule.
      // shadcn/ui primitives + feature components หลายตัว export ทั้ง component และ
      // variant/hook/helper ร่วมไฟล์ (canonical pattern) — ลดเป็น warn เพื่อไม่ต้อง
      // แตกไฟล์ vendored code โดยไม่จำเป็น (ดู DONE_WITH_CONCERNS task 11)
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // กัน import ของ Next หลุดเข้ามาหลัง migrate
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["next", "next/*", "next-intl", "next-intl/*", "nextjs-toploader"],
              message: "Use react-router or use-intl instead — this is a Vite SPA.",
            },
          ],
        },
      ],
    },
  },
  // App source รันในเบราว์เซอร์เท่านั้น — ห้ามอ้าง `process` (ReferenceError ตอน runtime;
  // tsc มอง @types/node เลยจับไม่ได้, vitest รันใน Node เลยไม่ crash → ต้องกันที่ lint)
  // ใช้ import.meta.env.* หรือ lib/runtime-config แทน
  {
    files: [
      "components/**/*.{ts,tsx}",
      "hooks/**/*.{ts,tsx}",
      "lib/**/*.{ts,tsx}",
      "routes/**/*.{ts,tsx}",
      "utils/**/*.{ts,tsx}",
      "constant/**/*.{ts,tsx}",
      "types/**/*.{ts,tsx}",
      "i18n/**/*.{ts,tsx}",
      "main.tsx",
    ],
    ignores: ["**/__tests__/**", "**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-globals": [
        "error",
        {
          name: "process",
          message:
            "Browser-only SPA — `process` does not exist at runtime. Use import.meta.env.* or lib/runtime-config.",
        },
      ],
    },
  },
);
