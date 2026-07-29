# Print Form per Document Type — Business Setting — Design

Date: 2026-07-23
Status: Approved (design), pending spec review
Repos: `carmen-inventory-frontend-react` (this one) + `carmen-turborepo-backend-v2`
Related: `2026-07-10-default-setting-page-split-design.md` (the page this lands on),
`2026-07-17-workflow-stage-signature-design.md` (signature slots in the print payload).

## Why this exists

Every business unit prints the same layout for a given document type. Which report
template gets used is decided entirely server-side by `tb_print_template_mapping`, a
platform-level table with **no BU scoping in the query** — so a BU cannot choose its own
PR/PO/GRN form even though the seed ships two templates per document type (portrait and
landscape).

This adds a **Print Forms** section to `/system-admin/default-setting` where a BU admin
picks the report form used when printing each of the ten document types, and makes the
print path honour that choice.

## Decisions (from brainstorm)

1. **Storage: the BU `config` array**, same mechanism as the existing PR/SI/PO sections
   (`PATCH /api/business-units`). One seeded item per document type.
2. **The frontend applies the setting.** `printDocument()` passes the configured template
   as `?template_id=` to the existing dedicated print-viewer endpoint. The backend does
   not read BU config.
3. **Backend is in scope this round.** The nine print-viewer endpoints gain an optional
   `template_id` query parameter.
4. **Options are fetched, not hardcoded.** One request to
   `GET /api-system/report-templates/forms?perpage=-1` returns every active form template;
   the client groups them by `report_group`. No `group` param, no ten-request waterfall.
5. **Section name: "Print Forms" / "แบบฟอร์มการพิมพ์".**
6. **Config keys use the `print-form.` prefix** (`print-form.pr`, …) to match the section
   name and the backend's existing "print template" vocabulary.
7. **A configured-but-unresolvable template is an error, never a silent fallback**
   (rationale in "Error semantics").
8. **Tests: the registry test only.** Per the user's global instruction, no new spec/test
   files beyond the one `add-business-setting-config` requires — a `describe` block in
   `company-profile-config-registry.test.ts` asserting the ten items' `key`, `datatype`,
   `defaultValue`, `labelKey` and `optionsGroup`, and that they carry no static `options`.
   Existing suites must pass.
9. **`tb_print_template_mapping` is not deleted in this PR.** It stays as the
   no-config-yet fallback. Removing it is a separate follow-up (see "Follow-up work").

## Current behaviour (verified, not assumed)

- `lib/print-document.ts:67-88` maps all ten `PrintDocumentType` values to dedicated
  `.../print-viewer` endpoints. `hooks/use-print-document.ts:25` is the single choke point
  through which the whole app prints.
- Nine of those endpoints exist in the gateway (PR, PO, GRN, SR, CN, IA, PC, SC, RFQ).
  **`INV` does not** — `lib/print-document.ts:86` points at
  `/api/{bu}/invoice/{id}/print-viewer`, which is not implemented. INV printing 404s today.
- None of the nine accept a template override; each calls
  `printToReport(id, user_id, bu_code)`.
- Eight of the nine resolve the template through the shared helper
  `apps/micro-business/src/common/print-report.helper.ts:192-208`
  (`renderViaMicroReport`). PR keeps an inline copy of the same logic at
  `apps/micro-business/src/procurement/purchase-request/purchase-request.service.ts:3151-3172`.
- The `documentType` values those callers pass (`'PR' | 'PO' | 'CN' | 'IA' | 'SR' | 'PC' |
  'GRN' | 'SC' | 'RFQ'`) are exactly the `report_group` values seeded by
  `seed.print-templates.ts`, so the two can be compared directly.
- `GET /api-system/report-templates/forms` filters `template_type='form'`,
  `is_active=true`, `deleted_at IS NULL`, uppercases `group` before matching, and treats
  `perpage=-1` as "no limit" (`Number(perpage) || 10` keeps `-1`; the query then omits
  `take`).

## Frontend

### Data model

Ten seeded items in the BU `config` array:

| key | datatype | defaultValue | value |
|---|---|---|---|
| `print-form.pr` … `print-form.inv` | `enum` | `""` | report template UUID; `""` = use the system default |

`datatype` stays `"enum"` — the backend stores a string either way, and the only thing
that differs from the existing SI enum is where the options come from. No new datatype is
introduced, so `ConfigField` needs no changes.

### Registry (`routes/system-admin/company-profile/company-profile-config-registry.ts`)

`SeededConfigItem` gains one optional field:

```ts
/** สำหรับ enum ที่ options มาจาก report-template API — ค่าคือ report_group (เช่น "PR") */
optionsGroup?: string;
```

A new section appended to `CONFIG_SECTIONS` (array order = render order):

```ts
{
  id: "printForm",
  titleKey: "sections.printForm",
  descKey: "sections.printFormDesc",
  items: [
    { key: "print-form.pr", datatype: "enum", defaultValue: "",
      label: "PR - Purchase Request", labelKey: "config.printFormPr", optionsGroup: "PR" },
    // PO, GRN, SR, CN, IA, PC, SC, RFQ, INV — same shape
  ],
}
```

