# Phase 2 — Procurement Modules Migration Implementation Plan

> **Status: ✅ completed** — merged via PR #2.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the entire procurement section (157 files, ~28.6k LOC: landing, PRT, CN, GRN, PO, PR, approval) into the SPA using the Phase 1 recipe, ending with an authenticated procurement e2e.

**Architecture:** Per module: copy verbatim from `$SRC/app/(root)/procurement/` → `next-to-vite.sh` → `nextpage-to-route.sh` on list/new pages → hand-convert `[id]/page.tsx` to `useParams` → convert `next/dynamic` stragglers to `lazy()+Suspense` → register lazy children under a `procurement` parent route with the existing `RouteErrorBoundaryAdapter`. Batches ordered smallest→largest.

**Tech Stack:** Vite 7, React Router 7 (lazy data routes), use-intl, TanStack Query, Playwright (env-gated authenticated project, local gateway :4000).

**Spec:** `docs/superpowers/specs/2026-06-11-phase2-procurement-design.md`
**Source:** `SRC="../carmen-inventory-frontend"`; procurement at `"$SRC/app/(root)/procurement"` (note parens in path).
**Branch:** `phase2-procurement` (from merged main). Bun runtime. Credentials env-only (E2E_EMAIL/E2E_PASSWORD) — NEVER in committed files. Backend login is rate-limited (429/~180s per email): each probe logs in ONCE; no retry loops.

**Verified source facts (read during planning):**
- All 18 `page.tsx` files use the standard metadata boilerplate (handled by `nextpage-to-route.sh`).
- All 5 `[id]/page.tsx` are identical in shape: async `params: Promise<{id}>` rendering `Edit<X>Content` from `./_content` — content component names: `EditPurchaseRequestTemplateContent`, `EditCreditNoteContent`, `EditGoodsReceiveNoteContent`, `EditPurchaseOrderContent`, `EditPurchaseRequestContent`.
- Landing = `page.tsx` + `procurement-dashboard.tsx` sibling (same shape as config).
- 10 files use `next/dynamic` → convert per the reference `routes/config/currency/_components/currency-component.tsx`.
- No `searchParams` page props, no other Next constructs.

**Hand-conversion template for every `[id]/page.tsx`** (replace `<X>`; reference: `routes/config/department/[id]/page.tsx`):

```tsx
import { useParams } from "react-router";
import { Edit<X>Content } from "./_content";

/** หน้าแก้ไข <X> — id มาจาก route param (เดิม: Next params Promise) */
export default function Edit<X>Page() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null; // route จับคู่ :id เสมอ — กัน type ระดับ runtime
  return <Edit<X>Content id={id} />;
}

export const Component = Edit<X>Page;
```

**Probe harness used by Tasks 1-5** (run with `E2E_EMAIL=<from controller> E2E_PASSWORD=<from controller>`; paths vary per task):

