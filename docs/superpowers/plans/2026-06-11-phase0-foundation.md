# Phase 0 Foundation — Next.js → Vite + React Router SPA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete foundation of the Carmen inventory SPA — Vite + React Router 7 scaffold, client-side auth, ported http-client, use-intl i18n, compat layer, bulk-ported shared code, login → dashboard-shell smoke path, and S3/CloudFront deploy artifacts.

**Architecture:** Static SPA (no server). The browser rewrites legacy `/api/proxy/<rest>` paths to `${BACKEND_URL}/<rest>` and attaches `Authorization: Bearer` + `x-app-id` itself. Access token lives in memory (`tokenStore`), refresh token in localStorage behind an adapter. Next-only APIs are absorbed by a small compat layer (`lib/compat/navigation`, `lib/compat/link`) and `use-intl`, so the ~1,200 source files port with codemods instead of rewrites.

**Tech Stack:** Vite 7, React 19 (+ React Compiler), TypeScript 5, React Router 7 (data router), Tailwind CSS 4 (`@tailwindcss/vite`), use-intl 4, TanStack Query 5, Vitest 4 + Testing Library, Playwright, Bun runtime.

**Spec:** `docs/superpowers/specs/2026-06-11-carmen-react-ssg-migration-design.md`
**Source app:** `../carmen-inventory-frontend/` (referred to as `$SRC` below; set `SRC=../carmen-inventory-frontend` in your shell).

**Working conventions for every task:**
- Run commands from the repo root (`carmen-inventory-frontend-react`).
- Bun is the runtime: `bun install`, `bun run <script>`, `bunx <tool>`.
- All prose in code comments may be Thai (matches source style); identifiers and commit messages in English.

---

### Task 1: Scaffold the Vite project

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.mjs`, `index.html`, `main.tsx`, `.gitignore`, `.prettierrc.json`
- Create: `styles/globals.css`, `styles/badge-status.css`, `styles/module-colors.css` (copied from source)
- Create: `public/config.sample.json`, `public/config.json` (gitignored)

- [ ] **Step 1: Write `package.json`**

Mirror the source dependency list, dropping Next-only packages (`next`, `next-intl`, `nextjs-toploader`, `eslint-config-next`, `@next/bundle-analyzer`) and adding the Vite/React Router stack:

```json
{
  "name": "carmen-inventory-frontend-react",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "test": "vitest",
    "test:run": "vitest run",
    "clear": "rm -rf dist node_modules bun.lock"
  },
  "dependencies": {
    "@base-ui/react": "^1.4.1",
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/modifiers": "^9.0.0",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "@fontsource-variable/geist": "^5.2.5",
    "@fontsource-variable/geist-mono": "^5.2.5",
    "@hookform/resolvers": "^5.2.2",
    "@monaco-editor/react": "^4.7.0",
    "@tanstack/react-query": "^5.100.10",
    "@tanstack/react-table": "^8.21.3",
    "@tanstack/react-virtual": "^3.13.24",
    "@xyflow/react": "^12.10.2",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "date-fns": "^4.1.0",
    "embla-carousel-react": "^8.6.0",
    "lucide-react": "^0.575.0",
    "next-themes": "^0.4.6",
    "radix-ui": "^1.4.3",
    "react": "19.2.3",
    "react-day-picker": "^9.14.0",
    "react-dom": "19.2.3",
    "react-easy-crop": "^5.5.7",
    "react-hook-form": "^7.75.0",
    "react-router": "^7.9.0",
    "recharts": "2.15.4",
    "sonner": "^2.0.7",
    "sql-formatter": "^15.7.4",
    "tailwind-merge": "^3.6.0",
    "use-intl": "^4.11.2",
    "xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.0",
    "@playwright/test": "^1.60.0",
    "@tailwindcss/vite": "^4.3.0",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.1",
    "@types/node": "^20.19.41",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.0.0",
    "babel-plugin-react-compiler": "^1.0.0",
    "eslint": "^9.39.4",
    "eslint-plugin-react-hooks": "^6.0.0",
    "eslint-plugin-react-refresh": "^0.4.20",
    "globals": "^16.0.0",
    "jsdom": "^29.1.1",
    "prettier": "^3.8.3",
    "prettier-plugin-tailwindcss": "^0.7.4",
    "tailwindcss": "^4.3.0",
    "typescript": "^5.9.3",
    "typescript-eslint": "^8.40.0",
    "vite": "^7.3.3",
    "vitest": "^4.1.6"
  },
  "trustedDependencies": ["unrs-resolver"]
}
```

Note: `next-themes` works in plain React (it only needs a React tree); keep it.

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "types": ["vite/client"],
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", "dist", "e2e"]
}
```

- [ ] **Step 3: Write `vite.config.ts`**

```ts
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
```

- [ ] **Step 4: Write `eslint.config.mjs`**

```js
import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "public"] },
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
```

- [ ] **Step 5: Write `index.html`**

```html
<!doctype html>
<html lang="en" suppresshydrationwarning>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Carmen Inventory</title>
    <meta name="description" content="ERP for Hospitality Hotel" />
  </head>
  <body class="antialiased">
    <div id="root"></div>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>
```

(The favicon data-URI from `components/icons/carmen-logo.tsx` is wired in Task 13 once components are ported.)

- [ ] **Step 6: Copy global styles and define font variables**

```bash
cp "$SRC/app/globals.css" styles/globals.css
cp "$SRC/app/badge-status.css" styles/badge-status.css
cp "$SRC/app/module-colors.css" styles/module-colors.css
```

Then in `styles/globals.css`: fix the import path `@import "./module-colors.css";` (already relative — verify it resolves), and append the font-variable block replacing `next/font`:

```css
/* next/font replacement — Fontsource variable fonts loaded in main.tsx */
:root {
  --font-geist-sans: "Geist Variable", ui-sans-serif, system-ui, sans-serif;
  --font-geist-mono: "Geist Mono Variable", ui-monospace, monospace;
}
```

- [ ] **Step 7: Write placeholder `main.tsx`** (replaced by the real boot in Task 13)

```tsx
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./styles/globals.css";
import "./styles/badge-status.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="p-6">Carmen SPA scaffold OK</div>
  </StrictMode>,
);
```

- [ ] **Step 8: Write `public/config.sample.json`, `public/config.json`, `.gitignore`, `.prettierrc.json`**

`public/config.sample.json`:

```json
{
  "BACKEND_URL": "https://backend.example.com",
  "X_APP_ID": "<copy from ../carmen-inventory-frontend/.env>"
}
```

`public/config.json` for local dev (values copied from `$SRC/.env` — `BACKEND_URL` left empty to use the Vite dev proxy):

```json
{
  "BACKEND_URL": "",
  "X_APP_ID": "<value of X_APP_ID from ../carmen-inventory-frontend/.env>"
}
```

`.gitignore`:

```
node_modules
dist
public/config.json
*.tsbuildinfo
.remember/
test-results/
playwright-report/
```

(`bun.lock` is committed, matching the source repo.)

`.prettierrc.json`: copy verbatim — `cp "$SRC/.prettierrc.json" .`

- [ ] **Step 9: Install and verify dev + build**

Run: `bun install && bun run build`
Expected: tsc passes, Vite build emits `dist/index.html` + assets with no errors.

