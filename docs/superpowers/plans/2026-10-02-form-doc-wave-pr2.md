# ระลอกเอกสาร — PR 2 (PO + SR) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** หัวของ purchase-order และ store-requisition วาดปุ่มผ่าน `FormToolbar` · ฟอร์มทั้งสองเข้า `FormPageShell width="wide"` โดยให้ footer workflow อยู่ใน slot `footer` · loading ใช้ `DocPageSkeleton` (สร้างไว้แล้วใน PR 1) — ต้องมี characterization test ของหัวที่เขียนและผ่านบนโค้ดเดิมก่อน

**Architecture:**
- `PoHeader` และ `SrHeader` คง props เดิมทุกตัว ฟอร์มจึงเรียกเหมือนเดิม แต่ข้างในเลิกประกอบปุ่มเอง ยังคำนวณ `badges` / `subtitle` / เงื่อนไขเหมือนเดิม แล้วส่งต่อให้ `FormToolbar`
- PO: ปุ่ม Close · Send email · `DocActionsMenu` เป็น `children`
- SR: Save ที่ปิดเพราะไม่มีแผนกใช้ `submitSlot` · history Sheet อยู่ใน fragment ข้าง FormToolbar
- shell อยู่ใน `PoForm` / `StoreRequisitionForm` ซึ่งเป็นคอมโพเนนต์ที่ถูก key

**Tech Stack:** React 19 + React Compiler · react-router 7 · Tailwind v4 · use-intl · Vitest + Testing Library · bun

**Spec:** `docs/superpowers/specs/2026-10-02-form-page-shell-documents-design.md` (§3 แถว PO/SR · §4 · §5 · §7 ข้อ 2) · แผนต้นแบบ: `docs/superpowers/plans/2026-10-02-form-doc-wave-pr1.md`

## Global Constraints

