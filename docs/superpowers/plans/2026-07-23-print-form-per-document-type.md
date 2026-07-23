# Print Form per Document Type — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a business-unit admin pick, per document type, which report form is used when printing — and make the print path honour that choice.

**Architecture:** The choice is stored as ten seeded items in the BU `config` array on `/system-admin/default-setting`, with dropdown options fetched from the platform report-template API. `usePrintDocument()` — the single choke point through which the whole app prints — reads the BU config and appends `?template_id=` to the existing dedicated print-viewer endpoint. Server-side, one shared resolver decides between the caller-supplied template and today's `tb_print_template_mapping` default.

**Tech Stack:** Frontend — Vite + React Router 7, TanStack Query, react-hook-form, `use-intl`, Vitest. Backend — NestJS gateway + NestJS microservices over a message bus, Prisma.

Spec: `docs/superpowers/specs/2026-07-23-print-form-per-document-type-design.md`

## Global Constraints

- **Do NOT write new tests.** Per the user's global CLAUDE.md: skip every "write the failing test" / "run the test to verify it fails" step, and do not create `*.test.ts` / `*.spec.ts` files. **Task 6 is the single exception** — it adds a `describe` block to an existing registry test file, which the `add-business-setting-config` skill requires and the spec approved. Static checks are not tests and must still run: `bunx tsc --noEmit`, `bun run lint`, `bun run build`.
- **Existing test suites must keep passing** in both repos. Do not delete or weaken an existing assertion to make a change fit.
- Frontend communicates in Thai with the user; **code, comments, commit messages and PR text are English**. Comments in this repo's existing config/registry files are Thai — match the file you are editing.
- Config `key` values and enum `value`s are canonical, locale-independent, and stored verbatim in the backend. The canonical English `label` is persisted; the *displayed* label always comes from `labelKey`.
- Multi-word `@Query` params in NestJS **must** carry an explicit snake_case name (`@Query('template_id')`) — Micronaut/Nest do not auto-convert, and the frontend sends snake_case.
- Two repos are involved. Frontend: `/Users/samutpra/GitHub/carmensoftware-organize/carmen-inventory-frontend-react`. Backend: `/Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2`. Each gets its own branch and its own PR.
- `bun run build` in a clean checkout / CI needs `BUILD_CONFIG_FILE=config.sample.json` because `public/config.prod.json` is gitignored.
- Known-failing-on-`main` tests: 3 in `routes/external/pl` (frontend). Compare against the base branch before diagnosing a failure.
- **Deviation from the spec, already reviewed:** the spec said `ConfigField` would not be modified. Task 8 makes two small changes to it (drop the `options.length > 0` condition from `isEnum`, add an optional `disabled` prop). Without the first, an enum whose options have not loaded yet falls through and renders as a **free-text `<Input>`** — a real bug, not a style preference.

---

## File Structure

**Backend — `carmen-turborepo-backend-v2`**

| File | Responsibility |
|---|---|
| `apps/micro-business/src/common/print-report.helper.ts` | *Modify.* Owns `resolvePrintTemplate()` — the single place that decides which template renders a document. `renderViaMicroReport` delegates to it. |
| `apps/micro-business/src/procurement/purchase-request/purchase-request.service.ts` | *Modify.* Drops its duplicated resolution block in favour of the shared resolver, keeping its own error-catalog codes. |
| 9 × gateway controller + 9 × gateway service | *Modify.* Accept and forward `template_id`. |
| 9 × micro controller + 9 × micro service | *Modify.* Read `template_id` from the payload and forward it as `templateId`. |

**Frontend — `carmen-inventory-frontend-react`**

| File | Responsibility |
|---|---|
| `lib/print-form-config.ts` | *Create.* Sole owner of the `print-form.*` key strings and the document-type list; reads a template id out of a BU config array. Imported by both the registry and the print hook so the two can never drift. |
| `types/report-form-template.ts` | *Create.* The response row shape for the report-template forms endpoint. |
| `hooks/use-report-form-templates.ts` | *Create.* One request for every active form template; returns them grouped by `report_group`. |
| `routes/system-admin/company-profile/company-profile-config-registry.ts` | *Modify.* Adds `optionsGroup` to the item type and the `printForm` section. |
| `routes/system-admin/company-profile/company-profile-ui.tsx` | *Modify.* `ConfigField` gains `disabled` and stops falling through to a text input on an empty enum. |
| `routes/system-admin/default-setting/default-setting-component.tsx` | *Modify.* Feeds fetched options into `ConfigField`; owns the loading / error / unknown-value states. |
| `lib/print-document.ts`, `hooks/use-print-document.ts` | *Modify.* Thread `templateId` from config to the request URL. |
| `messages/en.json`, `messages/th.json` | *Modify.* Section + 10 labels + the unknown-template string. |
| `routes/system-admin/company-profile/company-profile-config-registry.test.ts` | *Modify.* The one new test block. |

---

# Phase 1 — Backend (`carmen-turborepo-backend-v2`)

### Task 1: Shared print-template resolver

**Files:**
- Modify: `apps/micro-business/src/common/print-report.helper.ts` (header comment at `:1-10`, `RenderViaMicroReportInput` at `:137-155`, resolution block at `:192-208`)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `resolvePrintTemplate(input: ResolvePrintTemplateInput): Promise<Result<ResolvedPrintTemplate>>`
  - `interface ResolvePrintTemplateInput { prismaSystem: PrismaSystem; documentType: string; templateId?: string; errors?: PrintTemplateErrors }`
  - `interface ResolvedPrintTemplate { id: string; name: string }`
  - `interface PrintTemplateErrors { noMapping?: CatalogEntry; mappedNotFound?: CatalogEntry; configuredInvalid?: CatalogEntry }`
  - `RenderViaMicroReportInput` gains `templateId?: string`

- [ ] **Step 1: Create a branch**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
git checkout -b feature/print-form-template-id
```

- [ ] **Step 2: Add the resolver above `renderViaMicroReport`**

Insert immediately before the `renderViaMicroReport` doc comment (around `:175`). `ERROR_CATALOG`, `Result` and `ErrorCode` are already imported at `:12-15`; `PrismaSystem` is already aliased at `:17`.

```ts
/** Catalog entry shape used by ERROR_CATALOG members. */
type CatalogEntry = (typeof ERROR_CATALOG)[keyof typeof ERROR_CATALOG];

/**
 * Optional per-module error codes. Modules that own catalog entries for these
 * cases (currently only PR) pass them so their public error codes do not change.
 * โมดูลที่มี error code ของตัวเองส่งเข้ามาได้ เพื่อให้ code ที่ client เห็นไม่เปลี่ยน
 */
