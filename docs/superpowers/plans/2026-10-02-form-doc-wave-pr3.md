# ระลอกเอกสาร — PR 3 (PR + FormToolbar.ribbon) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** หัวของ purchase-request วาดผ่าน `FormToolbar` (ซึ่งได้ prop `ribbon` เพิ่ม) แทน `PrFormActions` · ฟอร์มเข้า `FormPageShell width="wide"` โดยให้ `PrFooterAction` อยู่ใน slot `footer` · loading ใช้ `DocPageSkeleton` · dialog "ไม่มีแผนก" กลับไปหน้า list ด้วย `toList()` แทน `navigate(-1)` · guard ปิดท้ายระลอกเอกสาร

**Architecture:**
- `FormToolbar` ได้ `ribbon?: ReactNode` ซึ่งส่งต่อ `DocFormHeader.ribbon` ตรง ๆ (spec §2.1)
- `PrHeader` รับหน้าที่ของ `PrFormActions` ทั้งหมด
  - prop `actions` ถูกแทนด้วย props ของปุ่ม (`mode` `role` `isPending` `isDeletePending` `onEdit` `onCancel` `onDelete` `onComment`)
  - logic duplicate กับ comments query ย้ายเข้ามาอยู่ใน `PrHeader`
  - ลบไฟล์ `pr-form-actions.tsx`
- `handleDeleteClick` (เช็คเจ้าของใบ) ยังอยู่ใน `pr-form` แล้วส่งเข้า `onDelete`

**Tech Stack:** React 19 + React Compiler · react-router 7 · Tailwind v4 · use-intl · Vitest + Testing Library · bun

**Spec:** `docs/superpowers/specs/2026-10-02-form-page-shell-documents-design.md` (§2.1 · §3 แถว PR · §4 · §5 · §7 ข้อ 3) · แผนต้นแบบ: `docs/superpowers/plans/2026-10-02-form-doc-wave-pr2.md`

## Global Constraints

- ภาษาที่ใช้สื่อสารและ commit = ไทย · PR title/body = อังกฤษ
- ห้ามแตะ query / schema / field / i18n key / payload
  - การ navigate เปลี่ยนจุดเดียวตาม spec §3: `navigate(-1)` เป็น `toList()`
