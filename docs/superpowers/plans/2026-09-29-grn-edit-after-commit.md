# GRN Edit After Commit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **User preference (overrides TDD):** do NOT write new `*.spec.ts` / `*.test.ts` files and skip
> "write failing test / run to fail" steps. Static checks (tsc, lint) and existing suites still run.
> Commit messages in Thai.

**Goal:** A committed GRN can have its header fields ②–⑦ edited until it is voided or pulled into a non-void AP Invoice.

**Architecture:** Backend exposes `ap_invoices` on GRN detail and guards `update()` by the GRN's
current status (voided → reject; committed → reject if AP-linked, else header-key allowlist).
Frontend reads `ap_invoices` to show/disable Edit and locks everything except ②–⑦ on committed
GRNs. Also fixes the pre-existing bug where `invoice_date` is stripped by the gateway update schema.

**Tech Stack:** NestJS + Prisma + zod (nestjs-zod) microservices (backend-gateway → micro-business over TCP); Vite + React 19 + react-hook-form + use-intl (frontend).

**Spec:** `docs/superpowers/specs/2026-09-29-grn-edit-after-commit-design.md` (frontend repo)

## Global Constraints

- Repos: backend `../carmen-turborepo-backend-v2` (branch `feature/grn-edit-after-commit` from `main`), frontend this repo (continue on `fix/grn-edit-saved`).
- Committed GRN editable keys (exact): `post_type`, `credit_term_id`, `credit_term_name`, `credit_term_days`, `invoice_no`, `invoice_date`, `invoice_f`, `payment_due_date`, `description` (+ `id`, `doc_version`).
- Always locked on committed: Vendor, GRN Date, Currency, Exchange rate, item lines, extra cost.
- "AP-linked" = any `tb_ap_invoice` reached via `tb_ap_invoice_detail_source.good_received_note_id` → `tb_ap_invoice_detail` with `doc_status != 'void'` and `deleted_at IS NULL`.
- Deploy order: backend before frontend. No migration.
- Backend tests: `jest` (never `bun test`). `:4000` local gateway = shared dev DB — PATCH only a test GRN the user approved.
- i18n strings must not contain `{{` `}}` (ICU); placeholders use single braces.

## Review Focus

- Committed GRN saved from the UI must never send `doc_status` → Task 6 Step 1 replaces the hard-coded `"saved"`; otherwise every committed save fails with `GRN_COMMITTED_HEADER_ONLY`.
- AP invoice that is `void` or soft-deleted must NOT lock the GRN → Task 2 query filter; verified in Task 4.
- One AP invoice pulling several lines of the same GRN → listed once → Task 2 distinct by id.
- New FE on old backend (no `ap_invoices`, no guard) → committed GRNs editable without AP check; mitigated only by deploying backend first (Global Constraints).
- `invoice_date` edits on draft/saved GRNs start persisting too (behavior change) → verified in Task 4.

---

## File Structure

Backend (`carmen-turborepo-backend-v2`):
- Modify `packages/error-catalog/src/catalog.ts` — 3 new GRN error entries
- Modify `apps/backend-gateway/src/common/dto/good-received-note/good-received-note.dto.ts` — `invoice_date` in update schema
- Modify `apps/micro-business/src/inventory/good-received-note/dto/good-received-note.dto.ts` — same
- Modify `apps/backend-gateway/src/application/good-received-notes/swagger/request.ts` — swagger prop
- Create `apps/micro-business/src/inventory/good-received-note/good-received-note.ap-link.ts` — `findActiveApInvoicesForGrn()` + `checkGrnUpdateAllowed()` (one job: may this GRN be edited, given status and AP link)
- Modify `apps/micro-business/src/inventory/good-received-note/good-received-note.service.ts` — `findOne` adds `ap_invoices`; `update()` calls the guard
- Modify both `good-received-note.serializer.ts` (micro + gateway) — `ap_invoices` in detail response

Frontend (this repo):
- Modify `types/goods-receive-note.ts`, `routes/procurement/goods-receive-note/grn-header.tsx`, `grn-form.tsx`, `grn-form-header.tsx`, `messages/en.json`, `messages/th.json`

---

### Task 1: Backend — error catalog entries + `invoice_date` in update schemas

