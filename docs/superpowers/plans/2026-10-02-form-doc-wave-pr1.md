# ระลอกเอกสาร — PR 1 (CN + GRN + DocPageSkeleton) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** หัวของ credit-note และ goods-receive-note วาดปุ่มผ่าน `FormToolbar`, ฟอร์มทั้งสองเข้า `FormPageShell width="wide"` โดย footer workflow อยู่ใน slot `footer`, loading ใช้ `DocPageSkeleton` ตัวใหม่ — โดยมี characterization test ของหัวที่เขียนและเขียวบนโค้ดเดิมก่อน

**Architecture:** `CnHeader` / `GrnHeader` คง props เดิมทุกตัว (ฟอร์มเรียกเหมือนเดิม) แต่ข้างในเลิกประกอบปุ่ม — คำนวณ `badges` / `subtitle` / เงื่อนไขเหมือนเดิม แล้วส่งให้ `FormToolbar` · `DocActionsMenu` เป็น `children` (ไม่ส่ง `activity` เพราะเมนูมีอยู่แล้ว) · Delete ที่เดิมแสดงเฉพาะโหมด edit ส่ง `onDelete` เฉพาะตอน edit · GRN ใช้ `submitSlot` (Save draft + Save แบบ handler) และ `writeDisabledReason` แทน Tooltip ของ AP-lock · shell อยู่ใน `CnForm` / `GrnForm` ซึ่งเป็นคอมโพเนนต์ที่ถูก key

**Tech Stack:** React 19 + React Compiler · react-router 7 · Tailwind v4 · use-intl · Vitest + Testing Library · bun

**Spec:** `docs/superpowers/specs/2026-10-02-form-page-shell-documents-design.md` (§2.2 · §2.3 · §3 CN/GRN · §4 · §5) · ผลสำรวจ: `.superpowers/sdd/form-doc-wave-survey.md`

## Global Constraints

- ภาษาสื่อสาร/commit = ไทย · PR title/body อังกฤษ
- ไม่แตะ query / schema / field / i18n key / payload / การ navigate
- branch `feature/form-doc-wave` จาก `main` (มี commit spec `a0abcb8e` ที่ยังไม่ push — จะไปกับ PR นี้) · merge commit ไม่ squash
- gate ทุก task: `bun run typecheck && bun run lint` (baseline 137 / 0) · gate→commit ต่อด้วย `&&` เท่านั้น · การแทน `</div>\n  );\n}` ต้องเล็งตัวแรกหลังจุดเปิด shell
- ก่อน PR: `bun test:run` เขียว ยกเว้น 2 เคส `ap-mock-repository.test.ts`
- **เทสต์:** characterization test 2 ไฟล์ตาม spec §4 (user อนุมัติ) · `cn-general-fields.test.tsx` ต้องเขียวโดยไม่แก้
- hook บล็อก `rm -rf` / `git checkout --` / `--amend`
- เบราว์เซอร์: ไม่กด Save / Submit / Commit / Void / Delete จริง (dev DB ใช้ร่วมกัน) · iframe 596px

## Review Focus