Run: `bun run dev` (briefly) and open http://localhost:3000
Expected: "Carmen SPA scaffold OK" renders with Geist font.

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "feat: scaffold Vite + React 19 + Tailwind 4 SPA foundation"
```

---

### Task 2: Vitest infrastructure

**Files:**
- Create: `vitest.config.ts`, `vitest.setup.ts`, `lib/__tests__/sanity.test.tsx`

- [ ] **Step 1: Write `vitest.config.ts`** (mirrors source, alias `@` → root)

```ts
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    environmentOptions: { jsdom: { url: "http://localhost" } },
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "dist", "e2e"],
  },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, ".") },
  },
});
```

- [ ] **Step 2: Copy `vitest.setup.ts`** — `cp "$SRC/vitest.setup.ts" .` and remove any Next-specific mocks if present (inspect the file; keep `@testing-library/jest-dom` import).

- [ ] **Step 3: Write a sanity test** `lib/__tests__/sanity.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("vitest setup", () => {
  it("renders JSX with jsdom", () => {
    render(<button>ok</button>);
    expect(screen.getByRole("button", { name: "ok" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run** `bun run test:run` — Expected: 1 test PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "test: add Vitest + Testing Library infrastructure"
```

---

### Task 3: Runtime config loader (TDD)

**Files:**
- Create: `lib/runtime-config.ts`
- Test: `lib/__tests__/runtime-config.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getRuntimeConfig,
  loadRuntimeConfig,
  setRuntimeConfigForTests,
} from "@/lib/runtime-config";

describe("runtime-config", () => {
  beforeEach(() => setRuntimeConfigForTests(null));
  afterEach(() => vi.restoreAllMocks());

  it("loads and normalizes config.json (strips trailing slash)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ BACKEND_URL: "https://api.example.com/", X_APP_ID: "app-1" }),
        ),
      ),
    );
    const config = await loadRuntimeConfig();
    expect(config.BACKEND_URL).toBe("https://api.example.com");
    expect(getRuntimeConfig().X_APP_ID).toBe("app-1");
  });

  it("accepts empty BACKEND_URL (dev proxy mode)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ BACKEND_URL: "", X_APP_ID: "app-1" })),
      ),
    );
    const config = await loadRuntimeConfig();
    expect(config.BACKEND_URL).toBe("");
  });

  it("throws when config.json is missing keys", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ BACKEND_URL: "x" }))),
    );
    await expect(loadRuntimeConfig()).rejects.toThrow(/X_APP_ID/);
  });

  it("getRuntimeConfig throws before load", () => {
    expect(() => getRuntimeConfig()).toThrow(/not loaded/);
  });
});
```

- [ ] **Step 2: Run to verify failure** — `bun run test:run lib/__tests__/runtime-config.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement `lib/runtime-config.ts`**

```ts
/**
 * Runtime config ของ SPA — โหลดจาก /config.json ตอน boot (ไม่ฝังใน bundle)
 * เพื่อให้ artifact เดียว deploy ได้ทุก environment (uat/aws)
 */
export interface RuntimeConfig {
  /** Origin ของ backend (ค่าว่าง = same-origin, ใช้กับ Vite dev proxy) */
  BACKEND_URL: string;
  /** ค่า x-app-id header ที่ backend ต้องการ */
  X_APP_ID: string;
}

let config: RuntimeConfig | null = null;

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  const res = await fetch("/config.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load /config.json");
  const json = (await res.json()) as Partial<RuntimeConfig>;
  if (typeof json.BACKEND_URL !== "string") {
    throw new Error("config.json missing BACKEND_URL");
  }
  if (typeof json.X_APP_ID !== "string" || !json.X_APP_ID) {
    throw new Error("config.json missing X_APP_ID");
  }
  config = {
    BACKEND_URL: json.BACKEND_URL.replace(/\/+$/, ""),
    X_APP_ID: json.X_APP_ID,
  };
  return config;
}

export function getRuntimeConfig(): RuntimeConfig {
  if (!config) {
    throw new Error("Runtime config not loaded — call loadRuntimeConfig() first");
  }
  return config;
}

/** สำหรับ unit tests เท่านั้น */
export function setRuntimeConfigForTests(value: RuntimeConfig | null): void {
  config = value;
}
```

- [ ] **Step 4: Run tests** — Expected: 4 PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add runtime config loader (config.json per environment)"`

---

### Task 4: Token stores (TDD)

**Files:**
- Create: `lib/auth/token-store.ts`, `lib/auth/refresh-token-storage.ts`
- Test: `lib/auth/__tests__/token-store.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { refreshTokenStorage } from "@/lib/auth/refresh-token-storage";
import { tokenStore } from "@/lib/auth/token-store";

describe("tokenStore (in-memory access token)", () => {
  beforeEach(() => tokenStore.clear());

  it("stores and returns the access token", () => {
    tokenStore.set("abc");
    expect(tokenStore.get()).toBe("abc");
  });

  it("clear() empties the token", () => {
    tokenStore.set("abc");
    tokenStore.clear();
    expect(tokenStore.get()).toBeNull();
  });

  it("notifies subscribers on set and clear", () => {
    const listener = vi.fn();
    const unsubscribe = tokenStore.subscribe(listener);
    tokenStore.set("abc");
    tokenStore.clear();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    tokenStore.set("xyz");
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe("refreshTokenStorage (localStorage adapter)", () => {
  beforeEach(() => localStorage.clear());

  it("persists and reads the refresh token", () => {
    refreshTokenStorage.set("rt-1");
    expect(refreshTokenStorage.get()).toBe("rt-1");
    expect(localStorage.getItem("carmen.refresh_token")).toBe("rt-1");
  });

  it("clear() removes the token", () => {
    refreshTokenStorage.set("rt-1");
    refreshTokenStorage.clear();
    expect(refreshTokenStorage.get()).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure** — Expected: FAIL (modules not found).

- [ ] **Step 3: Implement `lib/auth/token-store.ts`**

```ts
/**
 * Access token เก็บใน memory เท่านั้น (หายเมื่อ reload — boot จะ refresh ให้ใหม่)
 * มี subscribe สำหรับ useSyncExternalStore เพื่อให้ RequireAuth redirect อัตโนมัติ
 * เมื่อ session หมดอายุ (http-client เรียก clear())
 */
type Listener = () => void;

let accessToken: string | null = null;
const listeners = new Set<Listener>();

const notify = () => listeners.forEach((listener) => listener());

export const tokenStore = {
  get: (): string | null => accessToken,
  set: (token: string): void => {
    accessToken = token;
    notify();
  },
  clear: (): void => {
    accessToken = null;
    notify();
  },
  subscribe: (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
```

- [ ] **Step 4: Implement `lib/auth/refresh-token-storage.ts`**

```ts
/**
 * Refresh token ใน localStorage — backend ปัจจุบันรับ refresh_token ทาง request body
 * (ไม่มี cookie support) โมดูลนี้คือ swap point เดียวหาก backend เพิ่ม
 * httpOnly-cookie mode ในอนาคต (ดู spec §4)
 */
const KEY = "carmen.refresh_token";

export const refreshTokenStorage = {
  get: (): string | null => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null; // storage ถูกปิด (private mode บางเบราว์เซอร์)
    }
  },
  set: (token: string): void => {
    try {
      localStorage.setItem(KEY, token);
    } catch {
      // storage unavailable — session จะอยู่ได้แค่ใน memory
    }
  },
  clear: (): void => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  },
};
```

- [ ] **Step 5: Run tests** — Expected: 5 PASS.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: add in-memory access token store and localStorage refresh token adapter"`

---

### Task 5: Auth API — login / refresh / logout (TDD)

**Files:**
- Create: `lib/auth/auth-api.ts`
- Test: `lib/auth/__tests__/auth-api.test.ts`

Backend contract (verified against `$SRC/app/api/auth/*/route.ts`):
- `POST {BACKEND}/api/auth/login` body `{ email, password }` → `{ data: { access_token, refresh_token, expires_in, platform_role } }`
- `POST {BACKEND}/api/auth/refresh-token` body `{ refresh_token }` → `{ data: { access_token, refresh_token?, expires_in } }`
- `POST {BACKEND}/api/auth/logout` Bearer + body `{ refresh_token }`
- All requests need header `x-app-id`.

- [ ] **Step 1: Write the failing tests**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { login, logout, refreshTokens } from "@/lib/auth/auth-api";
import { refreshTokenStorage } from "@/lib/auth/refresh-token-storage";
import { tokenStore } from "@/lib/auth/token-store";
import { setRuntimeConfigForTests } from "@/lib/runtime-config";

const okJson = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200 });