**Files:**
- Modify: `packages/error-catalog/src/catalog.ts` (after `GRN_DISCOUNT_EXCEEDS_LINE_AMOUNT`; GRN ids currently end at 25)
- Modify: `apps/backend-gateway/src/common/dto/good-received-note/good-received-note.dto.ts:225`
- Modify: `apps/micro-business/src/inventory/good-received-note/dto/good-received-note.dto.ts:333`
- Modify: `apps/backend-gateway/src/application/good-received-notes/swagger/request.ts:~283`

**Interfaces:**
- Produces: `ERROR_CATALOG.GRN_VOIDED_NOT_EDITABLE`, `ERROR_CATALOG.GRN_AP_LINKED_NOT_EDITABLE` (param `{doc_nos}`), `ERROR_CATALOG.GRN_COMMITTED_HEADER_ONLY` (param `{fields}`)

- [ ] **Step 1: Create branch**

```bash
cd ../carmen-turborepo-backend-v2 && git status --short && git switch main && git pull --ff-only && git switch -c feature/grn-edit-after-commit
```
(If `git status` shows changes, stop and ask — parallel sessions share this repo.)

- [ ] **Step 2: Confirm next free ids**

Run: `grep -o "makeId(MODULE.GOOD_RECEIVED_NOTE, [0-9]*)" packages/error-catalog/src/catalog.ts | grep -o "[0-9]*)" | tr -d ')' | sort -n | tail -1`
Expected: `25` (if higher, shift the three ids below accordingly)

- [ ] **Step 3: Add catalog entries** directly after the `GRN_DISCOUNT_EXCEEDS_LINE_AMOUNT` entry:

```ts
  GRN_VOIDED_NOT_EDITABLE: {
    code: 'GRN_VOIDED_NOT_EDITABLE',
    id: makeId(MODULE.GOOD_RECEIVED_NOTE, 26),
    http_status: 400,
    message_en: 'A voided GRN cannot be edited',
    message_th: 'แก้ไขใบรับสินค้าที่ยกเลิกแล้วไม่ได้',
  },
  GRN_AP_LINKED_NOT_EDITABLE: {
    code: 'GRN_AP_LINKED_NOT_EDITABLE',
    id: makeId(MODULE.GOOD_RECEIVED_NOTE, 27),
    http_status: 400,
    message_en: 'This GRN is already on AP invoice {doc_nos} and can no longer be edited',
    message_th: 'ใบรับสินค้านี้ถูกดึงไปที่ AP Invoice {doc_nos} แล้ว แก้ไขไม่ได้',
  },
  GRN_COMMITTED_HEADER_ONLY: {
    code: 'GRN_COMMITTED_HEADER_ONLY',
    id: makeId(MODULE.GOOD_RECEIVED_NOTE, 28),
    http_status: 400,
    message_en:
      'A committed GRN only allows post type, credit term, invoice no/date, due date and description to change (rejected: {fields})',
    message_th:
      'ใบรับสินค้าที่ยืนยันแล้วแก้ได้เฉพาะ post type, credit term, เลข/วันที่ใบแจ้งหนี้, วันครบกำหนด และคำอธิบาย (ฟิลด์ที่ไม่อนุญาต: {fields})',
  },
```

- [ ] **Step 4: Add `invoice_date` to both update schemas.** In each dto file, directly below the existing `invoice_f:` line inside `GoodReceivedNoteUpdateSchema`:

```ts
  // invoice_f was the only invoice-date key this schema declared, so the invoice_date the
  // frontend sends was stripped by the validation pipe — PATCH returned 200 and the date never
  // moved. invoice_f stays for any client that still sends it.
  // schema เคยประกาศแค่ invoice_f ค่า invoice_date ที่หน้าบ้านส่งมาจึงถูกตัดทิ้ง PATCH ตอบ 200
  // แต่วันที่ไม่ขยับ คง invoice_f ไว้เผื่อ client ที่ยังส่งชื่อนี้
  invoice_date: z.string().datetime().pipe(z.coerce.date()).optional(),
```

- [ ] **Step 5: Swagger prop** — in `swagger/request.ts`, in the update request class that declares `invoice_f?: string;` (~line 283), add directly below it:

