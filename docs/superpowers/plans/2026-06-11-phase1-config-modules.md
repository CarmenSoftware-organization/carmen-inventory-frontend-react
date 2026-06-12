# Phase 1 — Config Modules Migration Implementation Plan

> **Status: ✅ completed** — merged via PR #1.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all 15 config modules + the config landing page from the source Next app into the SPA, proving the per-module migration recipe end-to-end with an authenticated e2e.

**Architecture:** Route-level code (`page.tsx` + `_components/`) is copied verbatim from `$SRC/app/(root)/config/`, converted by the existing `next-to-vite.sh` codemod plus a new `nextpage-to-route.sh` page codemod (strips Next metadata, appends the `Component` lazy-route export), and registered as lazy children of a `config` parent route guarded by a reusable React Router error-boundary adapter. All hooks/types/constants/UI components were already ported in Phase 0.

**Tech Stack:** Vite 7, React Router 7 (lazy data routes), use-intl, TanStack Query, Playwright (env-gated authenticated project against the local gateway :4000).

**Spec:** `docs/superpowers/specs/2026-06-11-phase1-config-modules-design.md`
**Source:** `SRC="../carmen-inventory-frontend"` (set in your shell; note the config dir path contains parens: `"$SRC/app/(root)/config"`)
**Working conventions:** repo root, Bun runtime, branch `phase0-foundation` (continues the open PR) unless instructed otherwise. Test credentials are provided via env vars only — NEVER write them into committed files.

**Verified source patterns (read during planning):**
- Every `page.tsx`: `import type { Metadata }` + `import { getTranslations } from "next-intl/server"` + async `generateMetadata()` block + a plain default-export component. Conversion = delete those three + append `export const Component = <Name>;`.
- `[id]/page.tsx` (department, location only): async component receiving `params: Promise<{ id: string }>` — must be hand-converted to `useParams` (exact code in Task 5).
- `error.tsx` re-exports `components/ui/module-error-boundary` whose contract is `{ error: Error & { digest?: string }, reset: () => void }` (verified).

---

### Task 1: Page codemod script

**Files:**
- Create: `scripts/codemods/nextpage-to-route.sh`

- [x] **Step 1: Write the script**

```bash
#!/usr/bin/env bash
# แปลง Next page.tsx (ที่ copy มาแล้ว) เป็น react-router lazy route module:
# - ตัด import Metadata / next-intl server import / generateMetadata block
# - เติม `export const Component = <DefaultExportName>;` (lazy-route convention)
# Idempotent — รันซ้ำได้
# Usage: scripts/codemods/nextpage-to-route.sh <file.tsx ...>
set -euo pipefail

for f in "$@"; do
  perl -0pi -e '
    s/import type \{ Metadata \} from "next";\n//;
    s/import \{ getTranslations \} from "next-intl\/server";\n//;
    s/export async function generateMetadata\(\)[^{]*\{(?:[^{}]|\{[^{}]*\})*\}\n+//s;
  ' "$f"

  if ! grep -q "export const Component" "$f"; then
    name=$(perl -ne 'if (/export default (?:async )?function (\w+)/) { print $1; exit }' "$f")
    if [ -n "${name:-}" ]; then
      printf '\nexport const Component = %s;\n' "$name" >> "$f"
    else
      echo "WARN: $f has no named default export — add Component export manually" >&2
    fi
  fi
done
echo "Converted: $#  file(s)"
```

- [x] **Step 2: Make executable + syntax check**

Run: `chmod +x scripts/codemods/nextpage-to-route.sh && bash -n scripts/codemods/nextpage-to-route.sh`
Expected: no output.

- [x] **Step 3: Smoke-test against a real source page (on a scratch copy)**

```bash
mkdir -p /tmp/pagemod-test
cp "$SRC/app/(root)/config/unit/page.tsx" /tmp/pagemod-test/page.tsx
scripts/codemods/nextpage-to-route.sh /tmp/pagemod-test/page.tsx
cat /tmp/pagemod-test/page.tsx
```

Expected output file:
- NO `Metadata` import, NO `next-intl/server` import, NO `generateMetadata` block
- default export `UnitPage` intact (JSDoc comment may remain — fine)
- last line: `export const Component = UnitPage;`

Run the script a second time on the same file — content unchanged (idempotent).

- [x] **Step 4: Commit**