export interface PrintTemplateErrors {
  /** No active row in tb_print_template_mapping for this document type. */
  noMapping?: CatalogEntry;
  /** The mapping points at a template that no longer exists. */
  mappedNotFound?: CatalogEntry;
  /** The caller supplied a template_id that is not a valid form for this type. */
  configuredInvalid?: CatalogEntry;
}

export interface ResolvePrintTemplateInput {
  prismaSystem: PrismaSystem;
  /** Document type discriminator, e.g. 'PR' — also the report_group of its form templates. */
  documentType: string;
  /**
   * Template chosen by the caller (from the BU's print-form config). Empty or
   * undefined falls back to the default tb_print_template_mapping row.
   */
  templateId?: string;
  errors?: PrintTemplateErrors;
}

export interface ResolvedPrintTemplate {
  id: string;
  name: string;
}

/**
 * Resolves which report template renders a document: the caller-supplied template when
 * given, otherwise the default print mapping for the document type
 * เลือกแม่แบบรายงานที่ใช้พิมพ์เอกสาร — ใช้ค่าที่ผู้เรียกส่งมาก่อน ถ้าไม่มีจึงใช้ mapping เริ่มต้น
 *
 * A supplied template_id must be an active, non-deleted `form` template whose
 * report_group matches the document type. Anything else is an error rather than a
 * silent fallback — printing a document on the wrong layout is worse than not printing.
 *
 * @param input - Prisma client, document type, optional template id and error codes
 * @returns Result with the resolved template id and name, or a NOT_FOUND error
 */
export async function resolvePrintTemplate(
  input: ResolvePrintTemplateInput,
): Promise<Result<ResolvedPrintTemplate>> {
  const { prismaSystem, documentType, templateId, errors } = input;

  if (templateId) {
    const chosen = await prismaSystem.tb_report_template.findFirst({
      where: {
        id: templateId,
        deleted_at: null,
        is_active: true,
        template_type: 'form',
        report_group: documentType,
      },
      select: { id: true, name: true },
    });
    if (!chosen) {
      return errors?.configuredInvalid
        ? Result.errorFromCatalog(errors.configuredInvalid, { template_id: templateId })
        : Result.error(
            `Configured print template ${templateId} is not a valid ${documentType} form`,
            ErrorCode.NOT_FOUND,
          );
    }
    return Result.ok(chosen);
  }

  const mapping = await prismaSystem.tb_print_template_mapping.findFirst({
    where: {
      document_type: documentType,
      is_active: true,
      deleted_at: null,
    },
    orderBy: [{ is_default: 'desc' }, { display_order: 'asc' }],
  });
  if (!mapping) {
    return errors?.noMapping
      ? Result.errorFromCatalog(errors.noMapping)
      : Result.error(
          `No active ${documentType} print mapping found`,
          ErrorCode.NOT_FOUND,
        );
  }

  const template = await prismaSystem.tb_report_template.findFirst({
    where: { id: mapping.report_template_id, deleted_at: null },
    select: { id: true, name: true },
  });
  if (!template) {
    return errors?.mappedNotFound
      ? Result.errorFromCatalog(errors.mappedNotFound, {
          template_id: mapping.report_template_id,
        })
      : Result.error(
          `Mapped template ${mapping.report_template_id} not found`,
          ErrorCode.NOT_FOUND,
        );
  }
  return Result.ok(template);
}
```

- [ ] **Step 3: Add `templateId` to `RenderViaMicroReportInput`**

In the interface at `:137-155`, after the `documentType` field:

```ts
  /**
   * Template chosen by the caller (BU print-form config). Omitted or empty falls
   * back to the default tb_print_template_mapping row.
   */
  templateId?: string;
```

- [ ] **Step 4: Delegate from `renderViaMicroReport`**

Add `templateId` to the destructuring at the top of the function, then replace the whole block from the `// 1. Resolve template via tb_print_template_mapping` comment through the `Mapped template ... not found` error (`:192-208`) with:

```ts
  // 1. Resolve template — caller's choice first, otherwise the default mapping
  const templateResult = await resolvePrintTemplate({
    prismaSystem,
    documentType,
    templateId,
  });
  if (!templateResult.isOk()) {
    // pass the AppError through unchanged — rebuilding it from message/code
    // would drop app_code, app_code_id and http_status, which StdResponse reads
    return Result.error(templateResult.error);
  }
  const template = templateResult.value;
```

- [ ] **Step 5: Update the file's header comment**

The comment at `:8-9` currently reads "PR uses an inlined version of this same flow inside its service; intentionally not refactored here to avoid touching the existing wired path." Task 2 removes that duplication, so replace those two lines with:

```
 * PR builds its own payload but shares this file's resolvePrintTemplate().
```

- [ ] **Step 6: Type-check**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
bunx tsc --noEmit -p apps/micro-business/tsconfig.json
```
Expected: no errors.

- [ ] **Step 7: Run the suites that mock this path**

```bash
bunx jest apps/micro-business/src/common/print-report.helper.spec.ts \
  apps/micro-business/src/procurement/purchase-order/purchase-order.service.spec.ts \
  apps/micro-business/src/inventory/store-requisition/store-requisition.service.spec.ts