describe("auth-api", () => {
  beforeEach(() => {
    setRuntimeConfigForTests({ BACKEND_URL: "https://api.test", X_APP_ID: "app-1" });
    tokenStore.clear();
    localStorage.clear();
  });
  afterEach(() => vi.restoreAllMocks());

  it("login stores both tokens and returns platform_role", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okJson({
        data: {
          access_token: "at-1",
          refresh_token: "rt-1",
          expires_in: 900,
          platform_role: "user",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await login("a@b.com", "secret");

    expect(result.platform_role).toBe("user");
    expect(tokenStore.get()).toBe("at-1");
    expect(refreshTokenStorage.get()).toBe("rt-1");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.test/api/auth/login");
    expect((init.headers as Record<string, string>)["x-app-id"]).toBe("app-1");
  });

  it("login throws ApiError with backend message on 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Invalid credentials" }), { status: 401 }),
      ),
    );
    await expect(login("a@b.com", "bad")).rejects.toThrow("Invalid credentials");
    expect(tokenStore.get()).toBeNull();
  });

  it("refreshTokens returns false without stored refresh token (no network call)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await refreshTokens()).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refreshTokens rotates tokens on success", async () => {
    refreshTokenStorage.set("rt-1");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        okJson({ data: { access_token: "at-2", refresh_token: "rt-2", expires_in: 900 } }),
      ),
    );
    expect(await refreshTokens()).toBe(true);
    expect(tokenStore.get()).toBe("at-2");
    expect(refreshTokenStorage.get()).toBe("rt-2");
  });

  it("refreshTokens clears the session on backend rejection", async () => {
    refreshTokenStorage.set("rt-1");
    tokenStore.set("at-1");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 401 })),
    );
    expect(await refreshTokens()).toBe(false);
    expect(tokenStore.get()).toBeNull();
    expect(refreshTokenStorage.get()).toBeNull();
  });

  it("concurrent refreshTokens calls share one network request (mutex)", async () => {
    refreshTokenStorage.set("rt-1");
    const fetchMock = vi.fn().mockResolvedValue(
      okJson({ data: { access_token: "at-2", expires_in: 900 } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const [a, b] = await Promise.all([refreshTokens(), refreshTokens()]);
    expect(a).toBe(true);
    expect(b).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("logout clears session locally and fires backend logout", async () => {
    tokenStore.set("at-1");
    refreshTokenStorage.set("rt-1");
    const fetchMock = vi.fn().mockResolvedValue(okJson({}));
    vi.stubGlobal("fetch", fetchMock);
    await logout();
    expect(tokenStore.get()).toBeNull();
    expect(refreshTokenStorage.get()).toBeNull();
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.test/api/auth/logout");
  });
});
```

- [ ] **Step 2: Run to verify failure** — Expected: FAIL (module not found).

- [ ] **Step 3: Implement `lib/auth/auth-api.ts`**

```ts
import { ApiError, ERROR_CODES } from "@/lib/api-error";
import { getRuntimeConfig } from "@/lib/runtime-config";
import { refreshTokenStorage } from "./refresh-token-storage";
import { tokenStore } from "./token-store";

/**
 * Auth API ฝั่ง client — แทน Next server routes /api/auth/* เดิมทั้งหมด
 * (backend คืน token ใน JSON body และรับ refresh_token ทาง request body)
 */

interface LoginResult {
  platform_role?: string;
}

const authHeaders = (): Record<string, string> => ({
  "Content-Type": "application/json",
  "x-app-id": getRuntimeConfig().X_APP_ID,
});

export async function login(email: string, password: string): Promise<LoginResult> {
  const { BACKEND_URL } = getRuntimeConfig();
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ApiError(ERROR_CODES.NETWORK_ERROR, "Auth server unavailable", undefined, true);
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      res.status === 401 ? ERROR_CODES.UNAUTHORIZED : ERROR_CODES.SERVER_ERROR,
      json?.message ?? "Login failed",
      res.status,
    );
  }

  const { access_token, refresh_token, platform_role } = json?.data ?? {};
  if (!access_token || !refresh_token) {
    throw new ApiError(ERROR_CODES.SERVER_ERROR, "Invalid login response from backend", 502);
  }

  tokenStore.set(access_token);
  refreshTokenStorage.set(refresh_token);
  return { platform_role };
}

// Mutex — concurrent 401s แชร์ refresh request เดียวกัน (พฤติกรรมเดิมจาก http-client)
let refreshPromise: Promise<boolean> | null = null;

export function refreshTokens(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = doRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function doRefresh(): Promise<boolean> {
  const refresh_token = refreshTokenStorage.get();
  if (!refresh_token) return false;

  const { BACKEND_URL } = getRuntimeConfig();
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/api/auth/refresh-token`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ refresh_token }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return false; // network/timeout — อย่าเคลียร์ session (อาจ offline ชั่วคราว)
  }

  if (!res.ok) {
    clearSession();
    return false;
  }

  const json = await res.json().catch(() => null);
  const tokens = json?.data;
  if (!tokens?.access_token) {
    clearSession();
    return false;
  }

  tokenStore.set(tokens.access_token);
  if (tokens.refresh_token) refreshTokenStorage.set(tokens.refresh_token);
  return true;
}

export async function logout(): Promise<void> {
  const { BACKEND_URL } = getRuntimeConfig();
  const accessToken = tokenStore.get();
  const refresh_token = refreshTokenStorage.get() ?? "";
  clearSession();

  if (!accessToken) return;
  try {
    await fetch(`${BACKEND_URL}/api/auth/logout`, {
      method: "POST",
      headers: { ...authHeaders(), Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ refresh_token }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // fire-and-forget — local session เคลียร์ไปแล้ว
  }
}

function clearSession(): void {
  tokenStore.clear();
  refreshTokenStorage.clear();
}
```

- [ ] **Step 4: Copy `api-error.ts` (dependency)**

```bash
mkdir -p lib && cp "$SRC/lib/api-error.ts" "$SRC/lib/api-error.test.ts" lib/
```

(`api-error.ts` is framework-agnostic — no modification needed. If `ERROR_CODES.SERVER_ERROR` does not exist in it, use the closest existing code, e.g. `ERROR_CODES.UNKNOWN` — check the file and keep the test + implementation consistent.)

- [ ] **Step 5: Run tests** — `bun run test:run lib/auth lib/api-error.test.ts` — Expected: all PASS.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: add client-side auth API (login/refresh/logout with mutex)"`

---

### Task 6: Port http-client with URL rewrite + bearer injection

**Files:**
- Create: `lib/http-client.ts` (ported + modified from `$SRC/lib/http-client.ts`)
- Test: `lib/http-client.test.ts` (ported + extended)

- [ ] **Step 1: Copy the source files**

```bash
cp "$SRC/lib/http-client.ts" "$SRC/lib/http-client.test.ts" lib/
```

- [ ] **Step 2: Apply modifications to `lib/http-client.ts`**

(a) Replace the imports + delete the local `refreshToken` mutex block (auth-api owns it now):

```ts
import { ApiError, ERROR_CODES } from "@/lib/api-error";
import { refreshTokens } from "@/lib/auth/auth-api";
import { tokenStore } from "@/lib/auth/token-store";
import { getRuntimeConfig } from "@/lib/runtime-config";
```

Delete: the `let refreshPromise` block and the whole `const refreshToken = ...` function (lines ~19-46 of the source).

(b) Delete `SAFE_ORIGIN` and `assertSafeUrl` entirely. Replace with URL resolution + auth header builder:

```ts
const PROXY_PREFIX = "/api/proxy/";
const EXTERNAL_PREFIX = "/api/external/";

/**
 * แปลง path เดิมของ Next server ให้ชี้ backend ตรง:
 *   /api/proxy/<rest>    → ${BACKEND_URL}/<rest>
 *   /api/external/<rest> → ${BACKEND_URL}/<rest>
 *   /api/<rest>          → ${BACKEND_URL}/api/<rest>   (เช่น /api/auth/*)
 * ทำให้ API_ENDPOINTS และ hooks ทั้งหมดใช้ต่อได้โดยไม่แก้
 */
const resolveUrl = (url: string): string => {
  const { BACKEND_URL } = getRuntimeConfig();
  if (url.startsWith(PROXY_PREFIX)) {
    return `${BACKEND_URL}/${url.slice(PROXY_PREFIX.length)}`;
  }
  if (url.startsWith(EXTERNAL_PREFIX)) {
    return `${BACKEND_URL}/${url.slice(EXTERNAL_PREFIX.length)}`;
  }
  if (url.startsWith("/api/")) {
    return `${BACKEND_URL}${url}`;
  }
  throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "Invalid request URL", 400);
};

const buildAuthHeaders = (): Record<string, string> => {
  const { X_APP_ID } = getRuntimeConfig();
  const token = tokenStore.get();
  return {
    "x-app-id": X_APP_ID,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};
```

(c) Replace `safeFetch` — resolve URL and attach fresh auth headers **per attempt** (so the post-refresh retry picks up the new token; caller-provided headers win on conflict):

```ts
const safeFetch = async (url: string, init: RequestInit): Promise<Response> => {
  const target = resolveUrl(url);
  const finalInit: RequestInit = {
    ...init,
    headers: { ...buildAuthHeaders(), ...(init.headers as Record<string, string>) },
  };
  try {
    return await fetch(target, finalInit);
  } catch (error) {
    throw toApiError(error);
  }
};
```

(d) In `handleClientErrors`, the 401 branch: replace `refreshToken()` with `refreshTokens()` and clear the token store when the session is over (this triggers `RequireAuth` → redirect via `useSyncExternalStore`):

```ts
    const refreshed = await refreshTokens();
    if (refreshed) return safeFetch(url, init);

    tokenStore.clear();
    throw new ApiError(ERROR_CODES.UNAUTHORIZED, "Session expired", 401);
```

(e) In `request()`, remove the server-side branch: `if (globalThis.window !== undefined)` wrapper — always call `handleClientErrors` (this is browser-only code now). Same for `checkRateLimit`'s server-side skip — remove the `if (globalThis.window === undefined) return;` line.

- [ ] **Step 3: Adapt `lib/http-client.test.ts`**

Read the ported test file. Apply:
- In a top-level `beforeEach`: `setRuntimeConfigForTests({ BACKEND_URL: "https://api.test", X_APP_ID: "app-1" })` and `tokenStore.clear()`.
- Mock the refresh dependency where 401 flows are tested: `vi.mock("@/lib/auth/auth-api", () => ({ refreshTokens: vi.fn() }))`.
- Update URL expectations: requests to `/api/proxy/api/x` now hit `https://api.test/api/x`.
- Delete tests that covered `assertSafeUrl`/SSRF internals that no longer exist; keep rate-limit + error-normalization tests.

- [ ] **Step 4: Add new tests** (append to `lib/http-client.test.ts`)

```ts
describe("SPA URL rewrite + auth", () => {
  it("rewrites /api/proxy/* to the backend origin with bearer + x-app-id", async () => {
    tokenStore.set("at-1");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await httpClient.get("/api/proxy/api/config/HQ/units");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.test/api/config/HQ/units");
    expect(init.headers.Authorization).toBe("Bearer at-1");
    expect(init.headers["x-app-id"]).toBe("app-1");
  });

  it("retries once with the refreshed token after 401", async () => {
    tokenStore.set("expired");
    const { refreshTokens } = await import("@/lib/auth/auth-api");
    vi.mocked(refreshTokens).mockImplementation(async () => {
      tokenStore.set("fresh");
      return true;
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await httpClient.get("/api/proxy/api/user/profile");

    expect(res.status).toBe(200);
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer fresh");
  });

  it("clears the token store when refresh fails after 401", async () => {
    tokenStore.set("expired");
    const { refreshTokens } = await import("@/lib/auth/auth-api");
    vi.mocked(refreshTokens).mockResolvedValue(false);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 401 })),
    );

    await expect(httpClient.get("/api/proxy/api/user/profile")).rejects.toThrow(
      "Session expired",
    );
    expect(tokenStore.get()).toBeNull();
  });

  it("rejects non-/api/ URLs", async () => {
    await expect(httpClient.get("https://evil.com/x")).rejects.toThrow(
      "Invalid request URL",
    );
  });
});
```

- [ ] **Step 5: Run** `bun run test:run lib/http-client.test.ts` — Expected: all PASS (iterate on adaptation until green; do not weaken the new tests).

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: port http-client with direct-backend URL rewrite and bearer injection"`

---

### Task 7: Next compat layer — navigation + Link (TDD)

**Files:**
- Create: `lib/compat/navigation.ts`, `lib/compat/link.tsx`
- Test: `lib/compat/__tests__/compat.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import Link from "@/lib/compat/link";
import { usePathname, useRouter, useSearchParams } from "@/lib/compat/navigation";

function Probe() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  return (
    <div>
      <span data-testid="pathname">{pathname}</span>
      <span data-testid="q">{searchParams.get("q")}</span>
      <button onClick={() => router.push("/b")}>go</button>
    </div>
  );
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/a" element={<Probe />} />
        <Route path="/b" element={<div>page B</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe("compat/navigation", () => {
  it("usePathname and useSearchParams mirror next/navigation", () => {
    renderAt("/a?q=hello");
    expect(screen.getByTestId("pathname")).toHaveTextContent("/a");
    expect(screen.getByTestId("q")).toHaveTextContent("hello");
  });

  it("router.push navigates", async () => {
    renderAt("/a");
    await userEvent.click(screen.getByRole("button", { name: "go" }));
    expect(screen.getByText("page B")).toBeInTheDocument();
  });
});

describe("compat/link", () => {
  it("renders an anchor from href and navigates on click", async () => {
    render(
      <MemoryRouter initialEntries={["/a"]}>
        <Routes>
          <Route path="/a" element={<Link href="/b">to B</Link>} />
          <Route path="/b" element={<div>page B</div>} />
        </Routes>
      </MemoryRouter>,
    );
    const anchor = screen.getByRole("link", { name: "to B" });
    expect(anchor).toHaveAttribute("href", "/b");
    await userEvent.click(anchor);
    expect(screen.getByText("page B")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure** — Expected: FAIL (modules not found).

- [ ] **Step 3: Implement `lib/compat/navigation.ts`**

```ts
import { useMemo } from "react";
import {
  useLocation,
  useNavigate,
  useParams as useRouterParams,
  useSearchParams as useRouterSearchParams,
} from "react-router";

/**
 * Drop-in replacement ของ next/navigation บน react-router
 * — codemod เปลี่ยน import path มาที่นี่ ทำให้ 77 ไฟล์เดิมไม่ต้องแก้ logic
 * โมดูลใหม่ๆ ควร import จาก react-router ตรงๆ
 */

export function usePathname(): string {
  return useLocation().pathname;
}

/** อ่านอย่างเดียวเหมือน next/navigation (การเขียน URL ใช้ useURL/useSetSearchParams เดิม) */
export function useSearchParams(): URLSearchParams {
  const [searchParams] = useRouterSearchParams();
  return searchParams;
}

export function useParams<
  T extends Record<string, string | string[] | undefined> = Record<string, string | undefined>,
>(): T {
  return useRouterParams() as T;
}

export interface CompatRouter {
  push: (href: string) => void;
  replace: (href: string) => void;
  back: () => void;
  forward: () => void;
  refresh: () => void;
  prefetch: (href: string) => void;
}

export function useRouter(): CompatRouter {
  const navigate = useNavigate();
  return useMemo(
    () => ({
      push: (href: string) => void navigate(href),
      replace: (href: string) => void navigate(href, { replace: true }),
      back: () => void navigate(-1),
      forward: () => void navigate(1),
      // SPA: ข้อมูลมาจาก TanStack Query — invalidate ที่ฝั่ง caller แทน
      refresh: () => {},
      // ไม่มี per-route prefetch แบบ Next; Vite preload ผ่าน dynamic import เอง
      prefetch: () => {},
    }),
    [navigate],
  );
}
```

- [ ] **Step 4: Implement `lib/compat/link.tsx`**

```tsx
import type { ComponentProps } from "react";
import { Link as RouterLink } from "react-router";

type CompatLinkProps = Omit<ComponentProps<typeof RouterLink>, "to"> & {
  href: string;
  /** Next-only prop — ignored */
  prefetch?: boolean;
};

/** Drop-in replacement ของ next/link (default export, รับ href) */
export default function Link({ href, prefetch: _prefetch, ...rest }: CompatLinkProps) {
  return <RouterLink to={href} {...rest} />;
}
```

- [ ] **Step 5: Run tests** — Expected: 3 PASS.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: add next/navigation and next/link compat layer over react-router"`

---

### Task 8: i18n — use-intl provider + locale switching

**Files:**
- Create: `components/i18n-provider.tsx`, `hooks/use-locale-switch.ts`, `i18n/config.ts`, `messages/en.json`, `messages/th.json`
- Test: `components/__tests__/i18n-provider.test.tsx`

- [ ] **Step 1: Copy locale assets**

```bash
mkdir -p i18n messages
cp "$SRC/i18n/config.ts" i18n/config.ts
cp "$SRC/messages/en.json" "$SRC/messages/th.json" messages/
```

(`i18n/config.ts` is pure constants — no changes. Do NOT copy `i18n/request.ts` — that was next-intl server config.)

- [ ] **Step 2: Write the failing test**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { useTranslations } from "use-intl";
import { beforeEach, describe, expect, it } from "vitest";
import { I18nProvider } from "@/components/i18n-provider";

function Probe() {
  // ใช้ namespace+key ที่มีจริงใน messages/en.json — เปิดไฟล์แล้วเลือกคีย์แรกที่เจอ
  // ตัวอย่างสมมุติ: common.save = "Save" (ปรับให้ตรงไฟล์จริงตอน implement)
  const t = useTranslations("common");
  return <span>{t("save")}</span>;
}

describe("I18nProvider", () => {
  beforeEach(() => localStorage.clear());

  it("loads default-locale messages and renders translations", async () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    await waitFor(() => expect(screen.getByText(/save/i)).toBeInTheDocument());
    expect(document.documentElement.lang).toBe("en");
  });
});
```

(Before finalizing: open `messages/en.json`, pick a real shallow key for the probe, and adjust both the component and assertion.)

- [ ] **Step 3: Run to verify failure** — Expected: FAIL.

- [ ] **Step 4: Implement `components/i18n-provider.tsx`**

```tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { IntlProvider } from "use-intl";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@/i18n/config";

/**
 * แทน NextIntlClientProvider — locale เก็บใน localStorage (เดิมคือ NEXT_LOCALE cookie)
 * messages โหลดเป็น chunk แยกต่อภาษา ผ่าน import.meta.glob
 */

const LOCALE_STORAGE_KEY = "carmen.locale";

type Messages = Record<string, unknown>;

const messageLoaders = import.meta.glob<{ default: Messages }>("../messages/*.json");

const readStoredLocale = (): SupportedLocale => {
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (SUPPORTED_LOCALES.includes(raw as SupportedLocale)) {
      return raw as SupportedLocale;
    }
  } catch {
    // storage unavailable
  }
  return DEFAULT_LOCALE;
};

const LocaleSwitchContext = createContext<(locale: SupportedLocale) => void>(() => {});

/** ใช้โดย hooks/use-locale-switch.ts */
export const useSwitchLocale = () => useContext(LocaleSwitchContext);

export function I18nProvider({ children }: { readonly children: React.ReactNode }) {
  const [locale, setLocale] = useState<SupportedLocale>(readStoredLocale);
  const [messages, setMessages] = useState<Messages | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = messageLoaders[`../messages/${locale}.json`];
    void load().then((mod) => {
      if (!cancelled) setMessages(mod.default);
    });
    document.documentElement.lang = locale;
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const switchLocale = useCallback((next: SupportedLocale) => {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // storage unavailable — สลับเฉพาะ session นี้
    }
    setLocale(next);
  }, []);

  // กัน flash ของ untranslated keys — chunk ภาษาโหลดเร็ว (local asset)
  if (!messages) return null;

  return (
    <LocaleSwitchContext.Provider value={switchLocale}>
      <IntlProvider locale={locale} messages={messages} timeZone="Asia/Bangkok">
        {children}
      </IntlProvider>
    </LocaleSwitchContext.Provider>
  );
}
```

- [ ] **Step 5: Write `hooks/use-locale-switch.ts`** (same return shape as the original so the navbar language switcher ports untouched)

```ts
import { useSwitchLocale } from "@/components/i18n-provider";
import type { SupportedLocale } from "@/i18n/config";

