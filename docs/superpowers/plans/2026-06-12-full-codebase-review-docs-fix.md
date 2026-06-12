# Full Codebase Review → Docs → Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline). This plan orchestrates Workflow-tool runs, which must be invoked from the main session — subagent-driven-development does not apply. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Review the entire codebase (~168k LOC) with a multi-agent workflow, produce a review report + architecture doc + 13 module docs, and fix confirmed bugs + quick wins on a branch delivered as a PR.

**Architecture:** Three sequential phases. Phase 1 is a Workflow run: 17 zone reviewers fan out, every medium+ finding is adversarially verified by 3 skeptic lenses (majority survives). Phase 2 is a second Workflow run writing docs with Phase 1 results as context. Phase 3 fixes verified findings on a branch with tsc/test/lint gates.

**Tech Stack:** Claude Code Workflow tool (pipeline + parallel + structured output schemas), bun/vitest/eslint/tsc gates, git branch + PR via `gh`.

**Spec:** `docs/superpowers/specs/2026-06-12-full-codebase-review-docs-fix-design.md`

---

## Task 1: Phase 1 review workflow

**Files:**
- No repo files modified. Workflow script passed inline; persisted script path + run results land in the session dir. Raw results saved to `/tmp/review-phase1-results.json` afterwards.

- [ ] **Step 1: Invoke the Workflow tool with the script below**

```javascript
export const meta = {
  name: 'full-codebase-review',
  description: 'Review 17 zones, adversarially verify medium+ findings',
  phases: [
    { title: 'Find', detail: 'one reviewer agent per zone' },
    { title: 'Verify', detail: '3 skeptic lenses per medium+ finding' },
  ],
}

const FINDINGS_SCHEMA = {
  type: 'object', required: ['findings'], additionalProperties: false,
  properties: { findings: { type: 'array', items: {
    type: 'object', additionalProperties: false,
    required: ['file', 'line', 'severity', 'confidence', 'category', 'description', 'suggested_fix', 'effort'],
    properties: {
      file: { type: 'string' }, line: { type: 'number' },
      severity: { enum: ['critical', 'high', 'medium', 'low'] },
      confidence: { type: 'number' },
      category: { enum: ['correctness', 'security', 'quality', 'perf'] },
      description: { type: 'string' }, suggested_fix: { type: 'string' },
      effort: { enum: ['quick-win', 'medium', 'large'] },
    } } } },
}

const VERDICT_SCHEMA = {
  type: 'object', required: ['refuted', 'reason'], additionalProperties: false,
  properties: { refuted: { type: 'boolean' }, reason: { type: 'string' } },
}

const ZONES = [
  { key: 'infra', paths: 'lib/ (all of it: auth/, compat/, http-client.ts, ...), providers/ if present, main.tsx, index.html, public/config.json' },
  { key: 'components-ui', paths: 'components/ui/' },
  { key: 'components-app', paths: 'components/ EXCLUDING components/ui/' },
  { key: 'hooks', paths: 'hooks/' },
  { key: 'types-utils', paths: 'types/, utils/, constants/ and dtos/ if present' },
  { key: 'routes-config', paths: 'routes/config/' },
  { key: 'routes-procurement-a', paths: 'routes/procurement/ — ONLY the purchase-request and purchase-order subtrees' },
  { key: 'routes-procurement-b', paths: 'routes/procurement/ — EVERYTHING EXCEPT purchase-request and purchase-order subtrees' },
  { key: 'routes-inventory', paths: 'routes/inventory-management/' },
  { key: 'routes-system-admin', paths: 'routes/system-admin/' },
  { key: 'routes-vendor', paths: 'routes/vendor-management/' },
  { key: 'routes-operation-plan', paths: 'routes/operation-plan/' },
  { key: 'routes-store-operation', paths: 'routes/store-operation/' },
  { key: 'routes-product', paths: 'routes/product-management/' },
  { key: 'routes-dashboard', paths: 'routes/dashboard/, routes/profile/, routes/notifications/' },
  { key: 'routes-report', paths: 'routes/report/, routes/external/, routes/router.tsx, routes/login/, routes/not-found/, routes/__tests__/' },
  { key: 'config-build', paths: 'eslint config, tsconfig*.json, vite.config.ts, package.json scripts, scripts/ (incl. codemods + deploy), Dockerfile / docker assets' },
]

const reviewPrompt = (z) => `You are reviewing a zone of a Vite + React Router 7 SPA
(ported from a Next.js app via codemods). Repo root: the current working directory.

ZONE: ${z.key} — read these paths thoroughly: ${z.paths}

