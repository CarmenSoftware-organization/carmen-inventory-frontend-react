import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "public", ".remember", "e2e"] },
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
              message: "Use lib/compat/* or use-intl instead — this is a Vite SPA.",
            },
          ],
        },
      ],
    },
  },
);