/**
 * สลับภาษาของแอป — แทนเวอร์ชัน Next เดิมที่เซ็ต NEXT_LOCALE cookie + router.refresh()
 * คง return shape เดิม ({ switchLocale, isPending }) ให้ navbar ใช้ต่อได้ทันที
 */
export function useLocaleSwitch() {
  const switchLocale = useSwitchLocale();
  return {
    switchLocale: (locale: SupportedLocale) => switchLocale(locale),
    isPending: false,
  };
}
```

- [ ] **Step 6: Run tests** — `bun run test:run components/__tests__/i18n-provider.test.tsx` — Expected: PASS.

- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat: add use-intl provider with localStorage locale persistence"`

---

### Task 9: Codemod script

**Files:**
- Create: `scripts/codemods/next-to-vite.sh`

- [ ] **Step 1: Write the script**

```bash
#!/usr/bin/env bash
# Codemod: แปลง Next imports → Vite/React Router equivalents
# ใช้กับไดเรกทอรีที่ copy มาจาก carmen-inventory-frontend
# Usage: scripts/codemods/next-to-vite.sh [dir ...]   (default: ทุก source dir)
set -euo pipefail

TARGETS=("${@:-components hooks lib utils types constant routes i18n}")
# shellcheck disable=SC2128,SC2086
read -ra DIRS <<< "${TARGETS[*]}"

mod() { # mod <perl-substitution> <grep-pattern>
  local subst="$1" pattern="$2"
  grep -rl --include='*.ts' --include='*.tsx' -- "$pattern" "${DIRS[@]}" 2>/dev/null |
    while IFS= read -r f; do perl -pi -e "$subst" "$f"; done
}

# 1) next-intl → use-intl (hook API เหมือนกัน 100%)
mod 's{from "next-intl"}{from "use-intl"}g' 'from "next-intl"'

# 2) next/navigation → compat layer
mod 's{from "next/navigation"}{from "\@/lib/compat/navigation"}g' 'from "next/navigation"'

# 3) next/link → compat Link (default export รับ href)
mod 's{from "next/link"}{from "\@/lib/compat/link"}g' 'from "next/link"'

# 4) ตัด directive "use client" / "use server" (no-op ใน Vite แต่ Rollup เตือน)
grep -rl --include='*.ts' --include='*.tsx' -E '^(["'\''])use (client|server)\1;?[[:space:]]*$' "${DIRS[@]}" 2>/dev/null |
  while IFS= read -r f; do
    perl -ni -e 'print unless /^(["\x27])use (client|server)\1;?\s*$/' "$f"
  done

echo "── Remaining Next imports (must be fixed manually): ──"
grep -rn --include='*.ts' --include='*.tsx' 'from "next' "${DIRS[@]}" 2>/dev/null || echo "  (none)"
```