```bash
git add scripts/codemods/nextpage-to-route.sh
git commit -m "feat: add Next page-to-route codemod for module migrations"
```

---

### Task 2: Route error-boundary adapter (TDD)

**Files:**
- Create: `routes/module-error-boundary-adapter.tsx`
- Test: `routes/__tests__/module-error-boundary-adapter.test.tsx`

- [x] **Step 1: Write the failing test**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/components/i18n-provider";
import { RouteErrorBoundaryAdapter } from "@/routes/module-error-boundary-adapter";

function Boom(): never {
  throw new Error("kaboom-test");
}

describe("RouteErrorBoundaryAdapter", () => {
  beforeEach(() => {
    localStorage.clear();
    // กัน error log ของ react-router รก console ระหว่างเทสต์
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders ModuleErrorBoundary with the thrown error message", async () => {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          ErrorBoundary: RouteErrorBoundaryAdapter,
          children: [{ index: true, Component: Boom }],
        },
      ],
      { initialEntries: ["/"] },
    );

    render(
      <I18nProvider>
        <RouterProvider router={router} />
      </I18nProvider>,
    );

    // ModuleErrorBoundary แสดง error.message ผ่าน ErrorState
    await waitFor(() =>
      expect(screen.getByText(/kaboom-test/i)).toBeInTheDocument(),
    );
    // มีปุ่ม retry (ErrorState ส่ง onRetry)
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
```

(If `ErrorState` renders the retry button with a translated label, the generic `getByRole("button")` still matches. If the message renders differently — read `components/ui/error-state.tsx` and adjust the assertion to the real DOM, keeping the intent: thrown message visible + retry present.)

- [x] **Step 2: Run to verify failure**

Run: `bun run test:run routes/__tests__/module-error-boundary-adapter.test.tsx`
Expected: FAIL (module not found).

- [x] **Step 3: Implement `routes/module-error-boundary-adapter.tsx`**

```tsx
import { useNavigate, useRouteError } from "react-router";
import ModuleError from "@/components/ui/module-error-boundary";

/**
 * แปลงสัญญา error boundary ของ react-router (useRouteError) ให้เข้ากับ
 * ModuleErrorBoundary เดิมจาก Next ({ error, reset }) — ใช้ซ้ำได้ทุกโมดูล/เฟส
 * reset = navigate(0) เพื่อ remount subtree ของ route ปัจจุบัน
 */
export function RouteErrorBoundaryAdapter() {
  const rawError = useRouteError();
  const navigate = useNavigate();

  const error =
    rawError instanceof Error ? rawError : new Error(String(rawError));

  return <ModuleError error={error} reset={() => void navigate(0)} />;
}
```

(Check the actual default-export name in `components/ui/module-error-boundary.tsx` — it is `ModuleError`. Import accordingly.)

- [x] **Step 4: Run tests** — Expected: PASS. Full gates: `bunx tsc --noEmit`, `bun run lint`, `bun run test:run` all clean.

- [x] **Step 5: Commit**

```bash
git add routes/module-error-boundary-adapter.tsx routes/__tests__/
git commit -m "feat: add react-router error boundary adapter for module routes"
```

---

### Task 3: Batch A — landing + unit + currency

**Files:**
- Create: `routes/config/page.tsx`, `routes/config/config-dashboard.tsx`, `routes/config/unit/**`, `routes/config/currency/**` (copied)
- Modify: `routes/router.tsx`

- [x] **Step 1: Copy from source**

```bash
mkdir -p routes/config
cp "$SRC/app/(root)/config/page.tsx" routes/config/page.tsx
cp "$SRC/app/(root)/config/config-dashboard.tsx" routes/config/config-dashboard.tsx
cp -R "$SRC/app/(root)/config/unit" routes/config/unit
cp -R "$SRC/app/(root)/config/currency" routes/config/currency
```

(Do NOT copy `error.tsx` — the adapter from Task 2 replaces it.)

- [x] **Step 2: Run both codemods**

```bash
scripts/codemods/next-to-vite.sh routes
scripts/codemods/nextpage-to-route.sh routes/config/page.tsx routes/config/unit/page.tsx routes/config/currency/page.tsx
```

Expected: next-to-vite reports "(none)" remaining; nextpage-to-route prints no WARN. Verify each page.tsx ends with its `export const Component = …;` line.

- [x] **Step 3: Register the config parent route**

In `routes/router.tsx`, add the import:

```tsx
import { RouteErrorBoundaryAdapter } from "./module-error-boundary-adapter";
```

and insert as a child of `ProtectedShell` (replacing the placeholder comment `── Module routes … ──`):

```tsx
{
  path: "config",
  ErrorBoundary: RouteErrorBoundaryAdapter,
  children: [
    { index: true, lazy: () => import("./config/page") },
    { path: "unit", lazy: () => import("./config/unit/page") },
    { path: "currency", lazy: () => import("./config/currency/page") },
    // ── config modules ถูกเพิ่มต่อท้ายตรงนี้ใน Batch B/C ──
  ],
},
```

- [x] **Step 4: Gates**

Run: `bunx tsc --noEmit && bun run lint && bun run test:run`
Expected: all clean (fix any straggler the codemods missed — typical: an import the next-to-vite report listed; do NOT change component logic).

- [x] **Step 5: Authenticated browser probe (manual smoke)**

Requires the local gateway running on :4000 and env creds (ask the controller if unavailable — do not hardcode):

```bash
(VITE_DEV_PROXY_TARGET=http://localhost:4000 bun run dev --port 3131 > /tmp/dev-p1.log 2>&1 &) && sleep 3
cat > /tmp/p1-probe.mjs <<'EOF'
import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:3131/", { waitUntil: "networkidle" });
await page.getByRole("textbox").first().fill(process.env.E2E_EMAIL);
await page.locator('input[type="password"]').fill(process.env.E2E_PASSWORD);
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL(/dashboard/, { timeout: 15000 });
for (const path of ["/config", "/config/unit", "/config/currency"]) {
  await page.goto(`http://localhost:3131${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  const text = await page.evaluate(() => document.body.innerText.slice(0, 120));
  console.log(path, "→", JSON.stringify(text));
}
await browser.close();
EOF
E2E_EMAIL=<from controller> E2E_PASSWORD=<from controller> bun /tmp/p1-probe.mjs
pkill -f "vite.*3131"; rm /tmp/p1-probe.mjs
```

Expected: `/config` shows the config dashboard (module cards), `/config/unit` + `/config/currency` show their list UI (DataGrid headers / search input — NOT the 404 page, NOT a blank screen). Report the captured text.

- [x] **Step 6: Commit**

```bash
git add routes/
git commit -m "feat: migrate config landing, unit and currency modules"
```

---

### Task 4: Batch B — remaining 10 dialog modules

**Files:**
- Create: `routes/config/{adjustment-type,business-type,certification,credit-note-reason,credit-term,delivery-point,eco,exchange-rate,extra-cost,tax-profile}/**`
- Modify: `routes/router.tsx`

- [x] **Step 1: Copy + codemod in one loop**

```bash
MODULES="adjustment-type business-type certification credit-note-reason credit-term delivery-point eco exchange-rate extra-cost tax-profile"
for m in $MODULES; do cp -R "$SRC/app/(root)/config/$m" "routes/config/$m"; done
scripts/codemods/next-to-vite.sh routes
scripts/codemods/nextpage-to-route.sh routes/config/{adjustment-type,business-type,certification,credit-note-reason,credit-term,delivery-point,eco,exchange-rate,extra-cost,tax-profile}/page.tsx
```

Expected: "(none)" remaining Next imports; no WARN from the page codemod.

- [x] **Step 2: Register the 10 routes**

In `routes/router.tsx` config children, after the currency entry:

```tsx
    { path: "adjustment-type", lazy: () => import("./config/adjustment-type/page") },
    { path: "business-type", lazy: () => import("./config/business-type/page") },
    { path: "certification", lazy: () => import("./config/certification/page") },
    { path: "credit-note-reason", lazy: () => import("./config/credit-note-reason/page") },
    { path: "credit-term", lazy: () => import("./config/credit-term/page") },
    { path: "delivery-point", lazy: () => import("./config/delivery-point/page") },
    { path: "eco", lazy: () => import("./config/eco/page") },
    { path: "exchange-rate", lazy: () => import("./config/exchange-rate/page") },
    { path: "extra-cost", lazy: () => import("./config/extra-cost/page") },
    { path: "tax-profile", lazy: () => import("./config/tax-profile/page") },
```

- [x] **Step 3: Gates**

Run: `bunx tsc --noEmit && bun run lint && bun run test:run && bun run build`
Expected: all green; build emits a separate chunk per module page (spot-check `ls dist/assets | grep -c "page-"` ≥ 16).

For exchange-rate specifically: the module compiles and its CRUD works; the live-rates fetch hits `/api/exchange-rate` which the backend doesn't serve yet (404 surfaces via the module's error handling) — this is the accepted degradation per spec §4. Do not "fix" it.

- [x] **Step 4: Commit**

```bash
git add routes/
git commit -m "feat: migrate remaining dialog-based config modules"
```

---

### Task 5: Batch C — department + location (page-based)

**Files:**
- Create: `routes/config/department/**`, `routes/config/location/**` (copied)
- Modify: `routes/router.tsx`, plus hand-edits to the two `[id]/page.tsx`

- [x] **Step 1: Copy + codemod**

```bash
cp -R "$SRC/app/(root)/config/department" routes/config/department
cp -R "$SRC/app/(root)/config/location" routes/config/location
scripts/codemods/next-to-vite.sh routes
scripts/codemods/nextpage-to-route.sh \
  routes/config/department/page.tsx routes/config/department/new/page.tsx \
  routes/config/location/page.tsx routes/config/location/new/page.tsx
```

(Do NOT run nextpage-to-route on the two `[id]/page.tsx` — they are replaced by hand in Step 2; the script's WARN/auto-append doesn't fit their async-params shape.)

- [x] **Step 2: Hand-convert the two `[id]/page.tsx`**

Replace `routes/config/department/[id]/page.tsx` ENTIRELY with:

```tsx
import { useParams } from "react-router";
import { EditDepartmentContent } from "./_content";

/** หน้าแก้ไข Department — id มาจาก route param (เดิม: Next params Promise) */
export default function EditDepartmentPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null; // route จับคู่ :id เสมอ — กัน type ระดับ runtime
  return <EditDepartmentContent id={id} />;
}

