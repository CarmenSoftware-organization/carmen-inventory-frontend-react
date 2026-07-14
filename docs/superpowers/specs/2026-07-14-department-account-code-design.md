# Department `account_code` field — Design

**Date:** 2026-07-14
**Status:** Approved, ready for implementation
**Scope:** Full-stack — add an optional `account_code` field to the Department entity.

## Summary

Add an optional, free-text `account_code` field to Department, persisted end-to-end
(Postgres → micro-business → gateway → frontend form/list/card). The field carries an
external accounting/GL identifier for a department. It is optional, free text (short),
no format enforcement, no uniqueness constraint, no trimming.

## Decisions

| Question | Decision |
|----------|----------|
| Backend support | Add it — this spec covers both backend (carmen-turborepo-backend-v2) and frontend. |
| Required vs optional | **Optional** (`String?`, `z.string().optional()`). |
| Format / validation | **Free text, short.** Frontend `maxLength={30}`. No regex, no uniqueness, no trim. |
| Display placement | Form (add/edit/view), list table column, mobile card. |

## Approach

Scalar column `account_code` directly on `tb_department`.

**Alternative rejected:** reuse the existing `tb_location.department_account_code` column
or a mapping table (`tb_product_account_code_mapping` pattern). Both miss the intent
("a field on department") and add unnecessary complexity. YAGNI.

## Backend — carmen-turborepo-backend-v2

The department create/update service already spreads `...data` into the Prisma
`create`/`update` calls, so `account_code` flows through automatically once it passes DTO
validation. No service logic changes. Zod serializer schemas strip unknown keys, so
`account_code` must be added to the response schemas or it will not reach the frontend.

| # | File | Change |
|---|------|--------|
| 1 | `packages/prisma-shared-schema-tenant/prisma/schema.prisma` → `model tb_department` | Add `account_code String? @db.VarChar` |
| 2 | new migration `YYYYMMDDHHMMSS_add_department_account_code/migration.sql` | `ALTER TABLE "tb_department" ADD COLUMN "account_code" VARCHAR;` |
| 3 | `packages/prisma-shared-schema-tenant/generated/tb_department.ts` | Regenerate via `prisma generate` (`db:generate`) |
| 4 | `apps/backend-gateway/src/common/dto/department/department.create.dto.ts` and `department.update.dto.ts` | Add `account_code: z.string().optional()` to both schemas |
| 5 | `apps/backend-gateway/src/config/config_departments/swagger/request.ts` (`DepartmentCreateRequestDto`, `DepartmentUpdateRequestDto`) and `swagger/response.ts` (`DepartmentResponseDto`) | Add `@ApiPropertyOptional` `account_code` |
| 6 | `apps/micro-business/src/master/departments/dto/department.dto.ts` (`DepartmentCreateSchema`, `DepartmentUpdateSchema`) | Add `account_code: z.string().optional()` |
| 7 | `apps/micro-business/src/master/departments/dto/department.serializer.ts` (`DepartmentDetailResponseSchema`, `DepartmentListItemResponseSchema`) | Add `account_code: z.string().nullable().optional()` |

**Service:** no change — `create` builds `createDepartmentData = {...data}`; `update`
spreads `...updateDepartmentData` into `tb_department.update`. `account_code` is carried
by the spread.

**Data flow (create):** FE payload `account_code` → gateway create DTO validate → micro
create DTO validate → `{...data}` → Prisma insert.
**Read:** Prisma row → serializer (must include field or it is stripped) → gateway → FE.

**Tests to check/update:** `departments.service.spec.ts`, `config_departments.controller.spec.ts`,
serializer/DTO specs — assert the new field round-trips.

### Migration mechanics

- Naming follows existing convention `YYYYMMDDHHMMSS_description` (see
  `20260622120000_add_product_account_code_mapping`).
- Apply with `db:migrate` (`prisma migrate dev --skip-generate`) then `db:generate`,
  or hand-author the `migration.sql` to match the timestamped folder pattern already in
  the repo.

## Frontend — carmen-inventory-frontend-react

| # | File | Change |
|---|------|--------|
| 1 | `types/department.ts` | Add `account_code?: string` to `Department` and `CreateDepartmentDto` |
| 2 | `routes/config/department/department-form-schema.ts` | Schema `account_code: z.string()`; `EMPTY_FORM.account_code = ""`; `getDefaultValues` → `account_code: department.account_code ?? ""` |
| 3 | `routes/config/department/department-form.tsx` | Add `<Field>` input; both `defaultValues` branches; `onSubmit` payload; `handleCancel` reset branch |
| 4 | `routes/config/department/use-department-table.tsx` | Add `account_code` column (not sortable — free text) |
| 5 | `routes/config/department/department-card.tsx` | Show `account_code` in `CardContent` when present |
| 6 | `messages/en.json`, `messages/th.json` | Add `field.accountCode` = `"Account Code"` / `"รหัสบัญชี"` |

**Form layout:** `code` + `name` stay in the existing `grid-cols-2` row. `account_code`
goes on a new row, left half (`grid-cols-2`, one cell), for visual balance. It is an
optional field (no `required` marker on the label). Disabled in view mode / while pending,
same as the other inputs.

**i18n key:** use the shared `field` namespace (`field.accountCode`) that both the form
(`tfl`) and the table header already read — one key serves label + column header.

**onSubmit payload:** add `account_code: values.account_code` to the payload object built
in `onSubmit` (used by both create and update mutations).

## Tests

TDD — write the failing test first at each layer.

- **Backend:** department service/controller/serializer specs assert `account_code`
  round-trips through create → read and update → read. Run the department test suite.
- **Frontend:**
  - schema test — `account_code` is present and optional (empty string valid).
  - form test — field renders; submitting includes `account_code` in the mutation payload.
  - table contract test — a column with id/accessorKey `account_code` exists.
- **Final gate:** `bunx tsc --noEmit && bun test:run` clean in the frontend repo; backend
  build + department tests clean.

## Out of scope

- No format/mask, no uniqueness, no trimming, no server-side normalization.
- No changes to `tb_location.department_account_code` or the product account-code mapping.
- No search/filter by `account_code` (column is display-only, not sortable).
