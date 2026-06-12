# app/ → routes/ Leaf-File Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `routes/` the single home for five leaf files currently duplicated under `app/(root)/`, delete `app/` entirely, and remove the leftover references in `eslint.config.mjs` and `CLAUDE.md`.

**Architecture:** Pure file/path consolidation with zero behavior change. The five `app/` files are byte-identical to their `routes/` copies (verified with `diff` during design), so the work is: repoint the four remaining `@/app/(root)/…` imports to `@/routes/…`, delete `app/`, and clean up config/docs. The existing test suite + tsc + lint + build are the safety net — no new tests are needed because no behavior changes.

**Tech Stack:** Vite + React Router SPA, TypeScript, Bun, ESLint, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-12-app-dir-consolidation-design.md`

---

### Task 1: Repoint the four `@/app/(root)/…` imports to `@/routes/…`

**Files:**
- Modify: `components/navbar/user-profile.tsx:29`
- Modify: `hooks/use-workflow.ts:13`
- Modify: `hooks/use-wastage-report.ts:8`
- Modify: `hooks/use-stock-replenishment.ts:5`

No new tests — this is a path-only refactor; the existing suite covers behavior. Each target file already exists under `routes/` with identical content.

- [ ] **Step 1: Edit `components/navbar/user-profile.tsx` line 29**

Replace:

```tsx
import ChangePasswordDialog from "@/app/(root)/profile/_components/change-password-dialog";
```

with:

```tsx
import ChangePasswordDialog from "@/routes/profile/_components/change-password-dialog";
```

- [ ] **Step 2: Edit `hooks/use-workflow.ts` line 13**

Replace:

```ts
import type { WorkflowCreateModel } from "@/app/(root)/system-admin/workflow/_components/wf-form-schema";
```

with:

```ts
import type { WorkflowCreateModel } from "@/routes/system-admin/workflow/_components/wf-form-schema";
```

- [ ] **Step 3: Edit `hooks/use-wastage-report.ts` line 8**

Replace:

```ts
import { wrMockData } from "@/app/(root)/store-operation/wastage-reporting/_components/wr-mock-data";
```

with:

```ts
import { wrMockData } from "@/routes/store-operation/wastage-reporting/_components/wr-mock-data";
```

- [ ] **Step 4: Edit `hooks/use-stock-replenishment.ts` line 5**

Replace:

```ts
import { mockData } from "@/app/(root)/store-operation/stock-replenishment/mock-data";
```

with:

```ts
import { mockData } from "@/routes/store-operation/stock-replenishment/mock-data";
```

- [ ] **Step 5: Verify no `@/app` imports remain anywhere**

Run:

```bash
grep -rn "@/app" --include='*.ts' --include='*.tsx' components hooks lib routes utils constant types i18n main.tsx
```

Expected: no output (exit code 1).

- [ ] **Step 6: Type-check**

Run: `bunx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 7: Commit**

```bash
git add components/navbar/user-profile.tsx hooks/use-workflow.ts hooks/use-wastage-report.ts hooks/use-stock-replenishment.ts
git commit -m "refactor: repoint app/(root) imports to routes/ copies"
```

---

### Task 2: Delete `app/` and remove its ESLint glob

**Files:**
- Delete: `app/` (entire directory — exactly these 5 files:
  `app/(root)/profile/_components/change-password-dialog.tsx`,
  `app/(root)/profile/_components/profile-form-schema.ts`,
  `app/(root)/store-operation/stock-replenishment/mock-data.ts`,
  `app/(root)/store-operation/wastage-reporting/_components/wr-mock-data.ts`,
  `app/(root)/system-admin/workflow/_components/wf-form-schema.ts`)
- Modify: `eslint.config.mjs:64`

- [ ] **Step 1: Confirm `app/` still contains only the five expected files**

Run: `find app -type f | sort`
Expected output, exactly:

```
app/(root)/profile/_components/change-password-dialog.tsx
app/(root)/profile/_components/profile-form-schema.ts
app/(root)/store-operation/stock-replenishment/mock-data.ts
app/(root)/store-operation/wastage-reporting/_components/wr-mock-data.ts
app/(root)/system-admin/workflow/_components/wf-form-schema.ts
```

If anything else appears, STOP and report — the design assumption is stale.

- [ ] **Step 2: Delete the directory**

Run: `git rm -r app`

- [ ] **Step 3: Remove the `app/**` glob from `eslint.config.mjs`**

In the `files:` array (around line 55–66), delete this one line:

```js
      "app/**/*.{ts,tsx}",
```

The array goes from:

```js
    files: [
      "components/**/*.{ts,tsx}",
      "hooks/**/*.{ts,tsx}",
      "lib/**/*.{ts,tsx}",
      "routes/**/*.{ts,tsx}",
      "utils/**/*.{ts,tsx}",
      "constant/**/*.{ts,tsx}",
      "types/**/*.{ts,tsx}",
      "i18n/**/*.{ts,tsx}",
      "app/**/*.{ts,tsx}",
      "main.tsx",
    ],
```

to:

```js
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
```

- [ ] **Step 4: Type-check and lint**

Run: `bunx tsc --noEmit && bun run lint`
Expected: tsc silent; lint reports 0 errors.

- [ ] **Step 5: Commit**

```bash
git add -A app eslint.config.mjs
git commit -m "refactor: delete app/ — routes/ is the single home for migrated leaves"
```

---

### Task 3: Update the CLAUDE.md known-open-items bullet

**Files:**
- Modify: `CLAUDE.md:77-84`

- [ ] **Step 1: Replace the duplication bullet**

In the "Known open items" list, replace this entire bullet (lines 77–84):

```markdown
- A few Phase-0 pre-copied leaf files still live under `app/` (workflow/wastage/stock-
  replenishment schemas + `profile/_components/{change-password-dialog,profile-form-schema}`)
  — imported by `components/navbar/user-profile.tsx` and a couple of hooks. The migrated
  `routes/profile/_components/` now also contains its own copies of those two profile
  leaves (the route tree imports the `routes/` copy; the navbar still imports the `app/`
  copy). The duplication is intentional and harmless — keeping `app/` untouched preserves
  the `git status app/` clean invariant; consolidate onto the `routes/` copies in a later
  cleanup if desired.
```

with:

```markdown
- `app/` is gone (2026-06-12 consolidation): the five Phase-0 pre-copied leaves
  (workflow/wastage/stock-replenishment schemas + the two profile leaves) now live only
  under `routes/`; `components/navbar/user-profile.tsx` and the hooks import the
  `routes/` copies directly.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: record app/ removal in CLAUDE.md"
```

---

### Task 4: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full gate from the spec**

Run:

```bash
bunx tsc --noEmit && bun test:run && bun run lint && bun run build
```

Expected: tsc silent; all Vitest tests pass (288 at time of writing); lint 0 errors; Vite build succeeds (the ~800kB router-chunk size advisory is pre-existing and acceptable).

- [ ] **Step 2: Final guard greps**

Run:

```bash
ls app 2>&1; grep -rn "@/app" --include='*.ts' --include='*.tsx' components hooks lib routes utils constant types i18n main.tsx; grep -n 'app/\*\*' eslint.config.mjs
```

Expected: `ls: app: No such file or directory`; both greps print nothing.

- [ ] **Step 3: Confirm clean tree**

Run: `git status --short`
Expected: empty (all work committed in Tasks 1–3).