```bash
(VITE_DEV_PROXY_TARGET=http://localhost:4000 bun run dev --port 3131 > /tmp/dev-p2.log 2>&1 &) && sleep 3
cat > /tmp/p2-probe.mjs <<'EOF'
import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0,100)); });
await page.goto("http://localhost:3131/", { waitUntil: "networkidle" });
await page.getByRole("textbox").first().fill(process.env.E2E_EMAIL);
await page.locator('input[type="password"]').fill(process.env.E2E_PASSWORD);
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL(/dashboard/, { timeout: 15000 });
for (const path of (process.env.PROBE_PATHS ?? "").split(",")) {
  await page.goto(`http://localhost:3131${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const text = await page.evaluate(() => document.body.innerText.slice(0, 200));
  console.log(path, "→", JSON.stringify(text));
}
// คลิกปุ่มแถวแรกของ list สุดท้าย → detail page (:id) — cell ใช้ <button> ไม่ใช่ <a>
const btn = page.locator("table button").first();
if (await btn.count()) {
  await btn.click(); await page.waitForTimeout(3000);
  console.log("DETAIL_URL:", page.url());
  console.log("DETAIL_BODY:", JSON.stringify(await page.evaluate(() => document.body.innerText.slice(0, 200))));
} else { console.log("NO_ROWS (empty list) — report as-is"); }
console.log("CONSOLE_ERRORS:", errors.length ? errors.slice(0,5).join(" || ") : "(none)");
await browser.close();
EOF
PROBE_PATHS="<task-specific>" bun /tmp/p2-probe.mjs
pkill -f "vite.*3131"; rm /tmp/p2-probe.mjs
```

**Every commit:** `git diff --cached | grep -i zebra` must be EMPTY first.

---

### Task 1: Batch A — procurement landing + purchase-request-template

**Files:**
- Create: `routes/procurement/page.tsx`, `routes/procurement/procurement-dashboard.tsx`, `routes/procurement/purchase-request-template/**`
- Modify: `routes/router.tsx`

- [x] **Step 1: Copy:**

```bash
SRC=/Users/samutpra/GitHub/carmensoftware-organize/carmen-inventory-frontend
mkdir -p routes/procurement
cp "$SRC/app/(root)/procurement/page.tsx" routes/procurement/page.tsx
cp "$SRC/app/(root)/procurement/procurement-dashboard.tsx" routes/procurement/procurement-dashboard.tsx
cp -R "$SRC/app/(root)/procurement/purchase-request-template" routes/procurement/purchase-request-template
```

(Do NOT copy `error.tsx` if present — the adapter replaces it. Check whether `$SRC/app/(root)/procurement/error.tsx` exists; skip it.)

- [x] **Step 2: Codemods:**

```bash
scripts/codemods/next-to-vite.sh routes
scripts/codemods/nextpage-to-route.sh routes/procurement/page.tsx \
  routes/procurement/purchase-request-template/page.tsx \
  routes/procurement/purchase-request-template/new/page.tsx
```

Expected: no WARN. Fix any `next/dynamic` stragglers the next-to-vite report lists, per the currency-component reference (lazy + Suspense fallback null); document each file.

- [x] **Step 3: Hand-convert** `routes/procurement/purchase-request-template/[id]/page.tsx` — replace ENTIRELY using the template at the top with `<X>` = `PurchaseRequestTemplate`.

- [x] **Step 4: Register routes.** In `routes/router.tsx`, after the closing brace of the `config` route object (same children level), add:

```tsx
          {
            path: "procurement",
            ErrorBoundary: RouteErrorBoundaryAdapter,
            children: [
              { index: true, lazy: () => import("./procurement/page") },
              { path: "purchase-request-template", lazy: () => import("./procurement/purchase-request-template/page") },
              { path: "purchase-request-template/new", lazy: () => import("./procurement/purchase-request-template/new/page") },
              { path: "purchase-request-template/:id", lazy: () => import("./procurement/purchase-request-template/[id]/page") },
              // ── procurement modules ถูกเพิ่มต่อท้ายตรงนี้ใน Batch B-F ──
            ],
          },
```

- [x] **Step 5: Gates:** `bunx tsc --noEmit && bun run lint && bun run test:run && bun run build` — all green. Cross-section import failures (imports of `@/app/(root)/<other-section>` paths): if the target is a self-contained leaf file, copy it to its exact source path and document; otherwise report DONE_WITH_CONCERNS.

- [x] **Step 6: Probe** with `PROBE_PATHS="/procurement,/procurement/purchase-request-template,/procurement/purchase-request-template/new"` using the harness above. Expected: landing dashboard renders; PRT list renders (table or empty-state, not 404/blank); new page renders a form; detail click-through loads a document if rows exist. Report verbatim incl. console errors.

- [x] **Step 7: Commit:** `git add routes/ && git commit -m "feat: migrate procurement landing and purchase-request-template"`

---

### Task 2: Batch B — credit-note

**Files:** Create `routes/procurement/credit-note/**`; modify `routes/router.tsx`.

- [x] **Step 1: Copy:** `cp -R "$SRC/app/(root)/procurement/credit-note" routes/procurement/credit-note`

- [x] **Step 2: Codemods:**

```bash
scripts/codemods/next-to-vite.sh routes
scripts/codemods/nextpage-to-route.sh routes/procurement/credit-note/page.tsx routes/procurement/credit-note/new/page.tsx
```

Fix `next/dynamic` stragglers per reference; document.

- [x] **Step 3: Hand-convert** `routes/procurement/credit-note/[id]/page.tsx` with the template, `<X>` = `CreditNote`.

- [x] **Step 4: Register** (replace the Batch B-F marker, keep marker below):

```tsx
              { path: "credit-note", lazy: () => import("./procurement/credit-note/page") },
              { path: "credit-note/new", lazy: () => import("./procurement/credit-note/new/page") },
              { path: "credit-note/:id", lazy: () => import("./procurement/credit-note/[id]/page") },
```

- [x] **Step 5: Gates:** `bunx tsc --noEmit && bun run lint && bun run test:run && bun run build` — all green (cross-section import rule as Task 1).

- [x] **Step 6: Probe** with `PROBE_PATHS="/procurement/credit-note,/procurement/credit-note/new"`. Report verbatim.

- [x] **Step 7: Commit:** `git add routes/ && git commit -m "feat: migrate credit-note module"`

---

### Task 3: Batch C — goods-receive-note

**Files:** Create `routes/procurement/goods-receive-note/**`; modify `routes/router.tsx`.

- [x] **Step 1: Copy:** `cp -R "$SRC/app/(root)/procurement/goods-receive-note" routes/procurement/goods-receive-note`

- [x] **Step 2: Codemods:**

```bash
scripts/codemods/next-to-vite.sh routes
scripts/codemods/nextpage-to-route.sh routes/procurement/goods-receive-note/page.tsx routes/procurement/goods-receive-note/new/page.tsx
```

Fix `next/dynamic` stragglers per reference; document.

- [x] **Step 3: Hand-convert** `routes/procurement/goods-receive-note/[id]/page.tsx` with the template, `<X>` = `GoodsReceiveNote`.

- [x] **Step 4: Register:**

```tsx
              { path: "goods-receive-note", lazy: () => import("./procurement/goods-receive-note/page") },
              { path: "goods-receive-note/new", lazy: () => import("./procurement/goods-receive-note/new/page") },
              { path: "goods-receive-note/:id", lazy: () => import("./procurement/goods-receive-note/[id]/page") },
```

- [x] **Step 5: Gates:** same four commands, all green.

- [x] **Step 6: Probe** with `PROBE_PATHS="/procurement/goods-receive-note,/procurement/goods-receive-note/new"`. Report verbatim.

- [x] **Step 7: Commit:** `git add routes/ && git commit -m "feat: migrate goods-receive-note module"`

---

### Task 4: Batch D — purchase-order (+ from-price-list)

**Files:** Create `routes/procurement/purchase-order/**`; modify `routes/router.tsx`.

- [x] **Step 1: Copy:** `cp -R "$SRC/app/(root)/procurement/purchase-order" routes/procurement/purchase-order`

- [x] **Step 2: Codemods:**

```bash
scripts/codemods/next-to-vite.sh routes
scripts/codemods/nextpage-to-route.sh routes/procurement/purchase-order/page.tsx \
  routes/procurement/purchase-order/new/page.tsx \
  routes/procurement/purchase-order/from-price-list/page.tsx
```

Fix `next/dynamic` stragglers per reference; document.

- [x] **Step 3: Hand-convert** `routes/procurement/purchase-order/[id]/page.tsx` with the template, `<X>` = `PurchaseOrder`.

- [x] **Step 4: Register:**

```tsx
              { path: "purchase-order", lazy: () => import("./procurement/purchase-order/page") },
              { path: "purchase-order/new", lazy: () => import("./procurement/purchase-order/new/page") },
              { path: "purchase-order/from-price-list", lazy: () => import("./procurement/purchase-order/from-price-list/page") },
              { path: "purchase-order/:id", lazy: () => import("./procurement/purchase-order/[id]/page") },
```

(`from-price-list` MUST be registered before `:id`? React Router ranks static segments above dynamic automatically — order in the array does not matter for matching, but keep this order for readability.)

- [x] **Step 5: Gates:** same four commands, all green.

- [x] **Step 6: Probe** with `PROBE_PATHS="/procurement/purchase-order,/procurement/purchase-order/new,/procurement/purchase-order/from-price-list"`. Report verbatim.

- [x] **Step 7: Commit:** `git add routes/ && git commit -m "feat: migrate purchase-order module"`

---

### Task 5: Batch E — purchase-request

**Files:** Create `routes/procurement/purchase-request/**`; modify `routes/router.tsx`.

- [x] **Step 1: Copy:** `cp -R "$SRC/app/(root)/procurement/purchase-request" routes/procurement/purchase-request`

- [x] **Step 2: Codemods:**

```bash
scripts/codemods/next-to-vite.sh routes
scripts/codemods/nextpage-to-route.sh routes/procurement/purchase-request/page.tsx routes/procurement/purchase-request/new/page.tsx
```

Fix `next/dynamic` stragglers per reference; document.

- [x] **Step 3: Hand-convert** `routes/procurement/purchase-request/[id]/page.tsx` with the template, `<X>` = `PurchaseRequest`.

- [x] **Step 4: Register:**

```tsx
              { path: "purchase-request", lazy: () => import("./procurement/purchase-request/page") },
              { path: "purchase-request/new", lazy: () => import("./procurement/purchase-request/new/page") },
              { path: "purchase-request/:id", lazy: () => import("./procurement/purchase-request/[id]/page") },
```

NOTE: keep these LISTED BEFORE any future `purchase-request-template` conflicts? No conflict — `purchase-request-template` is a distinct static segment; React Router matches exactly. No action needed.

- [x] **Step 5: Gates:** same four commands, all green. PR is the largest module (52 files) — expect possible `app/` leaf-file needs (Phase 0 pre-copied `mock-data.ts` etc. under `app/(root)/...` paths — they already exist; rsync/cp must NOT overwrite them: after copying, run `git status app/` — it must show NO changes. If the module's `_components` import more `@/app/...` leaves that don't exist yet, copy those specific files and document).

- [x] **Step 6: Probe** with `PROBE_PATHS="/procurement/purchase-request,/procurement/purchase-request/new"` — the click-through MUST land on a PR document detail (workflow/approval state visible) if rows exist. Report verbatim.

- [x] **Step 7: Commit:** `git add routes/ app/ && git commit -m "feat: migrate purchase-request module"`

---

### Task 6: Batch F — approval + authenticated procurement e2e + docs

**Files:**
- Create: `routes/procurement/approval/**`, `e2e/authenticated-procurement.spec.ts`
- Modify: `routes/router.tsx`, `CLAUDE.md`

- [x] **Step 1: Copy + codemod approval:**

```bash
cp -R "$SRC/app/(root)/procurement/approval" routes/procurement/approval
scripts/codemods/next-to-vite.sh routes
scripts/codemods/nextpage-to-route.sh routes/procurement/approval/page.tsx
```

- [x] **Step 2: Register** (replacing the Batch B-F marker):

```tsx
              { path: "approval", lazy: () => import("./procurement/approval/page") },
```

- [x] **Step 3: Write `e2e/authenticated-procurement.spec.ts`:**

```ts
import { expect, test } from "@playwright/test";

/**
 * Authenticated procurement smoke — ต้องตั้ง E2E_EMAIL / E2E_PASSWORD
 * Login ครั้งเดียวต่อการรัน (backend rate-limit 429/180s ต่อ email)
 */