```ts
  @ApiPropertyOptional({
    description: 'Invoice date (ISO 8601)',
    example: '2026-03-09T00:00:00.000Z',
  })
  invoice_date?: string;
```

- [ ] **Step 6: Build error-catalog dist and type-check**

Run: `(cd packages/error-catalog && bun run build:package) && (cd apps/micro-business && bunx tsc --noEmit) && (cd apps/backend-gateway && bunx tsc --noEmit)`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add packages/error-catalog/src apps/backend-gateway/src/common/dto/good-received-note/good-received-note.dto.ts apps/micro-business/src/inventory/good-received-note/dto/good-received-note.dto.ts apps/backend-gateway/src/application/good-received-notes/swagger/request.ts
git commit -m "fix(grn): รับ invoice_date ตอนแก้ใบ + เพิ่ม error code สำหรับด่านแก้ใบ committed/void"
```
(If `git status` shows `packages/error-catalog/dist` as tracked and modified, add it too.)

---

### Task 2: Backend — AP-link lookup + edit guard module

**Files:**
- Create: `apps/micro-business/src/inventory/good-received-note/good-received-note.ap-link.ts`

**Interfaces:**
- Consumes: `ERROR_CATALOG.*` from Task 1
- Produces:
  - `type GrnApInvoiceRef = { id: string; doc_no: string; doc_status: string }`
  - `findActiveApInvoicesForGrn(prisma: any, grnId: string): Promise<GrnApInvoiceRef[]>`
  - `checkGrnUpdateAllowed(prisma: any, grn: { id: string; doc_status: string }, data: Record<string, unknown>): Promise<Result<unknown> | null>` — `null` = allowed

- [ ] **Step 1: Resolve import specifiers.** Run
`grep -n "^import" apps/micro-business/src/inventory/good-received-note/good-received-note.service.ts`
and reuse the exact module specifiers it uses for `enum_good_received_note_status`, `ERROR_CATALOG`, and `Result`. Confirm relation names with
`awk '/^model tb_ap_invoice_detail_source/,/^}/' packages/prisma-shared-schema-tenant/prisma/schema.prisma` and the same for `tb_ap_invoice_detail` (expected relation fields `tb_ap_invoice_detail` and `tb_ap_invoice`).

- [ ] **Step 2: Write the module** (replace the three import lines with the specifiers from Step 1 if they differ)

```ts
import { enum_ap_invoice_status, enum_good_received_note_status } from '@repo/prisma-shared-schema-tenant';
import { ERROR_CATALOG } from '@repo/error-catalog';
import { Result } from '@repo/nest-result';

export type GrnApInvoiceRef = { id: string; doc_no: string; doc_status: string };

// Keys a committed GRN may still change: the vendor-invoice facts that arrive after the goods
// do. Everything else either moved stock (lines, extra cost, currency, rate) or identifies the
// receipt (vendor, date, status) and is fixed once committed.
// key ที่ใบ committed ยังแก้ได้ คือข้อมูลใบแจ้งหนี้ที่มาถึงทีหลังของ ที่เหลือกระทบสต๊อกหรือเป็นตัวตนของใบ
const COMMITTED_EDITABLE_KEYS = new Set([
  'id',
  'doc_version',
  'post_type',
  'credit_term_id',
  'credit_term_name',
  'credit_term_days',
  'invoice_no',
  'invoice_date',
  'invoice_f',
  'payment_due_date',
  'description',
]);

/**
 * AP invoices (not void, not deleted) that already pulled lines of this GRN
 * AP Invoice ที่ยังไม่ void/ลบ และดึงบรรทัดของ GRN นี้ไปแล้ว
 * @param prisma - Tenant Prisma client / Prisma client ของ tenant
 * @param grnId - GRN id / UUID ใบรับสินค้า
 * @returns Distinct AP invoices / รายการ AP Invoice ไม่ซ้ำ
 */