1. **footer ไม่ pin ก้นจอ / หายเมื่อไม่มีรายการ** — `GrnSummaryFooter` คืน null เมื่อไม่มีรายการ แต่ prop `footer` ยัง truthy ทำให้ shell เป็น flex column เสมอ (ไม่มีผลเสีย เหมือน IA ระลอกก่อน) · Task 6 ดูใบ GRN ที่มีรายการน้อยว่า footer ติดก้นจอ และใบ CN ว่า footer อยู่ล่างสุดเสมอ
2. **ตาราง item กว้างเท่าเดิม** — เดิมฟอร์มเต็มความกว้าง main-content (มี px-4 ที่ form) ตอนนี้ shell `wide` + `p-4` → ขอบซ้ายขวาเท่าเดิมโดยประมาณ · Task 6 วัดว่า `<table>` ของรายการไม่แคบลงเกิน 8px
3. **GRN Save draft / Save ไม่ผ่าน gate license** (อยู่ใน `submitSlot`) — เดิมก็ไม่ผ่าน; ปุ่ม Edit/Delete เริ่มถูกปิดเมื่อ license หมดอายุ (เดิมไม่) → PR body ประกาศ
4. **GRN AP-lock** เปลี่ยนจาก Tooltip component (โฟกัสได้ด้วยคีย์บอร์ด) เป็น native `title` บนปุ่มที่ disabled — คนใช้คีย์บอร์ดจะไม่เห็นเหตุผลอีก (spec §3 ยอมรับ) → PR body ประกาศ
5. **ไม่มี Activity ซ้ำ** — `DocActionsMenu` มี Activity อยู่ในเมนู ถ้าเผลอส่ง `activity` ให้ FormToolbar จะมีสองที่ · characterization test เช็คชุดปุ่มบนแถบแบบเป๊ะ (ไม่มี "Activity")

---

### Task 1: branch

```bash
git checkout main && git checkout -b feature/form-doc-wave
```

Expected: HEAD = `a0abcb8e` (spec commit บน main ในเครื่อง)

---

### Task 2: characterization test ของหัว CN + GRN (บนโค้ดเดิม)

**Files:**
- Create: `routes/procurement/credit-note/cn-header.characterization.test.tsx`
- Create: `routes/procurement/goods-receive-note/grn-header.characterization.test.tsx`

**Interfaces:**
- Consumes: `CnHeader` / `GrnHeader` props ปัจจุบัน (ไม่เปลี่ยนใน PR นี้) · `renderForm` จาก `@/lib/test-utils/form-characterization`
- Produces: ตาข่ายสำหรับ Task 4–5 — ต้องเขียวทั้งก่อนและหลัง refactor **โดยไม่แก้ assertion**

**Ruling:** ทดสอบที่ระดับหัว (prop-driven) ไม่ใช่ทั้งฟอร์ม — spec §4 เขียนชื่อไฟล์เป็น `*-form.characterization` แต่ GrnForm ต้อง mock query ลูกหลายสิบตัว ส่วนหัวคือสิ่งที่เปลี่ยนจริงใน PR นี้; footer ไม่ถูกแก้ (แค่ย้ายตำแหน่ง) จึงตรวจในเบราว์เซอร์แทน