- [ ] **Step 2: Make executable + syntax check**

Run: `chmod +x scripts/codemods/next-to-vite.sh && bash -n scripts/codemods/next-to-vite.sh`
Expected: no output (syntax OK).

- [ ] **Step 3: Smoke-test on a scratch dir**

```bash
mkdir -p /tmp/codemod-test && cat > /tmp/codemod-test/sample.tsx <<'EOF'
"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
EOF
scripts/codemods/next-to-vite.sh /tmp/codemod-test
cat /tmp/codemod-test/sample.tsx
```

Expected output file content:

```tsx

import { useTranslations } from "use-intl";
import { useRouter } from "@/lib/compat/navigation";
import Link from "@/lib/compat/link";
```

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: add next-to-vite codemod script"`

---

### Task 10: Bulk port — types, constant, utils, lib, messages

**Files:**
- Create: `types/*` (67 files), `constant/*` (28 files), `utils/*`, remaining `lib/*` (copied)

- [ ] **Step 1: Copy framework-agnostic directories**

```bash
cp -R "$SRC/types" "$SRC/constant" "$SRC/utils" .
```

- [ ] **Step 2: Copy `lib/` excluding server-only + already-ported files**

```bash
rsync -a "$SRC/lib/" lib/ \
  --exclude cookies.ts \
  --exclude env.ts \
  --exclude rate-limit.ts \
  --exclude failed-login-limit.ts \
  --exclude security-headers.ts \
  --exclude http-client.ts \
  --exclude http-client.test.ts \
  --exclude api-error.ts \
  --exclude api-error.test.ts
```

Rationale: `cookies/env/rate-limit/failed-login-limit/security-headers` were Next-server-only; `http-client`/`api-error` were already ported in Tasks 5-6.

- [ ] **Step 3: Run the codemod**

```bash
scripts/codemods/next-to-vite.sh types constant utils lib i18n
```

Expected: "Remaining Next imports" section lists few or no files. Fix any listed file:
- Imports of `@/lib/env` → replace with `getRuntimeConfig()` from `@/lib/runtime-config`.
- Imports of removed server files → delete the importing file too if it is itself server-only (decide per file; record in commit message).

- [ ] **Step 4: Type-check gate**