- ภาษาที่ใช้สื่อสารและ commit = ไทย · PR title/body = อังกฤษ
- ห้ามแตะ query / schema / field / i18n key / payload / การ navigate
- **stacked PR:** branch `feature/form-doc-wave-pr2` แตกจาก `feature/form-doc-wave` (#214 ยังไม่ merge) · base ของ PR = `feature/form-doc-wave`
  - merge ด้วย merge commit ห้าม squash
  - ห้าม `--delete-branch` จนกว่าจะ merge ครบทั้ง stack
- gate ของทุก task: `bun run typecheck && bun run lint` (baseline: 137 warnings / 0 errors) · gate กับ commit ต้องต่อกันด้วย `&&` เท่านั้น
- ก่อนเปิด PR: `bun test:run` ต้องเขียว ยกเว้น 2 เคสเดิมใน `ap-mock-repository.test.ts`
- **เทสต์:** characterization test 2 ไฟล์ตาม spec §4 (user อนุมัติแล้ว)
  - assertion ที่เปลี่ยนได้หลัง refactor มีแค่ลำดับปุ่ม Close ของ PO (spec §3) และต้องบอกใน commit message
  - เคส `canWrite=false` เพิ่มหลัง refactor ได้ เพราะเป็นพฤติกรรมใหม่ที่ spec §5 ประกาศไว้
- hook บล็อก `rm -rf` / `git checkout --` / `--amend`
- zsh ไม่แยกคำในตัวแปร ถ้าต้องส่งรายการไฟล์ให้ใช้ array `F=(...)`
- เบราว์เซอร์: ห้ามกด Save / Submit / Approve / Close / Send / Delete จริง เพราะ dev DB ใช้ร่วมกัน
  - ใบที่มีประวัติ: `PO20260500006` · `SR260800001` (memory `t02-workflow-test-documents`)
  - ทดสอบความกว้างแคบด้วย iframe 596px

## Review Focus

1. **PO: ลำดับปุ่มและ Send email**
   - Close ย้ายจากตำแหน่งแรกไปอยู่หลัง Delete (spec ยอมรับแล้ว)
   - Send email ต้องยังโผล่ทั้งโหมด view และ edit ตาม `SEND_EMAIL_STATUSES`
   - dialog ต้อง mount เฉพาะตอนเปิด
   - characterization ครอบเคส approved + canClose และ completed + terminal
2. **SR: Save ตอนไม่มีแผนก**
   - `submitSlot` ข้ามด่าน license ของ FormToolbar ได้ แต่ปุ่มถูก disabled อยู่แล้ว จึงไม่รั่ว
   - ตอนมีแผนก ต้องใช้ปุ่ม submit มาตรฐานซึ่งผ่านด่าน license
   - เทสต์ตรวจทั้งสองทาง
3. **ป้ายปุ่ม Save ในโหมด add**
   - เดิมทั้งสองโมดูลขึ้น "Save" แต่ FormToolbar ขึ้น "Create" เป็น default
   - ต้องส่ง `submitLabel={tc("save")}` ไม่งั้นป้ายจะเปลี่ยนเงียบ ๆ
   - เทสต์ `[add]` ตรวจชื่อปุ่ม
4. **PO Edit ระหว่าง isPending**
   - เดิม Edit ถูก disabled ระหว่างกด Approve/Reject ในโหมด view แต่ FormToolbar ไม่ปิด Edit ตาม isPending (เหมือนทุกหน้าในระลอก 1)
   - ruling: ยอมรับ เพราะกดแล้วแค่สลับโหมด ไม่ได้ยิง mutation
   - ประกาศใน PR body
5. **ไม่มี Activity ซ้ำ และ subtitle ไม่หาย**
   - `DocActionsMenu` มี Activity อยู่แล้ว จึงห้ามส่ง `activity` ให้ FormToolbar
   - `WorkflowStepButton` และ history Sheet ของ SR ต้องยังทำงาน
   - เทสต์ตรวจชุดปุ่มบนแถบแบบเป๊ะ และเปิด history Sheet ของ SR

---

### Task 1: branch

ทำไปแล้วตอนเขียนแผน (`git checkout -b feature/form-doc-wave-pr2` จาก `b0213019`) — ตรวจว่า `git branch --show-current` = `feature/form-doc-wave-pr2` และ commit แผนนี้อยู่บนสุด

---

### Task 2: characterization test ของหัว PO + SR (บนโค้ดเดิม)

**Files:**
- Create: `routes/procurement/purchase-order/po-header.characterization.test.tsx`
- Create: `routes/store-operation/store-requisition/sr-header.characterization.test.tsx`

**Interfaces:**
- Consumes:
  - props ปัจจุบันของ `PoHeader` / `SrHeader` (ไม่เปลี่ยนใน PR นี้)
  - `renderForm` จาก `@/lib/test-utils/form-characterization` ซึ่งห่อ MemoryRouter + QueryClient + IntlProvider ให้แล้ว
- Produces: ตาข่ายสำหรับ Task 3–4 ต้องเขียวทั้งก่อนและหลัง refactor ข้อยกเว้นเดียวคือเคส PO approved ซึ่งเปลี่ยนลำดับ Close ใน Task 3

**Ruling (สืบทอดจาก PR 1):**
- ทดสอบที่ระดับหัว (prop-driven) ไม่ทดสอบทั้งฟอร์ม เพราะ footer ไม่ถูกแก้ (แค่ย้ายตำแหน่ง) จึงตรวจในเบราว์เซอร์แทน
- `headerButtons()` อ่านจาก `h1.closest(".relative")` ซึ่งคือแถวปุ่มด้านใน — `WorkflowStepButton` อยู่ใน subtitle นอกแถวนี้จึงไม่ถูกนับ

- [ ] **Step 1: `po-header.characterization.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import en from "@/messages/en.json";
import type { PurchaseOrder } from "@/types/purchase-order";
import type { FormMode } from "@/types/form";
import { renderForm } from "@/lib/test-utils/form-characterization";

/**
 * characterization ของหัวใบสั่งซื้อ — จับ "ปุ่มอะไรโผล่ในโหมด/สถานะไหน" ก่อนย้ายไป
 * FormToolbar (spec 2026-10-02-form-page-shell-documents-design.md §4) ต้องเขียว
 * ทั้งก่อนและหลังย้าย — ข้อยกเว้นเดียวคือลำดับปุ่ม Close (spec §3) · ไม่ตรวจ variant/สี
 */

const can = { value: (_p: string) => true, isAdmin: true, canWrite: true };
vi.mock("@/hooks/use-can", () => ({
  useCan: () => ({
    can: (p: string) => can.value(p),
    canAny: () => true,
    canAll: () => true,
    guard: (_p: unknown, fn: () => void) => fn,
    isAdmin: can.isAdmin,
    permissions: [],
    canWrite: can.canWrite,
  }),
}));
vi.mock("@/hooks/use-permission-prefix", () => ({
  usePermissionPrefix: () => "procurement.purchase_order",
}));
const dispatchPermissionDenied = vi.fn();
vi.mock("@/components/permission-denied-dialog", () => ({
  dispatchPermissionDenied: (...a: unknown[]) => dispatchPermissionDenied(...a),
}));
vi.mock("../shared/use-purchase-order", async (orig) => ({
  ...(await orig<typeof import("../shared/use-purchase-order")>()),
  usePurchaseOrderComments: () => ({ data: [] }),
}));

const { PoHeader } = await import("./po-header");

const base = {
  id: "00000000-0000-4000-8000-000000000003",
  po_no: "PO26100001",
  po_type: "manual",
  doc_version: 1,
};
const DRAFT = { ...base, po_status: "draft" } as unknown as PurchaseOrder;
const IN_PROGRESS = {
  ...base,
  po_status: "in_progress",
} as unknown as PurchaseOrder;
const APPROVED = { ...base, po_status: "approved" } as unknown as PurchaseOrder;
const COMPLETED = {
  ...base,
  po_status: "completed",
} as unknown as PurchaseOrder;

function renderHeader(
  mode: FormMode,
  po?: PurchaseOrder,
  flags: { canEdit?: boolean; canClose?: boolean; terminalStatus?: boolean } = {},
) {
  const handlers = {
    onBack: vi.fn(),
    onCancel: vi.fn(),
    onEnterEdit: vi.fn(),
    onShowClose: vi.fn(),
    onShowComment: vi.fn(),
    onShowDelete: vi.fn(),
  };
  renderForm(
    <PoHeader
      purchaseOrder={po}
      mode={mode}
      canEdit={flags.canEdit ?? true}
      canClose={flags.canClose ?? false}
      terminalStatus={flags.terminalStatus ?? false}
      isPending={false}
      deletePoIsPending={false}
      departmentName="Kitchen"
      buyerName="Bob"
      {...handlers}
    />,
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

const SEND = en.procurement.purchaseOrder.sendEmail.button;

beforeEach(() => {
  vi.clearAllMocks();
  can.value = () => true;
  can.isAdmin = true;
  can.canWrite = true;
});

describe("PoHeader — characterization", () => {
  it("title = เลขที่ใบ", () => {
    renderHeader("view", DRAFT);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "PO26100001",
    );
  });

  it("[view, draft] Edit · Delete · More", async () => {
    const h = renderHeader("view", DRAFT);
    expect(headerButtons()).toEqual([
      en.common.edit,
      en.common.delete,
      en.common.more,
    ]);
    await userEvent.click(screen.getByRole("button", { name: en.common.edit }));
    expect(h.onEnterEdit).toHaveBeenCalledTimes(1);
    await userEvent.click(
      screen.getByRole("button", { name: en.common.delete }),
    );
    expect(h.onShowDelete).toHaveBeenCalledTimes(1);
  });

  it("[view, approved + canClose] Close · Edit · Delete · Send · More", async () => {
    const h = renderHeader("view", APPROVED, { canClose: true });
    expect(headerButtons()).toEqual([
      en.common.close,
      en.common.edit,
      en.common.delete,
      SEND,
      en.common.more,
    ]);
    await userEvent.click(screen.getByRole("button", { name: en.common.close }));
    expect(h.onShowClose).toHaveBeenCalledTimes(1);
  });

  it("[view, in_progress + canClose] ไม่มี Close (เฉพาะ approved/sent)", () => {
    renderHeader("view", IN_PROGRESS, { canEdit: false, canClose: true });
    expect(headerButtons()).toEqual([en.common.more]);
  });

  it("[view, completed + terminal] Send · More — ไม่มี Edit/Delete", () => {
    renderHeader("view", COMPLETED, { canEdit: false, terminalStatus: true });
    expect(headerButtons()).toEqual([SEND, en.common.more]);
  });

  it("[edit, draft] Cancel · Save · Delete · More", async () => {
    const h = renderHeader("edit", DRAFT);
    expect(headerButtons()).toEqual([
      en.common.cancel,
      en.common.save,
      en.common.delete,
      en.common.more,
    ]);
    const save = screen.getByRole("button", { name: en.common.save });
    expect(save).toHaveAttribute("type", "submit");
    expect(save).toHaveAttribute("form", "po-form");
    await userEvent.click(
      screen.getByRole("button", { name: en.common.cancel }),
    );
    expect(h.onCancel).toHaveBeenCalledTimes(1);
  });

  it("[add] Cancel · Save — ป้าย Save ไม่ใช่ Create · title = ชื่อ entity", () => {
    renderHeader("add");
    expect(headerButtons()).toEqual([en.common.cancel, en.common.save]);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      en.procurement.purchaseOrder.entity,
    );
  });

  it("[view, ไม่มีสิทธิ์] Edit ยังกดได้ — key ของ PO ไม่อยู่ใน catalog จึงไม่ gate", async () => {
    can.isAdmin = false;
    can.value = () => false;
    const h = renderHeader("view", DRAFT);
    await userEvent.click(screen.getByRole("button", { name: en.common.edit }));
    expect(h.onEnterEdit).toHaveBeenCalledTimes(1);
    expect(dispatchPermissionDenied).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: `sr-header.characterization.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import en from "@/messages/en.json";
import type { StoreRequisition } from "@/types/store-requisition";
import type { FormMode } from "@/types/form";
import { renderForm } from "@/lib/test-utils/form-characterization";

/**
 * characterization ของหัวใบเบิก — จับ "ปุ่มอะไรโผล่ในโหมด/stage role ไหน" ก่อนย้ายไป
 * FormToolbar (spec 2026-10-02-form-page-shell-documents-design.md §4) ต้องเขียว
 * ทั้งก่อนและหลังย้ายโดยไม่แก้ assertion — ไม่ตรวจ variant/สีของปุ่ม
 */

const can = { value: (_p: string) => true, isAdmin: true, canWrite: true };
vi.mock("@/hooks/use-can", () => ({
  useCan: () => ({
    can: (p: string) => can.value(p),
    canAny: () => true,
    canAll: () => true,
    guard: (_p: unknown, fn: () => void) => fn,
    isAdmin: can.isAdmin,
    permissions: [],
    canWrite: can.canWrite,
  }),
}));
vi.mock("@/hooks/use-permission-prefix", () => ({
  usePermissionPrefix: () => "store_operations.store_requisition",
}));
const dispatchPermissionDenied = vi.fn();
vi.mock("@/components/permission-denied-dialog", () => ({
  dispatchPermissionDenied: (...a: unknown[]) => dispatchPermissionDenied(...a),
}));
vi.mock("./use-sr", async (orig) => ({
  ...(await orig<typeof import("./use-sr")>()),
  useStoreRequisitionComments: () => ({ data: [] }),
}));
vi.mock("@/hooks/use-workflow", async (orig) => ({
  ...(await orig<typeof import("@/hooks/use-workflow")>()),
  useCreatableWorkflows: () => ({
    workflows: [],
    canCreate: true,
    isLoading: false,
  }),
}));

const { SrHeader } = await import("./sr-header");

const tSr = en.storeOperation.storeRequisition;
const base = {
  id: "00000000-0000-4000-8000-000000000004",
  sr_no: "SR26100001",
  doc_version: 1,
  role: "create",
};
const DRAFT = { ...base, doc_status: "draft" } as unknown as StoreRequisition;
const VIEW_ONLY = {
  ...base,
  doc_status: "in_progress",
  role: "view_only",
} as unknown as StoreRequisition;
const WITH_HISTORY = {
  ...base,
  doc_status: "in_progress",
  role: "approve",
  workflow_previous_stage: "Create",
  workflow_current_stage: "HOD",
  workflow_next_stage: "Store",
  workflow_history: [
    {
      action: "submit",
      at: "2026-10-01T03:00:00.000Z",
      user: { id: "u1", name: "Alice" },
      current_stage: "Create",
    },
  ],
} as unknown as StoreRequisition;

function renderHeader(
  mode: FormMode,
  sr?: StoreRequisition,
  opts: { hasDepartment?: boolean } = {},
) {
  const handlers = {
    onBack: vi.fn(),
    onEdit: vi.fn(),
    onCancel: vi.fn(),
    onDelete: vi.fn(),
    onComment: vi.fn(),
  };
  renderForm(
    <SrHeader
      storeRequisition={sr}
      mode={mode}
      isPending={false}
      hasDepartment={opts.hasDepartment ?? true}
      isDeletePending={false}
      dateFormat="dd/MM/yyyy"
      requesterName="Alice"
      departmentName="Kitchen"
      departmentCode="KIT"
      isLoading={false}
      {...handlers}
    />,
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
  can.canWrite = true;
});

describe("SrHeader — characterization", () => {
  it("title = เลขที่ใบ", () => {
    renderHeader("view", DRAFT);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "SR26100001",
    );
  });

  it("[view, role create] Edit · More", async () => {
    const h = renderHeader("view", DRAFT);
    expect(headerButtons()).toEqual([en.common.edit, en.common.more]);
    await userEvent.click(screen.getByRole("button", { name: en.common.edit }));
    expect(h.onEdit).toHaveBeenCalledTimes(1);
  });

  it("[view, role view_only] ไม่มี Edit", () => {
    renderHeader("view", VIEW_ONLY);
    expect(headerButtons()).toEqual([en.common.more]);
  });

  it("[edit, draft] Cancel · Save · Delete · More", async () => {
    const h = renderHeader("edit", DRAFT);
    expect(headerButtons()).toEqual([
      en.common.cancel,
      en.common.save,
      en.common.delete,
      en.common.more,
    ]);
    const save = screen.getByRole("button", { name: en.common.save });
    expect(save).toHaveAttribute("type", "submit");
    expect(save).toHaveAttribute("form", "store-requisition-form");
    expect(save).toBeEnabled();
    await userEvent.click(
      screen.getByRole("button", { name: en.common.delete }),
    );
    expect(h.onDelete).toHaveBeenCalledTimes(1);
  });

  it("[edit, ไม่มีแผนก] Save ถูกปิดพร้อมเหตุผล", () => {
    renderHeader("edit", DRAFT, { hasDepartment: false });
    const save = screen.getByRole("button", { name: en.common.save });
    expect(save).toBeDisabled();
    expect(save).toHaveAttribute("title", tSr.noDepartment);
  });

  it("[add] Cancel · Save — ไม่มี Delete/More · title = ชื่อหน้า", () => {
    renderHeader("add");
    expect(headerButtons()).toEqual([en.common.cancel, en.common.save]);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      tSr.title,
    );
  });

  it("[view, ไม่มีสิทธิ์] Edit ยังกดได้ — key ของ SR ไม่อยู่ใน catalog จึงไม่ gate", async () => {
    can.isAdmin = false;
    can.value = () => false;
    const h = renderHeader("view", DRAFT);
    await userEvent.click(screen.getByRole("button", { name: en.common.edit }));
    expect(h.onEdit).toHaveBeenCalledTimes(1);
    expect(dispatchPermissionDenied).not.toHaveBeenCalled();
  });

  it("[view, มีประวัติ] ปุ่มขั้นตอนเปิด history Sheet ที่หัวถืออยู่", async () => {
    renderHeader("view", WITH_HISTORY);
    await userEvent.click(
      screen.getByRole("button", { name: en.common.workflowHistoryHint }),
    );
    const sheet = await screen.findByRole("dialog");
    expect(
      within(sheet).getAllByText(tSr.tabWorkflowHistory).length,
    ).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: รันบนโค้ดเดิม**

```bash
bun test:run routes/procurement/purchase-order/po-header.characterization.test.tsx routes/store-operation/store-requisition/sr-header.characterization.test.tsx
```

Expected: ผ่านทั้งหมด (PO 8 · SR 8)
- ถ้าแดง แปลว่าเข้าใจพฤติกรรมเดิมผิด ให้แก้ **เทสต์** ให้ตรงกับของจริง (เพราะเป็น characterization) แล้วบันทึก ruling ใน ledger
- ถ้า history Sheet ไม่ render เพราะ fixture `workflow_history` ไม่ตรงรูปที่ `WorkflowHistoryTimeline` อ่าน ให้ปรับ fixture ห้ามตัด assertion ทิ้ง

- [ ] **Step 4: commit**

```bash
bunx prettier --write routes/procurement/purchase-order/po-header.characterization.test.tsx routes/store-operation/store-requisition/sr-header.characterization.test.tsx && bun run typecheck && bun run lint && git add routes/procurement/purchase-order/po-header.characterization.test.tsx routes/store-operation/store-requisition/sr-header.characterization.test.tsx && git commit -m "test(procurement): characterization ของหัว PO/SR ก่อนย้ายไป FormToolbar"
```

---

### Task 3: purchase-order

**Files:**
- Modify: `routes/procurement/purchase-order/po-header.tsx` (imports + const `actions` :124-232 + return :277-308)
- Modify: `routes/procurement/purchase-order/po-form.tsx` (import + wrapper :223-305 + `</div>` ตัวสุดท้าย)
- Modify: `routes/procurement/purchase-order/po-edit-content.tsx` (skeleton)
- Modify: `routes/procurement/purchase-order/po-header.characterization.test.tsx` (ลำดับ Close + เคส license)

**Interfaces:**
- Consumes:
  - `FormToolbar` props: `mode` `formId` `isPending` `title` `subtitle` `badges` `onBack` `onCancel` `onEdit` `onDelete` `deleteIsPending` `submitLabel` `children`
  - `FormPageShell` props: `width` `header` `footer` `children`
  - `DocPageSkeleton` (ไม่มี props)
- Produces: `PoHeader` props ไม่เปลี่ยน

- [ ] **Step 1: `po-header.tsx`**

**imports:**
- เอาออก: `Pencil` `Save` `Trash2` `X` (lucide) และ `DocFormHeader`
- คงไว้: `Building2` `Lock` `Mail` `User` และ `Button` (ยังใช้กับ Close / Send email)
- เพิ่ม: `import { FormToolbar } from "@/components/share/form-toolbar";`

**ตัวแปรที่ไม่ใช้แล้ว:**
- ลบ `isEditMode` `isAdd` `headerTitle`
- คง `isView` ไว้ (print ใน DocActionsMenu ยังใช้)

**ลบ const `actions` ทั้งก้อน** แล้วแทน `<DocFormHeader …/>` ใน return (fragment เดิมคงไว้) ด้วย:

```tsx
      <FormToolbar
        mode={mode}
        formId="po-form"
        isPending={isPending}
        title={purchaseOrder?.po_no ?? t("entity")}
        subtitle={
          docMeta || workflowStep ? (
            <span className="flex flex-col gap-1">
              {docMeta}
              {workflowStep}
            </span>
          ) : undefined
        }
        badges={badges}
        onBack={onBack}
        onCancel={onCancel}
        onEdit={purchaseOrder && canEdit ? onEnterEdit : undefined}
        // view + edit เหมือนเดิม — PO ลบได้ทั้งสองโหมดตราบที่ยังไม่ถึงสถานะปลายทาง
        onDelete={
          purchaseOrder && canEdit && !terminalStatus ? onShowDelete : undefined
        }
        deleteIsPending={deletePoIsPending}
        // เดิมป้าย Save ทุกโหมด — ไม่ให้โหมด add กลายเป็น "Create"
        submitLabel={tc("save")}
      >
        {/* Close/Send email ต่อท้าย Delete (เดิม Close อยู่หน้าสุด — spec §3 ยอมรับ)
            comment / activity / print ยุบอยู่ในเมนู ⋯ — ไม่ส่ง activity ให้ toolbar ซ้ำ */}
        {purchaseOrder && (
          <>
            {canClose &&
              (purchaseOrder.po_status === PO_STATUS.APPROVED ||
                purchaseOrder.po_status === PO_STATUS.SENT_OR_PRINT) && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={onShowClose}
                >
                  <Lock aria-hidden="true" />
                  {tc("close")}
                </Button>
              )}
            {canSendEmail && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => setShowSendEmail(true)}
              >
                <Mail aria-hidden="true" />
                {t("sendEmail.button")}
              </Button>
            )}
            <DocActionsMenu
              onComment={onShowComment}
              commentCount={comments?.length}
              activity={{ id: purchaseOrder.id, label: purchaseOrder.po_no }}
              print={
                isView
                  ? {
                      documentType: "PO",
                      documentId: purchaseOrder.id,
                      filters: purchaseOrder.po_no
                        ? { DocumentNo: purchaseOrder.po_no }
                        : undefined,
                    }
                  : undefined
              }
            />
          </>
        )}
      </FormToolbar>
```

comment เรื่อง mount dialog และ `{canSendEmail && showSendEmail && purchaseOrder && (<PoSendEmailDialog …/>)}` ที่อยู่ต่อจาก DocFormHeader เดิม คงไว้ตามเดิมทุกตัวอักษร

- [ ] **Step 2: `po-form.tsx`**

**import:** เพิ่ม `import { FormPageShell } from "@/components/share/form-page-shell";` ต่อจาก import ของ `@/lib/form-helpers`

**wrapper:** เปลี่ยน `<div className="flex min-h-full flex-col space-y-4">` + `<PoHeader …/>` เป็น:

```tsx
    <FormPageShell
      width="wide"
      header={
        <PoHeader
          purchaseOrder={purchaseOrder}
          mode={mode}
          canEdit={canEdit}
          canClose={canClose}
          terminalStatus={terminalStatus}
          isPending={isPending}
          deletePoIsPending={deletePo.isPending}
          departmentName={departmentName}
          buyerName={purchaseOrder?.buyer_name || buyerName}
          onBack={handleBack}
          onCancel={handleCancel}
          onEnterEdit={() => setMode("edit")}
          onShowClose={() => dialogs.setShowClose(true)}
          onShowComment={() => dialogs.setShowComment(true)}
          onShowDelete={() => dialogs.setShowDelete(true)}
          hasHistory={hasHistory}
          onShowHistory={() => dialogs.setShowHistory(true)}
        />
      }
      footer={
        <PoFooterAction
          control={form.control}
          currencyCode={form.getValues("currency_code")}
          isPending={isPending}
          isEditMode={isEditMode}
          role={role}
          poStatus={purchaseOrder?.po_status}
          previousStages={previousStages}
          stagesLoading={stagesLoading}
          // ใบใหม่ที่ยังไม่เคยเซฟก็กดส่งได้ — handleSubmitPo สร้างใบให้ก่อนแล้วค่อยส่ง
          // (ทรงเดียวกับ PR) ของเดิมส่ง undefined ทำให้ปุ่มหายจนกว่าจะกด Save ก่อน
          onSubmit={handleSubmitPo}
          onValidateSubmit={validateSubmitPo}
          onApprove={purchaseOrder ? handleApprovePo : undefined}
          onReject={
            purchaseOrder ? () => dialogs.setShowReject(true) : undefined
          }
          onReview={purchaseOrder ? handleReviewConfirm : undefined}
        />
      }
    >
```

**form และ footer เดิม:**
- `<form id="po-form" …>` เปลี่ยน className จาก `"flex flex-1 flex-col gap-4 px-4"` เป็น `"flex flex-col gap-4"` (`flex-1` ไม่มีผลแล้วเพราะ body ของ shell ไม่ใช่ flex)
- ลบ `<PoFooterAction …/>` เดิมที่อยู่ใต้ `</form>`

**ปิดท้าย:** `</div>` ตัวสุดท้ายก่อน `  );\n}` ท้ายไฟล์ เปลี่ยนเป็น `</FormPageShell>` — dialog / sheet ทั้งหมดอยู่ใน children ต่อจาก form ตามเดิม

- [ ] **Step 3: `po-edit-content.tsx`**

- เปลี่ยน import `FormSkeleton` เป็น `import { DocPageSkeleton } from "@/components/loader/doc-page-skeleton";`
- เปลี่ยน `if (isLoading) return <FormSkeleton />;` เป็น `<DocPageSkeleton />`
- `purchase-order-new.route.tsx` ไม่ต้องแตะ เพราะ `CreateWorkflowGate` ถือ skeleton ของตัวเอง (spec §8)

- [ ] **Step 4: เทสต์ — เปลี่ยนตามที่ตั้งใจ + เคส license**

ใน `po-header.characterization.test.tsx`:

(ก) เคส approved: เปลี่ยนชื่อ it เป็น `"[view, approved + canClose] Edit · Delete · Close · Send · More"` แล้วเปลี่ยน array เป็น:

```tsx
    expect(headerButtons()).toEqual([
      en.common.edit,
      en.common.delete,
      en.common.close,
      SEND,
      en.common.more,
    ]);
```

(ข) เพิ่มท้าย describe:

```tsx
  it("[view, license หมดอายุ] Edit/Delete ถูกปิดพร้อมเหตุผล — Close ไม่ถูกปิด", () => {
    can.canWrite = false;
    renderHeader("view", APPROVED, { canClose: true });
    for (const name of [en.common.edit, en.common.delete]) {
      const b = screen.getByRole("button", { name });
      expect(b).toBeDisabled();
      expect(b).toHaveAttribute("title", en.license.writeDisabledTitle);
    }
    expect(screen.getByRole("button", { name: en.common.close })).toBeEnabled();
  });
```

- [ ] **Step 5: gate + commit**

```bash
bunx prettier --write routes/procurement/purchase-order/po-header.tsx routes/procurement/purchase-order/po-form.tsx routes/procurement/purchase-order/po-edit-content.tsx routes/procurement/purchase-order/po-header.characterization.test.tsx && bun run typecheck && bun run lint && bun test:run routes/procurement/purchase-order && git add routes/procurement/purchase-order && git commit -m "refactor(form): purchase-order — หัวใช้ FormToolbar (Close/Send email เป็น children), ฟอร์มเข้า FormPageShell (footer slot), DocPageSkeleton

characterization เปลี่ยนตามที่ตั้งใจข้อเดียว: Close ย้ายจากหน้าสุดไปหลัง Delete (spec §3)
เพิ่มเคส license หมดอายุ (พฤติกรรมใหม่ spec §5)"
```

Expected: เทสต์ทั้งโฟลเดอร์ purchase-order เขียว (`build-po-payload` / `po-form-schema` / `po-item-pricing` / characterization 9 เคส)

---

### Task 4: store-requisition

**Files:**
- Modify: `routes/store-operation/store-requisition/sr-header.tsx` (imports + const `actions` :155-221 + `<DocFormHeader>` :316-328)
- Modify: `routes/store-operation/store-requisition/sr-form.tsx` (import + wrapper :222-321)
- Modify: `routes/store-operation/store-requisition/sr-edit-content.tsx` (skeleton)
- Modify: `routes/store-operation/store-requisition/store-requisition-new.route.tsx` (skeleton ระหว่างรอ duplicate)
- Modify: `routes/store-operation/store-requisition/sr-header.characterization.test.tsx` (เคส license)

**Interfaces:**
- Consumes:
  - `FormToolbar` เหมือน Task 3 บวก `submitSlot`
  - `FormPageShell`
  - `DocPageSkeleton`
- Produces: `SrHeader` props ไม่เปลี่ยน

- [ ] **Step 1: `sr-header.tsx`**

**imports:**
- เอาออก: `Pencil` `Trash2` `X` (lucide), `DocFormHeader`, `getModeLabels` (เปลี่ยนเป็น `import type { FormMode } from "@/types/form";`)
- คงไว้: `Building2` `CalendarDays` `Save` `User` และ `Button` (ยังใช้กับ Save ใน `submitSlot`)
- เพิ่ม: `import { FormToolbar } from "@/components/share/form-toolbar";`

**ลบ const `actions` ทั้งก้อน** แล้วเปลี่ยน `<DocFormHeader …/>` ใน return เป็น:

```tsx
      <FormToolbar
        mode={mode}
        formId="store-requisition-form"
        isPending={isPending}
        title={storeRequisition?.sr_no ?? t("title")}
        subtitle={
          <span className="flex flex-col gap-1">
            {docMeta}
            {workflowStep}
          </span>
        }
        badges={badges}
        onBack={onBack}
        onCancel={onCancel}
        // แก้ได้เฉพาะ stage role ที่กรอกใบได้ (create / approve / issue)
        onEdit={canEdit ? onEdit : undefined}
        // ลบได้เฉพาะตอนแก้ — หน้าดูเป็นที่ทำงาน workflow
        onDelete={!isView && storeRequisition ? onDelete : undefined}
        deleteIsPending={isDeletePending}
        // เดิมป้าย Save ทุกโหมด — ไม่ให้โหมด add กลายเป็น "Create"
        submitLabel={tc("save")}
        // ไม่มีแผนก = บันทึกไม่ได้ ปิดปุ่มพร้อมเหตุผล — มีแผนกแล้วใช้ปุ่มมาตรฐาน
        // (ผ่านด่าน license ของ toolbar)
        submitSlot={
          hasDepartment ? undefined : (
            <Button type="button" size="sm" disabled title={t("noDepartment")}>
              <Save aria-hidden="true" />
              {tc("save")}
            </Button>
          )
        }
      >
        {/* Duplicate/Print เฉพาะ view (ตอน edit ค่าบนจออาจยังไม่ save) ·
            comment / activity ยุบอยู่ในเมนู ⋯ — ไม่ส่ง activity ให้ toolbar ซ้ำ */}
        {storeRequisition && (
          <DocActionsMenu
            onDuplicate={isView ? handleDuplicate : undefined}
            onComment={onComment}
            commentCount={comments?.length}
            activity={{ id: storeRequisition.id, label: storeRequisition.sr_no }}
            print={
              isView && storeRequisition.id
                ? {
                    documentType: "SR",
                    documentId: storeRequisition.id,
                    filters: storeRequisition.sr_no
                      ? { DocumentNo: storeRequisition.sr_no }
                      : undefined,
                  }
                : undefined
            }
          />
        )}
      </FormToolbar>
```

ข้อควรระวัง:
- `{workflowHistorySheet}` ต่อจากนั้นคงไว้
- ตัวแปร `isAdd` ยังใช้กับ badge "New" ห้ามลบ
- ป้ายตอน pending: เดิมใช้ `getModeLabels` ได้ "Creating..." / "Saving..." ซึ่งเป็นข้อความเดียวกับ `form.creating` / `form.saving` ของ FormToolbar พฤติกรรมจึงเท่าเดิม

- [ ] **Step 2: `sr-form.tsx`**

**import:** เพิ่ม `import { FormPageShell } from "@/components/share/form-page-shell";` ต่อจาก `import { draftSaveHandler } …`

**wrapper:** เปลี่ยน `<div className="flex min-h-full flex-col">` + `<SrHeader …/>` เป็น:

```tsx
    <FormPageShell
      width="wide"
      header={
        <SrHeader
          storeRequisition={storeRequisition}
          srType={derivedSrType}
          mode={mode}
          isPending={actions.isPending}
          hasDepartment={!!departmentId}
          isDeletePending={actions.deleteIsPending}
          srDate={srDate}
          dateFormat={dateFormat}
          requesterName={reqName}
          departmentName={departmentName}
          departmentCode={departmentCode}
          isLoading={!profile}
          onBack={actions.handleBack}
          onEdit={() => setMode("edit")}
          onCancel={actions.handleCancel}
          onDelete={() => actions.setShowDelete(true)}
          onComment={() => actions.setShowComment(true)}
        />
      }
      footer={
        <SrFooter
          canSubmit={!!canSubmit}
          isPending={actions.isPending}
          role={storeRequisition?.role}
          action={computeSrAction(items.map((i) => i.stage_status ?? ""))}
          grandTotal={srGrandTotal(items)}
          hasItems={items.length > 0}
          activeTab={tab === "stock" ? "stock" : "items"}
          srId={storeRequisition?.id}
          docStatus={storeRequisition?.doc_status}
          onSubmit={actions.openSubmitDialog}
          onApprove={() => actions.setActionDialog("approve")}
          onIssue={() => actions.setActionDialog("issue")}
          onReject={() => actions.setActionDialog("reject")}
          onSendBack={() => actions.setActionDialog("review")}
        />
      }
    >
```

**form, footer และปิดท้าย:**
- `<form id="store-requisition-form" …>` เปลี่ยน className จาก `"space-y-4 px-4"` เป็น `"space-y-4"`
- ลบ `<SrFooter …/>` เดิมที่อยู่ใต้ `</form>`
- `<SrFormDialogs …/>` คงไว้ใน children ต่อจาก form
- `</div>` ตัวสุดท้ายของไฟล์ เปลี่ยนเป็น `</FormPageShell>`

- [ ] **Step 3: skeleton**

ทำซ้ำสองไฟล์เหมือนกัน:
- `sr-edit-content.tsx` และ `store-requisition-new.route.tsx`
- เปลี่ยน import `FormSkeleton` เป็น `import { DocPageSkeleton } from "@/components/loader/doc-page-skeleton";`
- เปลี่ยน `<FormSkeleton />` เป็น `<DocPageSkeleton />`
- key `audit.updated.at` ของ `sr-edit-content` คงไว้

- [ ] **Step 4: เคส license** — เพิ่มท้าย describe ของ `sr-header.characterization.test.tsx`:

```tsx
  it("[edit, license หมดอายุ] Save/Delete ถูกปิดพร้อมเหตุผล license", () => {
    can.canWrite = false;
    renderHeader("edit", DRAFT);
    for (const name of [en.common.save, en.common.delete]) {
      const b = screen.getByRole("button", { name });
      expect(b).toBeDisabled();
      expect(b).toHaveAttribute("title", en.license.writeDisabledTitle);
    }
  });
```

- [ ] **Step 5: gate + commit**

```bash
F=(routes/store-operation/store-requisition/sr-header.tsx routes/store-operation/store-requisition/sr-form.tsx routes/store-operation/store-requisition/sr-edit-content.tsx routes/store-operation/store-requisition/store-requisition-new.route.tsx routes/store-operation/store-requisition/sr-header.characterization.test.tsx)
bunx prettier --write $F && bun run typecheck && bun run lint && bun test:run routes/store-operation/store-requisition && git add $F && git commit -m "refactor(form): store-requisition — หัวใช้ FormToolbar (Save ไม่มีแผนกผ่าน submitSlot), ฟอร์มเข้า FormPageShell (footer slot), DocPageSkeleton

characterization เขียวโดยไม่แก้ assertion · เพิ่มเคส license หมดอายุ (พฤติกรรมใหม่ spec §5)"
```

Expected: characterization 9 เคสเขียว โดยไม่แก้ 8 เคสเดิม · `sr-form-helpers` / `sr-form-schema` / `use-sr-date-pattern` เขียว

---

### Task 5: guard + ตรวจ + PR

- [ ] **Step 1: guard** — ใน `components/share/__tests__/form-page-shell.usage.test.ts` ลบสองบรรทัด `routes/procurement/purchase-order/po-header.tsx` และ `routes/store-operation/store-requisition/sr-header.tsx` ออกจากบล็อก "ระลอกเอกสาร" (allowlist 12 → 10)

```bash
bun test:run components/share/__tests__/form-page-shell.usage.test.ts && bun run lint && git add components/share/__tests__/form-page-shell.usage.test.ts && git commit -m "test(form): guard allowlist — PO/SR ออกจากรายการรอระลอกเอกสาร"
```

Expected: 4/4

- [ ] **Step 2: suite**

```bash
bun run typecheck && bun run lint && bun test:run > .superpowers/sdd/2026-10-02-form-doc-wave-pr2/tests.log 2>&1; tail -15 .superpowers/sdd/2026-10-02-form-doc-wave-pr2/tests.log
```

Expected: เขียว ยกเว้น 2 เคสเดิมใน `ap-mock-repository.test.ts`

- [ ] **Step 3: เบราว์เซอร์ (ดูอย่างเดียว ห้ามกดปุ่มที่เขียน DB)** — `bun dev` ต่อ backend :4000 แล้วตรวจข้อต่อไปนี้

PO (`/procurement/purchase-order`):
- ใบ draft · view → Edit (primary) · Delete · ⋯ · กด Edit → Cancel · Save · Delete · ⋯ · กด Cancel กลับมาโหมด view
- `PO20260500006` (completed) · view → Send to vendor · ⋯ · ปุ่มขั้นตอนใน subtitle เปิด history Sheet ได้
- ใบ approved (ถ้ามี) → ลำดับ Edit · Delete · Close · Send · ⋯ · **ห้ามกด Close**
- `/procurement/purchase-order/new` (ผ่าน CreateWorkflowGate) → Cancel · Save · footer ติดก้นจอ

SR (`/store-operation/store-requisition`):
- ใบ draft · view → Edit · ⋯ (Duplicate อยู่ในเมนู) · edit → Cancel · Save · Delete · ⋯
- `SR260800001` → ปุ่มขั้นตอนเปิด history Sheet ได้ · footer ติดก้นจอ
- `/store-operation/store-requisition/new` → Cancel · Save · badge "New"

ทั้งสองโมดูล:
- วัดความกว้าง `<form>` ให้เท่าเดิมโดยประมาณ (PR 1 ได้ 1478px ที่จอเดียวกัน) · title ตรงคอลัมน์ฟอร์ม
- ที่ 596px ปุ่มไม่ล้นจอ (แถวยอดรวมของ footer ที่ล้นอยู่เดิมเป็น ruling ของ PR 1 ไม่ต้องแก้ที่นี่)
- console ไม่มี error ใหม่

- [ ] **Step 4: final review** — ใช้ review-package + reviewer ตามที่ executing-plans กำหนด

- [ ] **Step 5: push + PR** (**รอ user สั่งก่อน**)

base ของ PR = `feature/form-doc-wave` · title:

`refactor(procurement): purchase-order and store-requisition headers go through FormToolbar + FormPageShell (document wave 2)`

PR body ต้องประกาศพฤติกรรมที่เปลี่ยนตาม spec §5:
- Edit เป็น primary
- license `canWrite` ปิด Edit / Save / Delete ของ PO และ SR (เดิมไม่เช็ค) · permission gate ยังไม่มีผลเพราะ key ไม่อยู่ใน catalog
- PO: ปุ่ม Close ย้ายไปอยู่หลัง Delete · Save แสดง "Saving…" ระหว่างบันทึก · Edit ไม่ถูกปิดระหว่าง Approve/Reject ในโหมด view
- ระยะห่างจากหัวถึง body = `mt-6` · padding รอบหน้ามาจาก shell
- stacked บน #214
