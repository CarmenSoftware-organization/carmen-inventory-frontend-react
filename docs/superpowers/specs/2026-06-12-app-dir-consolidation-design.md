# app/ → routes/ Leaf-File Consolidation

**Date:** 2026-06-12
**Status:** Approved design, pending implementation

## Background

During the Next.js → Vite migration, five leaf files were pre-copied under `app/(root)/`
in Phase 0 and later copied again into `routes/` when their modules migrated. Both copies
are byte-identical today. The `app/` copies existed only to preserve the
"`git status app/` stays clean" invariant during the migration, which is complete —
the invariant no longer serves a purpose.

## Goal

Make `routes/` the single home for these files, delete `app/` entirely, and remove the
leftover references in config and docs.

## Current state

Five duplicated files (each pair verified byte-identical with `diff`):

| `app/(root)/` copy | canonical `routes/` copy |
|---|---|
| `profile/_components/change-password-dialog.tsx` | `routes/profile/_components/change-password-dialog.tsx` |
| `profile/_components/profile-form-schema.ts` | `routes/profile/_components/profile-form-schema.ts` |
| `store-operation/stock-replenishment/mock-data.ts` | `routes/store-operation/stock-replenishment/mock-data.ts` |
| `store-operation/wastage-reporting/_components/wr-mock-data.ts` | `routes/store-operation/wastage-reporting/_components/wr-mock-data.ts` |
| `system-admin/workflow/_components/wf-form-schema.ts` | `routes/system-admin/workflow/_components/wf-form-schema.ts` |

Only four files still import the `app/` copies (everything under `routes/` already
imports the `routes/` copies):

- `components/navbar/user-profile.tsx` → `@/app/(root)/profile/_components/change-password-dialog`
- `hooks/use-workflow.ts` → `@/app/(root)/system-admin/workflow/_components/wf-form-schema`
- `hooks/use-wastage-report.ts` → `@/app/(root)/store-operation/wastage-reporting/_components/wr-mock-data`
- `hooks/use-stock-replenishment.ts` → `@/app/(root)/store-operation/stock-replenishment/mock-data`

Other references to `app/`:

- `eslint.config.mjs` — one `"app/**/*.{ts,tsx}"` entry in a `files:` glob list.
- `CLAUDE.md` — the "Known open items" bullet describing this duplication.
- Historical specs/plans under `docs/superpowers/` mention `app/(root)` — these are
  records of past work and are intentionally left unchanged.

## Design

Decision (user-approved): keep `routes/` as the permanent home rather than extracting
the shared leaves to a neutral directory (`lib/`, `constants/`). This stays closest to
the source app's structure — its hooks import from `app/(root)/…` the same way — which
keeps future upstream-delta syncs mechanical. The only cost is that the four importing
files now carry a one-line import-path diff against the source app.

### Changes

1. **Repoint imports** in the four files above from `@/app/(root)/…` to the
   corresponding `@/routes/…` path. No other edits to those files.
2. **Delete `app/`** entirely (the five files are its only contents).
3. **`eslint.config.mjs`:** remove the `"app/**/*.{ts,tsx}"` line from the `files:` glob.
4. **`CLAUDE.md`:** rewrite the duplication bullet in "Known open items" to record that
   `app/` was removed and `routes/` is the single home for these leaves.

### Out of scope

- Moving the leaves out of `routes/` to a neutral layer (rejected alternative).
- Touching historical docs under `docs/superpowers/specs|plans/`.
- Any behavior change — this is purely a file/path consolidation.

## Error handling

No runtime surface changes. The only failure mode is a missed import or stale glob,
which the verification step catches at build/lint time.

## Verification

All four must pass clean after the change:

```bash
bunx tsc --noEmit
bun test:run
bun run lint
bun run build
```

Plus `grep -r "@/app" --include='*.ts*'` must return nothing.