export async function findActiveApInvoicesForGrn(
  prisma: any,
  grnId: string,
): Promise<GrnApInvoiceRef[]> {
  const sources = await prisma.tb_ap_invoice_detail_source.findMany({
    where: {
      good_received_note_id: grnId,
      tb_ap_invoice_detail: {
        tb_ap_invoice: {
          deleted_at: null,
          doc_status: { not: enum_ap_invoice_status.void },
        },
      },
    },
    select: {
      tb_ap_invoice_detail: {
        select: { tb_ap_invoice: { select: { id: true, doc_no: true, doc_status: true } } },
      },
    },
  });

  // One AP invoice can match several lines of the same GRN — list it once.
  const byId = new Map<string, GrnApInvoiceRef>();
  for (const s of sources) {
    const inv = s.tb_ap_invoice_detail?.tb_ap_invoice;
    if (inv && !byId.has(inv.id)) {
      byId.set(inv.id, { id: inv.id, doc_no: inv.doc_no, doc_status: inv.doc_status });
    }
  }
  return [...byId.values()];
}

/**
 * Decides whether an update payload may be applied to a GRN in its current status
 * ตัดสินว่า payload แก้ไขนี้ใช้กับใบในสถานะปัจจุบันได้หรือไม่
 * @param prisma - Tenant Prisma client / Prisma client ของ tenant
 * @param grn - Current GRN row / แถวใบรับสินค้าปัจจุบัน
 * @param data - Update payload after server-owned keys are removed / payload หลังลบ key ที่ server เป็นเจ้าของ
 * @returns Error result, or null when allowed / Result ข้อผิดพลาด หรือ null เมื่อผ่าน
 */
export async function checkGrnUpdateAllowed(
  prisma: any,
  grn: { id: string; doc_status: string },
  data: Record<string, unknown>,
): Promise<Result<unknown> | null> {
  if (grn.doc_status === enum_good_received_note_status.voided) {
    return Result.errorFromCatalog(ERROR_CATALOG.GRN_VOIDED_NOT_EDITABLE);
  }
  if (grn.doc_status !== enum_good_received_note_status.committed) return null;

  const apInvoices = await findActiveApInvoicesForGrn(prisma, grn.id);
  if (apInvoices.length > 0) {
    return Result.errorFromCatalog(ERROR_CATALOG.GRN_AP_LINKED_NOT_EDITABLE, {
      doc_nos: apInvoices.map((a) => a.doc_no).join(', '),
    });
  }

  const rejected = Object.keys(data).filter(
    (key) => data[key] !== undefined && !COMMITTED_EDITABLE_KEYS.has(key),
  );
  if (rejected.length > 0) {
    return Result.errorFromCatalog(ERROR_CATALOG.GRN_COMMITTED_HEADER_ONLY, {
      fields: rejected.join(', '),
    });
  }
  return null;
}
```

- [ ] **Step 3: Type-check**

Run: `cd apps/micro-business && bunx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add apps/micro-business/src/inventory/good-received-note/good-received-note.ap-link.ts
git commit -m "feat(grn): helper หา AP Invoice ที่ดึง GRN ไปแล้ว + ด่านตรวจการแก้ใบตามสถานะ"
```

---

### Task 3: Backend — wire into `findOne` / `update()` + response schemas

**Files:**
- Modify: `apps/micro-business/src/inventory/good-received-note/good-received-note.service.ts` (`findOne` `responseData` ~L291; `update()` after `delete data.received_by_name;` ~L1402)
- Modify: `apps/micro-business/src/inventory/good-received-note/dto/good-received-note.serializer.ts` (~L180, after `extra_cost:` in `GoodReceivedNoteDetailResponseSchema`)
- Modify: `apps/backend-gateway/src/common/dto/good-received-note/good-received-note.serializer.ts` (~L258, after `extra_cost:` in `GoodReceivedNoteDetailResponseSchema`)

**Interfaces:**
- Consumes: `findActiveApInvoicesForGrn`, `checkGrnUpdateAllowed` (Task 2)
- Produces: GRN detail JSON field `ap_invoices: { id, doc_no, doc_status }[]`

- [ ] **Step 1: Import** at top of the service:

```ts
import { checkGrnUpdateAllowed, findActiveApInvoicesForGrn } from './good-received-note.ap-link';
```

- [ ] **Step 2: `findOne`** — replace the `responseData` block with:

```ts
    const apInvoices = await findActiveApInvoicesForGrn(prisma, id);

    const responseData = {
      ...goodReceivedNote,
      good_received_note_detail: goodReceivedNoteDetailWithItems,
      extra_cost: extraCost,
      ap_invoices: apInvoices,
      last_action: buildLastAction(goodReceivedNote),
    };