- **stacked PR:** branch `feature/form-doc-wave-pr3` แตกจาก `feature/form-doc-wave-pr2` (#215) · base ของ PR = `feature/form-doc-wave-pr2`
  - merge ด้วย merge commit ห้าม squash
  - ห้าม `--delete-branch` จนกว่าจะ merge ครบทั้ง stack
- gate ของทุก task: `bun run typecheck && bun run lint` (baseline: 137 warnings / 0 errors) · gate กับ commit ต้องต่อกันด้วย `&&`
- ก่อนเปิด PR: `bun test:run` ต้องเขียว ยกเว้น 2 เคสเดิมใน `ap-mock-repository.test.ts`
- **เทสต์:** spec §4 (user อนุมัติแล้ว)
  - เทสต์ PR characterization 1 ไฟล์
  - เทสต์ `FormToolbar` เพิ่ม 1 เคสสำหรับ ribbon
  - ข้อยกเว้นจาก "ห้ามแก้เทสต์หลัง refactor": เพราะ API ของ `PrHeader` เปลี่ยน จึงแก้ได้เฉพาะ JSX ใน helper `renderHeader` ส่วน assertion ห้ามแก้
  - เคส license หมดอายุเพิ่มหลัง refactor ได้
- hook บล็อก `rm -rf` / `git checkout --` / `--amend` · ลบไฟล์ใช้ `git rm`
- zsh ส่งรายการไฟล์ด้วย array `F=(...)`
- เบราว์เซอร์: ดูอย่างเดียว ห้ามกด Save / Submit / Approve / Reject / Delete จริง (dev DB ใช้ร่วมกัน) · ทดสอบความกว้างแคบด้วย iframe 596px

## Review Focus

1. **ribbon ตรงคอลัมน์**
   - ช่องแรกของ ribbon (workflow) ต้องเริ่มที่ขอบซ้ายเดียวกับ title (`h1`) และกับ `<form>`
   - เหตุผล: `-ml-4` ของ DocFormHeader หักล้างกับ `ml-4` ของ ribbon ใน PrHeader ซึ่งเดิมคำนวณบนหัวแบบ non-flush (px-4) ตอนนี้หัวเป็น flush
   - ribbon มี `w-full` + `ml-4` จึงอาจยื่นเกินขวา 16px → Task 5 วัด `ribbon.right ≤ form.right`
2. **Delete ของ PR โผล่ทั้ง view และ edit เมื่อเป็น draft**
   - กติกาเดิม ห้ามเปลี่ยนเป็น edit-only แบบ GRN/CN/SR
   - การเช็คเจ้าของใบยังอยู่ที่ `handleDeleteClick` เพราะ `onDelete` ต้องชี้ไปที่ handler นั้น ไม่ใช่ `setShowDelete` ตรง ๆ
3. **Duplicate / Print เฉพาะ view** ยังอยู่ใน `DocActionsMenu`
   - comments query ยังปิดเมื่อไม่มี record (`hasRecord ? prId : undefined`)
   - ไม่มี Activity ซ้ำ
4. **ปุ่ม Save ตอน add ยังขึ้นป้าย "Save"** (`submitLabel`) · ระหว่าง pending จะขึ้น "Saving…" (เปลี่ยนจากเดิม ประกาศใน PR body)
5. **dialog ไม่มีแผนก → `toList()`**
   - ปลายทางคือ list พร้อม filter เดิม (ถ้ามี state) ไม่ใช่ history
   - เปิดจาก deep link แล้วไปที่ `/procurement/purchase-request` แทนการถอยออกนอกแอป
   - `useNavigate` ใน pr-form-dialogs ถ้าไม่มีที่ใช้แล้วต้องลบออก

---

### Task 1: branch

ทำไปแล้วตอนเขียนแผน (`git switch -c feature/form-doc-wave-pr3` จาก `28afef38`) — ตรวจว่า branch ถูกและ commit แผนอยู่บนสุด

---

### Task 2: characterization test ของหัว PR (บนโค้ดเดิม)

**Files:**
- Create: `routes/procurement/purchase-request/pr-header.characterization.test.tsx`

**Interfaces:**
- Consumes: `PrHeader` (props เดิม รวม `actions`) + `PrFormActions` · `renderForm`
- Produces: ตาข่ายสำหรับ Task 4 — Task 4 แก้ได้แค่ JSX ใน `renderHeader` ส่วน assertion ต้องเขียวโดยไม่แก้

**Ruling:**
- `usePermissionPrefix` mock เป็น `undefined` เพราะเป็นค่าจริงของ production: leaf `purchaseRequest` ใน `constant/module-list.ts:289-293` ไม่มี `permission` (แก้ตาม minor ของ review PR 2)
- เทสต์ "ไม่มีสิทธิ์แต่ยังกดได้" จึงบอกเหตุผลตรงตามจริง

- [ ] **Step 1: เขียนไฟล์**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import en from "@/messages/en.json";
import type { ReactNode } from "react";
import type { PurchaseRequest } from "@/types/purchase-request";
import type { FormMode } from "@/types/form";
import { renderForm } from "@/lib/test-utils/form-characterization";

/**
 * characterization ของหัวใบขอซื้อ — จับ "ปุ่มอะไรโผล่ในโหมด/สถานะ/role ไหน" และ ribbon
 * ก่อนย้ายไป FormToolbar (spec 2026-10-02-form-page-shell-documents-design.md §4)
 * API ของ PrHeader เปลี่ยนในการย้าย (actions → props ของปุ่ม) จึงแก้ได้เฉพาะ JSX ใน
 * renderHeader — assertion ต้องเขียวทั้งก่อนและหลังโดยไม่แก้ · ไม่ตรวจ variant/สี
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
// leaf purchaseRequest ไม่มี permission (module-list.ts) → prefix จริงคือ undefined
vi.mock("@/hooks/use-permission-prefix", () => ({
  usePermissionPrefix: () => undefined,
}));
const dispatchPermissionDenied = vi.fn();
vi.mock("@/components/permission-denied-dialog", () => ({
  dispatchPermissionDenied: (...a: unknown[]) => dispatchPermissionDenied(...a),
}));
vi.mock("./use-purchase-request", async (orig) => ({
  ...(await orig<typeof import("./use-purchase-request")>()),
  usePurchaseRequestComments: () => ({ data: [] }),
}));
vi.mock("@/hooks/use-workflow", async (orig) => ({
  ...(await orig<typeof import("@/hooks/use-workflow")>()),
  useCreatableWorkflows: () => ({
    workflows: [],
    canCreate: true,
    isLoading: false,
  }),
}));

const { PrHeader } = await import("./pr-header");
const { PrFormActions } = await import("./pr-form-actions");

const tPr = en.procurement.purchaseRequest;
const base = {
  id: "00000000-0000-4000-8000-000000000005",
  pr_no: "PR26100001",
  doc_version: 1,
};
const DRAFT = { ...base, pr_status: "draft" } as unknown as PurchaseRequest;
const IN_PROGRESS = {
  ...base,
  pr_status: "in_progress",
  workflow_previous_stage: "Create",
  workflow_current_stage: "HOD",
  workflow_next_stage: "Purchase",
} as unknown as PurchaseRequest;
const VOIDED = { ...base, pr_status: "voided" } as unknown as PurchaseRequest;

interface Opts {
  role?: string;
  hasHistory?: boolean;
  workflowName?: string;
  workflowField?: ReactNode;
  description?: string;
  descriptionField?: ReactNode;
}

function renderHeader(mode: FormMode, pr?: PurchaseRequest, opts: Opts = {}) {
  const h = {
    onBack: vi.fn(),
    onEdit: vi.fn(),
    onCancel: vi.fn(),
    onDelete: vi.fn(),
    onComment: vi.fn(),
    onShowHistory: vi.fn(),
  };
  const role = opts.role ?? "create";
  renderForm(
    <PrHeader
      purchaseRequest={pr}
      onBack={h.onBack}
      reqName="Alice"
      departmentName="Kitchen"
      prDateDisplay="01/10/2026"
      workflowName={opts.workflowName}
      workflowField={opts.workflowField}
      description={opts.description}
      descriptionField={opts.descriptionField}
      hasHistory={opts.hasHistory}
      onShowHistory={h.onShowHistory}
      actions={
        <PrFormActions
          mode={mode}
          role={role}
          prStatus={pr?.pr_status}
          prId={pr?.id}
          prNo={pr?.pr_no}
          isPending={false}
          isDeletePending={false}
          hasRecord={!!pr}
          onEdit={h.onEdit}
          onCancel={h.onCancel}
          onDelete={h.onDelete}
          onComment={h.onComment}
        />
      }
    />,
  );
  return h;
}

/** แถวหัว (title + ปุ่ม) — ไม่รวม subtitle และ ribbon */
function headerRow() {
  return document.querySelector("h1")!.closest(".relative")!;
}

/** ชื่อปุ่มบนแถบหัว เรียงตาม DOM (ไม่รวมปุ่มย้อนกลับ) */
function headerButtons() {
  return [...headerRow().querySelectorAll("button")]
    .map((b) => b.textContent?.trim() || b.getAttribute("aria-label") || "")
    .filter((n) => n !== en.common.goBack);
}

beforeEach(() => {
  vi.clearAllMocks();
  can.value = () => true;
  can.isAdmin = true;
  can.canWrite = true;
});

describe("PrHeader — characterization", () => {
  it("title = เลขที่ใบ", () => {
    renderHeader("view", DRAFT);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "PR26100001",
    );
  });

  it("[view, draft, create] Edit · Delete · More", async () => {
    const h = renderHeader("view", DRAFT);
    expect(headerButtons()).toEqual([
      en.common.edit,
      en.common.delete,
      en.common.more,
    ]);
    await userEvent.click(screen.getByRole("button", { name: en.common.edit }));
    expect(h.onEdit).toHaveBeenCalledTimes(1);
    await userEvent.click(
      screen.getByRole("button", { name: en.common.delete }),
    );
    expect(h.onDelete).toHaveBeenCalledTimes(1);
  });

  it("[view, in_progress, approve] Edit · More — ไม่มี Delete (เฉพาะ draft)", () => {
    renderHeader("view", IN_PROGRESS, { role: "approve" });
    expect(headerButtons()).toEqual([en.common.edit, en.common.more]);
  });

  it("[view, view_only] More อย่างเดียว", () => {
    renderHeader("view", IN_PROGRESS, { role: "view_only" });
    expect(headerButtons()).toEqual([en.common.more]);
  });

  it("[view, voided] ไม่มี Edit", () => {
    renderHeader("view", VOIDED);
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
    expect(save).toHaveAttribute("form", "purchase-request-form");
    await userEvent.click(
      screen.getByRole("button", { name: en.common.cancel }),
    );
    expect(h.onCancel).toHaveBeenCalledTimes(1);
  });

  it("[add] Cancel · Save — ป้าย Save ไม่ใช่ Create · title = ชื่อหน้า", () => {
    renderHeader("add");
    expect(headerButtons()).toEqual([en.common.cancel, en.common.save]);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      tPr.title,
    );
  });

  it("ribbon: โหมดอ่านโชว์ workflow + description เป็นช่อง disabled ใต้แถวหัว", () => {
    renderHeader("view", DRAFT, {
      workflowName: "PR Standard",
      description: "Need for event",
    });
    const wf = screen.getByDisplayValue("PR Standard");
    const desc = screen.getByDisplayValue("Need for event");
    expect(wf).toBeDisabled();
    expect(desc).toBeDisabled();
    expect(headerRow().contains(wf)).toBe(false);
  });

  it("ribbon: ช่องที่แก้ได้ส่งเป็น node มาวางแทนช่อง disabled", () => {
    renderHeader("edit", DRAFT, {
      workflowField: <span>WF-FIELD</span>,
      descriptionField: <span>DESC-FIELD</span>,
    });
    expect(screen.getByText("WF-FIELD")).toBeInTheDocument();
    expect(screen.getByText("DESC-FIELD")).toBeInTheDocument();
  });

  it("[view, มีประวัติ] ปุ่มขั้นตอนเรียก onShowHistory", async () => {
    const h = renderHeader("view", IN_PROGRESS, {
      role: "approve",
      hasHistory: true,
    });
    await userEvent.click(
      screen.getByRole("button", { name: en.common.workflowHistoryHint }),
    );
    expect(h.onShowHistory).toHaveBeenCalledTimes(1);
  });

  it("[view, ไม่มีสิทธิ์] Edit ยังกดได้ — leaf ไม่มี permission จึงไม่ gate", async () => {
    can.isAdmin = false;
    can.value = () => false;
    const h = renderHeader("view", DRAFT);
    await userEvent.click(screen.getByRole("button", { name: en.common.edit }));
    expect(h.onEdit).toHaveBeenCalledTimes(1);
    expect(dispatchPermissionDenied).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: รันบนโค้ดเดิม**

```bash
bun test:run routes/procurement/purchase-request/pr-header.characterization.test.tsx
```

Expected: 11/11 ผ่าน — ถ้าแดง แปลว่าเข้าใจพฤติกรรมเดิมผิด ให้แก้ **เทสต์** ให้ตรงของจริงแล้วบันทึก ruling ใน ledger

- [ ] **Step 3: commit**

```bash
bunx prettier --write routes/procurement/purchase-request/pr-header.characterization.test.tsx && bun run typecheck && bun run lint && git add routes/procurement/purchase-request/pr-header.characterization.test.tsx && git commit -m "test(procurement): characterization ของหัว PR (ปุ่ม + ribbon) ก่อนย้ายไป FormToolbar"
```

---

### Task 3: `FormToolbar.ribbon`

**Files:**
- Modify: `components/share/form-toolbar.tsx` (interface · destructure · `<DocFormHeader>`)
- Modify: `components/share/form-toolbar.test.tsx` (เพิ่ม describe ท้ายไฟล์)

**Interfaces:**
- Produces: `FormToolbarProps.ribbon?: ReactNode` → `DocFormHeader.ribbon`

- [ ] **Step 1: เทสต์ (เขียนก่อน)** — ต่อท้าย `form-toolbar.test.tsx`:

```tsx
describe("FormToolbar — ribbon", () => {
  it("renders the ribbon under the header row, outside the action buttons", () => {
    setCan();
    renderToolbar({ mode: "view", ribbon: <div data-testid="ribbon">R</div> });
    const ribbon = screen.getByTestId("ribbon");
    const row = screen
      .getByRole("heading", { level: 1 })
      .closest(".relative")!;
    expect(row.contains(ribbon)).toBe(false);
  });
});
```

- [ ] **Step 2: รัน** — `bun test:run components/share/form-toolbar.test.tsx`
  Expected: เคส ribbon FAIL (`Unable to find an element by: [data-testid="ribbon"]`) เพราะ FormToolbar ยังไม่ส่งต่อ prop

- [ ] **Step 3: implement** — ใน `form-toolbar.tsx`

interface: ต่อจาก `activity`

```ts
  /** แถวช่องข้อมูลใต้หัว ส่งต่อ `DocFormHeader.ribbon` (PR — ช่อง workflow/description) */
  readonly ribbon?: ReactNode;
```

ที่เหลือ:
- เพิ่ม `ribbon,` ใน destructure ต่อจาก `activity,`
- เพิ่ม `ribbon={ribbon}` ใน `<DocFormHeader>` ต่อจาก `actions={actions}`

- [ ] **Step 4: รัน + commit**

```bash
bunx prettier --write components/share/form-toolbar.tsx components/share/form-toolbar.test.tsx && bun run typecheck && bun run lint && bun test:run components/share/form-toolbar.test.tsx && git add components/share/form-toolbar.tsx components/share/form-toolbar.test.tsx && git commit -m "feat(form): FormToolbar รับ ribbon ส่งต่อ DocFormHeader (สำหรับหัว PR)"
```

Expected: ทุกเคสใน form-toolbar.test.tsx เขียว

---

### Task 4: purchase-request

**Files:**
- Modify: `routes/procurement/purchase-request/pr-header.tsx` (ทั้งไฟล์)
- Delete: `routes/procurement/purchase-request/pr-form-actions.tsx`
- Modify: `routes/procurement/purchase-request/pr-form.tsx` (import · wrapper :235-361)
- Modify: `routes/procurement/purchase-request/pr-form-dialogs.tsx` (:5, :91, :175)
- Modify: `routes/procurement/purchase-request/pr-edit-content.tsx` · `pr-new-content.tsx` (skeleton)
- Modify: `routes/procurement/purchase-request/pr-header.characterization.test.tsx` (JSX ใน renderHeader + เคส license)

**Interfaces:**
- Consumes: `FormToolbar` (รวม `ribbon` จาก Task 3) · `FormPageShell` · `DocPageSkeleton`
- Produces: `PrHeaderProps` ใหม่:

```ts
interface PrHeaderProps {
  readonly purchaseRequest?: PurchaseRequest;
  readonly mode: FormMode;
  readonly role?: string;
  readonly isPending: boolean;
  readonly isDeletePending: boolean;
  readonly onBack: () => void;
  readonly onEdit: () => void;
  readonly onCancel: () => void;
  readonly onDelete: () => void;
  readonly onComment: () => void;
  readonly reqName: string;
  readonly departmentName: string;
  readonly prDateDisplay: string;
  readonly workflowName?: string;
  readonly workflowField?: ReactNode;
  readonly description?: string;
  readonly descriptionField?: ReactNode;
  readonly hasHistory?: boolean;
  readonly onShowHistory?: () => void;
}
```

- [ ] **Step 1: `pr-header.tsx`**

**imports** (แทนชุดเดิมทั้งหมด):

```tsx
import { Building2, CalendarDays, User } from "lucide-react";
import { type ReactNode } from "react";
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import { useListReturn } from "@/hooks/use-list-return";
import { useCreatableWorkflows } from "@/hooks/use-workflow";
import { dispatchPermissionDenied } from "@/components/permission-denied-dialog";
import { DocActionsMenu } from "@/components/share/doc-actions-menu";
import { FormToolbar } from "@/components/share/form-toolbar";
import { WorkflowTrack } from "@/components/share/workflow-track";
import { WorkflowStepButton } from "@/components/share/workflow-step-button";
import { PR_STATUS, type PurchaseRequest } from "@/types/purchase-request";
import { StatusIconLabel } from "@/components/ui/status-icon-label";
import { PR_STATUS_CONFIG } from "@/constant/purchase-request";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { WORKFLOW_TYPE } from "@/types/workflows";
import { STAGE_ROLE } from "@/types/stage-role";
import type { FormMode } from "@/types/form";
import { usePurchaseRequestComments } from "./use-purchase-request";
```

**props:** interface ตาม Interfaces ข้างบน · destructure เพิ่ม `mode, role, isPending, isDeletePending, onEdit, onCancel, onDelete, onComment` และเอา `actions` ออก

**ต่อจาก `const tfl = …` เพิ่ม** (ยกมาจาก pr-form-actions.tsx:46-66):

```tsx
  const navigate = useNavigate();
  const { returnState } = useListReturn("/procurement/purchase-request");
  const prId = purchaseRequest?.id;
  const prNo = purchaseRequest?.pr_no;
  // Duplicate = สร้างใบใหม่ — เกณฑ์เดียวกับปุ่ม Add: ต้องมี workflow ที่เริ่มได้
  // (PR ไม่มี permission .create ใน catalog) กดไม่ผ่านเด้ง dialog บอกเหตุผล
  const { canCreate: canCreatePr } = useCreatableWorkflows(WORKFLOW_TYPE.PR);
  const handleDuplicate = () => {
    if (!canCreatePr) {
      dispatchPermissionDenied(undefined, t("noCreatableWorkflow"));
      return;
    }
    navigate(
      `/procurement/purchase-request/new?duplicate_id=${prId}`,
      returnState,
    );
  };
  const { data: comments } = usePurchaseRequestComments(
    purchaseRequest ? prId : undefined,
  );
  const isView = mode === "view";
  const isVoided = purchaseRequest?.pr_status === PR_STATUS.VOIDED;
  const isViewOnly = role === STAGE_ROLE.VIEW_ONLY;
```

**ribbon:** คง `workflowCell` / `descriptionCell` / `ribbonRow` / `ribbon` ไว้ตามเดิม (ห้ามแก้ class)

**return** (แทน `<DocFormHeader …/>`):

```tsx
  return (
    <FormToolbar
      mode={mode}
      formId="purchase-request-form"
      isPending={isPending}
      title={purchaseRequest?.pr_no ?? t("title")}
      subtitle={
        workflowStep || docMeta ? (
          <span className="flex flex-col gap-1">
            {docMeta}
            {workflowStep}
          </span>
        ) : undefined
      }
      badges={badges}
      ribbon={ribbon}
      onBack={onBack}
      onCancel={onCancel}
      // แก้ได้เว้นแต่ใบถูก void หรือ role ของ stage นี้อ่านอย่างเดียว
      onEdit={!isViewOnly && !isVoided ? onEdit : undefined}
      // ลบได้ทั้ง view/edit ตราบที่ยังเป็น draft — เช็คเจ้าของใบอยู่ที่ handler ของฟอร์ม
      onDelete={
        purchaseRequest?.pr_status === PR_STATUS.DRAFT ? onDelete : undefined
      }
      deleteIsPending={isDeletePending}
      // เดิมป้าย Save ทุกโหมด — ไม่ให้โหมด add กลายเป็น "Create"
      submitLabel={tc("save")}
    >
      {/* comment / activity / duplicate / print ยุบอยู่ในเมนู ⋯ — ไม่ส่ง activity
          ให้ toolbar ซ้ำ · Duplicate/Print เฉพาะ view (ตอน edit ค่าบนจออาจยังไม่ save) */}
      {purchaseRequest && (
        <DocActionsMenu
          onDuplicate={isView && prId ? handleDuplicate : undefined}
          onComment={onComment}
          commentCount={comments?.length}
          activity={prId ? { id: prId, label: prNo } : undefined}
          print={
            isView && prId
              ? {
                  documentType: "PR",
                  documentId: prId,
                  filters: prNo ? { DocumentNo: prNo } : undefined,
                }
              : undefined
          }
        />
      )}
    </FormToolbar>
  );
```

- [ ] **Step 2: ลบ `pr-form-actions.tsx`** — `git rm routes/procurement/purchase-request/pr-form-actions.tsx`

- [ ] **Step 3: `pr-form.tsx`**

**imports:**
- ลบ `import { PrFormActions } from "./pr-form-actions";`
- เพิ่ม `import { FormPageShell } from "@/components/share/form-page-shell";` ต่อจาก import ของ `@/lib/form-helpers`

**wrapper:** เปลี่ยน `<div className="flex flex-1 flex-col space-y-4">` + `<PrHeader …/>` เป็น:

```tsx
    <FormPageShell
      width="wide"
      header={
        <PrHeader
          purchaseRequest={purchaseRequest}
          mode={mode}
          role={role}
          isPending={actions.isPending}
          isDeletePending={actions.deletePr.isPending}
          onBack={actions.handleBack}
          onEdit={() => setMode("edit")}
          onCancel={actions.handleCancel}
          onDelete={handleDeleteClick}
          onComment={() => actions.setShowComment(true)}
          reqName={reqName}
          departmentName={departmentName ?? ""}
          prDateDisplay={prDateDisplay}
          description={descriptionReadOnly ? watchedDescription : undefined}
          workflowName={
            purchaseRequest?.workflow?.name ??
            template?.workflow?.name ??
            undefined
          }
          workflowField={
            workflowEditable ? (
              <PrWorkflowField
                form={form}
                disabled={actions.isPending}
                isAdd={isAdd}
              />
            ) : undefined
          }
          descriptionField={
            descriptionReadOnly ? undefined : (
              <PrDescriptionField
                form={form}
                disabled={actions.isPending}
                className="lg:col-span-2"
              />
            )
          }
          hasHistory={hasHistory}
          onShowHistory={() => actions.setShowHistory(true)}
        />
      }
      footer={
        <PrFooterAction
          role={role}
          prStatus={purchaseRequest?.pr_status}
          isPending={actions.isPending}
          hasRecord={!!purchaseRequest}
          control={form.control}
          currencyCode={defaultBu?.config?.default_currency?.code ?? ""}
          previousStages={previousStages}
          stagesLoading={stagesLoading}
          onSubmitPr={actions.handleSubmitPr}
          onValidateSubmit={actions.validateSubmitPr}
          onApprove={actions.handleApprove}
          onReject={actions.handleReject}
          onReview={actions.handleReview}
          onPurchaseApprove={actions.handlePurchaseApprove}
          onValidatePurchase={validatePurchase}
        />
      }
    >
```

**form, footer และปิดท้าย:**
- `<form id="purchase-request-form" …>` เปลี่ยน className จาก `"space-y-4 px-4"` เป็น `"space-y-4"`
- ลบ `<PrFooterAction …/>` เดิมที่อยู่**ใต้** `<PrFormDialogs …/>` — ระวัง: ต้องค้นหาหลังตำแหน่ง `</form>` ไม่ใช่ตัวแรกในไฟล์ เพราะตัวแรกคือตัวที่เพิ่งใส่ใน `footer` (บทเรียนจาก PR 2 Task 3)
- `</div>` ตัวสุดท้ายของไฟล์ เปลี่ยนเป็น `</FormPageShell>`

- [ ] **Step 4: `pr-form-dialogs.tsx`**
- `onConfirm={() => navigate(-1)}` เปลี่ยนเป็น `onConfirm={() => toList()}`
- ลบ `const navigate = useNavigate();` และ import `useNavigate` ถ้าไม่มีที่ใช้อื่นแล้ว — ตรวจด้วย `grep -n "navigate" routes/procurement/purchase-request/pr-form-dialogs.tsx`

- [ ] **Step 5: skeleton**
- `pr-edit-content.tsx` และ `pr-new-content.tsx`: เปลี่ยน import `FormSkeleton` เป็น `import { DocPageSkeleton } from "@/components/loader/doc-page-skeleton";`
- เปลี่ยน `<FormSkeleton />` เป็น `<DocPageSkeleton />` ทุกจุด (pr-new-content มี 2 จุด คือ duplicate wait และ Suspense fallback)

- [ ] **Step 6: เทสต์ — JSX ใน renderHeader + เคส license**

ใน `pr-header.characterization.test.tsx`:

(ก) ลบบรรทัด `const { PrFormActions } = await import("./pr-form-actions");`

(ข) เปลี่ยน JSX ใน `renderForm(…)` ของ `renderHeader` เป็น:

```tsx
    <PrHeader
      purchaseRequest={pr}
      mode={mode}
      role={role}
      isPending={false}
      isDeletePending={false}
      onBack={h.onBack}
      onEdit={h.onEdit}
      onCancel={h.onCancel}
      onDelete={h.onDelete}
      onComment={h.onComment}
      reqName="Alice"
      departmentName="Kitchen"
      prDateDisplay="01/10/2026"
      workflowName={opts.workflowName}
      workflowField={opts.workflowField}
      description={opts.description}
      descriptionField={opts.descriptionField}
      hasHistory={opts.hasHistory}
      onShowHistory={h.onShowHistory}
    />,
```

(ค) เพิ่มท้าย describe:

```tsx
  it("[view, license หมดอายุ] Edit/Delete ถูกปิดพร้อมเหตุผล license", () => {
    can.canWrite = false;
    renderHeader("view", DRAFT);
    for (const name of [en.common.edit, en.common.delete]) {
      const b = screen.getByRole("button", { name });
      expect(b).toBeDisabled();
      expect(b).toHaveAttribute("title", en.license.writeDisabledTitle);
    }
  });
```

- [ ] **Step 7: gate + commit**

```bash
D=routes/procurement/purchase-request
F=($D/pr-header.tsx $D/pr-form.tsx $D/pr-form-dialogs.tsx $D/pr-edit-content.tsx $D/pr-new-content.tsx $D/pr-header.characterization.test.tsx)
bunx prettier --write $F && bun run typecheck && bun run lint && bun test:run $D && git add $F && git commit -m "refactor(form): purchase-request — หัวใช้ FormToolbar (ribbon + ปุ่มจาก PrFormActions), ฟอร์มเข้า FormPageShell (footer slot), DocPageSkeleton

- ลบ pr-form-actions.tsx (duplicate/comments ย้ายเข้า PrHeader)
- dialog ไม่มีแผนก: navigate(-1) → toList() (spec §3)
- characterization: แก้เฉพาะ JSX ใน renderHeader ตาม API ใหม่ assertion เดิมเขียวไม่แก้ · เพิ่มเคส license หมดอายุ"
```

Expected:
- characterization 12 เคสเขียว (11 เดิม + license)
- เทสต์อื่นในโฟลเดอร์ purchase-request เขียว
- `git rm` ของ Step 2 ถูก stage อยู่แล้ว จึงไปกับ commit นี้

---

### Task 5: guard ปิดท้าย + ตรวจ + PR

- [ ] **Step 1: guard** — ใน `components/share/__tests__/form-page-shell.usage.test.ts`
  - ลบสองบรรทัด `routes/procurement/purchase-request/pr-header.tsx` และ `routes/procurement/purchase-request/pr-form-dialogs.tsx`
  - เปลี่ยนหัวข้อบล็อก `// ── ระลอกเอกสาร (procurement / accounting) — spec §8` เป็น `// ── ชั่วคราว — accounting รอ spec accounting i18n (documents spec §0/§8)`
  - เหลือ accounting 4 ไฟล์ · allowlist 10 → 8

```bash
bun test:run components/share/__tests__/form-page-shell.usage.test.ts && bun run lint && git add components/share/__tests__/form-page-shell.usage.test.ts && git commit -m "test(form): guard allowlist — PR ออก ระลอกเอกสาร procurement ครบ เหลือ accounting รอ spec i18n"
```

Expected: 4/4

- [ ] **Step 2: suite**

```bash
bun run typecheck && bun run lint && bun test:run > .superpowers/sdd/2026-10-02-form-doc-wave-pr3/tests.log 2>&1; grep -E "Test Files|Tests |FAIL" .superpowers/sdd/2026-10-02-form-doc-wave-pr3/tests.log | sort -u
```

Expected: เขียว ยกเว้น 2 เคสเดิมใน `ap-mock-repository.test.ts`

- [ ] **Step 3: เบราว์เซอร์ (ดูอย่างเดียว)** — dev :3000 + backend :4000

**PR draft** (หาจาก list):
- view → Edit (primary) · Delete · ⋯ — ribbon โชว์ workflow + description
- edit → Cancel · Save (submit, `purchase-request-form`) · Delete · ⋯ — ช่อง workflow/description แก้ได้
- กด Cancel ถ้ามี Discard dialog → กด Discard (ไม่เขียน DB)

**PR ที่เดินแล้ว** (in_progress/completed):
- ปุ่มขั้นตอนเปิด history Sheet ได้
- ไม่มี Delete

**`/procurement/purchase-request/new`:** Cancel · Save · footer ติดก้นจอ

**วัด:**
- `h1.left` = ช่องแรกของ ribbon `.left` = `form.left`
- ribbon `.right` ≤ `form.right` + 1
- ฟอร์มกว้างเท่า PO/SR (1478px ที่จอเดียวกัน)
- iframe 596px ไม่ล้น (`documentElement.scrollWidth` = 596)

**dialog ไม่มีแผนก:** ตรวจด้วยมือไม่ได้ถ้าบัญชีมีแผนก → บันทึกเป็น ruling ว่าตรวจด้วยการอ่านโค้ด + guard ที่ดัก `navigate(-1)`

- [ ] **Step 4: final review** — review-package + reviewer (fable) ตาม executing-plans

- [ ] **Step 5: push + PR** (**รอ user สั่ง**)

base = `feature/form-doc-wave-pr2` · title:

`refactor(procurement): purchase-request header goes through FormToolbar (+ ribbon) and FormPageShell (document wave 3)`

PR body ประกาศ:
- Edit เป็น primary
- license `canWrite` ปิด Edit / Save / Delete ของ PR
- Save ขึ้น "Saving…" ระหว่างบันทึก
- dialog ไม่มีแผนก กลับหน้า list (`toList`) แทน history
- `FormToolbar.ribbon` ใหม่
- `pr-form-actions.tsx` ถูกลบ
- guard 10 → 8 เหลือแค่ accounting
- stacked บน #215 → #214
