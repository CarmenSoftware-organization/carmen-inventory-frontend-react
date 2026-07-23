# Print Form Report Groups + `tb_print_template_mapping` Removal — Design

Date: 2026-07-23
Status: Approved (design), pending spec review
Repos: `carmen-turborepo-backend-v2` (incl. `packages/prisma-shared-schema-platform`),
`micro-report`, `carmen-platform`, `carmen-inventory-frontend-react`
Follows: `2026-07-23-print-form-per-document-type-design.md` (shipped today — BE #249, FE #61)

## Why this exists

Two things, deliberately done together because they touch the same two tables.

**1. The canonical report-group list already moved, and nothing followed it.**
`carmen-platform` gained a fixed code list for form templates on 2026-07-21
(`9843bb0`, `ReportTemplateEdit.tsx:38`):

```
PR PO GRN SR CN SI SO PC SC RFP EOP
```

The backend seed and the inventory frontend still use the older set —
`PR PO GRN SR CN IA PC SC RFQ INV`. So `RFQ` vs `RFP` disagree across repos, `SI`/`SO`/`EOP`
exist in the admin UI with nothing behind them, and `IA` exists in the backend with no way to
select it in the admin UI. `IA` is missing from the platform list by oversight, not intent.

**2. `tb_print_template_mapping` is redundant.** After the per-BU print-form feature shipped,
that table carries exactly one fact per document type: which template is the default. The seed
writes one row per type, always pointing at the portrait template of the matching group. Its
`allow_business_unit` / `deny_business_unit` columns are populated by the seed and **read by no
query anywhere**; `display_label` is unused by the print path.

## Decisions (from brainstorm)

1. **Canonical set is 12 groups**: `PR PO GRN SR CN SI SO IA PC SC RFP EOP`. That is the
   platform list plus `IA` (restored), minus `INV`.
2. **`INV` is dropped.** It has no gateway `print-viewer` route and never did. Its shipped
   config key `print-form.inv` goes with it.
3. **`SI`, `SO` and `EOP` are added now, endpoints later.** They have no `print-viewer` route
   either. The setting stores and persists; printing them stays unavailable until someone
   builds the endpoints. This is a deliberate repeat of the position `INV` used to hold.
4. **`RFQ` → `RFP` everywhere it means the document type** — but **not** `datasetPrefix`
   (see "The datasetPrefix trap").
5. **The default moves onto `tb_report_template`** as an `is_default` column, one per
   `report_group` among active non-deleted form templates, and `tb_print_template_mapping`
   is dropped in the same migration. No deprecation period — the user chose a single-PR drop.
6. **Both changes ship together.** Doing the realignment alone would require updating
   `tb_print_template_mapping.document_type` for RFQ→RFP — editing a table we are about to
   delete.
7. **Display labels use Title Case** (`Good Received Note`, `Store Requisition`) rather than
   the mixed casing in the request, to stay consistent with the existing labels.

## Current state (verified, not assumed)

- `carmen-platform` has **no occurrence of `IA`** anywhere in `src/`.
- `FORM_REPORT_GROUPS` is used only in `ReportTemplateEdit.tsx` (`:38`, `:556-561`), as the
  options of the Report Group select when `template_type === 'form'`.
- Backend uses `'RFQ'` in exactly three places: `request-for-pricing.service.ts:833`
  (`documentType`), `:835` (`datasetPrefix`), and `seed.print-templates.ts:104` (`code`).
- Inventory frontend uses `RFQ` as a document type in six places: `lib/print-document.ts:22`
  (union) and `:90` (endpoint map), `lib/print-form-config.ts:20`,
  `company-profile-config-registry.ts:123` and its test at `:208`,
  `routes/vendor-management/request-price-list/rfp-form.tsx:283`, plus the
  `printFormRfq` key in both message files. Other `RFQ` mentions in `routes/external/pl/**`
  and `pl-product-grouping.ts` describe the vendor price-request portal and are unrelated —
  leave them.
- `tb_report_template` has **no** `is_default` column. (The `is_default` at
  `schema.prisma:632` belongs to `tb_user_tb_business_unit`.)
- `tb_print_template_mapping` blast radius: 12 files in `carmen-turborepo-backend-v2`
  (the `platform_print-template-mappings/` module with 7 endpoints, the resolver, 4 spec files,
  3 seed files, the Prisma model and 2 migrations) and 9 files in `carmen-platform`.
- The gateway's mapping CRUD is consumed only by `carmen-platform`.
- **`tb_print_template_mapping` is also owned by a fourth repo.** `micro-report` (Go) carries
  `model/print_template_mapping.go`, `controller/print_template_mapping_controller.go` and
  `db/print_template_mapping_repo.go` — ~658 lines — exposing `/api/print-template-mappings`
  and `/api/print-template-mappings/resolve`. Two things call `/resolve`: the gateway module
  being deleted here (`platform_print-template-mappings.service.ts:157`) and
  `reports.service.ts:541`, which backs `GET /api/{bu}/reports/print-template`.

## The 12 groups

| Code | Document | print-viewer endpoint today |
|---|---|---|
| PR | Purchase Request | yes |
| PO | Purchase Order | yes |
| GRN | Good Received Note | yes |
| SR | Store Requisition | yes |
| CN | Credit Note | yes |
| SI | Stock In | **no** |
| SO | Stock Out | **no** |
| IA | Inventory Adjustment | yes |
| PC | Physical Count | yes |
| SC | Spot Check | yes |
| RFP | Request For Pricing | yes (module already named `request-for-pricing`) |
| EOP | End Of Period | **no** |

Nine have endpoints; `SI`, `SO` and `EOP` do not.

## Migration (`packages/prisma-shared-schema-platform`)

One migration, in this order. The order matters: backfilling before creating the unique index
means a bad dataset fails the index creation loudly instead of passing a meaningless check.

```sql
-- 1. Realign the renamed group. Written to be a no-op if an admin already renamed it
--    through the platform UI, which has offered RFP since 2026-07-21.
UPDATE tb_report_template SET report_group = 'RFP'
 WHERE report_group = 'RFQ' AND template_type = 'form';

-- 2. The default moves onto the template itself.
ALTER TABLE tb_report_template ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT false;

-- 3. Carry over every active mapping. Joins by template id, so it is unaffected by step 1.
UPDATE tb_report_template t SET is_default = true
  FROM tb_print_template_mapping m
 WHERE m.report_template_id = t.id AND m.is_active AND m.deleted_at IS NULL;

-- 4. Exactly one default per group, among live form templates.
CREATE UNIQUE INDEX idx_report_template_default_per_group
    ON tb_report_template (report_group)
 WHERE is_default AND template_type = 'form' AND deleted_at IS NULL;

-- 5. The table's remaining job is done.
DROP TABLE tb_print_template_mapping;
```

Step 4 **will fail** if the live data has two active mappings for one document type pointing at
two templates in the same group. That is the intended behaviour: it surfaces a data problem
instead of silently choosing one. Whoever runs it must be ready to reconcile.

`INV` form templates seeded earlier become orphaned — nothing references them once `INV`
leaves the code. Leave them in place rather than soft-deleting; they are inert.

## Backend (`carmen-turborepo-backend-v2`)

**Resolver** — `resolvePrintTemplate()` in `apps/micro-business/src/common/print-report.helper.ts`.
The `templateId`-supplied branch is unchanged. The fallback branch drops from two queries to one:

```
templateId absent → tb_report_template where report_group = documentType
                    ∧ template_type = 'form' ∧ is_active ∧ deleted_at IS NULL ∧ is_default
                    none → NOT_FOUND
```

`PR_NO_PRINT_MAPPING`'s catalog message still says "No active PR print mapping found"; reword it
to describe a missing default form. Keep the code itself so the public error contract holds.

**RFQ → RFP** — change `documentType: 'RFQ'` to `'RFP'` at
`request-for-pricing.service.ts:833`, and `code: 'RFQ'` to `'RFP'` in `seed.print-templates.ts`.

**Delete** the `platform_print-template-mappings/` module (controller, service, module, swagger,
2 specs — 7 endpoints including `GET /resolve` and `GET /document-types`), the 4
`print_template_mapping` permission rows in `seed.platform-permission.data.ts`, and the 3 role
grants in `seed.platform-role-permission.data.ts`.

**Seed** — `seed.print-templates.ts`: `DOCS` becomes the 12 codes above (drop `INV`, add `SI`,
`SO`, `EOP`, rename `RFQ`), and `ensureDefaultMapping()` becomes `ensureDefaultTemplate()`,
setting `is_default` on the portrait template instead of writing a mapping row. Signature blocks
for the three new types need defining — mirror the existing ones.

**Expose `is_default`** on the report-template read and update paths so the platform UI can set it.

### The datasetPrefix trap

`request-for-pricing.service.ts:835` also reads `datasetPrefix: 'RFQ'`. **Do not change it.**
`datasetPrefix` names the keys inside the payload sent to micro-report (`RFQHeader`,
`RFQDetail`), and the `.frx` template content binds to those names. Renaming it without editing
every RFP template's XML breaks rendering. It shares a string with `documentType` today by
coincidence, not by meaning.

## `micro-report`

Delete `model/print_template_mapping.go`, `controller/print_template_mapping_controller.go`,
`db/print_template_mapping_repo.go`, their route registration, the `/api/print-template-mappings`
entries in `docs/swagger/docs.go`, and the corresponding case in `routes/routes_test.go`. The
table they read is gone; leaving them would mean endpoints that error at runtime.

Also delete the gateway's `GET /api/{bu}/reports/print-template`
(`reports.controller.ts:388`, `reports.service.ts:541`) and its spec, since its only job was
proxying `/resolve`. The frontend change below removes its last caller.

## `carmen-platform`

- **Add `IA`** to `FORM_REPORT_GROUPS` (`ReportTemplateEdit.tsx:38`) — currently 11 codes, and
  `IA` is absent from the whole repo. Place it between `SO` and `PC` to match the canonical order.
- **Add a default toggle.** `ReportTemplateEdit` already has `is_standard` and `is_active`
  booleans; `is_default` follows the same shape, shown only when `template_type === 'form'`.
  `ReportTemplateManagement` gets a badge on the default row.
- **Delete** `PrintTemplateMappingManagement.tsx`, `PrintTemplateMappingEdit.tsx`, their two
  test files, `services/printTemplateMappingService.ts` and its test, the routes in `App.tsx`
  (`:24-25`, `:203-219`), the `Breadcrumbs.tsx` and `Layout.tsx` entries, and the four
  `print_template_mapping.*` entries in `utils/permissions.ts:61`.

## `carmen-inventory-frontend-react`

- `PrintDocumentType` (`lib/print-document.ts:13-23`): drop `INV`, add `SI`/`SO`/`EOP`, rename
  `RFQ`→`RFP`. `DEDICATED_PRINT_ENDPOINTS` (`:67-93`): drop the `INV` entry, rename the `RFQ`
  key. `SI`/`SO`/`EOP` get no entry — they have no endpoint.
- `PRINT_FORM_DOCUMENT_TYPES` (`lib/print-form-config.ts`): the 12 codes in canonical order.
- The registry's `printForm` section: 12 rows. New labels — `SI - Stock In`, `SO - Stock Out`,
  `EOP - End Of Period`, and `RFP - Request For Pricing` replacing the RFQ row.
- i18n both files: drop `printFormInv`, rename `printFormRfq`→`printFormRfp` with the new label,
  add `printFormSi`/`printFormSo`/`printFormEop`.
- `rfp-form.tsx:283`: `documentType="RFQ"` → `"RFP"`.
- The registry test's expected pairs list grows to 12 and picks up the renames.

### Path 2 stops resolving a mapping

`printDocument()`'s generic path currently calls `GET .../reports/print-template` to look up a
mapping, then posts to the viewer. That lookup is the last consumer of the endpoint chain being
deleted, so the path is reworked rather than removed:

```
Path 2 (no dedicated endpoint for this type):
  templateId (from BU config, or the caller) + filters → POST /reports/viewer
  no templateId → throw "no print form configured for <TYPE>"
```

Three things fall out of this at once. The mapping resolve endpoint loses its final caller.
`SI`/`SO`/`EOP` — which have no dedicated endpoint — become printable through the generic
viewer as soon as an admin picks a form, instead of being dead rows. And the previous spec's
review finding that Path 2 silently discarded a supplied `templateId` is closed.

Path 2 renders from the template's own `source_view`/`source_name`, so it does not carry the
composed header/detail/signature payload the dedicated endpoints build. That is the existing
behaviour of this path, not a regression.

## Deploy ordering

**Order: backend → micro-report → carmen-platform → inventory frontend.**

1. **Backend first.** It carries the migration, which is what creates the RFP-grouped templates
   and the `is_default` values everything else reads.
2. **`micro-report` immediately after.** Its mapping endpoints read a table that no longer
   exists the moment step 1 lands. Nothing calls them by then — the gateway module that did is
   deleted in step 1, and the frontend's Path 2 lookup is dead code today — but they must not
   linger as endpoints that error.
3. **`carmen-platform` immediately after.** Its Print Template Mapping pages break when step 1
   deletes their API, and its "set default" toggle needs the new column, so it can go neither
   first nor late. Internal admin tool, one deploy gap — accepted, but do not leave it open.
4. **Inventory frontend last.**

There is a brief cosmetic gap whichever way the frontend is ordered, and it is harmless in both
directions: ship it late and the old build asks for group `RFQ`, which the migration has
renamed, so that one dropdown is empty; ship it early and it asks for `RFP`, which does not exist
yet, so that dropdown is empty instead. No data is lost either way, because the config keys being
renamed have no stored values anywhere yet.

What must **not** happen is the previous change's failure mode — a frontend that sends a query
parameter an older gateway silently ignores. This change does not reintroduce it: the frontend
only ever sends a `template_id` an admin selected from a list the backend served.

**Back up `tb_print_template_mapping` before running the migration in any environment you care
about.** The drop is irreversible and there is no deprecation window by choice.

## Out of scope

- Building `print-viewer` endpoints for `SI`, `SO` and `EOP`.
- Enforcing `allow_business_unit` / `deny_business_unit` on `tb_report_template`. Still unread
  by every query; the previous spec's review established this is the pre-existing status quo and
  not a new exposure.
- Re-grouping `list`-type templates. Only `template_type = 'form'` is in scope; the `CR`, `RC`,
  `PR_DOC`, `PO_DOC` groups seen in `seed.report-template.ts` belong to list reports.

## Risks

| Risk | Mitigation |
|---|---|
| Two active mappings for one document type | The unique index fails the migration deliberately; reconcile the data first |
| Someone already created RFP/SI/SO/EOP templates through the platform UI in the last two days | The RFQ→RFP update is scoped `WHERE report_group = 'RFQ'`, so it is a no-op for rows already renamed |
| `datasetPrefix` renamed by pattern-matching | Called out explicitly above; it must stay `'RFQ'` |
| Config keys `print-form.rfq` / `print-form.inv` already stored by some BU | The feature shipped today and no BU has configured a value, so there is nothing to orphan. This is the cheapest possible moment to rename |
| DROP is irreversible | Back up before running; single-PR drop was an explicit choice |
| `micro-report` deletions missed, leaving endpoints that query a dropped table | Called out as its own repo section; its `/resolve` callers are both deleted in this change |
| Path 2 rework changes how endpoint-less types render | It renders from the template's own source view rather than a composed payload — the pre-existing behaviour of that path, but new to `SI`/`SO`/`EOP`, so their templates need a working `source_type`/`source_name` |

## Verification

```bash
# inventory frontend
bunx tsc --noEmit && bun run lint && bun test:run && bun run build
# backend
cd apps/micro-business && bun run check-types && bun run test
cd apps/backend-gateway && bunx tsc --noEmit && bun run test
# carmen-platform — its own test command
```

Manual, against a real stack:

1. Platform → Report Template → a form template offers all 12 codes including `IA`, and the
   default toggle appears only in form mode.
2. Marking a second template default in the same group is rejected by the unique index.
3. `/system-admin/default-setting` shows 12 Print Forms rows, no `INV`, `RFP` present.
4. Printing an RFP document resolves its template by the `RFP` group.
5. Printing a document type whose BU has configured nothing still works, now via `is_default`.
6. `SI`/`SO`/`EOP` rows store and reload a value, and print reports a clear unavailability
   error rather than a silent no-op.