- [ ] **Step 1: `cn-header.characterization.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import en from "@/messages/en.json";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { CreditNoteDetail } from "@/types/credit-note";
import type { FormMode } from "@/types/form";
import { renderForm } from "@/lib/test-utils/form-characterization";

/**
 * characterization ของหัวใบลดหนี้ — จับ "ปุ่มอะไรโผล่ในโหมด/สถานะไหน" ก่อนย้ายไป
 * FormToolbar (spec 2026-10-02-form-page-shell-documents-design.md §4) ต้องเขียว
 * ทั้งก่อนและหลังย้ายโดยไม่แก้ assertion — ไม่ตรวจ variant/สีของปุ่ม
 */

const can = { value: (_p: string) => true, isAdmin: true };
vi.mock("@/hooks/use-can", () => ({
  useCan: () => ({
    can: (p: string) => can.value(p),
    canAny: () => true,
    canAll: () => true,
    guard: (_p: unknown, fn: () => void) => fn,
    isAdmin: can.isAdmin,
    permissions: [],
    canWrite: true,
  }),
}));
vi.mock("@/hooks/use-permission-prefix", () => ({
  usePermissionPrefix: () => "procurement.credit_note",
}));
const dispatchPermissionDenied = vi.fn();
vi.mock("@/components/permission-denied-dialog", () => ({
  dispatchPermissionDenied: (...a: unknown[]) => dispatchPermissionDenied(...a),
}));
vi.mock("./use-credit-note", async (orig) => ({
  ...(await orig<typeof import("./use-credit-note")>()),
  useCreditNoteComments: () => ({ data: [] }),
}));

const { CnHeader } = await import("./cn-header");

const DRAFT = {
  id: "00000000-0000-4000-8000-000000000001",
  cn_no: "CN26100001",
  doc_status: "draft",
  doc_version: 2,
} as unknown as CreditNoteDetail;

function renderHeader(
  mode: FormMode,
  opts: { creditNote?: CreditNoteDetail; isLocked?: boolean } = {},
) {
  const handlers = {
    onBack: vi.fn(),
    onEnterEdit: vi.fn(),
    onCancel: vi.fn(),
    onShowDelete: vi.fn(),
    onShowComment: vi.fn(),
  };
  renderForm(
    <TooltipProvider>
      <CnHeader
        creditNote={"creditNote" in opts ? opts.creditNote : DRAFT}
        mode={mode}
        isPending={false}
        deleteIsPending={false}
        isLocked={opts.isLocked ?? false}
        createdByName="Alice"
        {...handlers}
      />
    </TooltipProvider>,
  );
  return handlers;
}

/** ชื่อปุ่มบนแถบหัว เรียงตาม DOM (ไม่รวมปุ่มย้อนกลับ) */
function headerButtons() {
  const row = document.querySelector("h1")!.closest(".relative")!;
  return [...row.querySelectorAll("button")]
    .map((b) => b.textContent?.trim() || b.getAttribute("aria-label") || "")
    .filter((n) => n !== en.common.goBack);
}

beforeEach(() => {
  vi.clearAllMocks();
  can.value = () => true;
  can.isAdmin = true;
});

describe("CnHeader — characterization", () => {
  it("title = เลขที่ใบ", () => {
    renderHeader("view");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "CN26100001",
    );
  });

  it("[view, draft] Edit + เมนู More — ไม่มี Delete/Save/Activity บนแถบ", async () => {
    const h = renderHeader("view");
    expect(headerButtons()).toEqual([en.common.edit, en.common.more]);
    await userEvent.click(screen.getByRole("button", { name: en.common.edit }));
    expect(h.onEnterEdit).toHaveBeenCalledTimes(1);
  });

  it("[view, locked] ไม่มี Edit", () => {
    renderHeader("view", { isLocked: true });
    expect(headerButtons()).toEqual([en.common.more]);
  });

  it("[edit, draft] Cancel · Save(submit cn-form) · Delete · More", async () => {
    const h = renderHeader("edit");
    expect(headerButtons()).toEqual([
      en.common.cancel,
      en.common.save,
      en.common.delete,
      en.common.more,
    ]);
    const save = screen.getByRole("button", { name: en.common.save });
    expect(save).toHaveAttribute("type", "submit");
    expect(save).toHaveAttribute("form", "cn-form");
    await userEvent.click(screen.getByRole("button", { name: en.common.delete }));
    expect(h.onShowDelete).toHaveBeenCalledTimes(1);
  });

  it("[add] Cancel · Create — ไม่มี Delete/More", () => {
    renderHeader("add", { creditNote: undefined });
    expect(headerButtons()).toEqual([en.common.cancel, en.common.create]);
  });

  it("[view, ไม่มีสิทธิ์ update] Edit กดได้แต่เด้ง permission dialog", async () => {
    can.isAdmin = false;
    can.value = () => false;
    const h = renderHeader("view");
    const edit = screen.getByRole("button", { name: en.common.edit });
    expect(edit).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(edit);
    expect(h.onEnterEdit).not.toHaveBeenCalled();
    expect(dispatchPermissionDenied).toHaveBeenCalledWith(
      "procurement.credit_note.update",
    );
  });
});
```

- [ ] **Step 2: `grn-header.characterization.test.tsx`** — โครงเดียวกับ Step 1 (mock `use-can`, `use-permission-prefix` → `"procurement.goods_received_note"`, `permission-denied-dialog`, และ `@/hooks/use-goods-receive-note` → spread ของจริง + `useGoodsReceiveNoteComments: () => ({ data: [] })`) · fixture