```

- [ ] **Step 3: `update()`** — directly after `delete data.received_by_name;` insert:

```ts
    // A committed receipt stays editable for the vendor-invoice facts until AP picks it up; a
    // voided one is closed. Draft and saved are unaffected.
    // ใบ committed แก้ข้อมูลใบแจ้งหนี้ได้จนกว่า AP จะดึงไป ใบ void ปิดแล้ว ส่วน draft/saved ไม่เปลี่ยน
    const notAllowed = await checkGrnUpdateAllowed(prisma, goodReceivedNote, data as any);
    if (notAllowed) return notAllowed;
```

- [ ] **Step 4: Both serializers** — add after the `extra_cost:` line of `GoodReceivedNoteDetailResponseSchema` (match the file's indentation):

```ts
    ap_invoices: z
      .array(z.object({ id: z.string(), doc_no: z.string(), doc_status: z.string() }))
      .optional(),
```

- [ ] **Step 5: Type-check + existing GRN suites**

Run:
```bash
(cd apps/micro-business && bunx tsc --noEmit && bunx jest src/inventory/good-received-note) && (cd apps/backend-gateway && bunx tsc --noEmit && bunx jest src/application/good-received-notes)
```
Expected: tsc clean; jest all pass. If an existing `findOne`/`update` unit test's prisma mock lacks `tb_ap_invoice_detail_source`, add `tb_ap_invoice_detail_source: { findMany: jest.fn().mockResolvedValue([]) }` to that existing mock (repairing an existing test, not adding a new one).

- [ ] **Step 6: Commit**

```bash
git add apps/micro-business/src/inventory/good-received-note apps/backend-gateway/src/common/dto/good-received-note
git commit -m "feat(grn): ส่ง ap_invoices กับรายละเอียดใบ + ใช้ด่านแก้ใบใน update()"
```

---

### Task 4: Backend — manual verification via curl

**Files:** none

- [ ] **Step 1:** Run backend locally (`bun run dev` in backend root; gateway on :4000). Log in with the dev account (memory: *local-backend-test-accounts*); keep `TOKEN`, `APP_ID`, `BU` in shell variables only — never write them into files.

- [ ] **Step 2:** Confirm routes: `grep -n "@Get(\|@Patch(" apps/backend-gateway/src/application/good-received-notes/good-received-notes.controller.ts`. Ask the user which committed GRN may be PATCHed (dev DB is shared). Find one AP-linked committed GRN and one voided GRN with GET-only list calls.

- [ ] **Step 3: Checks** (substitute ids/route):

```bash
H=(-H "Authorization: Bearer $TOKEN" -H "x-app-id: $APP_ID" -H 'Content-Type: application/json')
B=http://localhost:4000/api/$BU/good-received-note
curl -s "${H[@]}" $B/$COMMITTED_ID | jq '.data.ap_invoices, .data.doc_version, .data.invoice_no, .data.invoice_date'
curl -s -X PATCH "${H[@]}" $B/$COMMITTED_ID -d "{\"doc_version\":$V,\"invoice_no\":\"IV-TEST\",\"invoice_date\":\"2026-09-01T00:00:00.000Z\"}" | jq '.status, .code'
curl -s "${H[@]}" $B/$COMMITTED_ID | jq '.data.invoice_no, .data.invoice_date'   # expect IV-TEST, 2026-09-01
curl -s -X PATCH "${H[@]}" $B/$COMMITTED_ID -d "{\"doc_version\":$V2,\"currency_id\":\"$SAME_CURRENCY_ID\"}" | jq   # expect GRN_COMMITTED_HEADER_ONLY
curl -s -X PATCH "${H[@]}" $B/$AP_LINKED_ID -d '{"description":"x"}' | jq   # expect GRN_AP_LINKED_NOT_EDITABLE
curl -s -X PATCH "${H[@]}" $B/$VOIDED_ID -d '{"description":"x"}' | jq      # expect GRN_VOIDED_NOT_EDITABLE
```
Then PATCH the committed GRN back to its original `invoice_no` / `invoice_date`.

---

### Task 5: Frontend — type, header buttons, tooltip, i18n

**Files:**
- Modify: `types/goods-receive-note.ts:150` (inside `GoodsReceiveNote`, after `doc_version`)
- Modify: `routes/procurement/goods-receive-note/grn-header.tsx`
- Modify: `messages/en.json`, `messages/th.json` (`procurement.goodsReceiveNote`)

**Interfaces:**
- Produces: `export interface GrnApInvoiceRef { id: string; doc_no: string; doc_status: string }`, `GoodsReceiveNote.ap_invoices?: GrnApInvoiceRef[]`

- [ ] **Step 1: Type** — add to `types/goods-receive-note.ts` (above `GoodsReceiveNote`):

```ts
export interface GrnApInvoiceRef {
  id: string;
  doc_no: string;
  doc_status: string;
}
```
and inside `GoodsReceiveNote` after `doc_version?: number;`:
```ts
  // AP Invoice ที่ยังไม่ void ซึ่งดึงใบนี้ไปแล้ว — มีสักใบ = ใบ committed แก้ไม่ได้
  // (optional: backend รุ่นก่อนไม่ส่งมา)
  ap_invoices?: GrnApInvoiceRef[];
