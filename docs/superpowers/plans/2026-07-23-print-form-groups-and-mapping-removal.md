# Print Form Groups + Mapping Removal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align every repo on the canonical 12 form report-groups, and retire `tb_print_template_mapping` by moving the default onto `tb_report_template.is_default`.

**Architecture:** One migration renames `RFQ`→`RFP`, adds `is_default`, backfills it from the mapping table, enforces one default per group, and drops the table. The resolver's fallback becomes a single query. Four repos then shed or gain the pieces that referenced the old shape.

**Tech Stack:** NestJS + Prisma (gateway, micro-cluster, micro-business) · Go + Gin (micro-report) · React + Vite (carmen-platform, carmen-inventory-frontend-react)

Spec: `docs/superpowers/specs/2026-07-23-print-form-groups-and-mapping-removal-design.md`

## Global Constraints

- **The canonical 12 codes, in this order:** `PR PO GRN SR CN SI SO IA PC SC RFP EOP`. Labels: Purchase Request, Purchase Order, Good Received Note, Store Requisition, Credit Note, Stock In, Stock Out, Inventory Adjustment, Physical Count, Spot Check, Request For Pricing, End Of Period. Title Case everywhere.
- **`INV` is removed. `SI`/`SO`/`EOP` are added but have no print-viewer endpoint and no template rows — they are configurable, not printable.** Do not add endpoints or template entries for them in this plan, and do not write anything implying they print.
- **Never change `datasetPrefix: 'RFQ'`** at `request-for-pricing.service.ts:835`. It names payload keys (`RFQHeader`/`RFQDetail`) bound inside `.frx` template content. Only `documentType` at `:833` changes.
- **Do NOT author tests.** Per the repo owner's standing instruction, no new `*.test.ts` / `*.spec.ts` / `*_test.go` files, and no new test cases — with the single exception called out in Task 9, which updates an existing registry test's expected data because the data it asserts is changing. Existing suites must pass; never delete or weaken an assertion to make a change fit. Static checks are not tests and must still run.
- Commit messages, code and comments in English. Comments in the inventory frontend's `lib/`, `hooks/` and registry files are Thai prose with English identifiers; `micro-report` is Go doc-comment style; match the file you are editing.
- Verify commands per repo:
  - inventory frontend: `bunx tsc --noEmit`, `bun run lint`, `bun test:run`, `bun run build`
  - backend `apps/micro-business`: `bun run check-types`, `bun run test <path>`
  - backend `apps/backend-gateway`: `bunx tsc --noEmit`, `bun run test` (**no** `check-types` script). Baseline: 3 pre-existing tsc errors and 16 pre-existing failing suites — gate is "no NEW failures"
  - backend `apps/micro-cluster`: `bunx tsc --noEmit`
  - `carmen-platform`: `npm run test` (vitest), `npx tsc --noEmit`
  - `micro-report`: `make build`, `make test`
- Known pre-existing backend failure, not yours: `apps/micro-business` `check-price-list.service.spec.ts`.
- Repo paths: `/Users/samutpra/GitHub/carmensoftware-organize/{carmen-turborepo-backend-v2,micro-report,carmen-platform,carmen-inventory-frontend-react}`.
- Each repo gets its own branch and its own PR. **Do not push and do not open PRs** — that is the human's call at the end.

---

## File Structure

**`carmen-turborepo-backend-v2`**

| File | Change |
|---|---|
| `packages/prisma-shared-schema-platform/prisma/migrations/<ts>_print_form_default/migration.sql` | *Create.* The whole schema change, in five ordered statements. |
| `packages/prisma-shared-schema-platform/prisma/schema.prisma` | *Modify.* Add `is_default` + index to `tb_report_template`; delete `model tb_print_template_mapping`. |
| `apps/micro-business/src/common/print-report.helper.ts` | *Modify.* Fallback branch becomes one query against `is_default`. |
| `apps/micro-business/src/master/request-for-pricing/request-for-pricing.service.ts:833` | *Modify.* `documentType` → `'RFP'`. Line 835 untouched. |
| `apps/backend-gateway/src/platform/platform_print-template-mappings/` | *Delete.* Whole directory. |
| `apps/backend-gateway/src/application/reports/reports.{controller,service}.ts` | *Modify.* Delete the `print-template` endpoint and its service method. |
| `apps/backend-gateway/src/platform/platform_report-templates/` + `apps/micro-cluster/src/cluster/report-template/` | *Modify.* Carry `is_default` on read and write. |
| `packages/prisma-shared-schema-platform/prisma/seed.{print-templates,platform-permission.data,platform-role-permission.data}.ts` | *Modify.* 12 codes; `is_default` instead of a mapping row; drop the 4 permissions and 3 grants. |