Run: `bunx tsc --noEmit`
Expected: errors only from missing `hooks/`/`components/` imports (those land in Task 11) — record the error count. Errors *within* `types/ constant/ utils/ lib/` must be fixed now (typical causes: `process.env` references → runtime config; `server-only` imports → delete).

- [ ] **Step 5: Run ported lib tests**

Run: `bun run test:run lib utils`
Expected: PASS (fix individual test files that assumed Next runtime; delete tests of excluded server files if rsync pulled their specs inside `lib/__tests__/`).

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: port types, constants, utils and lib from Next app"`

---

### Task 11: Bulk port — hooks + components (+ codemod + mechanical fixes)

**Files:**
- Create: `hooks/*` (~115 files), `components/*` (all subdirs)

- [ ] **Step 1: Copy**

```bash
rsync -a "$SRC/hooks/" hooks/ --exclude use-locale-switch.ts
rsync -a "$SRC/components/" components/ --exclude providers.tsx
```

(`use-locale-switch.ts` and `i18n-provider.tsx` already written in Task 8; `providers.tsx` is rewritten in Task 13.)

- [ ] **Step 2: Run the codemod**

```bash
scripts/codemods/next-to-vite.sh hooks components
```

- [ ] **Step 3: Fix the known mechanical leftovers** (the codemod's "Remaining Next imports" list + these known cases):

(a) **`next/image` (4 files)** — `grep -rln 'next/image' components hooks`. In each file replace:

```tsx
import Image from "next/image";
// ...
<Image src={src} alt={alt} width={w} height={h} ... />
```

with:

```tsx
// next/image → plain img (ไม่มี image optimization server บน S3)
<img src={src} alt={alt} width={w} height={h} loading="lazy" ... />
```

Drop Next-only props (`fill` → CSS `absolute inset-0 w-full h-full object-cover`, `priority` → remove `loading="lazy"`, `sizes`/`quality` → drop).

(b) **`hooks/use-server-time.ts`** — called Next route `/api/time`. Replace `fetchServerTime` with a local-time stub, keeping the hook's return shape:

```ts
/**
 * Phase 0 stub: ไม่มี /api/time server route แล้ว — ใช้เวลาเครื่อง client ไปก่อน
 * Open item (spec §6): ย้ายไป backend time endpoint เมื่อโมดูลที่ใช้ sync เวลาถูก migrate
 */
async function fetchServerTime(): Promise<{ now: string; offset: number }> {
  return { now: new Date().toISOString(), offset: 0 };
}
```

(c) **`hooks/use-exchange-rate.ts`** — calls Next route `/api/exchange-rate`; leave the file compiling as-is (the URL passes the `/api/` rewrite). Runtime 404 is acceptable in Phase 0 — the page using it is not wired. Add one comment at the call site: `// TODO(phase-config): /api/exchange-rate was a Next route — move to backend or client-side fetch when the config module migrates`.

(d) **Anything else the codemod lists** — fix per the same patterns; if a component is irreparably server-bound, delete it and note it in the commit message.

- [ ] **Step 4: Type-check until clean**

Run: `bunx tsc --noEmit`
Expected: 0 errors. Iterate on stragglers; typical fixes are the patterns from Step 3. Do not change component logic.

- [ ] **Step 5: Run the full ported test suite**

Run: `bun run test:run`
Expected: PASS. For hook tests that wrapped components in `NextIntlClientProvider`, the codemod renamed the import to use-intl's `IntlProvider`-compatible export — if a test imported `NextIntlClientProvider` *by name*, switch it to:

```tsx
import { IntlProvider } from "use-intl";
// <IntlProvider locale="en" messages={messages} timeZone="Asia/Bangkok">...</IntlProvider>
```

Tests that mocked `next/navigation` should now mock `@/lib/compat/navigation` (same shape).

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: port hooks and components with next-to-vite codemod"`

---

### Task 12: Providers, AppRoot, TopLoader

**Files:**
- Create: `components/providers.tsx` (adapted), `components/top-loader.tsx`, `routes/app-root.tsx`

- [ ] **Step 1: Write `components/providers.tsx`** — port of the source minus the CSP `nonce` prop (no per-request nonce on static hosting):

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { PermissionDeniedDialog } from "@/components/permission-denied-dialog";
import { TooltipProvider } from "@/components/ui/tooltip";

const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
      },
    },
  });

let browserQueryClient: QueryClient | undefined;

const getQueryClient = () => {
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
};