```

- [ ] **Step 2: i18n** — add key `editLockedByAp` under `procurement.goodsReceiveNote`:
  - `messages/en.json`: `"editLockedByAp": "Already on AP invoice {docNos} — can no longer be edited"`
  - `messages/th.json`: `"editLockedByAp": "ถูกดึงไปที่ AP Invoice {docNos} แล้ว — แก้ไขไม่ได้"`

- [ ] **Step 3: Header logic** — in `grn-header.tsx` replace the current `isSaved` / `canEdit` block (and its comment) with:

```ts
  // ใบ saved/committed ยังแก้ได้ — saved แก้ได้เกือบทุกช่อง (หลังบ้านลงสต๊อกใหม่ให้),
  // committed แก้ได้เฉพาะข้อมูลใบแจ้งหนี้จนกว่า AP จะดึงไป · ด่านจริงอยู่ที่ update() ของหลังบ้าน
  const isSaved = goodsReceiveNote?.doc_status === "saved";
  const apInvoiceNos = (goodsReceiveNote?.ap_invoices ?? []).map((a) => a.doc_no);
  const apLocked = isCommitted && apInvoiceNos.length > 0;
  const canEdit = !isVoid && !apLocked;
  // ใบที่ถอยกลับเป็นร่างไม่ได้ ไม่มีปุ่มเก็บร่าง
  const isPastDraft = isSaved || isCommitted;
```

Add import:
```ts
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
```

Directly after the existing `{isView && goodsReceiveNote && canEdit && (...)}` Edit button block, add (use whichever translator in this component is bound to `procurement.goodsReceiveNote` — check the `useTranslations` calls at the top):

```tsx
      {/* ใบ committed ที่ AP ดึงไปแล้ว — ปุ่มกดไม่ได้พร้อมเหตุผล คนที่เคยแก้ใบ
          committed ได้จะได้ไม่งงว่าทำไมใบนี้แก้ไม่ได้ */}
      {isView && goodsReceiveNote && apLocked && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button size="sm" variant="outline" disabled>
                <Pencil aria-hidden="true" />
                {tc("edit")}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {t("editLockedByAp", { docNos: apInvoiceNos.join(", ") })}
          </TooltipContent>
        </Tooltip>
      )}