`ConfigSectionEntry` carries `optionsGroup` through `groupConfigForRender()` alongside the
existing `options`. Static `options` and `optionsGroup` are mutually exclusive; the SI
section is untouched.

The canonical `label` (persisted, locale-independent) is the English
`"<CODE> - <Document Name>"` string. The displayed label comes from `labelKey`.

### Shared key module (`lib/print-form-config.ts`, new)

One owner for the key strings, imported by both the registry and the print hook so they
cannot drift:

```ts
export function printFormConfigKey(type: PrintDocumentType): string;   // "PR" → "print-form.pr"
export function resolvePrintFormTemplateId(
  config: BusinessUnitDetail["config"],
  type: PrintDocumentType,
): string | undefined;                                                 // "" / missing → undefined
```

This also keeps `hooks/` from importing out of `routes/`.

### Options hook (`hooks/use-report-form-templates.ts`, new)

- `API_ENDPOINTS.REPORT_TEMPLATE_FORMS = "/api/proxy/api-system/report-templates/forms"`
- `QUERY_KEYS.REPORT_TEMPLATE_FORMS = "report-template-forms"`
- One `useQuery` → `?perpage=-1`, generous `staleTime` (the list changes rarely).
- Returns `Map<report_group, { value: id; label: name }[]>`, built once.

**Response envelope must be confirmed against a running backend before the hook is
wired.** Static reading of `StdResponse.fromResult` says a paginated result serialises to
`{ data: [...], paginate, status, success, ... }` — i.e. `json.data` is the array — but the
app-config list endpoint taught us that a test mocking the wrong envelope passes while the
real page crashes. Verify in the browser, not in a unit test.

### Rendering (`routes/system-admin/default-setting/default-setting-component.tsx`)

For each entry with `optionsGroup`, options come from the hook's map instead of
`resolveConfigOptions()`. Three states matter:

- **Loading** — the Select is disabled.
- **Fetch failed** — the section still renders; the Selects are empty and the section shows
  an inline error. The rest of the page keeps working.
- **Stored value not in the list** (template deleted or deactivated) — prepend a synthetic
  option labelled `⚠ Unknown template (<uuid>)` so the value survives a Save and the
  problem is visible instead of silently reset.

`ConfigField` in `company-profile-ui.tsx` is not modified.

### i18n (`messages/en.json` + `messages/th.json`)

Under `defaultSetting`:

- `sections.printForm` = `"Print Forms"` / `"แบบฟอร์มการพิมพ์"`
- `sections.printFormDesc` = `"Report form used when printing each document type."` /
  `"แบบฟอร์มรายงานที่ใช้พิมพ์สำหรับเอกสารแต่ละประเภท"`
- `config.printFormPr` … `config.printFormInv`:

| key | en | th |
|---|---|---|
| `printFormPr` | PR - Purchase Request | PR - ใบขอซื้อ |
| `printFormPo` | PO - Purchase Order | PO - ใบสั่งซื้อ |
| `printFormGrn` | GRN - Good Received Note | GRN - ใบรับสินค้า |
| `printFormSr` | SR - Store Requisition | SR - ใบเบิกสินค้า |
| `printFormCn` | CN - Credit Note | CN - ใบลดหนี้ |
| `printFormIa` | IA - Inventory Adjustment | IA - ปรับปรุงสินค้าคงคลัง |
| `printFormPc` | PC - Physical Count | PC - ตรวจนับสินค้า |
| `printFormSc` | SC - Spot Check | SC - ตรวจสอบเฉพาะจุด |
| `printFormRfq` | RFQ - Request For Quotation | RFQ - ขอใบเสนอราคา |
| `printFormInv` | INV - Invoice | INV - ใบแจ้งหนี้ |

Plus `config.printFormUnknown` for the synthetic option
(`"⚠ Unknown template ({id})"` / `"⚠ ไม่พบเทมเพลต ({id})"`).

### Print path

- `PrintDocumentOptions` gains `templateId?: string`.
- `printDocument()` appends `?template_id=<uuid>` to the dedicated endpoint URL when
  `templateId` is set. Without it the URL is byte-for-byte what it is today.
- `usePrintDocument()` reads the BU detail via `useBusinessUnit(useProfile().defaultBu?.id)`
  and resolves the template with `resolvePrintFormTemplateId()`. An explicit
  `options.templateId` from a caller wins over the config.

`useProfile().defaultBu.config` cannot be used: it is a `BusinessUnitConfig` object
(`types/profile.ts:74`), a different shape from the `BusinessUnitConfigItem[]` the Default
Setting page edits (`types/business-unit.ts:32`). `useBusinessUnit` is the right source —
it is gated by `AppIdGuard('userBusinessUnit.getCurrent')` rather than an admin role, so an
ordinary user pressing Print can call it, and its 5-minute `staleTime` means it does not add
a request per print.