export const Component = EditDepartmentPage;
```

Replace `routes/config/location/[id]/page.tsx` ENTIRELY with the same shape — open the original first to confirm the content component name/import (expected: `EditLocationContent` from `./_content`; match what the source file actually re-exports):

```tsx
import { useParams } from "react-router";
import { EditLocationContent } from "./_content";

/** หน้าแก้ไข Location — id มาจาก route param (เดิม: Next params Promise) */
export default function EditLocationPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <EditLocationContent id={id} />;
}

export const Component = EditLocationPage;
```

- [x] **Step 3: Register routes**

In `routes/router.tsx` config children, after tax-profile:

```tsx
    { path: "department", lazy: () => import("./config/department/page") },
    { path: "department/new", lazy: () => import("./config/department/new/page") },
    { path: "department/:id", lazy: () => import("./config/department/[id]/page") },
    { path: "location", lazy: () => import("./config/location/page") },
    { path: "location/new", lazy: () => import("./config/location/new/page") },
    { path: "location/:id", lazy: () => import("./config/location/[id]/page") },
```

- [x] **Step 4: Gates**

Run: `bunx tsc --noEmit && bun run lint && bun run test:run && bun run build`
Expected: all green.

- [x] **Step 5: Authenticated probe — page-based flow**

Same harness as Task 3 Step 5, visiting: `/config/department` (list), `/config/department/new` (form renders), `/config/location` (list). Report captured text. If a department row exists, also visit one `/config/department/<real-id>` by clicking the first row link (`page.locator("table a").first().click()` or per the actual DOM) and confirm the edit form loads data.

- [x] **Step 6: Commit**

```bash
git add routes/
git commit -m "feat: migrate department and location page-based config modules"
```

---

### Task 6: Authenticated e2e (env-gated)

**Files:**
- Modify: `playwright.config.ts`
- Create: `e2e/authenticated-config.spec.ts`

- [x] **Step 1: Extend `playwright.config.ts` with a gated project + dev webServer**

Replace the file content with:

```ts
import { defineConfig } from "@playwright/test";