export default function Providers({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          {children}
          <PermissionDeniedDialog />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 2: Write `components/top-loader.tsx`** — replaces `nextjs-toploader`, driven by react-router navigation state (covers lazy-chunk loading):

```tsx
import { useNavigation } from "react-router";

/** แถบ loading บนสุดระหว่างเปลี่ยนหน้า — แทน nextjs-toploader */
export function TopLoader() {
  const navigation = useNavigation();
  const active = navigation.state !== "idle";

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]"
    >
      <div
        className="h-full bg-primary transition-[width,opacity] ease-out"
        style={{
          width: active ? "80%" : "100%",
          opacity: active ? 1 : 0,
          transitionDuration: active ? "8s" : "300ms",
        }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Write `routes/app-root.tsx`** — port of `$SRC/app/layout.tsx` (minus server APIs):

```tsx
import { Outlet } from "react-router";
import { Toaster } from "sonner";
import { I18nProvider } from "@/components/i18n-provider";
import Providers from "@/components/providers";
import { TopLoader } from "@/components/top-loader";

/** Root ของ React tree — แทน app/layout.tsx เดิม (fonts/styles โหลดใน main.tsx) */
export default function AppRoot() {
  return (
    <I18nProvider>
      <Providers>
        {/* Skip link (WCAG 2.4.1) — คงพฤติกรรมเดิม */}
        <a
          href="#main-content"
          className="focus:bg-background focus:text-foreground sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-2"
        >
          Skip to content
        </a>
        <TopLoader />
        <Outlet />
        <Toaster
          richColors
          closeButton
          position="bottom-left"
          mobileOffset={{ top: "1rem", left: "1rem", right: "1rem" }}
          offset={{ top: "1rem", right: "1rem" }}
        />
      </Providers>
    </I18nProvider>
  );
}
```

- [ ] **Step 4: Type-check** — `bunx tsc --noEmit` — Expected: 0 errors.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add providers, app root and top loader"`

---

### Task 13: Router, guards, login + dashboard smoke pages

**Files:**
- Create: `components/auth/require-auth.tsx`, `routes/router.tsx`, `routes/root-layout.tsx`, `routes/login/page.tsx`, `routes/dashboard/page.tsx`, `routes/not-found/page.tsx`
- Modify: `main.tsx`, `index.html`
- Test: `components/auth/__tests__/require-auth.test.tsx`

- [ ] **Step 1: Write the failing guard test**

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { RequireAuth } from "@/components/auth/require-auth";
import { tokenStore } from "@/lib/auth/token-store";

const App = () => (
  <MemoryRouter initialEntries={["/secure"]}>
    <Routes>
      <Route path="/login" element={<div>login page</div>} />
      <Route
        path="/secure"
        element={
          <RequireAuth>
            <div>secure content</div>
          </RequireAuth>
        }
      />
    </Routes>
  </MemoryRouter>
);

describe("RequireAuth", () => {
  beforeEach(() => tokenStore.clear());

  it("redirects to /login without a token", () => {
    render(<App />);
    expect(screen.getByText("login page")).toBeInTheDocument();
  });

  it("renders children with a token", () => {
    tokenStore.set("at-1");
    render(<App />);
    expect(screen.getByText("secure content")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure** — Expected: FAIL.

- [ ] **Step 3: Implement `components/auth/require-auth.tsx`**

```tsx
import { useSyncExternalStore } from "react";
import { Navigate, useLocation } from "react-router";
import { tokenStore } from "@/lib/auth/token-store";

/**
 * Route guard ระดับ auth — token ใน store หาย (เช่น refresh ล้มเหลวกลางคัน
 * จาก http-client) → redirect ไป /login ทันทีผ่าน useSyncExternalStore
 * (การเช็ค permission รายหน้าเป็นหน้าที่ของ RouteGuard เดิม)
 */
export function RequireAuth({ children }: { readonly children: React.ReactNode }) {
  const token = useSyncExternalStore(tokenStore.subscribe, tokenStore.get);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
```

- [ ] **Step 4: Run guard tests** — Expected: 2 PASS.

- [ ] **Step 5: Write `routes/root-layout.tsx`** — port of `$SRC/app/(root)/layout.tsx` with `<Outlet/>`:

```tsx
import { Outlet } from "react-router";
import { StatusBar } from "@/components/footer/status-bar";
import { KeyboardShortcutsDialog } from "@/components/keyboard-shortcuts-dialog";
import { MissingDepartmentDialog } from "@/components/missing-department-dialog";
import { Navbar } from "@/components/navbar/navbar";
import { RouteGuard } from "@/components/route-guard";
import { OfflineBanner } from "@/components/share/offline-banner";
import { ProfileGate } from "@/components/share/profile-gate";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SidebarShell } from "@/components/sidebar/sidebar-shell";
import { SidebarInset } from "@/components/ui/sidebar";

export default function RootLayout() {
  return (
    <SidebarShell>
      <AppSidebar />
      <SidebarInset className="space-main-gradient relative h-dvh overflow-hidden">
        <Navbar />
        <OfflineBanner />
        <div
          id="main-content"
          className="m-3 flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-2"
        >
          <ProfileGate>
            <RouteGuard>
              <Outlet />
            </RouteGuard>
          </ProfileGate>
        </div>
        <StatusBar />
      </SidebarInset>
      <KeyboardShortcutsDialog />
      <MissingDepartmentDialog />
    </SidebarShell>
  );
}
```

- [ ] **Step 6: Write the smoke pages**

`routes/login/page.tsx` — port `$SRC/app/login/page.tsx`: copy its JSX/component usage, strip `export const metadata`, append the route export. Shape:

```tsx
// Port เนื้อหาจาก $SRC/app/login/page.tsx (ตัด metadata ออก)
// ตัวอย่างโครง — ใช้ของจริงจาก source:
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return <LoginForm />;
}

export const Component = LoginPage;
```

(Check the real export style of `components/login-form.tsx` — named vs default — and match it.)

`routes/dashboard/page.tsx`:

```tsx
/** Placeholder — dashboard widgets migrate ในเฟสถัดไป; Phase 0 พิสูจน์แค่ shell + auth */
export default function DashboardPage() {
  return (
    <div className="text-muted-foreground p-6 text-sm">
      Dashboard migration lands in a later phase.
    </div>
  );
}

export const Component = DashboardPage;
```

`routes/not-found/page.tsx`:

```tsx
import { NotFoundComponent } from "@/components/not-found-component";

export default function NotFoundPage() {
  return <NotFoundComponent />;
}

export const Component = NotFoundPage;
```

(Check the real export name in `components/not-found-component.tsx` and match it.)

- [ ] **Step 7: Write `routes/router.tsx`**

```tsx
import { createBrowserRouter, Navigate } from "react-router";
import { RequireAuth } from "@/components/auth/require-auth";
import AppRoot from "./app-root";
import RootLayout from "./root-layout";

const ProtectedShell = () => (
  <RequireAuth>
    <RootLayout />
  </RequireAuth>
);

export const router = createBrowserRouter([
  {
    Component: AppRoot,
    children: [
      { path: "/login", lazy: () => import("./login/page") },
      {
        Component: ProtectedShell,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: "dashboard", lazy: () => import("./dashboard/page") },
          // ── Module routes (config, procurement, …) ถูกเพิ่มตรงนี้ในเฟสถัดไป ──
        ],
      },
      { path: "*", lazy: () => import("./not-found/page") },
    ],
  },
]);
```

- [ ] **Step 8: Replace `main.tsx` with the real boot sequence**

```tsx
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./styles/globals.css";
import "./styles/badge-status.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";

/**
 * Boot ลำดับ: config → restore session → render
 * refresh ก่อน render ตัดปัญหา flash ของ login page ตอน reload ขณะ logged-in
 */
async function boot() {
  const { loadRuntimeConfig } = await import("@/lib/runtime-config");
  await loadRuntimeConfig();

  const { refreshTokens } = await import("@/lib/auth/auth-api");
  await refreshTokens(); // ล้มเหลว = ไม่ logged-in → RequireAuth พาไป /login เอง

  const { router } = await import("./routes/router");
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}

void boot();
```

- [ ] **Step 9: Wire the favicon in `index.html`** — import the data URI constant value from `components/icons/carmen-logo.tsx` (open the file, copy the literal `CARMEN_ICON_DATA_URI` string) into a `<link rel="icon" href="data:image/...">` tag.

- [ ] **Step 10: Verify**

Run: `bunx tsc --noEmit && bun run test:run`
Expected: clean + all tests PASS.

Run: `bun run dev`, open http://localhost:3000
Expected: redirected to `/login`; login form renders with translations, theme and fonts.

- [ ] **Step 11: Commit** — `git add -A && git commit -m "feat: add router, auth guard, root layout and smoke pages"`

---

### Task 14: Adapt login-form to client auth + end-to-end smoke

**Files:**
- Modify: `components/login-form.tsx`

- [ ] **Step 1: Replace the mutation's API call**

In `components/login-form.tsx`, the mutation currently does (around line 100):

```ts
const res = await httpClient.post(API_ENDPOINTS.LOGIN, credentials);
// + manual res.ok / data.message handling
```

Replace the `mutationFn` body with:

```ts
import { login } from "@/lib/auth/auth-api";
// ...
mutationFn: async (credentials: LoginFormValues) =>
  login(credentials.email, credentials.password),
```

`login()` already throws `ApiError` carrying the backend `message`, so the existing `loginMutation.error.message` rendering keeps working. Read the existing `onSuccess` handler: it may use `platform_role`/`profile` from the old Next-route response — `login()` returns `{ platform_role }`; profile now loads via `ProfileGate`/`use-profile` after redirect. Adjust the handler minimally to use only `platform_role` + navigation.

Remove now-unused imports (`httpClient`, `API_ENDPOINTS`) if nothing else in the file uses them.

- [ ] **Step 2: Type-check + tests** — `bunx tsc --noEmit && bun run test:run` — Expected: clean/PASS.

- [ ] **Step 3: Manual end-to-end smoke against a real backend**

```bash
VITE_DEV_PROXY_TARGET="<BACKEND_URL from $SRC/.env.uat or .env>" bun run dev
```

With `public/config.json` `BACKEND_URL: ""`. In the browser:
1. Land on `/login` → submit valid UAT credentials.
2. Expected: redirect into the shell — sidebar + navbar render, profile loads (`ProfileGate`), dashboard placeholder visible.
3. Reload the page → Expected: session restored via refresh-token boot (no login redirect).
4. DevTools → Application → localStorage: `carmen.refresh_token` present; access token NOT in storage.

Record the result honestly. If backend connectivity is unavailable, mark this step blocked and continue — but it must pass before Phase 0 is called done.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: wire login form to client-side auth API"`

---

### Task 15: Production build verification

- [ ] **Step 1: Full build** — `bun run build` — Expected: success.

- [ ] **Step 2: Inspect chunking**

Run: `ls -lh dist/assets | head -30`
Expected: separate chunks exist for `login`, `dashboard`, `not-found` routes (lazy imports), plus vendor chunks. `messages/en.json`/`th.json` appear as separate chunks (import.meta.glob).

- [ ] **Step 3: Preview smoke**

Run: `bun run preview` then open the printed URL.
Expected: app boots, redirects to `/login`, form renders. Navigate to a deep URL (e.g. `/dashboard`) directly — Vite preview serves the SPA fallback and the app redirects to login (full S3 fallback behavior is configured in Task 16).

- [ ] **Step 4: Commit any fixes** — `git add -A && git commit -m "chore: production build fixes"` (skip if no changes).

---

### Task 16: Deploy artifacts — S3/CloudFront

**Files:**
- Create: `scripts/deploy-s3.sh`, `docs/deploy.md`

- [ ] **Step 1: Write `scripts/deploy-s3.sh`**

```bash
#!/usr/bin/env bash
# Deploy SPA ไป S3 + invalidate CloudFront
# Usage: scripts/deploy-s3.sh <s3-bucket> <cloudfront-distribution-id>
# หมายเหตุ: config.json จัดการแยกต่อ environment — ห้าม sync ทับ
set -euo pipefail

BUCKET="${1:?Usage: deploy-s3.sh <bucket> <distribution-id>}"
DISTRIBUTION_ID="${2:?Usage: deploy-s3.sh <bucket> <distribution-id>}"

bun run build

# Hashed assets — cache ยาว (immutable)
aws s3 sync dist/ "s3://${BUCKET}/" \
  --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "index.html" \
  --exclude "config.json" \
  --exclude "config.sample.json"

# index.html — no-cache เพื่อให้ deploy ใหม่มีผลทันที
aws s3 cp dist/index.html "s3://${BUCKET}/index.html" \
  --cache-control "no-cache"

# config.json บน bucket เป็นของ environment นั้นๆ — อัปโหลดครั้งแรกด้วยมือ:
#   aws s3 cp config.<env>.json s3://<bucket>/config.json --cache-control "no-cache"

aws cloudfront create-invalidation \
  --distribution-id "${DISTRIBUTION_ID}" \
  --paths "/index.html"

echo "Deployed to s3://${BUCKET} and invalidated /index.html"
```

Run: `chmod +x scripts/deploy-s3.sh && bash -n scripts/deploy-s3.sh` — Expected: syntax OK.

- [ ] **Step 2: Write `docs/deploy.md`**

```markdown
# Deploy — S3 + CloudFront

## One-time infrastructure setup

1. **S3 bucket** (private, no static-website mode needed):
   - Block all public access: ON
2. **CloudFront distribution**:
   - Origin: the S3 bucket via **Origin Access Control (OAC)**; update the bucket
     policy with the generated statement.
   - Default root object: `index.html`
   - **Custom error responses** (SPA client-side routing):
     - HTTP 403 → response page `/index.html`, response code 200
     - HTTP 404 → response page `/index.html`, response code 200
   - Viewer protocol policy: redirect HTTP → HTTPS
3. **Per-environment `config.json`** — upload once per environment:
   ```bash
   aws s3 cp config.uat.json s3://<bucket>/config.json --cache-control "no-cache"
   ```
   Shape (see `public/config.sample.json`):
   ```json
   { "BACKEND_URL": "https://<backend-host>", "X_APP_ID": "<app id>" }
   ```

## Backend prerequisites (see spec §4)

- CORS: allow the CloudFront origin (`https://<distribution-domain>`), methods
  GET/POST/PUT/PATCH/DELETE, headers `Authorization`, `Content-Type`, `x-app-id`.

## Each release

```bash
scripts/deploy-s3.sh <bucket> <distribution-id>
```

`index.html` is no-cache; hashed assets are immutable — returning users pick up
new releases on next navigation.
```

- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat: add S3/CloudFront deploy script and documentation"`

---

### Task 17: Playwright smoke e2e

**Files:**
- Create: `playwright.config.ts`, `e2e/login-page.spec.ts`

- [ ] **Step 1: Write `playwright.config.ts`**

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:4173",
  },
  webServer: {
    command: "bun run preview --port 4173",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 2: Write `e2e/login-page.spec.ts`** — boots the real bundle with no session and asserts the auth redirect + form render (no backend needed: with no stored refresh token, `refreshTokens()` short-circuits without a network call):

```ts
import { expect, test } from "@playwright/test";

test("unauthenticated visitor is redirected to the login form", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("textbox").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in|login|เข้าสู่ระบบ/i })).toBeVisible();
});
```

(Adjust the button-name regex to the actual login button label from `messages/en.json` during implementation.)

- [ ] **Step 3: Build + run**

Run: `bun run build && bunx playwright test`
Expected: 1 PASS. (`bunx playwright install chromium` first if browsers are missing.)

- [ ] **Step 4: Commit** — `git add -A && git commit -m "test: add Playwright login smoke e2e"`

---

### Task 18: CLAUDE.md, README, final verification

**Files:**
- Create: `CLAUDE.md`, `README.md`

- [ ] **Step 1: Write `CLAUDE.md`**

```markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Carmen inventory ERP frontend — **Vite + React Router SPA port** of the Next.js app at
`../carmen-inventory-frontend/`. Static bundle on S3/CloudFront; the browser calls the
backend directly. Spec: `docs/superpowers/specs/2026-06-11-carmen-react-ssg-migration-design.md`.

## ภาษาในการสื่อสาร

สื่อสารกับ user เป็น **ภาษาไทย** เสมอ (ยกเว้น code, commit message, PR ใช้ภาษาอังกฤษ)

## Commands

```bash
bun dev              # Dev server (VITE_DEV_PROXY_TARGET=<backend> to proxy /api)
bun run build        # tsc + vite build → dist/
bun run lint         # ESLint        bun test          # Vitest watch
bun test:run         # Single run    bun test:run path # Single file
bunx playwright test # e2e (needs build)
scripts/deploy-s3.sh <bucket> <cf-id>   # Deploy (see docs/deploy.md)
```

## Architecture (deltas from the source app — its CLAUDE.md still describes module patterns)

- **No server.** `lib/http-client.ts` rewrites `/api/proxy/<rest>` and `/api/external/<rest>`
  → `${BACKEND_URL}/<rest>` and attaches `Authorization: Bearer` + `x-app-id` itself.
  `API_ENDPOINTS`/hooks are identical to the source app.
- **Auth:** access token in memory (`lib/auth/token-store.ts`), refresh token in
  localStorage (`lib/auth/refresh-token-storage.ts` — single swap point for future cookie
  mode). Boot order in `main.tsx`: `loadRuntimeConfig()` → `refreshTokens()` → render.
  `RequireAuth` redirects to `/login` whenever the token store empties.
- **Routing:** React Router 7 data router in `routes/router.tsx`. Pages live in
  `routes/<module>/page.tsx` and must `export const Component`. Add new module routes
  under the `ProtectedShell` children.
- **Next compat:** `next/navigation` → `@/lib/compat/navigation`, `next/link` →
  `@/lib/compat/link`, `next-intl` → `use-intl`. ESLint blocks direct `next*` imports.
  New code should import `react-router` directly.
- **i18n:** `use-intl` + `components/i18n-provider.tsx`; locale persisted in
  localStorage (`carmen.locale`); messages in `messages/{en,th}.json`.
- **Runtime config:** `public/config.json` (`BACKEND_URL`, `X_APP_ID`) fetched at boot —
  never hardcode backend URLs in the bundle.

## Migrating a module from the source app

1. Copy the module's `_components/`, hook and types files from `$SRC`.
2. Run `scripts/codemods/next-to-vite.sh <dirs>`.
3. Create `routes/<path>/page.tsx` re-exporting the page component + `Component` export;
   register it in `routes/router.tsx` with `lazy:`.
4. `bunx tsc --noEmit && bun test:run` must be clean.
```

- [ ] **Step 2: Write `README.md`** (short: project intent, dev quickstart copying `config.sample.json` → `config.json`, link to `docs/deploy.md` and the spec).

```markdown
# carmen-inventory-frontend-react

Vite + React Router SPA port of [carmen-inventory-frontend](../carmen-inventory-frontend)
(ERP inventory system), built for static hosting on S3 + CloudFront.

## Quickstart

```bash
bun install
cp public/config.sample.json public/config.json   # set X_APP_ID; BACKEND_URL="" for proxy mode
VITE_DEV_PROXY_TARGET=https://<backend> bun dev
```

- Spec: `docs/superpowers/specs/2026-06-11-carmen-react-ssg-migration-design.md`
- Phase 0 plan: `docs/superpowers/plans/2026-06-11-phase0-foundation.md`
- Deploy: `docs/deploy.md`
```

- [ ] **Step 3: Final verification — run everything**

```bash
bun run lint && bun run test:run && bun run build && bunx playwright test
```

Expected: all four green. Report actual output.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "docs: add CLAUDE.md and README for the SPA port"`

---

## Open items carried out of Phase 0 (tracked, not blocking)

1. **`/api/exchange-rate` + `/api/time`** Next routes have no SPA equivalent yet — stubbed/deferred to the config-module phase (Task 11 Step 3).
2. **Backend CORS** must be enabled before production deploy (dev uses the Vite proxy) — spec §4.
3. **Refresh token → httpOnly cookie mode** when the backend adds support — swap `lib/auth/refresh-token-storage.ts`.
4. **CSP headers** (source had nonce-based CSP via Next) — re-introduce via CloudFront response-headers policy in a later phase.
5. **`(external)/pl/[url_token]` public route** — migrates with the vendor-management phase.
```