## Backend (`carmen-turborepo-backend-v2`)

### The logic lives in one place

`apps/micro-business/src/common/print-report.helper.ts` gains an exported
`resolvePrintTemplate({ prismaSystem, documentType, templateId })`:

```
templateId empty → unchanged: tb_print_template_mapping,
                   order by is_default desc, display_order asc
templateId set   → tb_report_template by id, all of:
                     deleted_at IS NULL ∧ is_active ∧ template_type = 'form'
                     ∧ report_group = documentType
                   any miss → NOT_FOUND
```

`RenderViaMicroReportInput` gains `templateId?: string` and calls the resolver in place of
the current inline block — that covers PO, GRN, SR, CN, IA, PC, SC and RFQ at once.

`purchase-request.service.ts:3151-3172` replaces its duplicated copy with the same
resolver, keeping the `PR_NO_PRINT_MAPPING` / `PR_MAPPED_TEMPLATE_NOT_FOUND` catalog codes
it already returns.

### Threading the parameter — nine mechanical chains

| Layer | Change |
|---|---|
| gateway controller ×9 | `@Query('template_id') template_id?: string` + `@ApiQuery`. Explicit snake_case per `NAMING_CONVENTIONS.md`. |
| gateway service ×9 | include `template_id` in the microservice payload |
| micro controller ×9 | read it from the payload, pass to the service |
| micro service ×9 | forward as `templateId` |

The parameter is validated as an optional UUID v4 (400 when malformed). Omitting it
reproduces today's behaviour exactly, so this is backward compatible with no migration and
no schema change.

### Error semantics

A configured template that no longer resolves returns 404 rather than falling back to the
mapping. Falling back would print a document in a different layout with nothing to signal
it — a PO sent to a vendor on the wrong form is worse than a print that fails loudly. The
frontend covers the same case at configuration time with the `⚠ Unknown template` option.

## Out of scope

- **The missing `INV` print-viewer endpoint.** It is a pre-existing gap, not caused by this
  work. The `print-form.inv` row still stores a value so the setting is ready when the
  endpoint lands; until then INV printing fails exactly as it does today.
- Making the backend read BU config directly.
- Any change to `tb_print_template_mapping` rows, schema, or its platform admin UI.

## Follow-up work (separate PR, not this one)

Deleting `tb_print_template_mapping` once every BU has its Print Forms configured. Recorded
here so the intent is not lost. Blast radius, measured:

- **`carmen-turborepo-backend-v2`** — the `platform_print-template-mappings/` CRUD module
  (controller, service, module, swagger, 2 specs); the resolver fallback in
  `print-report.helper.ts` and `purchase-request.service.ts`; 4 spec files that mock the
  table; `seed.print-templates.ts`; 4 permission rows in `seed.platform-permission.data.ts`
  and 3 grants in `seed.platform-role-permission.data.ts`; the Prisma model plus a
  `DROP TABLE` migration.
- **`carmen-platform`** — 9 files / 69 references: `PrintTemplateMappingManagement.tsx`,
  `PrintTemplateMappingEdit.tsx` and their tests, `services/printTemplateMappingService.ts`
  and its test, plus routes in `App.tsx`, `Breadcrumbs.tsx`, `Layout.tsx` and
  `utils/permissions.ts`.

The sequencing matters: the table is currently the only thing that decides which template
prints, so it can only be dropped after every BU has a value — otherwise printing breaks
for every unconfigured BU across every document type.

## Verification

```bash
bunx tsc --noEmit                                    # 0 errors
bun test:run routes/system-admin/company-profile/    # registry test passes
bun run build                                        # BUILD_CONFIG_FILE=config.sample.json in CI
```

Backend: the existing `print-report.helper.spec.ts`,
`purchase-request.service.spec.ts`, `purchase-order.service.spec.ts` and
`store-requisition.service.spec.ts` all mock `tb_print_template_mapping` and must still
pass after the resolver is extracted.

Manual, against a real backend — this is the part that unit tests cannot cover:

1. `/system-admin/default-setting` shows the Print Forms section with ten populated
   dropdowns, confirming the response envelope is what we assumed.
2. Pick a non-default form for PR, Save, reload — the value persists.
3. Print a PR — the chosen layout renders and the request carries `?template_id=`.
4. Clear the PR value, Save, print again — falls back to the mapping, as before.
5. Known-failing tests on `main` (3 in `routes/external/pl`) are unrelated; compare against
   the base branch before diagnosing.

## Risks

| Risk | Mitigation |
|---|---|
| Response envelope differs from the static reading | Confirm in the browser before wiring the hook; do not trust a mocked test |
| First Save writes ten empty config rows to the BU | Existing behaviour of `buildPatch` for PR/SI/PO; accepted |
| A template is deleted after being configured | 404 on print, `⚠ Unknown template` in the config UI |
| Nine near-identical backend chains invite copy-paste slips | All real logic sits in `resolvePrintTemplate()`; the per-chain edit is one parameter |