test("login and browse procurement modules", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox").first().fill(process.env.E2E_EMAIL!);
  await page.locator('input[type="password"]').fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });

  // Lists render (table มี header เสมอ; data row อาจว่าง — เช็คตารางปรากฏ)
  for (const path of [
    "/procurement/purchase-request-template",
    "/procurement/credit-note",
    "/procurement/goods-receive-note",
    "/procurement/purchase-order",
    "/procurement/purchase-request",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("table").first()).toBeVisible({ timeout: 10_000 });
  }

  // Detail page: คลิกปุ่มแถวแรกของ PR list (cell ใช้ <button>) → :id โหลดเอกสารจริง
  await page.goto("/procurement/purchase-request");
  await expect(page.getByRole("table").first()).toBeVisible({ timeout: 10_000 });
  const firstCellButton = page.locator("table button").first();
  if (await firstCellButton.count()) {
    await firstCellButton.click();
    await expect(page).toHaveURL(/purchase-request\/[\w-]+/, { timeout: 10_000 });
  }

  // Landing + approval ไม่ใช่ 404
  for (const path of ["/procurement", "/procurement/approval"]) {
    await page.goto(path);
    await expect(page.getByText(/404|not found/i)).toHaveCount(0);
  }
});
```

(Adjust selectors to the real DOM if a list renders empty-state without a table — switch that path's assertion to the visible empty-state text while keeping intent: real UI, not 404/blank. Document adjustments.)

- [x] **Step 4: Update CLAUDE.md:** in the Routing bullet, extend: `/config/*` and `/procurement/*` are migrated (routes/config/, routes/procurement/). Add any new open items found during Phase 2 probes to "Known open items".

- [x] **Step 5: Final verification:**

```bash
bun run lint && bun run test:run && bun run build && bunx playwright test
```

(no creds — static only, must pass). Then ONE authenticated run:

```bash
E2E_EMAIL=<from controller> E2E_PASSWORD=<from controller> bunx playwright test
```

Expected: 3 passed (static + authenticated-config + authenticated-procurement). Report all summary lines honestly.

- [x] **Step 6: Commit:** `git add routes/ e2e/ CLAUDE.md && git commit -m "feat: migrate approval module and add procurement e2e"`

---

## Acceptance checklist (spec §4)

1. 18 procurement routes reachable (landing + PRT×3 + CN×3 + GRN×3 + PO×4 + PR×3 + approval) — Tasks 1-6.
2. Sidebar `/procurement/*` links ↔ router entries 100% matched — verified in the phase-final review.
3. Detail pages load real backend data — Task 5/6 click-throughs.
4. All gates green; static e2e green without creds; no credentials in git — every task.