// Authenticated project รันเมื่อตั้ง E2E_EMAIL/E2E_PASSWORD เท่านั้น
// (CI ที่ไม่มี credentials ข้ามไปโดย suite ยังเขียวเหมือนเดิม)
const hasCreds = !!process.env.E2E_EMAIL && !!process.env.E2E_PASSWORD;
const E2E_BACKEND = process.env.E2E_BACKEND ?? "http://localhost:4000";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  projects: [
    {
      name: "static",
      testIgnore: /authenticated/,
      use: { baseURL: "http://localhost:4173" },
    },
    ...(hasCreds
      ? [
          {
            name: "authenticated",
            testMatch: /authenticated/,
            use: { baseURL: "http://localhost:3132" },
          },
        ]
      : []),
  ],
  webServer: [
    {
      command: "bun run preview --port 4173",
      url: "http://localhost:4173",
      reuseExistingServer: !process.env.CI,
    },
    ...(hasCreds
      ? [
          {
            command: `VITE_DEV_PROXY_TARGET=${E2E_BACKEND} bun run dev --port 3132`,
            url: "http://localhost:3132",
            reuseExistingServer: !process.env.CI,
          },
        ]
      : []),
  ],
});
```

- [x] **Step 2: Write `e2e/authenticated-config.spec.ts`**

```ts
import { expect, test } from "@playwright/test";