Report findings in three dimensions: correctness bugs, security, quality/perf.
Migration-specific risk classes to actively hunt for:
- stale Next.js idioms that survived codemods (next/* imports, metadata exports, 'use client' leftovers that break behavior)
- broken [id]-page conversions: useParams misuse, wrong param names vs routes/router.tsx registration
- broken next/dynamic → lazy()+Suspense conversions
- hardcoded backend URLs (must come from runtime config public/config.json)
- auth violations: access token persisted anywhere (must live in memory via lib/auth/token-store.ts; only the refresh token may touch localStorage)
Also ordinary review: broken logic, unhandled error paths, race conditions, dead code,
incorrect hook dependencies, i18n keys used but missing from messages/{en,th}.json.

Rules:
- Only report what you actually verified by reading the code. No speculation.
- confidence: your honest 0-1 probability the finding is real.
- effort: quick-win = small local change, low regression risk; large = refactor.
- severity low = style/minor quality; medium+ = affects behavior, security, or maintenance significantly.
Return ONLY the structured findings.`

const skepticPrompt = (f, lens) => `A code reviewer claims this finding in a Vite+React SPA.
Your job: try to REFUTE it through the ${lens} lens. Read ${f.file} around line ${f.line}
and any code needed to decide. Finding: [${f.severity}/${f.category}] ${f.description}
Suggested fix: ${f.suggested_fix}
${lens === 'reproduce' ? 'Lens: would this actually manifest at runtime? Trace the real code path.' : ''}
${lens === 'correctness' ? 'Lens: is the claim technically correct about what the code does?' : ''}
${lens === 'security' ? 'Lens: is the claimed impact real, or theoretical/unreachable?' : ''}
If uncertain, default to refuted=true. Return refuted + one-sentence reason.`

const results = await pipeline(
  ZONES,
  (z) => agent(reviewPrompt(z), { label: `find:${z.key}`, phase: 'Find', schema: FINDINGS_SCHEMA })
    .then((r) => ({ zone: z.key, status: r ? 'reviewed' : 'NOT REVIEWED', findings: r ? r.findings : [] })),
  async (zr) => {
    if (zr.status !== 'reviewed') return zr
    const needsVerify = zr.findings.filter((f) => f.severity !== 'low')
    const low = zr.findings.filter((f) => f.severity === 'low')
    const verified = await parallel(needsVerify.map((f) => () =>
      parallel(['correctness', 'security', 'reproduce'].map((lens) => () =>
        agent(skepticPrompt(f, lens), { label: `verify:${zr.zone}:${f.file.split('/').pop()}`, phase: 'Verify', schema: VERDICT_SCHEMA })))
        .then((votes) => {
          const valid = votes.filter(Boolean)
          const surviving = valid.filter((v) => !v.refuted).length
          return { ...f, votes: valid.map((v) => ({ refuted: v.refuted, reason: v.reason })), confirmed: surviving >= 2 }
        })
    ))
    return { ...zr, confirmed: verified.filter(Boolean).filter((f) => f.confirmed),
             rejected: verified.filter(Boolean).filter((f) => !f.confirmed), low }
  }
)

const flat = results.filter(Boolean)
log(`zones reviewed: ${flat.filter((z) => z.status === 'reviewed').length}/17; confirmed findings: ${flat.flatMap((z) => z.confirmed || []).length}`)
return flat
```

- [ ] **Step 2: Save the returned JSON to `/tmp/review-phase1-results.json`** (Write tool, verbatim workflow return value)

- [ ] **Step 3: Sanity-check coverage**

Confirm all 17 zones present; any `NOT REVIEWED` zone gets one retry via a fresh single-zone Workflow/Agent call before being recorded as NOT REVIEWED.

## Task 2: Review report

**Files:**
- Create: `docs/code-review/2026-06-12-full-codebase-review.md`

- [ ] **Step 1: Write the report from `/tmp/review-phase1-results.json`**

Structure (English):

```markdown
# Full Codebase Review — 2026-06-12
## Summary        <!-- counts by severity/category/zone; coverage table 17 zones -->
## Confirmed findings   <!-- table: # | zone | file:line | sev | category | effort | description | status -->
## Quick wins     <!-- the effort=quick-win subset -->
## Backlog        <!-- effort=large + medium that won't be fixed now -->
## Rejected by verification  <!-- finding + the refuting reasons, for the record -->
## Low-severity notes
## Not reviewed   <!-- zones, if any, with reason -->
```

Every confirmed finding starts with `status: pending`; Task 6 updates statuses to `fixed` / `backlog` / `wont-fix`.

- [ ] **Step 2: Commit**

```bash
git add docs/code-review/2026-06-12-full-codebase-review.md
git commit -m "docs: full codebase review findings report"
```

## Task 3: Phase 2 docs workflow

**Files:**
- Create: `docs/architecture.md`
- Create: `docs/modules/<section>.md` × 13 — sections: `config`, `procurement`, `inventory-management`, `system-admin`, `vendor-management`, `operation-plan`, `store-operation`, `product-management`, `report`, `dashboard`, `profile`, `notifications`, `external`

- [ ] **Step 1: Invoke the Workflow tool with the script below**

```javascript
export const meta = {
  name: 'codebase-docs',
  description: 'Write architecture doc + 13 module docs',
  phases: [{ title: 'Docs', detail: '14 writer agents' }],
}

const SECTIONS = ['config', 'procurement', 'inventory-management', 'system-admin',
  'vendor-management', 'operation-plan', 'store-operation', 'product-management',
  'report', 'dashboard', 'profile', 'notifications', 'external']

const archPrompt = `Write docs/architecture.md (English) for this Vite + React Router 7 SPA.
Read CLAUDE.md, main.tsx, lib/ (http-client.ts, auth/), routes/router.tsx,
components/i18n-provider.tsx, lib/compat/, vite.config.ts, public/config.json,
docs/deploy.md, then document: boot flow (loadRuntimeConfig → refreshTokens → render),
auth/token design (access in memory, refresh in localStorage, RequireAuth), http-client
/api/proxy rewrite + headers, routing structure & module registration pattern, i18n,
Next-compat layer, build & deploy targets (S3/GCS/Docker). Describe what IS, with real
file paths. Use the Write tool to create the file. Return 'done' plus any inaccuracies
you noticed in existing docs.`

const modPrompt = (s) => `Write docs/modules/${s}.md (English) for the routes/${s}/ section
of this Vite + React Router 7 SPA. Read routes/${s}/ and its registration in
routes/router.tsx. Document: purpose; route table (path → page file); key components;
hooks + API endpoints used (trace to lib/api endpoints or hooks/); notable patterns or
deviations from the reference module (routes/config/). Keep it factual and concise
(~100-200 lines). Use the Write tool to create the file. Return 'done'.`

const results = await parallel([
  () => agent(archPrompt, { label: 'doc:architecture', phase: 'Docs' }),
  ...SECTIONS.map((s) => () => agent(modPrompt(s), { label: `doc:${s}`, phase: 'Docs' })),
])
log(`docs written: ${results.filter(Boolean).length}/14`)
return results
```

- [ ] **Step 2: Spot-check the 14 files exist and skim 2-3 for accuracy**

```bash
ls docs/architecture.md docs/modules/   # expect 13 files in docs/modules/
```

- [ ] **Step 3: Commit**

```bash
git add docs/architecture.md docs/modules/
git commit -m "docs: architecture overview and per-module documentation"
```

## Task 4: Fix branch + triage

**Files:**
- No source changes yet. Branch created.

- [ ] **Step 1: Create the branch**

```bash
git checkout -b review/full-codebase-fixes
```

- [ ] **Step 2: Triage confirmed findings into fix batches**

From `/tmp/review-phase1-results.json`: fix list = `confirmed` where `effort` ∈ {quick-win, medium} and category ∈ {correctness, security} **plus** all quick-wins of any category. `effort: large` → backlog. Group by zone; zones touch disjoint files, so batches can run as parallel agents in one working tree.

For each routes/ finding, the fixer first checks `../carmen-inventory-frontend` for the same code; if identical there, tag `inherited-from-source` in the report and still fix it here when cheap and local (per spec).

## Task 5: Execute fixes per zone batch

**Files:**
- Modify: per findings (paths from Phase 1 results)
- Test: add regression tests beside existing test files where the bug is in testable logic (hooks/lib); deep-UI rendering bugs may skip tests

- [ ] **Step 1: Dispatch one fixer agent per zone batch** (parallel across disjoint zones, max ~5 at a time)

Each fixer prompt includes: the zone's confirmed findings verbatim (file, line, description, suggested_fix), the inherited-from-source check instruction, and the rules — fix exactly the findings, no drive-by refactors; for testable logic write the regression test first, watch it fail, then fix; report per finding: fixed / could-not-fix + reason.

- [ ] **Step 2: Run the gates**

```bash
bunx tsc --noEmit && bun test:run && bun run lint
```

Expected: tsc silent; all tests pass (≥288 — more if regression tests were added); lint 0 errors. Any failure: fix forward if trivial, otherwise revert that finding's change (`git checkout -- <files>`) and downgrade it to backlog with a note.

- [ ] **Step 3: Commit per zone batch**

```bash
git add <zone files>
git commit -m "fix(<zone>): <summary of findings fixed>"
```

## Task 6: Update report, PR, close out

**Files:**
- Modify: `docs/code-review/2026-06-12-full-codebase-review.md` (statuses)

- [ ] **Step 1: Update every finding's status** to `fixed` / `backlog` / `wont-fix` (+ `inherited-from-source` tags); commit on the branch

```bash
git add docs/code-review/2026-06-12-full-codebase-review.md
git commit -m "docs: update review report with fix statuses"
```

- [ ] **Step 2: Final full gate run** (same commands as Task 5 Step 2) — must be green

- [ ] **Step 3: Push and open PR**

```bash
git push -u origin review/full-codebase-fixes
gh pr create --title "fix: full codebase review fixes" --body "<summary table of findings fixed, link to report>

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

- [ ] **Step 4: Report to user (Thai):** counts found/confirmed/fixed/backlog, PR link, doc locations.

---

## Notes for the executor

- Phases are strictly sequential: docs and fixes both consume Phase 1 results.
- Tasks 2–3 commit docs on `main` (matches existing repo practice for docs); Tasks 4–6 happen on the branch. If the permission classifier blocks a main commit, pause and ask the user.
- Workflow agent deaths: zone → NOT REVIEWED (retry once); doc writer → re-run that one agent; fixer → finding stays `pending`, downgrade to backlog with note if retry fails.
- Do not start Task 3 before Task 2's report exists — the report is the source of truth the fix phase annotates.
