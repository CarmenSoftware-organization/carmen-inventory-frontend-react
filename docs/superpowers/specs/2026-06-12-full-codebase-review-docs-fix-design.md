# Full Codebase Review → Docs → Fix — Design

**Date:** 2026-06-12
**Status:** Approved
**Scope:** Entire repo (~168k LOC, ~1,150 TS/TSX files)

## Goal

Run a deep multi-agent code review over the whole codebase, produce three sets of
documentation, and fix the confirmed real bugs plus low-risk quick wins. Large
refactors are recorded as backlog items, not executed.

## Background

The repo is a freshly completed Vite + React Router SPA port of the Next.js app at
`../carmen-inventory-frontend/` (125 lazy routes, 288 tests green). Most route code
was migrated via codemods, so systematic conversion mistakes (stale Next.js idioms,
broken `useParams` conversions, lazy/Suspense regressions) are a specific risk class
on top of ordinary bugs.

## Approach (chosen)

Full **Workflow orchestration** (multi-agent fan-out with adversarial verification).
The user explicitly opted into workflow-scale token usage. Alternatives considered
and rejected: zone-by-zone Agent-tool review with verification only for
critical/high findings (cheaper, less certain), and manual sequential review
(too slow for 168k LOC).

## Phase 1 — Review

### Zones (17)

| Zone | Paths | ~LOC |
|---|---|---|
| infra | `lib/` (auth, http-client, compat), `providers/`, `main.tsx`, vite config | 4.3k |
| components-ui | `components/ui/` | ~half of 29.6k |
| components-app | `components/` excluding `ui/` | ~half of 29.6k |
| hooks | `hooks/` | 14.5k |
| types-utils | `types/`, `utils/`, `constants/`, `dtos/` | 4.4k |
| routes-config | `routes/config/` | 8.3k |
| routes-procurement-a | `routes/procurement/` (PR + PO halves) | ~14k |
| routes-procurement-b | `routes/procurement/` (GRN/CN/SR + rest) | ~14k |
| routes-inventory | `routes/inventory-management/` | 12.1k |
| routes-system-admin | `routes/system-admin/` | 18.1k |
| routes-vendor | `routes/vendor-management/` | 11.9k |
| routes-operation-plan | `routes/operation-plan/` | 9.9k |
| routes-store-operation | `routes/store-operation/` | 7.2k |
| routes-product | `routes/product-management/` | 6.3k |
| routes-dashboard | `routes/dashboard/`, `routes/profile/`, `routes/notifications/` | 8k |
| routes-report | `routes/report/`, `routes/external/`, router.tsx + small routes | 4.8k |
| config-build | eslint config, tsconfig, vite.config, scripts/, Dockerfile, deploy scripts | small |

### Find

One reviewer agent per zone reads the code (not a diff) and reports findings across
three dimensions: **correctness bugs**, **security**, **quality/perf**. Structured
output schema per finding: `file`, `line`, `severity` (critical/high/medium/low),
`confidence` (0–1), `category`, `description`, `suggested_fix`, `effort`
(quick-win / medium / large).

Reviewer prompts call out migration-specific risk classes: stale Next.js idioms that
survived the codemods, `[id]` → `useParams` conversion errors, `next/dynamic` →
`lazy()` conversion errors, hardcoded backend URLs (must use runtime config),
direct `next*` imports, token handling that violates the auth design (access token
must stay in memory only).

### Verify (adversarial)

Every critical/high/medium finding goes to **3 skeptic agents** with distinct
lenses — correctness, security, does-it-actually-reproduce — each prompted to
refute the finding (default to refuted when uncertain). A finding survives with
≥2 of 3 non-refuted votes. Low-severity findings skip verification and go straight
to the quality/backlog list.

Verified findings are bucketed: **confirmed bugs**, **quick wins**, **backlog**
(large refactors, by `effort`).

### Coverage guarantees

- An agent that dies or is skipped marks its zone "NOT REVIEWED" in the report —
  never silently dropped.
- Findings that also exist verbatim in the source Next.js app are tagged
  `inherited-from-source`; they are fixed only when the fix is cheap and local.

## Phase 2 — Docs

1. `docs/code-review/2026-06-12-full-codebase-review.md` — all verified findings
   with severity, zone, status (`fixed` / `backlog` / `wont-fix`), plus the
   NOT-REVIEWED list if any. Updated after Phase 3 with final statuses.
2. `docs/architecture.md` — boot flow (`loadRuntimeConfig` → `refreshTokens` →
   render), auth/token design, http-client proxy rewrite, routing structure,
   i18n, Next-compat layer, build & deploy targets.
3. `docs/modules/<section>.md` × 13 — per routes-section: pages/routes, hooks and
   API endpoints used, notable patterns or deviations.

Docs are written by agents that read the relevant zones; Phase 1 structured
results are passed in as context. English, like existing docs.

## Phase 3 — Fix

- Work on a new branch (e.g. `review/full-codebase-fixes`); deliver as PR(s) to
  `main`. No direct-to-main commits.
- Fix scope: confirmed bugs + quick wins only. Anything `effort: large` or
  behavior-changing beyond the bug itself goes to backlog.
- Fixes grouped by zone; each group runs through fixer agents on the branch.
- Completion gates (all must pass before the PR is opened):
  `bunx tsc --noEmit` · `bun test:run` (288 tests) · `bun run lint`.
- Bug fixes should include a regression test when the bug is testable at
  reasonable cost (hooks/lib logic yes; deep UI rendering optional).

## Error handling

- Workflow agent failures → zone marked NOT REVIEWED (Phase 1) or finding left as
  `backlog` with a note (Phase 3); the run continues.
- If verification kills all findings in a zone, the zone is still recorded as
  reviewed-clean.
- If a fix breaks the gates and isn't quickly resolvable, revert that fix and
  downgrade the finding to backlog with a note.

## Out of scope

- Large refactors / architectural changes (backlog only).
- The e2e repo (`../carmen-inventory-frontend-e2e`) and the source Next.js app.
- Backend issues (already reported separately in
  `docs/2026-06-12-report-to-backend-team.md`).
- Bundle-size work (router chunk ~800kB advisory) unless a quick win surfaces.

## Success criteria

- Every zone reviewed (or explicitly marked NOT REVIEWED).
- The three doc sets exist and are accurate.
- All confirmed bugs and quick wins fixed on a branch with green gates, delivered
  as PR(s); remainder captured as backlog in the review report.