```ts
const base = {
  id: "00000000-0000-4000-8000-000000000002",
  grn_no: "GRN26100001",
  doc_type: "purchase_order",
  doc_version: 1,
  ap_invoices: [],
};
const DRAFT = { ...base, doc_status: "draft" } as unknown as GoodsReceiveNote;
const SAVED = { ...base, doc_status: "saved" } as unknown as GoodsReceiveNote;
const VOID = { ...base, doc_status: "voided" } as unknown as GoodsReceiveNote;
const AP_LOCKED = {
  ...base,
  doc_status: "committed",
  ap_invoices: [{ doc_no: "AP26100001" }],
} as unknown as GoodsReceiveNote;
```

`renderHeader(mode, grn?)` ส่ง handler ทุกตัวเป็น `vi.fn()` (`onBack onEnterEdit onCancel onShowComment onShowDelete onSaveDraft onSave`), `receivedByName="Bob"` `departmentName="Kitchen"` `isPending={false}` `deleteIsPending={false}` · `isCommitted={grn?.doc_status === "committed"}` `isVoid={grn?.doc_status === "voided"}` · ห่อ `<TooltipProvider>`

เคส:

| เคส | คาด |
|---|---|
| title | h1 = `GRN26100001` |
| [view, draft] | `[Edit, More]` · กด Edit → `onEnterEdit` 1 ครั้ง |
| [view, voided] | `[More]` |
| [view, committed + AP] | ปุ่ม `Edit` อยู่และ `toBeDisabled()` · `onEnterEdit` ไม่ถูกเรียก |
| [edit, draft] | `[Cancel, Save Draft, Save, Delete, More]` · Save `type="button"` · กด Save → `onSave` · กด Save Draft → `onSaveDraft` |
| [edit, saved] | `[Cancel, Save, More]` |
| [add] (`grn` undefined) | `[Cancel, Save Draft, Create]` |
| [view, ไม่มีสิทธิ์ update] | Edit `aria-disabled="true"` · คลิก → `dispatchPermissionDenied("procurement.goods_received_note.update")` |

ชื่อปุ่ม: `en.common.saveDraft`

- [ ] **Step 3: รันบนโค้ดเดิม**

```bash
bun test:run routes/procurement/credit-note/cn-header.characterization.test.tsx routes/procurement/goods-receive-note/grn-header.characterization.test.tsx
```

Expected: ผ่านทั้งหมด — ถ้าแดง แปลว่าเข้าใจพฤติกรรมเดิมผิด ให้แก้ **เทสต์** ให้ตรงของจริง (characterization) และบันทึก ruling ใน ledger

- [ ] **Step 4: commit**

```bash
bun run typecheck && bun run lint && git add routes/procurement/credit-note/cn-header.characterization.test.tsx routes/procurement/goods-receive-note/grn-header.characterization.test.tsx && git commit -m "test(procurement): characterization ของหัว CN/GRN ก่อนย้ายไป FormToolbar"
```

---

### Task 3: `DocPageSkeleton` + comment ของ DocFormHeader

**Files:**
- Create: `components/loader/doc-page-skeleton.tsx`
- Modify: `components/share/doc-form-header.tsx` (comment เหนือ ribbon)

- [ ] **Step 1: `doc-page-skeleton.tsx`**

```tsx
import { FormPageShell } from "@/components/share/form-page-shell";
import { FormPageHeaderSkeleton } from "@/components/loader/form-page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * loading state ของหน้าเอกสาร (PO/PR/GRN/CN/SR) — หัว + แถวช่องข้อมูลหัวใบ +
 * ตารางรายการ ในโครง FormPageShell แบบ wide เหมือนหน้าจริง (spec
 * 2026-10-02-form-page-shell-documents-design.md §2.3)
 */
export function DocPageSkeleton() {
  return (
    <FormPageShell width="wide" header={<FormPageHeaderSkeleton />}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
        <Skeleton className="h-px w-full" />
        <div className="flex gap-4">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="space-y-2 rounded-lg border p-3">
          <Skeleton className="h-6 w-full" />
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      </div>
    </FormPageShell>
  );
}
```