**`micro-report`** — `db/seed/report-templates/_metadata.json` (rename two entries' group); delete `model/print_template_mapping.go`, `controller/print_template_mapping_controller.go`, `db/print_template_mapping_repo.go`; edit `routes/routes.go`, `main.go`, `docs/swagger/docs.go`, `routes/routes_test.go`.

**`carmen-platform`** — `src/pages/ReportTemplateEdit.tsx` (add `IA`, add the default toggle), `src/pages/ReportTemplateManagement.tsx` (badge); delete the 4 mapping files + service + its test; edit `App.tsx`, `Breadcrumbs.tsx`, `Layout.tsx`, `utils/permissions.ts`.

**`carmen-inventory-frontend-react`** — `lib/print-document.ts`, `lib/print-form-config.ts`, `routes/system-admin/company-profile/company-profile-config-registry.ts` + its test, `messages/{en,th}.json`, `routes/vendor-management/request-price-list/rfp-form.tsx`.

---

# Phase 1 — Backend

### Task 1: Migration and Prisma model

**Files:**
- Create: `packages/prisma-shared-schema-platform/prisma/migrations/20260723120000_print_form_default/migration.sql`
- Modify: `packages/prisma-shared-schema-platform/prisma/schema.prisma` (`tb_report_template` at `:731-802`, `tb_print_template_mapping` at `:806-832`)

**Interfaces:**
- Consumes: nothing.
- Produces: `tb_report_template.is_default: Boolean`, unique index `idx_report_template_default_per_group`, and the removal of `tb_print_template_mapping` from the schema and database.

- [ ] **Step 1: Branch**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
git checkout -b feature/print-form-default-column
```

- [ ] **Step 2: Write the migration**

Statement order is load-bearing: backfilling before the index means bad data fails the index creation loudly instead of passing a meaningless check.

```sql
-- 1. Realign the renamed group. No-op if an admin already renamed it through the
--    platform UI, which has offered RFP since 2026-07-21.
UPDATE "tb_report_template" SET "report_group" = 'RFP'
 WHERE "report_group" = 'RFQ' AND "template_type" = 'form';

-- 2. The default moves onto the template itself.
ALTER TABLE "tb_report_template"
  ADD COLUMN IF NOT EXISTS "is_default" BOOLEAN NOT NULL DEFAULT false;

-- 3. Carry over every active mapping. Joins by template id, so step 1 does not affect it.
UPDATE "tb_report_template" t SET "is_default" = true
  FROM "tb_print_template_mapping" m
 WHERE m."report_template_id" = t."id"
   AND m."is_active" AND m."deleted_at" IS NULL;

-- 4. Exactly one default per group, among live form templates.
--    Fails loudly if the data has two active mappings for one document type.
CREATE UNIQUE INDEX "idx_report_template_default_per_group"
    ON "tb_report_template" ("report_group")
 WHERE "is_default" AND "template_type" = 'form' AND "deleted_at" IS NULL;

-- 5. Its remaining job is done.
DROP TABLE "tb_print_template_mapping";
```

- [ ] **Step 3: Update the Prisma schema**

In `model tb_report_template`, after the `is_standard` field:

```prisma
  // is_default — the form used when a business unit has not chosen one for this
  // report_group. Exactly one live form template per group may carry it.
  is_default Boolean @default(false)
```

**Do not declare the new index in the model.** `tb_report_template` already carries
`@@index([report_group], map: "idx_report_template_report_group")` at `:798`; adding a second
`@@index([report_group])` would be a duplicate declaration on the same field set, and it would
describe a partial unique index as a plain one. Prisma cannot express `WHERE is_default AND
template_type = 'form' AND deleted_at IS NULL`, so the index lives in raw SQL only. Record that
with a comment beside the `is_default` field:

```prisma
  // A partial unique index (idx_report_template_default_per_group) enforces one default per
  // report_group among live form templates. It is inexpressible in Prisma and exists only in
  // the migration SQL — do not let `migrate diff` drop it.
```

Then delete `model tb_print_template_mapping` entirely (`:806-832`).

- [ ] **Step 4: Regenerate the client and type-check**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
bunx prisma generate --schema packages/prisma-shared-schema-platform/prisma/schema.prisma
cd apps/micro-business && bun run check-types
```
Expected: `check-types` now **fails** in `print-report.helper.ts` and the specs that mock `tb_print_template_mapping` — that model no longer exists. Task 2 fixes the helper; Tasks 3 and 5 fix the rest. Record the failures; do not fix them here.

- [ ] **Step 5: Commit**

```bash
git add packages/prisma-shared-schema-platform/prisma
git commit -m "feat(schema): move the print default onto tb_report_template, drop the mapping table"
```

---

### Task 2: Resolver reads `is_default`

**Files:**
- Modify: `apps/micro-business/src/common/print-report.helper.ts` (the fallback branch of `resolvePrintTemplate`)
- Modify: `apps/micro-business/src/master/request-for-pricing/request-for-pricing.service.ts:833`

**Interfaces:**
- Consumes: `tb_report_template.is_default` (Task 1).
- Produces: `resolvePrintTemplate` keeps its exported signature — `(input: ResolvePrintTemplateInput) => Promise<Result<ResolvedPrintTemplate>>` — so no caller changes.

- [ ] **Step 1: Replace the fallback branch**

The `templateId`-supplied branch stays exactly as it is. Replace everything after it — the `tb_print_template_mapping.findFirst` block and the `tb_report_template.findFirst` that followed it — with:

```ts
  const fallback = await prismaSystem.tb_report_template.findFirst({
    where: {
      report_group: documentType,
      template_type: 'form',
      is_active: true,
      is_default: true,
      deleted_at: null,
    },
    select: { id: true, name: true },
  });
  if (!fallback) {
    return errors?.noMapping
      ? Result.errorFromCatalog(errors.noMapping)
      : Result.error(
          `No default print form configured for ${documentType}`,
          ErrorCode.NOT_FOUND,
        );
  }
  return Result.ok(fallback);
```

The `errors.mappedNotFound` case disappears with the second query — one lookup cannot half-succeed. Remove `mappedNotFound` from `PrintTemplateErrors`, and remove the now-unused key from PR's `errors` object in `purchase-request.service.ts`.

- [ ] **Step 2: Reword the catalog message**

In `packages/error-catalog/src/catalog.ts:361`, `PR_NO_PRINT_MAPPING`'s messages say "No active PR print mapping found" / "ไม่พบการตั้งค่าการพิมพ์ PR ที่เปิดใช้งาน". Change the English to "No default PR print form configured" and the Thai to "ไม่พบแบบฟอร์มการพิมพ์เริ่มต้นของ PR". Keep the `code` and `id` — the public error contract must not change.

`PR_MAPPED_TEMPLATE_NOT_FOUND` stays; it is still the `configuredInvalid` code.

- [ ] **Step 3: RFQ → RFP**

`request-for-pricing.service.ts:833`: `documentType: 'RFQ'` becomes `documentType: 'RFP'`.

**Line 835 (`datasetPrefix: 'RFQ'`) must not change** — it names the payload keys the `.frx` content binds to.

- [ ] **Step 4: Type-check and run the affected suites**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2/apps/micro-business
bun run check-types
bun run test src/common/print-report.helper.spec.ts \
  src/procurement/purchase-request/purchase-request.service.spec.ts \
  src/procurement/purchase-order/purchase-order.service.spec.ts \
  src/inventory/store-requisition/store-requisition.service.spec.ts \
  src/master/request-for-pricing/request-for-pricing.service.spec.ts
```

These four spec files mock `tb_print_template_mapping.findFirst`, which no longer exists. Update those mocks to `tb_report_template.findFirst` returning `{ id, name }`, and update any assertion that named the old model. That is amending existing tests to match an intentional schema change, not weakening them — do not delete assertions or whole cases.

- [ ] **Step 5: Commit**

```bash
git add apps/micro-business packages/error-catalog
git commit -m "feat(print): resolve the default form from tb_report_template.is_default"
```

---

### Task 3: Delete the gateway mapping module and the reports proxy

**Files:**
- Delete: `apps/backend-gateway/src/platform/platform_print-template-mappings/` (controller, service, module, `swagger/`, 2 spec files)
- Modify: `apps/backend-gateway/src/app.module.ts` (drop the module import/registration)
- Modify: `apps/backend-gateway/src/application/reports/reports.controller.ts:388` (delete the `print-template` route) and `reports.service.ts:541` (delete the method it calls)
- Modify: `apps/backend-gateway/src/application/reports/reports.service.spec.ts:297` (drop the case covering the deleted method)
- Modify: `packages/prisma-shared-schema-platform/prisma/seed.platform-permission.data.ts:29-32`, `seed.platform-role-permission.data.ts:13,19,24`

**Interfaces:**
- Consumes: nothing.
- Produces: `/api-system/print-template-mappings/*` and `GET /api/{bu}/reports/print-template` cease to exist. `carmen-platform` (Phase 3) and the inventory frontend (Phase 4) are their only callers.

- [ ] **Step 1: Delete the module**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
git rm -r apps/backend-gateway/src/platform/platform_print-template-mappings
```

Then remove its import and its entry in the `imports` array of `apps/backend-gateway/src/app.module.ts`.

- [ ] **Step 2: Delete the reports proxy**

In `reports.controller.ts`, delete the whole `@Get('print-template')` handler and its decorators (around `:388`). In `reports.service.ts`, delete the method that builds `/api/print-template-mappings/resolve?...` (around `:541`). In `reports.service.spec.ts`, delete the single `it(...)` case that asserted that URL (around `:297`) — the method it covers is gone, so the case cannot be amended.

- [ ] **Step 3: Drop the permissions**

`seed.platform-permission.data.ts`: delete the four `{ resource: "print_template_mapping", ... }` rows at `:29-32`.

`seed.platform-role-permission.data.ts`: remove `"print_template_mapping.*"` from `:13` and `"print_template_mapping.read"` from `:19` and `:24`, leaving the surrounding arrays valid.

- [ ] **Step 4: Type-check and test**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2/apps/backend-gateway
bunx tsc --noEmit
bun run test
```
Expected: the 3 pre-existing tsc errors drop to 2 — `platform_print-template-mappings.service.spec.ts:163` was one of them and is now deleted. No new failures beyond the 16 pre-existing suites.

- [ ] **Step 5: Commit**

```bash
git add -A apps/backend-gateway packages/prisma-shared-schema-platform/prisma
git commit -m "feat(print): delete the print-template-mapping module and its reports proxy"
```

---

### Task 4: Expose `is_default` on the report-template API

**Files:**
- Modify: `apps/backend-gateway/src/platform/platform_report-templates/platform_report-templates.controller.ts` (the create/update DTO and the swagger response shape)
- Modify: `apps/micro-cluster/src/cluster/report-template/report-template.service.ts` (`findForms` select at `:155-173`, plus `findAll`, `findOne`, `create`, `update`)

**Interfaces:**
- Consumes: `tb_report_template.is_default` (Task 1).
- Produces: `is_default` readable on report-template GET responses (including `findForms`) and writable on create/update. `carmen-platform` (Task 7) depends on this.

- [ ] **Step 1: Add it to the reads**

In `report-template.service.ts`, add `is_default: true` to the `select` of `findForms` (`:155-173`) and to the equivalent selects in `findAll` and `findOne`. The inventory frontend does not consume it, but the platform list page needs it to show which template is the default.

- [ ] **Step 2: Add it to the writes**

Add an optional `is_default?: boolean` to the create and update DTOs used by `platform_report-templates.controller.ts`, and pass it through in the service's `create` and `update` data objects. Follow exactly how `is_standard` is already threaded — it is the closest existing analogue.

- [ ] **Step 3: Type-check**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2/apps/micro-cluster && bunx tsc --noEmit
cd ../backend-gateway && bunx tsc --noEmit
```

- [ ] **Step 4: Run the report-template suites**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2/apps/micro-cluster
bun run test src/cluster/report-template
```
If a spec asserts an exact `select` object, extend the expectation to include `is_default: true`.

- [ ] **Step 5: Commit**

```bash
git add apps/backend-gateway apps/micro-cluster
git commit -m "feat(report-template): expose is_default on read and write"
```

---

### Task 5: Seed the 12 codes and the default flag

**Files:**
- Modify: `packages/prisma-shared-schema-platform/prisma/seed.print-templates.ts` (`DocSpec` list at `:35-120`, `ensureDefaultMapping` at `:153-199`, `main` at `:201-212`)

**Interfaces:**
- Consumes: `tb_report_template.is_default` (Task 1).
- Produces: a seed that flags defaults instead of writing mapping rows, over the 12 canonical codes.

- [ ] **Step 1: Realign `DOCS`**

Remove the `INV` entry. Rename `RFQ` to `RFP` with label `Request For Pricing`. Add three entries after `CN`, in canonical order, with signature blocks mirroring the existing style:

```ts
  {
    code: 'SI',
    label: 'Stock In',
    signatures: [
      { key: 'Sig1Name', label: 'Received By', required: true },
      { key: 'Sig2Name', label: 'Approved By', required: true },
    ],
  },
  {
    code: 'SO',
    label: 'Stock Out',
    signatures: [
      { key: 'Sig1Name', label: 'Issued By', required: true },
      { key: 'Sig2Name', label: 'Approved By', required: true },
    ],
  },
  {
    code: 'EOP',
    label: 'End Of Period',
    signatures: [
      { key: 'Sig1Name', label: 'Prepared By', required: true },
      { key: 'Sig2Name', label: 'Approved By', required: true },
    ],
  },
```

Final order: `PR PO GRN SR CN SI SO IA PC SC RFP EOP`.

`SI`, `SO` and `EOP` have no template rows in `micro-report`'s seed, so `ensureTemplate` will log its existing "template not found" warning for them. That is expected and correct — leave the warning path alone.

- [ ] **Step 2: Replace `ensureDefaultMapping` with `ensureDefaultTemplate`**

```ts
/**
 * Flags the portrait template of this document type as the group default.
 * ตั้งแม่แบบแนวตั้งของเอกสารชนิดนี้ให้เป็นค่าเริ่มต้นของกลุ่ม
 * @param doc - Document spec / ข้อมูลชนิดเอกสาร
 */
async function ensureDefaultTemplate(doc: DocSpec): Promise<void> {
  const portraitName = `${doc.label} Document`;
  const tpl = await prisma.tb_report_template.findFirst({
    where: { name: portraitName, deleted_at: null },
    select: { id: true },
  });
  if (!tpl) {
    console.warn(`[default] skip ${doc.code} — portrait template not found`);
    return;
  }

  // Clear any other default in this group first — the partial unique index
  // allows exactly one, so an update-then-set order would collide.
  await prisma.tb_report_template.updateMany({
    where: {
      report_group: doc.code,
      template_type: 'form',
      deleted_at: null,
      is_default: true,
      id: { not: tpl.id },
    },
    data: { is_default: false },
  });

  await prisma.tb_report_template.update({
    where: { id: tpl.id },
    data: { is_default: true },
  });
  console.log(`[default] ${doc.code} → ${portraitName}`);
}
```

Update the call in `main()` (`:209`) and the file's header comment, which still describes inserting mapping rows.

- [ ] **Step 3: Type-check and commit**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2/apps/micro-business && bun run check-types
```

```bash
git add packages/prisma-shared-schema-platform/prisma/seed.print-templates.ts
git commit -m "feat(seed): 12 canonical form codes, flag defaults on the template"
```

---

# Phase 2 — `micro-report`

### Task 6: Rename the group and delete the mapping code

**Files:**
- Modify: `db/seed/report-templates/_metadata.json` (the two `report_group: "RFQ"` entries)
- Delete: `model/print_template_mapping.go`, `controller/print_template_mapping_controller.go`, `db/print_template_mapping_repo.go`
- Modify: `routes/routes.go:22,49-50`, `main.go`, `docs/swagger/docs.go`, `routes/routes_test.go:45`

**Interfaces:**
- Consumes: nothing. Its `/resolve` callers were deleted in Task 3.
- Produces: `/api/print-template-mappings*` ceases to exist; freshly seeded databases carry `RFP` instead of `RFQ`.

- [ ] **Step 1: Branch**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/micro-report
git checkout -b feature/print-form-groups
```

- [ ] **Step 2: Rename the group in the seed metadata**

`db/seed/report-templates/_metadata.json` has 38 entries, 20 of them `"template_type": "form"`. Exactly two carry `"report_group": "RFQ"` (the portrait and landscape Request For Quotation documents). Change both to `"RFP"`.

Their `name` fields also read "Request For Quotation Document" / "... Landscape". Rename those to "Request For Pricing Document" / "Request For Pricing Document Landscape" — the backend seed's `ensureDefaultTemplate` looks the portrait one up **by name** built from the label `Request For Pricing`, so leaving the old names would break the default flag.

Leave `id`, `builder_key` and `signature_config` untouched — the ids are referenced by existing rows and the builder key by Go code.

- [ ] **Step 3: Delete the mapping code**

```bash
git rm model/print_template_mapping.go \
       controller/print_template_mapping_controller.go \
       db/print_template_mapping_repo.go
```

In `routes/routes.go`, delete the `PrintTemplateMapping *controller.PrintTemplateMappingHTTPHandler` field (`:22`) and the `if deps.PrintTemplateMapping != nil { ... }` block (`:49-50`). In `main.go`, delete where that handler is constructed and passed into the route deps. In `routes/routes_test.go`, delete the `"/api/print-template-mappings"` entry at `:45`.

- [ ] **Step 4: Regenerate or hand-edit swagger**

`docs/swagger/docs.go` carries the `/api/print-template-mappings*` path entries. If the repo has a swagger generation target (`make swagger`), run it. Otherwise remove those path objects by hand and keep the JSON valid.

- [ ] **Step 5: Build and test**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/micro-report
make build
make test
```
Expected: both clean. If `make test` was already failing before your change, record the baseline and confirm you added nothing.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(report): rename RFQ group to RFP, delete print-template-mapping"
```

---

# Phase 3 — `carmen-platform`

### Task 7: 12 codes and a default toggle

**Files:**
- Modify: `src/pages/ReportTemplateEdit.tsx` (`FORM_REPORT_GROUPS` at `:38`, the form data interface at `:52-83`, the load at `:206-210`, the submit at `:315`, and the `is_standard` Badge area at `:422`)
- Modify: `src/pages/ReportTemplateManagement.tsx` (columns at `:202-204`)

**Interfaces:**
- Consumes: `is_default` on the report-template API (Task 4).
- Produces: the platform UI can set and see the group default.

- [ ] **Step 1: Branch and add `IA`**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-platform
git checkout -b feature/print-form-groups
```

`FORM_REPORT_GROUPS` (`:38`) currently reads:

```ts
const FORM_REPORT_GROUPS = [
  'PR', 'PO', 'GRN', 'SR', 'CN', 'SI', 'SO', 'PC', 'SC', 'RFP', 'EOP',
] as const;
```

Insert `'IA'` between `'SO'` and `'PC'` so it matches the canonical order:

```ts
const FORM_REPORT_GROUPS = [
  'PR', 'PO', 'GRN', 'SR', 'CN', 'SI', 'SO', 'IA', 'PC', 'SC', 'RFP', 'EOP',
] as const;
```

- [ ] **Step 2: Thread `is_default` through the form**

Add `is_default: boolean` to `ReportTemplateFormData` beside `is_standard` (`:55`), default it to `false` in the initial state (`:79`), hydrate it on load as `template.is_default ?? false` (`:210`), and include it in the submit payload (`:315`) — but only when `template_type === 'form'`, mirroring how `is_standard` is special-cased there.

- [ ] **Step 3: Render the toggle**

Beside the `is_standard` Badge (`:422`), add a control for `is_default`, shown only when `template_type === 'form'`. Label it "Default for this report group". Follow whatever control `is_active` uses in this file so it looks native rather than invented.

Add a short hint under it: setting this clears the previous default for the group, and the server permits exactly one.

- [ ] **Step 4: Show it in the list**

In `ReportTemplateManagement.tsx`, the columns array (`:202-204`) has `report_group` and `is_active`. Add a `Default` badge — either a new column or an inline badge on the `report_group` cell. Only meaningful for form templates.

- [ ] **Step 5: Type-check and test**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-platform
npx tsc --noEmit
npm run test
```
`ReportTemplateEdit.test.tsx` and `ReportTemplateManagement.test.tsx` exist. If one asserts the exact `FORM_REPORT_GROUPS` length or the submitted payload shape, update the expected data to match the intentional change. Do not delete cases.

- [ ] **Step 6: Commit**

```bash
git add src/pages
git commit -m "feat(report-template): add IA to form groups, expose the group default"
```

---

### Task 8: Delete the mapping pages

**Files:**
- Delete: `src/pages/PrintTemplateMappingManagement.tsx`, `src/pages/PrintTemplateMappingEdit.tsx`, both `.test.tsx` siblings, `src/services/printTemplateMappingService.ts` and its test
- Modify: `src/App.tsx` (`:24-25`, `:203-219`), `src/components/Breadcrumbs.tsx`, `src/components/Layout.tsx`, `src/utils/permissions.ts:61`

**Interfaces:**
- Consumes: nothing.
- Produces: no references to `print_template_mapping` remain in this repo.

- [ ] **Step 1: Delete the files**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-platform
git rm src/pages/PrintTemplateMappingManagement.tsx \
       src/pages/PrintTemplateMappingManagement.test.tsx \
       src/pages/PrintTemplateMappingEdit.tsx \
       src/pages/PrintTemplateMappingEdit.test.tsx \
       src/services/printTemplateMappingService.ts \
       src/services/printTemplateMappingService.test.ts
```

Deleting a test file whose subject is deleted is not authoring or weakening tests — the code under test is gone.

- [ ] **Step 2: Remove the references**

`App.tsx`: the two `lazy(...)` imports (`:24-25`) and the three route blocks (`:203-219`). `Breadcrumbs.tsx` and `Layout.tsx`: the nav/label entries for the mapping pages. `utils/permissions.ts:61`: the four `print_template_mapping.*` strings, leaving the array valid.

- [ ] **Step 3: Prove nothing is left**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-platform
grep -rn "PrintTemplateMapping\|print_template_mapping\|print-template-mapping" src || echo "clean"
```
Expected: `clean`.

- [ ] **Step 4: Type-check, test, commit**

```bash
npx tsc --noEmit && npm run test
git add -A src
git commit -m "feat(report-template): remove the print template mapping pages"
```

---

# Phase 4 — Inventory frontend

### Task 9: The 12 document types

**Files:**
- Modify: `lib/print-document.ts` (`PrintDocumentType` at `:13-23`, `DEDICATED_PRINT_ENDPOINTS` at `:67-93`)
- Modify: `lib/print-form-config.ts` (`PRINT_FORM_DOCUMENT_TYPES`)
- Modify: `routes/system-admin/company-profile/company-profile-config-registry.ts` (the `printForm` items at `:107-134`)
- Modify: `routes/system-admin/company-profile/company-profile-config-registry.test.ts` (the expected pairs at `:200-212`)
- Modify: `messages/en.json`, `messages/th.json`
- Modify: `routes/vendor-management/request-price-list/rfp-form.tsx:283`

**Interfaces:**
- Consumes: nothing from earlier tasks in this repo.
- Produces: `PrintDocumentType` = the 12 canonical codes; `print-form.{pr,po,grn,sr,cn,si,so,ia,pc,sc,rfp,eop}` config keys.

- [ ] **Step 1: Branch**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-inventory-frontend-react
git checkout -b feature/print-form-groups-realign
```
(If that branch already holds the spec and plan commits, stay on it.)

- [ ] **Step 2: The union and the endpoint map**

`PrintDocumentType`: drop `"INV"`, rename `"RFQ"` to `"RFP"`, add `"SI"`, `"SO"`, `"EOP"` in canonical order.

`DEDICATED_PRINT_ENDPOINTS`: delete the `INV` entry entirely — no gateway route exists for it. Rename the `RFQ` key to `RFP`, keeping its `request-for-pricings` URL unchanged. Add nothing for `SI`/`SO`/`EOP`.

Update the map's doc comment: it is now a partial map by design, and three document types deliberately have no entry.

- [ ] **Step 3: `PRINT_FORM_DOCUMENT_TYPES`**

```ts
export const PRINT_FORM_DOCUMENT_TYPES: readonly PrintDocumentType[] = [
  "PR",
  "PO",
  "GRN",
  "SR",
  "CN",
  "SI",
  "SO",
  "IA",
  "PC",
  "SC",
  "RFP",
  "EOP",
] as const;
```

- [ ] **Step 4: The registry rows**

Replace the tuple list with the 12 canonical rows:

```ts
        ["PR", "PR - Purchase Request", "config.printFormPr"],
        ["PO", "PO - Purchase Order", "config.printFormPo"],
        ["GRN", "GRN - Good Received Note", "config.printFormGrn"],
        ["SR", "SR - Store Requisition", "config.printFormSr"],
        ["CN", "CN - Credit Note", "config.printFormCn"],
        ["SI", "SI - Stock In", "config.printFormSi"],
        ["SO", "SO - Stock Out", "config.printFormSo"],
        ["IA", "IA - Inventory Adjustment", "config.printFormIa"],
        ["PC", "PC - Physical Count", "config.printFormPc"],
        ["SC", "SC - Spot Check", "config.printFormSc"],
        ["RFP", "RFP - Request For Pricing", "config.printFormRfp"],
        ["EOP", "EOP - End Of Period", "config.printFormEop"],
```

- [ ] **Step 5: i18n**

In both message files under `defaultSetting.config`: delete `printFormInv`; rename `printFormRfq` to `printFormRfp`; add `printFormSi`, `printFormSo`, `printFormEop`.

| key | en | th |
|---|---|---|
| `printFormSi` | SI - Stock In | SI - รับสินค้าเข้า |
| `printFormSo` | SO - Stock Out | SO - จ่ายสินค้าออก |
| `printFormRfp` | RFP - Request For Pricing | RFP - ขอราคา |
| `printFormEop` | EOP - End Of Period | EOP - สิ้นงวด |

Reproduce the Thai character for character. Leave `printFormIa`, `printFormPc` and the rest as they are.

- [ ] **Step 6: The call site**

`routes/vendor-management/request-price-list/rfp-form.tsx:283`: `documentType="RFQ"` becomes `documentType="RFP"`.

Do **not** touch the `RFQ` mentions in `routes/external/pl/**` or `pl-product-grouping.ts` — those describe the vendor price-request portal and are unrelated prose.

- [ ] **Step 7: Update the registry test's expected data**

`company-profile-config-registry.test.ts` asserts a 10-row `[optionsGroup, labelKey]` table. The data it pins is intentionally changing, so update the table to the 12 rows above, in order. This is the plan's single approved test edit — do not add cases.

- [ ] **Step 8: Verify**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-inventory-frontend-react
bunx tsc --noEmit && bun run lint && bun test:run
node -e "
const en=require('./messages/en.json'), th=require('./messages/th.json');
const ek=Object.keys(en.defaultSetting.config).sort(), tk=Object.keys(th.defaultSetting.config).sort();
console.log('config keys equal:', JSON.stringify(ek)===JSON.stringify(tk));
console.log('has inv:', ek.includes('printFormInv'), '| has rfq:', ek.includes('printFormRfq'));
"
```
Expected: type-check clean, lint 0 errors, 640/640 tests, key parity `true`, and both `has inv` and `has rfq` `false`.

- [ ] **Step 9: Commit**

```bash
git add lib routes messages
git commit -m "feat(print-form): align on the 12 canonical document types"
```

---

### Task 10: The generic print path stops resolving a mapping

**Files:**
- Modify: `lib/print-document.ts` (the Path 2 block, roughly `:136-181` after Task 9's edits)
- Modify: `constant/api-endpoints.ts` if a now-unused `print-template` constant is left behind

**Interfaces:**
- Consumes: `PrintDocumentOptions.templateId` (already present) and the endpoint deletions from Task 3.
- Produces: `printDocument` no longer calls `.../reports/print-template`.

- [ ] **Step 1: Replace the mapping lookup**

Path 2 currently issues `GET ${API_ENDPOINTS.REPORTS(buCode)}/print-template?document_type=...`, reads `report_template_id` from the response, then posts to the viewer. That endpoint is deleted in Task 3. Replace the lookup with the caller's template:

```ts
  // Path 2 — no dedicated endpoint for this type. The template comes from the
  // BU's print-form config; there is no server-side mapping to fall back on.
  if (!options.templateId) {
    throw new Error(`No print form configured for ${documentType}`);
  }

  const viewerUrl = `${API_ENDPOINTS.REPORTS(buCode)}/viewer`;
  const viewerRes = await httpClient.post(viewerUrl, {
    template_id: options.templateId,
    filters: options.filters ?? {},
  });
```

Keep everything after that — the `!viewerRes.ok` guard, the URL extraction, the `target` handling — as it is, and return `templateId: options.templateId` with `templateName: null` in the result.

Delete the now-unused `PrintMappingResponse` interface.

- [ ] **Step 2: Note the limitation in the doc comment**

Path 2 renders from the template's own source view. Every form template in `micro-report`'s seed has `source_name: null` and renders through a Go `builder_key` instead, so this path is **not** a working print route for `SI`/`SO`/`EOP` today. Say that in the function's doc comment rather than letting a reader assume otherwise.

- [ ] **Step 3: Verify**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-inventory-frontend-react
bunx tsc --noEmit && bun run lint && bun test:run && bun run build
grep -rn "print-template" lib constant || echo "no mapping lookup left"
```
Expected: all clean, `640/640`, `✓ built`, and the grep prints `no mapping lookup left`.

- [ ] **Step 4: Commit**

```bash
git add lib constant
git commit -m "feat(print): use the configured form on the generic path, drop the mapping lookup"
```

---

# Phase 5 — Verification

### Task 11: Cross-repo verification

Nothing here changes code unless a defect is found.

- [ ] **Step 1: Confirm the table is gone from every repo**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize
grep -rn "tb_print_template_mapping\|print_template_mapping\|print-template-mapping" \
  --include="*.ts" --include="*.tsx" --include="*.go" --include="*.prisma" \
  carmen-turborepo-backend-v2/apps carmen-turborepo-backend-v2/packages \
  micro-report carmen-platform/src carmen-inventory-frontend-react/lib \
  2>/dev/null | grep -v "/dist/" | grep -v node_modules | grep -v vendor | grep -v migrations
```
Expected: no output. Historical migration files legitimately still mention it — that is why they are excluded.

- [ ] **Step 2: Confirm RFQ is gone as a document type**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize
grep -rn "'RFQ'\|\"RFQ\"" --include="*.ts" --include="*.go" --include="*.json" \
  carmen-turborepo-backend-v2/apps carmen-turborepo-backend-v2/packages micro-report/db \
  2>/dev/null | grep -v "/dist/" | grep -v node_modules
```
Expected: exactly one hit — `datasetPrefix: 'RFQ'` at `request-for-pricing.service.ts:835`, which must survive.

- [ ] **Step 3: Run the migration against a scratch database**

Do **not** run it against the shared dev database. Point Prisma at a scratch copy, apply the migration, and confirm all five statements succeed and `tb_report_template.is_default` is true for exactly one form template per group.

If step 4 of the migration fails, the source data has two active mappings for one document type — report which, and stop.

- [ ] **Step 4: Manual pass, once all four repos are deployed to a test environment**

1. Platform → Report Template → editing a form template offers all 12 codes including `IA`, and the default toggle appears only in form mode.
2. Marking a second template default in the same group is rejected.
3. `/system-admin/default-setting` shows 12 Print Forms rows — no `INV`, `RFP` present, `SI`/`SO`/`EOP` present with empty dropdowns.
4. A BU that has configured nothing still prints, now resolved via `is_default`.
5. Printing an RFP document works and resolves by the `RFP` group.
6. The Print Template Mapping pages are gone from the platform nav.

- [ ] **Step 5: Record the outcome**

Write the results into all four PR descriptions. If any step fails, report the exact request, response and console output rather than patching around it.

---

## Open items to carry into the PR descriptions

- **Deploy order: backend → micro-report → carmen-platform → inventory frontend.** The backend carries the migration; `micro-report` and `carmen-platform` both hold code that reads a table the migration drops; the frontend is last. A brief window where the platform's Print Template Mapping page errors is expected and accepted.
- **Back up `tb_print_template_mapping` before running the migration anywhere you care about.** The drop is irreversible by explicit choice — there is no deprecation window.
- **`SI`, `SO` and `EOP` are configurable but not printable.** No print-viewer endpoint, and no template rows in `micro-report`'s seed. Their dropdowns will be empty until someone authors templates (a `.frx` content file, a Go builder behind a new `builder_key`, and a signature config) and adds the endpoints.
- **`INV` is removed as a document type.** Its two seeded form templates remain in the database, inert and unreferenced.
- Two checks left over from the previous change are still unverified and worth folding into the same test pass: that a printed document actually uses the chosen layout (needs `micro-report` running on `:6015`), and that a wrong-group `template_id` returns 404.