/**
 * Authenticated config smoke — ต้องตั้ง E2E_EMAIL / E2E_PASSWORD
 * (และ backend ที่ E2E_BACKEND, default http://localhost:4000)
 */
test("login and browse config modules", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox").first().fill(process.env.E2E_EMAIL!);
  await page.locator('input[type="password"]').fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });

  // Dialog-based module list renders (DataGrid มี search + table)
  await page.goto("/config/unit");
  await expect(page.getByRole("table")).toBeVisible({ timeout: 10_000 });

  // Page-based module list + new form
  await page.goto("/config/department");
  await expect(page.getByRole("table")).toBeVisible({ timeout: 10_000 });
  await page.goto("/config/department/new");
  await expect(page.locator("form")).toBeVisible({ timeout: 10_000 });

  // Landing renders module cards (ไม่ใช่ 404)
  await page.goto("/config");
  await expect(page.getByText(/404|not found/i)).toHaveCount(0);
});
```

(Adjust the table/form selectors to the real DOM if DataGrid doesn't render a native `table` role — inspect with the probe from Task 3 and keep assertion intent: real list UI visible, not 404/blank.)

- [x] **Step 3: Run both projects**

```bash
bun run build && bunx playwright test                            # static only — must pass with NO creds
E2E_EMAIL=<from controller> E2E_PASSWORD=<from controller> bunx playwright test   # both projects
```

Expected: run 1 → 1 passed (static); run 2 → 2 passed. Report actual output. (Mind the backend's login rate limit — don't loop retries; if 429, wait ~3 minutes.)

- [x] **Step 4: Commit**

```bash
git add playwright.config.ts e2e/
git commit -m "test: add env-gated authenticated config e2e"
```

---

### Task 7: Docs + final verification

**Files:**
- Modify: `CLAUDE.md`

- [x] **Step 1: Update CLAUDE.md**

In the "Known Phase 0 open items" section: retitle to `## Known open items`, and update content:
- exchange-rate item becomes: `- Exchange-rate live-rates fetch needs a backend endpoint (GET /api/exchange-rate?base=XXX — same shape as the old Next route, which held the provider API key server-side). CRUD works; the fetch action degrades with an error toast until then.`
- Remove the line about `/api/time` only if untrue — it is still stubbed; keep it.

Append to the "Migrating a module from the source app" recipe a step referencing the page codemod:

```markdown
2.5 Run `scripts/codemods/nextpage-to-route.sh routes/<path>/**/page.tsx` (strips Next
    metadata, appends the `Component` export). `[id]` pages need hand-conversion to
    `useParams` — see `routes/config/department/[id]/page.tsx` as the reference.
```

Also add under Commands: `E2E_EMAIL=.. E2E_PASSWORD=.. bunx playwright test   # authenticated e2e (needs local backend :4000)`

- [x] **Step 2: Final verification — run everything**

```bash
bun run lint && bun run test:run && bun run build && bunx playwright test
```

Expected: all green (static e2e only without creds). Report each summary line honestly.

- [x] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: record Phase 1 config migration and module recipe updates"
```

---

## Acceptance checklist (from spec §7)

1. 16 routes reachable under the shell (`/config` + 15 modules incl. department/location sub-routes) — Tasks 3-5 probes.
2. CRUD round-trip vs local backend for unit (dialog) + department (page-based) — covered by probes/e2e; full create/edit/delete round-trip is exercised manually by the user (UI identical to source app).
3. No `next/*`, no `process.*` (lint-enforced), all gates green — every task's gate step.
4. Exchange-rate degradation documented + backend request recorded — Task 7.