- [ ] **Step 2: comment** — ใน `doc-form-header.tsx` แทน `(PO/PR/GRN/CN/SR)` ในประโยค "ribbon เป็น grid ที่ align คอลัมน์กับ form body (PO/PR/GRN/CN/SR)" ด้วย `(ใช้แค่ PR — ช่อง workflow/description)`

- [ ] **Step 3: commit**

```bash
bunx prettier --write components/loader/doc-page-skeleton.tsx components/share/doc-form-header.tsx && bun run typecheck && bun run lint && git add components/loader/doc-page-skeleton.tsx components/share/doc-form-header.tsx && git commit -m "feat(form): DocPageSkeleton สำหรับหน้าเอกสาร + แก้ comment ribbon ของ DocFormHeader"
```

---

### Task 4: credit-note

**Files:**
- Modify: `routes/procurement/credit-note/cn-header.tsx` (ส่วน gating + `actions` + return)
- Modify: `routes/procurement/credit-note/cn-form.tsx:390-427,last-close`
- Modify: `routes/procurement/credit-note/cn-edit-content.tsx`

- [ ] **Step 1: `cn-header.tsx`** — คง `badges` `subtitle` `statusCfg` `comments` · ลบ: `useCan` `usePermissionPrefix` `dispatchPermissionDenied` `buildPermissionKey` `cn` และตัวแปร `*Permission` / `*Denied` / `isAdd` · ลบบล็อก `actions` · return:

```tsx
  return (
    <FormToolbar
      mode={mode}
      formId="cn-form"
      isPending={isPending}
      title={creditNote?.cn_no ?? t("entity")}
      subtitle={subtitle}
      badges={badges}
      onBack={onBack}
      onCancel={onCancel}
      // ส่งใบย้ายไป footer ขวาล่าง (CnFooterAction) — หัวมีแค่ Edit
      onEdit={isLocked ? undefined : onEnterEdit}
      // ลบได้เฉพาะตอนแก้ใบที่ยังไม่ล็อก — หน้าดูเป็นที่ทำงาน workflow
      onDelete={!isView && creditNote && !isLocked ? onShowDelete : undefined}
      deleteIsPending={deleteIsPending}
    >
      {/* comment / activity / print ยุบอยู่ในเมนู ⋯ — ไม่ส่ง activity ให้ toolbar ซ้ำ */}
      {creditNote && <DocActionsMenu …props เดิมทั้งก้อน… />}
    </FormToolbar>
  );
```

import: `Pencil, Save, Trash2, X` ออกจาก lucide (เหลือ `User`) · `Button` `DocFormHeader` ออก · เพิ่ม `FormToolbar` · permission ได้จาก auto-prefix `procurement.credit_note` (อยู่ใน catalog — gate เท่าเดิม + license)

- [ ] **Step 2: `cn-form.tsx`** — `<div className="flex min-h-full flex-col space-y-4">\n      <CnHeader` → `<FormPageShell\n      width="wide"\n      header={\n        <CnHeader` · ปิด `      />\n\n      <form` → `        />\n      }\n      footer={\n        <CnFooterAction …props เดิม… />\n      }\n    >\n      <form` · ลบบล็อก `<CnFooterAction …/>` เดิมที่อยู่หลัง `</form>` · `className="space-y-3 px-4"` → `className="space-y-3"` · `</div>` ปิดของ component (ตัวแรกหลังเปิด shell) → `</FormPageShell>` · import `FormPageShell`