```

In the `{!isView && (...)}` block:
- Save draft condition `{!isSaved && (` → `{!isPastDraft && (` (update the comment above it to mention committed)
- Delete button condition `{goodsReceiveNote && (` → `{goodsReceiveNote && !isCommitted && (`

- [ ] **Step 4: Static checks**

Run: `bun run typecheck && bunx eslint routes/procurement/goods-receive-note types/goods-receive-note.ts`
Expected: no errors (pre-existing warnings OK)

- [ ] **Step 5: Commit**

```bash
git add types/goods-receive-note.ts routes/procurement/goods-receive-note/grn-header.tsx messages/en.json messages/th.json
git commit -m "feat(grn): ใบ committed มีปุ่มแก้ไข เว้นแต่ถูกดึงเข้า AP Invoice แล้ว (ปุ่มกดไม่ได้ + บอกเลข AP)"
```

---

### Task 6: Frontend — lock fields on committed + Save keeps status

**Files:**
- Modify: `routes/procurement/goods-receive-note/grn-form.tsx` (`onSave` ~L423; `GrnFormHeader` props ~L431; `GrnItemTable` / `GrnExtraCostFields` ~L459–462)
- Modify: `routes/procurement/goods-receive-note/grn-form-header.tsx`

**Interfaces:**
- Consumes: `isCommitted` (`grn-form.tsx:45`), existing `lockIdentity` prop (commit `aad1136b`)
- Produces: `GrnFormHeader` prop `lockCommercial?: boolean`

- [ ] **Step 1: Save keeps current status** — in `grn-form.tsx` replace
`onSave={() => actions.handleSubmitWithStatus("saved")}` with:

```tsx
        // ใบ committed ต้องส่งสถานะเดิม — ส่ง "saved" จะทำให้ doc_status นับเป็นค่าที่เปลี่ยน
        // แล้วหลังบ้านปฏิเสธด้วย GRN_COMMITTED_HEADER_ONLY
        onSave={() =>
          actions.handleSubmitWithStatus(isCommitted ? "committed" : "saved")
        }
```

- [ ] **Step 2: Header locks** — in `grn-form.tsx` replace the `lockIdentity={...}` prop on `GrnFormHeader` with:

```tsx
          lockIdentity={
            goodsReceiveNote?.doc_status === "saved" || isCommitted
          }
          lockCommercial={isCommitted}
```

In `grn-form-header.tsx` add to `GrnFormHeaderProps`:
```ts
  /** ใบ committed: สกุลเงิน/เรตล็อก — ต้นทุนสต๊อกลงเป็นสกุลหลักไปแล้วและไม่ถูกลงใหม่ */
  readonly lockCommercial?: boolean;
```
destructure `lockCommercial = false,` and change:
- currency `InputSuffixField`: `disabled={disabled}` → `disabled={disabled || lockCommercial}`
- `LookupCurrency`: `disabled={disabled || fromWizard}` → `disabled={disabled || fromWizard || lockCommercial}`
- exchange-rate `InputSuffixAmount`: `disabled={disabled}` → `disabled={disabled || lockCommercial}`

- [ ] **Step 3: Lines + extra cost locked** — in `grn-form.tsx`:

```tsx
            <GrnItemTable form={form} disabled={isDisabled || isCommitted} />
```
```tsx
            <GrnExtraCostFields form={form} disabled={isDisabled || isCommitted} />
```

- [ ] **Step 4: Static checks + existing tests**

Run: `bun run typecheck && bun run lint && bun test:run routes/procurement/goods-receive-note`
Expected: typecheck clean, 0 lint errors, GRN tests pass

- [ ] **Step 5: Commit**

```bash
git add routes/procurement/goods-receive-note/grn-form.tsx routes/procurement/goods-receive-note/grn-form-header.tsx
git commit -m "feat(grn): ใบ committed แก้ได้เฉพาะหัวใบ ②–⑦ และปุ่ม Save คงสถานะเดิม"
```

---

### Task 7: Frontend — browser verification

**Files:** none

- [ ] **Step 1:** With the backend from Task 4 running and `VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev`, open a committed GRN that is NOT AP-linked and click Edit. Expect: Vendor, GRN Date, Currency, Exchange rate, item table, extra cost disabled; Post Type, Credit Term, Invoice No, Invoice Date, Due Date, Description enabled; buttons = Cancel + Save only.
- [ ] **Step 2:** AP-linked committed GRN: Edit disabled; hover shows `editLockedByAp` with the AP doc no.
- [ ] **Step 3:** Voided GRN: no Edit. Saved GRN: unchanged from commit `aad1136b` (everything editable except Vendor / GRN Date; Save only, no Save draft).
- [ ] **Step 4:** Only with the user's OK (shared dev DB): change Invoice No + Invoice Date on the approved test GRN → Save → success toast, status still Committed, values persist after reload; then restore originals.
- [ ] **Step 5:** Report results; do not push or open PRs unless asked.