```
Expected: PASS. These mock `tb_print_template_mapping.findFirst`, which the no-`templateId` path still calls in exactly the same way.

- [ ] **Step 8: Commit**

```bash
git add apps/micro-business/src/common/print-report.helper.ts
git commit -m "refactor(print): extract resolvePrintTemplate with optional template override"
```

---

### Task 2: PR uses the shared resolver

**Files:**
- Modify: `apps/micro-business/src/procurement/purchase-request/purchase-request.service.ts:3131-3172`

**Interfaces:**
- Consumes: `resolvePrintTemplate`, `ResolvedPrintTemplate` from Task 1.
- Produces: `PurchaseRequestService.printToReport(id: string, templateId?: string)`.

- [ ] **Step 1: Import the resolver**

Add `resolvePrintTemplate` to the existing import from `print-report.helper` (the file already imports `loadSignatureNames` from it).

- [ ] **Step 2: Widen the signature**

At `:3131`:

```ts
  async printToReport(
    id: string,
    templateId?: string,
  ): Promise<Result<{ viewer_url: string }>> {
```

- [ ] **Step 3: Replace the duplicated resolution block**

Replace `:3151-3172` — the `// 2. Resolve template via tb_print_template_mapping` comment through the `PR_MAPPED_TEMPLATE_NOT_FOUND` guard — with:

```ts
    // 2. Resolve template — BU-configured form first, else the default mapping.
    //    Signature slots come from the workflow stages, not from the template —
    //    see resolveSignatureNames().
    const templateResult = await resolvePrintTemplate({
      prismaSystem: this.prismaSystem,
      documentType: 'PR',
      templateId,
      errors: {
        noMapping: ERROR_CATALOG.PR_NO_PRINT_MAPPING,
        mappedNotFound: ERROR_CATALOG.PR_MAPPED_TEMPLATE_NOT_FOUND,
        configuredInvalid: ERROR_CATALOG.PR_MAPPED_TEMPLATE_NOT_FOUND,
      },
    });
    if (!templateResult.isOk()) {
      // pass the AppError through so the PR_* catalog code survives
      return Result.error(templateResult.error);
    }
    const template = templateResult.value;
```

The code after this block already uses `template.id` / `template.name`; leave it untouched.

- [ ] **Step 4: Type-check**

```bash
bunx tsc --noEmit -p apps/micro-business/tsconfig.json
```
Expected: no errors.

- [ ] **Step 5: Run the PR suite**

```bash
bunx jest apps/micro-business/src/procurement/purchase-request/purchase-request.service.spec.ts
```
Expected: PASS. The spec at `:1346` mocks `tb_print_template_mapping.findFirst`, which the no-`templateId` path still reaches.

- [ ] **Step 6: Commit**

```bash
git add apps/micro-business/src/procurement/purchase-request/purchase-request.service.ts
git commit -m "refactor(pr): resolve print template through the shared helper"
```

---

### Task 3: Micro layer — accept `templateId` in all 9 services

**Files (all under `apps/micro-business/src/`):**

| Code | Controller (`print-to-report` handler) | Service (`printToReport`) | `documentType` |
|---|---|---|---|
| PR | `procurement/purchase-request/purchase-request.controller.ts:612` | *(done in Task 2)* `:3131` | `PR` |
| PO | `procurement/purchase-order/purchase-order.controller.ts:802` | `procurement/purchase-order/purchase-order.service.ts:5631` | `PO` |
| CN | `procurement/credit-note/credit-note.controller.ts:153` | `procurement/credit-note/credit-note.service.ts:593` | `CN` |
| GRN | `inventory/good-received-note/good-received-note.controller.ts:529` | `inventory/good-received-note/good-received-note.service.ts:2716` | `GRN` |
| SR | `inventory/store-requisition/store-requisition.controller.ts:444` | `inventory/store-requisition/store-requisition.service.ts:2234` | `SR` |
| IA | `inventory/inventory-adjustment/inventory-adjustment.controller.ts:9` | `inventory/inventory-adjustment/inventory-adjustment.service.ts:137` | `IA` |
| PC | `inventory/physical-count/physical-count.controller.ts:364` | `inventory/physical-count/physical-count.service.ts:1604` | `PC` |
| SC | `inventory/spot-check/spot-check.controller.ts:273` | `inventory/spot-check/spot-check.service.ts:1210` | `SC` |
| RFQ | `master/request-for-pricing/request-for-pricing.controller.ts:150` | `master/request-for-pricing/request-for-pricing.service.ts:810` | `RFQ` |

**Interfaces:**
- Consumes: `RenderViaMicroReportInput.templateId` (Task 1); `PurchaseRequestService.printToReport(id, templateId?)` (Task 2).
- Produces: every `<Domain>Service.printToReport(id: string, templateId?: string)`; every micro controller forwards `payload.template_id`.

`MicroservicePayload` has an index signature (`[key: string]: any`), so `template_id` needs no type change — but add it explicitly for discoverability.

- [ ] **Step 1: Declare `template_id` on the payload interface**

`apps/micro-business/src/common/interfaces/microservice-payload.interface.ts`, in the `// Query` group:

```ts
  /** Report template override for print endpoints (BU print-form config). */
  template_id?: string;
```

- [ ] **Step 2: Update each micro controller (9 files)**

The handler body is identical in shape everywhere. Using PO at `purchase-order.controller.ts:802` as the worked example — destructure `template_id` and pass it as the second argument:

```ts
  @MessagePattern({ cmd: 'purchase-orders.print-to-report', service: 'purchase-orders' })
  async printToReport(@Payload() payload: MicroservicePayload): Promise<MicroserviceResponse> {
    this.logger.debug(
      { function: 'printToReport', payload },
      PurchaseOrderController.name,
    );
    const { user_id, bu_code, id, template_id } = payload;
    this.purchaseOrderService.userId = user_id;
    this.purchaseOrderService.bu_code = bu_code;
    await this.purchaseOrderService.initializePrismaService(bu_code, user_id);
    const auditContext = this.createAuditContext(payload);
    const result = await runWithAuditContext(auditContext, () =>
      this.purchaseOrderService.printToReport(id, template_id),
    );
    return this.handleResult(result);
  }
```

Apply the same two edits — add `template_id` to the destructuring, pass it as the second argument to `…Service.printToReport(id, …)` — at each controller line in the table above. Class and service property names differ per file; change nothing else.

- [ ] **Step 3: Update each micro service (8 files — PR already done)**

Two edits per service. Using PO at `purchase-order.service.ts:5631`:

```ts
  async printToReport(
    id: string,
    templateId?: string,
  ): Promise<Result<{ viewer_url: string }>> {
```

and in its `renderViaMicroReport({ … })` call, add `templateId` next to `documentType`:

```ts
    return renderViaMicroReport({
      prismaSystem: this.prismaSystem,
      bu_code: this.bu_code,
      documentType: 'PO',
      templateId,
      datasetPrefix: 'PO',
      signatureNames,
      buildHeader: () => ({ /* unchanged */ }),
      buildDetail: () => ([ /* unchanged */ ]),
    });
```

Repeat for CN, GRN, SR, IA, PC, SC and RFQ at the service lines in the table, using each one's own `documentType` value. Do not touch `buildHeader` / `buildDetail`.

- [ ] **Step 4: Type-check**

```bash
bunx tsc --noEmit -p apps/micro-business/tsconfig.json
```
Expected: no errors.

- [ ] **Step 5: Run the micro-business suite**

```bash
bunx jest apps/micro-business
```
Expected: PASS — `templateId` is optional everywhere, so every existing call site and mock is unaffected.

- [ ] **Step 6: Commit**

```bash
git add apps/micro-business/src
git commit -m "feat(print): accept an optional template override in print-to-report handlers"
```

---

### Task 4: Gateway layer — expose `template_id` on all 9 endpoints

**Files (all under `apps/backend-gateway/src/application/`):**

| Code | Controller (`print-viewer` route) | Service (`printToReport`) | id `@Param` |
|---|---|---|---|
| PR | `purchase-requests/purchase-requests.controller.ts:1166` | `purchase-requests/purchase-requests.service.ts:954` | `purchase_request_id` |
| PO | `purchase-orders/purchase-orders.controller.ts:1633` | `purchase-orders/purchase-orders.service.ts:1019` | `purchase_order_id` |
| GRN | `good-received-notes/good-received-notes.controller.ts:1574` | `good-received-notes/good-received-notes.service.ts:914` | `good_received_note_id` |
| SR | `store-requisitions/store-requisitions.controller.ts:847` | `store-requisitions/store-requisitions.service.ts:677` | `store_requisition_id` |
| CN | `credit-notes/credit-notes.controller.ts:420` | `credit-notes/credit-notes.service.ts:281` | `credit_note_id` |
| IA | `inventory-adjustments/inventory-adjustments.controller.ts:195` | `inventory-adjustments/inventory-adjustments.service.ts:243` | `inventory_adjustment_id` |
| PC | `physical-counts/physical-counts.controller.ts:865` | `physical-counts/physical-counts.service.ts:607` | `physical_count_id` |
| SC | `spot-checks/spot-checks.controller.ts:920` | `spot-checks/spot-checks.service.ts:623` | `spot_check_id` |
| RFQ | `request-for-pricings/request-for-pricings.controller.ts:361` | `request-for-pricings/request-for-pricings.service.ts:234` | `request_for_pricing_id` |

**Interfaces:**
- Consumes: the micro handlers from Task 3 (they read `payload.template_id`).
- Produces: `GET …/print-viewer?template_id=<uuid>` on all nine endpoints; every gateway `printToReport(id, user_id, bu_code, template_id?)`.

All nine controllers already import `Query` and use `@ApiQuery`, so no import changes are needed.

- [ ] **Step 1: Update each gateway controller (9 files)**

Two edits per file: one `@ApiQuery` decorator among the existing ones on the route, and one parameter. Using PO at `purchase-orders.controller.ts:1633-1662` as the worked example:

```ts
  @ApiQuery({
    name: 'template_id',
    description:
      'Report template to render with (UUID v4). Omit to use the default print mapping for this document type.',
    required: false,
    example: '019638a6-2a00-7c4f-8e46-9b7a52c80c4d',
  })
  @ApiStdResponse(undefined, { description: 'Resource retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Missing or invalid Bearer token' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  @HttpCode(HttpStatus.OK)
  async printToReport(
    @Param('purchase_order_id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('bu_code') bu_code: string,
    @Req() req: Request,
    @Res() res: Response,
    @Query('template_id', new ParseUUIDPipe({ version: '4', optional: true }))
    template_id?: string,
  ): Promise<void> {
    this.logger.debug(
      { function: 'printToReport', id, bu_code, template_id },
      PurchaseOrdersController.name,
    );

    const { user_id } = ExtractRequestHeader(req);
    const result = await this.purchaseOrdersService.printToReport(
      id,
      user_id,
      bu_code,
      template_id,
    );
    this.respond(res, result);
  }
```

Apply the same shape at each controller line in the table, substituting that route's id `@Param` name, controller class name and service property name. `optional: true` on `ParseUUIDPipe` is what makes a missing param legal while a malformed one still returns 400.

- [ ] **Step 2: Update each gateway service (9 files)**

Two edits per file. Using PO at `purchase-orders.service.ts:1019`:

```ts
  async printToReport(
    id: string,
    user_id: string,
    bu_code: string,
    template_id?: string,
  ): Promise<Result<{ viewer_url: string }>> {
    this.logger.debug(
      { function: 'printToReport', id, template_id },
      PurchaseOrdersService.name,
    );

    const response = await firstValueFrom(
      this.procurementService.send(
        { cmd: 'purchase-orders.print-to-report', service: 'purchase-orders' },
        { id, user_id, bu_code, template_id, ...getGatewayRequestContext() },
      ),
    );
```

Leave the rest of each method untouched. Repeat at each service line in the table, keeping that module's own `cmd` / `service` strings and client property.

- [ ] **Step 3: Type-check**

```bash
bunx tsc --noEmit -p apps/backend-gateway/tsconfig.json
```
Expected: no errors.

- [ ] **Step 4: Run the gateway suite**

```bash
bunx jest apps/backend-gateway
```
Expected: PASS. `purchase-requests.service.spec.ts` asserts the microservice payload; if it uses an exact-object matcher it will now also see `template_id: undefined` — if that fails, update the expectation to include `template_id: undefined` rather than dropping the assertion.

- [ ] **Step 5: Commit and push**

```bash
git add apps/backend-gateway/src
git commit -m "feat(print): optional template_id query param on print-viewer endpoints"
git push -u origin feature/print-form-template-id
```

---

# Phase 2 — Frontend (`carmen-inventory-frontend-react`)

### Task 5: Config key module

**Files:**
- Create: `lib/print-form-config.ts`

**Interfaces:**
- Consumes: `PrintDocumentType` from `lib/print-document.ts`; `BusinessUnitConfigItem` / `BusinessUnitDetail` from `types/business-unit.ts`.
- Produces:
  - `PRINT_FORM_DOCUMENT_TYPES: readonly PrintDocumentType[]`
  - `printFormConfigKey(type: PrintDocumentType): string`
  - `resolvePrintFormTemplateId(config, type): string | undefined`

`lib/print-document.ts` must **not** import this module — the dependency runs one way only, or the two files form a cycle.

- [ ] **Step 1: Create a branch**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-inventory-frontend-react
git checkout -b feature/print-form-config
```

- [ ] **Step 2: Write the module**

```ts
import type { PrintDocumentType } from "@/lib/print-document";
import type {
  BusinessUnitConfigItem,
  BusinessUnitDetail,
} from "@/types/business-unit";

/**
 * document type ที่ตั้งค่าแบบฟอร์มการพิมพ์ได้ — ลำดับเดียวกับที่แสดงในหน้า
 * Default Setting และตรงกับ `report_group` ของ report template ฝั่ง backend
 */
export const PRINT_FORM_DOCUMENT_TYPES: readonly PrintDocumentType[] = [
  "PR",
  "PO",
  "GRN",
  "SR",
  "CN",
  "IA",
  "PC",
  "SC",
  "RFQ",
  "INV",
] as const;

/**
 * key ของ config "แบบฟอร์มการพิมพ์" ของ document type หนึ่ง
 *
 * @param type - document type (เช่น "PR")
 * @returns key ที่เก็บใน BU config (เช่น "print-form.pr")
 */
export function printFormConfigKey(type: PrintDocumentType): string {
  return `print-form.${type.toLowerCase()}`;
}

/**
 * อ่าน report template id ที่ BU ตั้งไว้สำหรับ document type นั้น
 *
 * ค่าว่างหรือไม่มี key = ยังไม่ได้ตั้งค่า → คืน undefined เพื่อให้ backend ใช้
 * mapping เริ่มต้นตามเดิม (GET อาจคืน config เป็น `{}` จึงต้องเช็ค isArray)
 *
 * @param config - `config` จาก BusinessUnitDetail
 * @param type - document type ที่กำลังจะพิมพ์
 * @returns UUID ของ report template หรือ undefined
 */
export function resolvePrintFormTemplateId(
  config: BusinessUnitDetail["config"] | undefined,
  type: PrintDocumentType,
): string | undefined {
  if (!Array.isArray(config)) return undefined;
  const key = printFormConfigKey(type);
  const value = (config as BusinessUnitConfigItem[]).find(
    (i) => i.key === key,
  )?.value;
  return value ? value : undefined;
}
```

- [ ] **Step 3: Type-check**

```bash
bunx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/print-form-config.ts
git commit -m "feat(print-form): add print-form config key helpers"
```

---

### Task 6: Registry section + registry test

**Files:**
- Modify: `routes/system-admin/company-profile/company-profile-config-registry.ts` (`SeededConfigItem` at `:17-30`, `CONFIG_SECTIONS` at `:44-102`, `ConfigSectionEntry` at `:114-122`, `groupConfigForRender` at `:160-174`)
- Modify: `routes/system-admin/company-profile/company-profile-config-registry.test.ts` (append)

**Interfaces:**
- Consumes: `printFormConfigKey`, `PRINT_FORM_DOCUMENT_TYPES` (Task 5).
- Produces: `SeededConfigItem.optionsGroup?: string`; `ConfigSectionEntry.optionsGroup?: string`; a `printForm` section in `CONFIG_SECTIONS`.

- [ ] **Step 1: Add `optionsGroup` to `SeededConfigItem`**

After the `options?: ConfigOption[]` field at `:29`:

```ts
  /**
   * สำหรับ enum ที่ options มาจาก report-template API (ไม่ใช่ static `options`)
   * ค่าคือ `report_group` ที่ใช้กรอง เช่น "PR" — ใช้พร้อม `options` ไม่ได้
   */
  optionsGroup?: string;
```

- [ ] **Step 2: Add the same field to `ConfigSectionEntry`**

After its `options?: ConfigOption[]` field at `:121`:

```ts
  /** สำหรับ enum ที่ options มาจาก API — report_group ที่ใช้กรอง */
  optionsGroup?: string;
```

- [ ] **Step 3: Import the key helper**

At the top of the registry file, beside the existing type import:

```ts
import { printFormConfigKey } from "@/lib/print-form-config";
import type { PrintDocumentType } from "@/lib/print-document";
```

- [ ] **Step 4: Append the `printForm` section to `CONFIG_SECTIONS`**

After the `po` section (`:101`), inside the array. `key` is derived so it can never drift from `printFormConfigKey`; `labelKey` is written out so it stays greppable.

```ts
  {
    id: "printForm",
    titleKey: "sections.printForm",
    descKey: "sections.printFormDesc",
    items: (
      [
        ["PR", "PR - Purchase Request", "config.printFormPr"],
        ["PO", "PO - Purchase Order", "config.printFormPo"],
        ["GRN", "GRN - Good Received Note", "config.printFormGrn"],
        ["SR", "SR - Store Requisition", "config.printFormSr"],
        ["CN", "CN - Credit Note", "config.printFormCn"],
        ["IA", "IA - Inventory Adjustment", "config.printFormIa"],
        ["PC", "PC - Physical Count", "config.printFormPc"],
        ["SC", "SC - Spot Check", "config.printFormSc"],
        ["RFQ", "RFQ - Request For Quotation", "config.printFormRfq"],
        ["INV", "INV - Invoice", "config.printFormInv"],
      ] as [PrintDocumentType, string, string][]
    ).map(([type, label, labelKey]) => ({
      key: printFormConfigKey(type),
      datatype: "enum",
      defaultValue: "",
      label,
      labelKey,
      optionsGroup: type,
    })),
  },
```

- [ ] **Step 5: Carry `optionsGroup` through `groupConfigForRender`**

At `:165`, extend the pushed entry:

```ts
        entries.push({
          ...found,
          labelKey: seeded.labelKey,
          options: seeded.options,
          optionsGroup: seeded.optionsGroup,
        });
```

- [ ] **Step 6: Append the registry test**

Add to the end of `company-profile-config-registry.test.ts`. Import `printFormConfigKey` and `PRINT_FORM_DOCUMENT_TYPES` from `@/lib/print-form-config` at the top of the file.

```ts
describe("Print Form config registry", () => {
  const section = CONFIG_SECTIONS.find((s) => s.id === "printForm");

  it("registers one enum item per printable document type", () => {
    expect(section).toBeDefined();
    expect(section?.items).toHaveLength(PRINT_FORM_DOCUMENT_TYPES.length);
    expect(section?.items.map((i) => i.key)).toEqual(
      PRINT_FORM_DOCUMENT_TYPES.map(printFormConfigKey),
    );
  });

  it("defaults every item to empty (use the system default) with no static options", () => {
    for (const item of section?.items ?? []) {
      expect(item.datatype).toBe("enum");
      expect(item.defaultValue).toBe("");
      expect(item.options).toBeUndefined();
    }
  });

  it("points each item at its report_group and its own label key", () => {
    expect(
      section?.items.map((i) => [i.optionsGroup, i.labelKey]),
    ).toEqual([
      ["PR", "config.printFormPr"],
      ["PO", "config.printFormPo"],
      ["GRN", "config.printFormGrn"],
      ["SR", "config.printFormSr"],
      ["CN", "config.printFormCn"],
      ["IA", "config.printFormIa"],
      ["PC", "config.printFormPc"],
      ["SC", "config.printFormSc"],
      ["RFQ", "config.printFormRfq"],
      ["INV", "config.printFormInv"],
    ]);
  });

  it("exposes optionsGroup on rendered entries", () => {
    const groups = groupConfigForRender(mergeSeededConfig([]));
    const rendered = groups.sections.find((s) => s.id === "printForm");
    expect(
      rendered?.entries.find((e) => e.item.key === "print-form.pr")
        ?.optionsGroup,
    ).toBe("PR");
  });
});
```

- [ ] **Step 7: Run the registry tests**

```bash
bun test:run routes/system-admin/company-profile/
```
Expected: PASS, including the pre-existing grouping test that asserts `groups.sections` has `CONFIG_SECTIONS.length` entries — it is derived, so the new section does not break it.

- [ ] **Step 8: Type-check and commit**

```bash
bunx tsc --noEmit
git add routes/system-admin/company-profile/company-profile-config-registry.ts \
        routes/system-admin/company-profile/company-profile-config-registry.test.ts
git commit -m "feat(print-form): seed print form config items per document type"
```

---

### Task 7: i18n + options hook

**Files:**
- Create: `types/report-form-template.ts`
- Create: `hooks/use-report-form-templates.ts`
- Modify: `constant/api-endpoints.ts` (near `REPORT_TEMPLATES` at `:301`)
- Modify: `constant/query-keys.ts` (near `REPORT_TEMPLATES` at `:103`)
- Modify: `messages/en.json`, `messages/th.json` (`defaultSetting.sections` and `defaultSetting.config`)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `interface ReportFormTemplate { id: string; name: string; description: string | null; report_group: string }`
  - `type ReportFormOption = { value: string; label: string }`
  - `useReportFormTemplates(): UseQueryResult<Map<string, ReportFormOption[]>>`
  - i18n keys `defaultSetting.sections.printForm`, `.printFormDesc`, `defaultSetting.config.printForm{Pr,Po,Grn,Sr,Cn,Ia,Pc,Sc,Rfq,Inv}`, `.printFormUnknown`, `.printFormLoading`

- [ ] **Step 1: Add the endpoint constant**

In `constant/api-endpoints.ts`, beside `REPORT_TEMPLATES`:

```ts
  /** platform-level form templates (ไม่ผูก BU) — ใช้เลือกแบบฟอร์มการพิมพ์ */
  REPORT_TEMPLATE_FORMS: "/api/proxy/api-system/report-templates/forms",
```

- [ ] **Step 2: Add the query key**

In `constant/query-keys.ts`, after `REPORT_TEMPLATES`:

```ts
  REPORT_TEMPLATE_FORMS: "report-template-forms",
```

- [ ] **Step 3: Add the response row type**

`types/report-form-template.ts`:

```ts
/**
 * แถวจาก `GET /api-system/report-templates/forms`
 * (เฉพาะ field ที่หน้าเลือกแบบฟอร์มการพิมพ์ใช้ — endpoint คืนมามากกว่านี้)
 */
export interface ReportFormTemplate {
  id: string;
  name: string;
  description: string | null;
  /** กลุ่มรายงาน = document type code เช่น "PR" */
  report_group: string;
}
```

- [ ] **Step 4: Write the hook**

`hooks/use-report-form-templates.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";
import { ApiError } from "@/lib/api-error";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { CACHE_STATIC } from "@/lib/cache-config";
import type { ReportFormTemplate } from "@/types/report-form-template";

/** option ของ dropdown เลือกแบบฟอร์ม — value = template id, label = ชื่อ template */
export type ReportFormOption = { value: string; label: string };

/**
 * Hook ดึง report template ชนิด form ทั้งหมด แล้วจัดกลุ่มตาม `report_group`
 *
 * ยิงครั้งเดียวโดยไม่ส่ง `group` (perpage=-1 = ไม่จำกัดจำนวน) แทนการยิงทีละ
 * document type — หน้า Default Setting ต้องใช้ครบทุกกลุ่มพร้อมกันอยู่แล้ว
 *
 * @returns query ที่คืน `Map<report_group, ReportFormOption[]>`
 */
export function useReportFormTemplates() {
  return useQuery<Map<string, ReportFormOption[]>>({
    queryKey: [QUERY_KEYS.REPORT_TEMPLATE_FORMS],
    queryFn: async () => {
      const res = await httpClient.get(
        `${API_ENDPOINTS.REPORT_TEMPLATE_FORMS}?perpage=-1`,
      );
      if (!res.ok) {
        throw await ApiError.from(res, "Failed to fetch report form templates");
      }
      const json = await res.json();
      // paginated StdResponse วาง rows ไว้ที่ `data`; เผื่อ envelope แบบ
      // `data.items` ที่ app-config list ใช้ (ยืนยันของจริงในเบราว์เซอร์แล้ว)
      const rows: ReportFormTemplate[] = Array.isArray(json.data)
        ? json.data
        : (json.data?.items ?? []);

      const map = new Map<string, ReportFormOption[]>();
      for (const row of rows) {
        const group = (row.report_group ?? "").toUpperCase();
        if (!group || !row.id) continue;
        const list = map.get(group) ?? [];
        list.push({ value: row.id, label: row.name || row.id });
        map.set(group, list);
      }
      return map;
    },
    ...CACHE_STATIC,
  });
}
```

- [ ] **Step 5: Add the English strings**

In `messages/en.json` under `defaultSetting.sections`, after `"poDesc"`:

```json
    "printForm": "Print Forms",
    "printFormDesc": "Report form used when printing each document type."
```

and under `defaultSetting.config`, after `"poGroupByPrComment"`:

```json
    "printFormPr": "PR - Purchase Request",
    "printFormPo": "PO - Purchase Order",
    "printFormGrn": "GRN - Good Received Note",
    "printFormSr": "SR - Store Requisition",
    "printFormCn": "CN - Credit Note",
    "printFormIa": "IA - Inventory Adjustment",
    "printFormPc": "PC - Physical Count",
    "printFormSc": "SC - Spot Check",
    "printFormRfq": "RFQ - Request For Quotation",
    "printFormInv": "INV - Invoice",
    "printFormLoading": "Loading forms…",
    "printFormUnknown": "⚠ Unknown template ({id})",
    "printFormLoadError": "Could not load report forms."
```

Mind the commas: `"poGroupByPrComment"` currently ends its object, so it needs a trailing comma once these follow.

- [ ] **Step 6: Add the Thai strings**

Same two places in `messages/th.json`:

```json
    "printForm": "แบบฟอร์มการพิมพ์",
    "printFormDesc": "แบบฟอร์มรายงานที่ใช้พิมพ์สำหรับเอกสารแต่ละประเภท"
```

```json
    "printFormPr": "PR - ใบขอซื้อ",
    "printFormPo": "PO - ใบสั่งซื้อ",
    "printFormGrn": "GRN - ใบรับสินค้า",
    "printFormSr": "SR - ใบเบิกสินค้า",
    "printFormCn": "CN - ใบลดหนี้",
    "printFormIa": "IA - ปรับปรุงสินค้าคงคลัง",
    "printFormPc": "PC - ตรวจนับสินค้า",
    "printFormSc": "SC - ตรวจสอบเฉพาะจุด",
    "printFormRfq": "RFQ - ขอใบเสนอราคา",
    "printFormInv": "INV - ใบแจ้งหนี้",
    "printFormLoading": "กำลังโหลดแบบฟอร์ม…",
    "printFormUnknown": "⚠ ไม่พบเทมเพลต ({id})",
    "printFormLoadError": "โหลดรายการแบบฟอร์มรายงานไม่สำเร็จ"
```

- [ ] **Step 7: Verify both message files are valid JSON and the key sets match**

```bash
node -e "
const en=require('./messages/en.json'), th=require('./messages/th.json');
const ek=Object.keys(en.defaultSetting.config).sort(), tk=Object.keys(th.defaultSetting.config).sort();
console.log('config keys equal:', JSON.stringify(ek)===JSON.stringify(tk));
console.log('sections equal:', JSON.stringify(Object.keys(en.defaultSetting.sections).sort())===JSON.stringify(Object.keys(th.defaultSetting.sections).sort()));
"
```
Expected: both lines print `true`.

- [ ] **Step 8: Type-check and commit**

```bash
bunx tsc --noEmit
git add types/report-form-template.ts hooks/use-report-form-templates.ts \
        constant/api-endpoints.ts constant/query-keys.ts messages/en.json messages/th.json
git commit -m "feat(print-form): fetch report form templates grouped by report group"
```

---

### Task 8: Render the Print Forms section

**Files:**
- Modify: `routes/system-admin/company-profile/company-profile-ui.tsx` (`ConfigField` at `:358-421`, enum branch at `:421-447`)
- Modify: `routes/system-admin/default-setting/default-setting-component.tsx` (`:170-204`)

**Interfaces:**
- Consumes: `useReportFormTemplates`, `ReportFormOption` (Task 7); `ConfigSectionEntry.optionsGroup` (Task 6).
- Produces: `ConfigField` gains `readonly disabled?: boolean`; no other public surface.

- [ ] **Step 1: Make `ConfigField` tolerate an empty enum option list**

At `:380-381` the enum test currently reads:

```ts
  const isEnum =
    item.datatype === "enum" && options != null && options.length > 0;
```

Change it to:

```ts
  const isEnum = item.datatype === "enum" && options != null;
```

Without this, an enum whose options have not arrived yet falls through to the final `return` and renders a free-text `<Input>` bound to the config value — the user could type anything into it.

- [ ] **Step 2: Add a `disabled` prop to `ConfigField`**

Add to the destructured props and the prop type at `:358-378`:

```ts
  disabled,
```

```ts
  /** ปิดการแก้ไขชั่วคราว (เช่น options ยังโหลดไม่เสร็จ) */
  readonly disabled?: boolean;
```

and pass it to the enum `<Select>` at `:428`:

```ts
            <Select
              value={typeof field.value === "string" ? field.value : ""}
              onValueChange={field.onChange}
              disabled={disabled}
            >
```

- [ ] **Step 3: Import the hook and helpers in the Default Setting component**

Add to the imports at the top of `default-setting-component.tsx`:

```ts
import {
  useReportFormTemplates,
  type ReportFormOption,
} from "@/hooks/use-report-form-templates";
```

- [ ] **Step 4: Add a module-level options builder**

Above the component (after the imports), so it stays testable and out of the render body:

```ts
/**
 * รวม options ของ dropdown แบบฟอร์มการพิมพ์
 *
 * ถ้าค่าที่เก็บไว้ไม่อยู่ใน list (template ถูกลบ/ปิดใช้งาน) จะเติม option
 * สังเคราะห์ไว้หัวรายการ เพื่อไม่ให้ค่าหายตอน Save และให้ admin เห็นว่ามีปัญหา
 *
 * @param current - ค่าปัจจุบันของ config item (template id หรือ "")
 * @param list - options ของ report_group นั้น (undefined = ยังไม่มีข้อมูล)
 * @param isLoading - hook ยังโหลดอยู่
 * @param unknownLabel - ป้ายสำหรับค่าที่หาไม่เจอ
 * @param loadingLabel - ป้ายระหว่างโหลด
 */
export function buildPrintFormOptions(
  current: string,
  list: ReportFormOption[] | undefined,
  isLoading: boolean,
  unknownLabel: string,
  loadingLabel: string,
): ReportFormOption[] {
  const base = list ?? [];
  if (!current || base.some((o) => o.value === current)) return base;
  return [{ value: current, label: isLoading ? loadingLabel : unknownLabel }, ...base];
}
```

- [ ] **Step 5: Call the hook in the component**

After the `useBusinessUnit` / `useUpdateBusinessUnit` lines (`:52-53`):

```ts
  const formTemplates = useReportFormTemplates();
```

- [ ] **Step 6: Feed the options into `ConfigField`**

Replace the `options` computation and `ConfigField` call inside the section map (`:179-200`) with:

```ts
              {section.entries.map((entry) => {
                const group = entry.optionsGroup;
                const options = group
                  ? buildPrintFormOptions(
                      entry.item.value,
                      formTemplates.data?.get(group),
                      formTemplates.isLoading,
                      t("config.printFormUnknown", { id: entry.item.value }),
                      t("config.printFormLoading"),
                    )
                  : entry.options
                    ? resolveConfigOptions(
                        entry.options,
                        data.calculation_method,
                        entry.item.value,
                      ).map((o) => ({ value: o.value, label: t(o.labelKey) }))
                    : undefined;
                return (
                  <ConfigField
                    key={entry.item.key}
                    editing={editing}
                    form={form}
                    index={entry.index}
                    item={entry.item}
                    label={t(entry.labelKey)}
                    yesLabel={t("yes")}
                    noLabel={t("no")}
                    options={options}
                    disabled={group !== undefined && formTemplates.isLoading}
                  />
                );
              })}
```

- [ ] **Step 7: Surface a fetch failure on the section itself**

The `SettingSection` component accepts an `action` node rendered under the description. Change the section wrapper at `:172-178` to:

```ts
          {configGroups.sections.map((section, i) => (
            <SettingSection
              key={section.id}
              first={i === 0}
              title={t(section.titleKey)}
              description={t(section.descKey)}
              action={
                section.id === "printForm" && formTemplates.isError ? (
                  <p className="text-destructive text-xs">
                    {t("config.printFormLoadError")}
                  </p>
                ) : undefined
              }
            >
```

The rest of the page keeps working when the template list fails; only these dropdowns come up empty.

- [ ] **Step 8: Type-check, lint and test**

```bash
bunx tsc --noEmit && bun run lint && bun test:run routes/system-admin/
```
Expected: no type errors, no new lint errors, tests pass.

- [ ] **Step 9: Commit**

```bash
git add routes/system-admin/company-profile/company-profile-ui.tsx \
        routes/system-admin/default-setting/default-setting-component.tsx
git commit -m "feat(print-form): render the Print Forms section with fetched options"
```

---

### Task 9: Apply the configured template when printing

**Files:**
- Modify: `lib/print-document.ts` (`PrintDocumentOptions` at `:39-60`, dedicated-endpoint branch at `:115-134`)
- Modify: `hooks/use-print-document.ts` (`:25-52`)

**Interfaces:**
- Consumes: `resolvePrintFormTemplateId` (Task 5); the backend `?template_id=` param (Task 4).
- Produces: `PrintDocumentOptions.templateId?: string`. `usePrintDocument().print` keeps its existing signature.

- [ ] **Step 1: Add `templateId` to `PrintDocumentOptions`**

After the `filters` field at `:53`:

```ts
  /**
   * Report template to render with. Normally supplied by usePrintDocument()
   * from the BU's print-form config; pass it explicitly to override. Omitted
   * means the server picks the default mapping for this document type.
   */
  templateId?: string;
```

- [ ] **Step 2: Append the query param on the dedicated path**

Replace `:117-119` (the `const url = dedicated(...)` line and the `httpClient.get`) with:

```ts
    const endpoint = dedicated(buCode, options.documentId);
    const requestUrl = options.templateId
      ? `${endpoint}?template_id=${encodeURIComponent(options.templateId)}`
      : endpoint;
    const res = await httpClient.get(requestUrl);
```

Leave the rest of that branch alone — it already reads `viewer_url` out of the response into its own `viewerUrl` variable, so nothing else references the old `url` binding.

- [ ] **Step 3: Resolve the template in the hook**

Rewrite `hooks/use-print-document.ts` so it reads the BU config. The full file:

```ts

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import {
  printDocument,
  type PrintDocumentOptions,
  type PrintDocumentResult,
  type PrintDocumentType,
} from "@/lib/print-document";
import { resolvePrintFormTemplateId } from "@/lib/print-form-config";
import { useBuCode } from "@/hooks/use-bu-code";
import { useBusinessUnit } from "@/hooks/use-business-unit";
import { useProfile } from "@/hooks/use-profile";

export interface UsePrintDocumentResult {
  print: (
    documentType: PrintDocumentType,
    options?: PrintDocumentOptions,
  ) => Promise<PrintDocumentResult | null>;
  isPrinting: boolean;
}

/**
 * UI-side wrapper around printDocument(): pulls buCode from context, applies the
 * BU's configured print form, manages a loading flag so callers can disable
 * buttons, and surfaces failures via toast.
 *
 * The form comes from the BU record (`useBusinessUnit`), not from the profile —
 * `useProfile().defaultBu.config` is a different, curated object shape that does
 * not carry the config array the Default Setting page edits. The query is cached
 * for 5 minutes, so this costs no extra request per print.
 */
export function usePrintDocument(): UsePrintDocumentResult {
  const buCode = useBuCode();
  const { defaultBu } = useProfile();
  const { data: businessUnit } = useBusinessUnit(defaultBu?.id);
  const t = useTranslations("common");
  const [isPrinting, setIsPrinting] = useState(false);

  const print = async (
    documentType: PrintDocumentType,
    options?: PrintDocumentOptions,
  ): Promise<PrintDocumentResult | null> => {
    if (!buCode) {
      toast.error("Business unit not selected");
      return null;
    }
    setIsPrinting(true);
    try {
      // caller-supplied templateId wins over the BU config
      const templateId =
        options?.templateId ??
        resolvePrintFormTemplateId(businessUnit?.config, documentType);
      const result = await printDocument(buCode, documentType, {
        ...options,
        templateId,
      });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`${t("print")}: ${message}`);
      return null;
    } finally {
      setIsPrinting(false);
    }
  };

  return { print, isPrinting };
}
```

- [ ] **Step 4: Type-check, lint, full test run, build**

```bash
bunx tsc --noEmit && bun run lint && bun test:run && bun run build
```
Expected: no type errors; no new lint errors; the only failures are the 3 pre-existing `routes/external/pl` tests that already fail on `main`; `✓ built`.

- [ ] **Step 5: Commit and push**

```bash
git add lib/print-document.ts hooks/use-print-document.ts
git commit -m "feat(print-form): print with the business unit's configured form"
git push -u origin feature/print-form-config
```

---

# Phase 3 — End-to-end verification

### Task 10: Verify against a running backend

Unit tests cannot catch the two things most likely to be wrong here: the response envelope of the forms endpoint, and whether the backend actually honours the query param. Both need a real browser and a real gateway.

**Files:** none — this task changes nothing unless a defect is found.

- [ ] **Step 1: Start the backend and the frontend**

Run the backend gateway on port 4000 from the `feature/print-form-template-id` branch, then:

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-inventory-frontend-react
VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev
```

Note: the `:4000` backend points at the shared dev database. Reads are fine; the only write in this checklist is saving BU config for the BU you log in as.

- [ ] **Step 2: Confirm the response envelope**

Log in, open `/system-admin/default-setting`, and in DevTools → Network inspect the response of `api-system/report-templates/forms?perpage=-1`. Confirm the rows are at `data` (an array). If they are at `data.items` instead, the hook's fallback already handles it — but update the comment in `hooks/use-report-form-templates.ts` to state which shape is real, so the next reader is not misled.

- [ ] **Step 3: Check the section renders**

The **Print Forms** section appears last on the page with ten rows (PR … INV). Press **Edit**: each row is a dropdown. Rows whose `report_group` has templates are populated; empty ones are allowed. Zero console errors.

- [ ] **Step 4: Save and reload**

Pick a non-default form for **PR**, press **Save**, confirm the success toast, then reload the page. The chosen form is still selected and shown by name (not by UUID) in view mode.

- [ ] **Step 5: Print with the configured form**

Open a purchase request and press Print. In Network, the `…/purchase-requests/<id>/print-viewer` request carries `?template_id=<the uuid you picked>` and returns 200. The rendered document uses the chosen layout.

- [ ] **Step 6: Confirm the fallback still works**

Back in Default Setting, clear the PR value (select the blank/first entry), Save, then print the same PR again. The request has no `template_id` and the document renders via the default mapping exactly as before this change.

- [ ] **Step 7: Confirm a bad value fails loudly**

In DevTools, call the print endpoint directly with a template id belonging to a different group (e.g. a PO form id on the PR endpoint). Expect **404**, not a silently different layout.

- [ ] **Step 8: Record the outcome**

If every step passed, note it in both PR descriptions. If any step failed, stop and report the exact request, response and console output rather than patching around it.

---

## Open items to carry into the PR descriptions

- **`INV` cannot print yet.** The gateway has no `…/invoice/:id/print-viewer` route, so `lib/print-document.ts:86` points at an endpoint that does not exist. The `print-form.inv` row stores a value and is ready for the day that endpoint lands; until then INV printing fails exactly as it does today. Pre-existing, out of scope.
- **`tb_print_template_mapping` removal is a separate follow-up.** It stays here as the no-config-yet default. The spec's "Follow-up work" section records the measured blast radius — a backend CRUD module, seeds, permissions and a `DROP TABLE`, plus 9 files / 69 references of admin UI in the third repo `carmen-platform`. It can only be dropped once every BU has its Print Forms configured.