- [ ] **Step 3: `cn-edit-content.tsx`** — `DocFormSkeleton` → `DocPageSkeleton` (import จาก `@/components/loader/doc-page-skeleton`) · ถ้า `DocFormSkeleton` ไม่เหลือผู้ใช้ (`grep -rn DocFormSkeleton routes components`) ปล่อยไฟล์ไว้ — ลบเป็นงานแยก (บันทึกใน ledger)

- [ ] **Step 4: เทสต์ + gate + commit**

```bash
bunx prettier --write routes/procurement/credit-note/cn-header.tsx routes/procurement/credit-note/cn-form.tsx routes/procurement/credit-note/cn-edit-content.tsx && bun run typecheck && bun run lint && bun test:run routes/procurement/credit-note && git add routes/procurement/credit-note && git commit -m "refactor(form): credit-note — หัวใช้ FormToolbar, ฟอร์มเข้า FormPageShell (footer slot), DocPageSkeleton"
```

Expected: `cn-header.characterization` เขียว **โดยไม่แก้** · `cn-general-fields.test` เขียว (ไม่มี mock use-can — `canWrite` default true ตอนไม่มีข้อมูล license, use-license.ts:145)

---

### Task 5: goods-receive-note

**Files:**
- Modify: `routes/procurement/goods-receive-note/grn-header.tsx`
- Modify: `routes/procurement/goods-receive-note/grn-form.tsx:187-200,215,253-262,last-close`
- Modify: `routes/procurement/goods-receive-note/grn-edit-content.tsx`

- [ ] **Step 1: `grn-header.tsx`** — คง `badges` `subtitle` `statusCfg` `apInvoiceNos` `apLocked` `canEdit` `isPastDraft` `comments` · ลบ gating ทั้งชุด (`useCan` `usePermissionPrefix` `dispatchPermissionDenied` `buildPermissionKey` `cn` `*Permission` `*Denied`) · ลบ `actions` · return:

```tsx
  // Save ของ GRN เป็น handler (ส่งสถานะเอง) ไม่ใช่ submit ของ <form> และมี Save draft
  // นำหน้าสำหรับใบร่าง — จึงเป็น submitSlot (ไม่ผ่าน gate license เหมือนเดิม)
  const submitSlot = (
    <>
      {!isPastDraft && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={onSaveDraft}
        >
          <FileText aria-hidden="true" />
          {tc("saveDraft")}
        </Button>
      )}
      <Button type="button" size="sm" disabled={isPending} onClick={onSave}>
        <Save aria-hidden="true" />
        {isEdit ? tc("save") : tc("create")}
      </Button>
    </>
  );

  return (
    <FormToolbar
      mode={mode}
      formId="grn-form"
      isPending={isPending}
      title={goodsReceiveNote?.grn_no ?? t("entity")}
      subtitle={subtitle}
      badges={badges}
      submitSlot={submitSlot}
      onBack={onBack}
      onCancel={onCancel}
      // AP ดึงใบ committed ไปแล้ว = ปุ่ม Edit ยังโชว์แต่กดไม่ได้พร้อมเหตุผล
      onEdit={goodsReceiveNote && (canEdit || apLocked) ? onEnterEdit : undefined}
      writeDisabledReason={
        isView && apLocked
          ? t("editLockedByAp", { docNos: apInvoiceNos.join(", ") })
          : undefined
      }
      // หลังบ้านลบได้เฉพาะใบร่าง และลบจากโหมดแก้เท่านั้น
      onDelete={
        isEdit && goodsReceiveNote && !isPastDraft ? onShowDelete : undefined
      }
      deleteIsPending={deleteIsPending}
    >
      {goodsReceiveNote && <DocActionsMenu …props เดิมทั้งก้อน… />}
    </FormToolbar>
  );
```

คง comment ภาษาไทยเดิมที่อธิบาย isPastDraft / willCallSave ไว้เหนือ `submitSlot` · import: ลบ `Pencil, Trash2, X` (คง `FileText, Save, User, Building2`) · ลบ `Tooltip*` `DocFormHeader` · เพิ่ม `FormToolbar`

- [ ] **Step 2: `grn-form.tsx`** — เหมือน Task 4 Step 2: `GrnHeader` เข้า `header`, `GrnSummaryFooter` (props เดิม) เข้า `footer`, form `className="space-y-3 px-4"` → `"space-y-3"`, ปิดด้วย `</FormPageShell>` (ตัวแรกหลังจุดเปิด)

- [ ] **Step 3: `grn-edit-content.tsx`** — `FormSkeleton` → `DocPageSkeleton`

- [ ] **Step 4: เทสต์ + gate + commit**

```bash
bunx prettier --write routes/procurement/goods-receive-note/grn-header.tsx routes/procurement/goods-receive-note/grn-form.tsx routes/procurement/goods-receive-note/grn-edit-content.tsx && bun run typecheck && bun run lint && bun test:run routes/procurement/goods-receive-note && git add routes/procurement/goods-receive-note && git commit -m "refactor(form): goods-receive-note — หัวใช้ FormToolbar (Save draft/AP-lock ผ่าน submitSlot/writeDisabledReason), ฟอร์มเข้า FormPageShell, DocPageSkeleton"
```

Expected: `grn-header.characterization` เขียวโดยไม่แก้

---

### Task 6: guard + ตรวจ + PR

- [ ] **Step 1: guard** — ใน `components/share/__tests__/form-page-shell.usage.test.ts` ลบ `cn-header.tsx` และ `grn-header.tsx` จากบล็อกระลอกเอกสาร → `bun test:run components/share/__tests__/form-page-shell.usage.test.ts` 4/4 (allowlist 14 → 12)

```bash
bun run lint && git add components/share/__tests__/form-page-shell.usage.test.ts && git commit -m "test(form): guard allowlist — CN/GRN ออกจากรายการรอระลอกเอกสาร"
```

- [ ] **Step 2: suite** — `bun run typecheck && bun run lint && bun test:run > .superpowers/sdd/2026-10-02-form-doc-wave-pr1/tests.log 2>&1; tail -15 …` → เขียวยกเว้น 2 เคสเดิม

- [ ] **Step 3: เบราว์เซอร์** (ดูอย่างเดียว ไม่กดปุ่มที่เขียน DB)

| หน้า | ดูอะไร |
|---|---|
| `/procurement/credit-note/<draft>` | view: Edit · More · footer ติดก้นจอ · ตารางรายการกว้างเท่าเดิม (Review Focus 2) · กด Edit → Cancel/Save/Delete/More → Cancel |
| `/procurement/credit-note/<ใบที่ล็อก>` | ไม่มี Edit |
| `/procurement/goods-receive-note/<draft>` | Edit → Cancel/Save Draft/Save/Delete/More → Cancel |
| `/procurement/goods-receive-note/<committed + AP>` (ถ้ามีใน dev) | Edit disabled + title เหตุผล |
| `/procurement/goods-receive-note/<มีรายการน้อย>` | footer ติดก้นจอ (Review Focus 1) |
| ทั้งสองที่ 596px | ปุ่ม back ครบ · ปุ่มหัวขึ้นบรรทัดใหม่ได้ไม่ล้น |
| เมนู More | มี Activity ในเมนู · ไม่มีปุ่ม Activity บนแถบ (Review Focus 5) |

- [ ] **Step 4: push + PR** — base `main`

```bash
git push -u origin feature/form-doc-wave
gh pr create --base main --title "refactor(procurement): credit-note and GRN headers go through FormToolbar + FormPageShell (document wave 1)" --body-file .superpowers/sdd/2026-10-02-form-doc-wave-pr1/pr-body.md
```

PR body: spec link · characterization tests (เขียวบนโค้ดเดิมก่อน) · DocPageSkeleton · พฤติกรรมเปลี่ยน: Edit primary · license ปิด Edit/Delete/Save(CN) · GRN AP-lock เป็น native title · ระยะ header→body `mt-6` · guard 14→12
