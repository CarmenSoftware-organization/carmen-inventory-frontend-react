# FormPageShell — PR 1 (ของกลาง + guard + config · vendor-management · workflow/new) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** สร้าง `FormPageShell` / `FormPageSkeleton` / `FormToolbar` v2 / `isKnownPermission` แล้วย้ายฟอร์ม 17 หน้า (department · location · PR template · physical-count · vendor · price-list · price-list-template · request-price-list · workflow/new) ให้ใช้ พร้อม guard test ที่ allowlist เหลือเฉพาะหน้าที่ PR 2–3 และระลอกเอกสารจะไล่ต่อ

**Architecture:** shell คุมโครง (padding safe-area · `max-w-4xl` หรือ `wide` · `mt-6` คั่น header/body · ช่อง `footer`) · header ทุกหน้า = `FormToolbar` → `DocFormHeader` · FormToolbar รับ `title`/`titleMuted`/`badges`/`subtitle`/`leading`/`submitLabel`/`writeDisabledReason` และ gate permission เฉพาะ key ที่อยู่ใน `PERMISSIONS` จริง · กลุ่ม A (ใช้ FormToolbar อยู่แล้ว 4 ไฟล์) แค่ห่อ shell + เปลี่ยนชื่อ prop · กลุ่ม C (DocFormHeader + ปุ่มเขียนเอง 5 ไฟล์) แทนบล็อก actions ทั้งก้อนด้วย FormToolbar

**Tech Stack:** React 19 + React Compiler · react-router 7 · Tailwind v4 · use-intl · Vitest + Testing Library · bun

**Spec:** `docs/superpowers/specs/2026-10-01-form-page-shell-design.md` (§2 ของกลาง · §4 PR 1 · §5 guard)

## Global Constraints

- ภาษาสื่อสาร/commit = ไทย · PR title/body อังกฤษ (CLAUDE.md)
- `components/` ห้าม import จาก `routes/` (ESLint บังคับ) · ไม่มี `index.ts` barrel
- ไม่แตะ query / schema / field / i18n key / การ navigate ของหน้า — เปลี่ยนเฉพาะ wrapper + header
- ไม่ squash-merge · branch `feature/form-page-shell` จาก `main` (หลัง `ee811cd7`)
- gate ทุก task: `bun run typecheck && bun run lint` (lint baseline = 137 warnings, 0 error — ห้ามเพิ่ม) · pipeline gate→commit ต่อด้วย `&&` เท่านั้น ห้าม `;` ห้าม `| grep`
- ก่อน PR: `bun test:run` เขียว ยกเว้น 2 เคสแดงเดิมใน `routes/accounting/accounts-payable/ap-mock-repository.test.ts`
- ไม่เขียนเทสต์ใหม่ (preference ผู้ใช้) **ยกเว้น** guard test ตาม spec §5 และเคสใน `form-toolbar.test.tsx` ที่ spec §4 PR 1 ระบุ · characterization tests เดิม (department · location · pc · vendor · pl · rfp) ต้องเขียวโดยไม่แก้ assertion
- hook ในเครื่องบล็อก `rm -rf` / `git checkout --` / `git commit --amend` — คืนไฟล์ด้วย `git show HEAD:<file> > <file>`, แก้ commit ที่ผิดด้วย commit ใหม่
- เบราว์เซอร์: มือถือดูผ่าน iframe กว้าง 596px (`resize_window` ไม่เปลี่ยน viewport) · ปุ่ม Radix กดด้วย JS `.click()`

## Review Focus

1. **ปุ่ม back ของ pc-form ถูกตัดบนมือถือ** — เดิม pc เป็น full-width `px-4` เพราะกลัวปุ่มที่ห้อยออกซ้ายโดน `#main-content` ตัด (comment ใน pc-form.tsx:89) พอย้ายมา shell `max-w-4xl` ที่ 596px กล่องชิดขอบ ปุ่มต้องยังอยู่ใน `px-4 + m-3` ของ main-content → Task 9 เปิด `/inventory-management/physical-count/new` ใน iframe 596px แล้วดูว่าปุ่มลูกศรครบทั้งปุ่ม
2. **vendor / price-list เริ่ม gate permission** (key `vendor_management.vendor.*` / `.price_list.*` อยู่ใน catalog) — ผู้ใช้ non-admin ที่ role ไม่มี `.update` จะเห็นปุ่ม Edit จาง + dialog แทนที่เคยกดได้แล้วได้ 403 → Task 9 ยืนยันด้วย admin ว่าปุ่มยังทำงาน และ PR body ประกาศพฤติกรรมใหม่
3. **`entity` กลายเป็น optional ใน FormToolbar** — หน้าที่ส่ง `title` ไม่ต้องส่ง `entity` แต่ถ้าหน้าไหนไม่ส่งทั้งคู่ h1 จะว่างเงียบ ๆ (typecheck จับไม่ได้) → Task 4 ให้ title derive เป็น `entity ?? ""` และทุก call site ใน PR นี้ส่งอย่างน้อยหนึ่งตัว (ตรวจตอน Task 5–7)
4. **location-form focus container หลัง save** (`containerRef.current?.focus()` location-form.tsx:207) — shell ต้องส่ง `ref` + `tabIndex` ลง div จริง ไม่งั้น focus หาย → Task 5 ย้าย `ref`/`tabIndex` ไปที่ shell และ Task 9 กด Save ในหน้า location แล้วเช็ค `document.activeElement` เป็น div ของ shell
5. **wf-new ปุ่ม Save เปลี่ยนไอคอนจาก Plus เป็น Save และ Cancel ได้ไอคอน X** — เป็นผลของการใช้ชุดปุ่มมาตรฐาน (spec §0) ไม่ใช่หลุด → Task 7 ระบุเป็น ruling, PR body ประกาศ

---

### Task 1: branch + `PERMISSION_KEYS` / `isKnownPermission`

**Files:**
- Modify: `constant/permissions.ts` (ท้ายไฟล์ หลัง `buildPermissionKey`)

**Interfaces:**
- Produces: `PERMISSION_KEYS: ReadonlySet<string>` (ทุก leaf string ใน `PERMISSIONS`) · `isKnownPermission(key: string): key is Permission`

- [ ] **Step 1: branch**

```bash
git checkout main && git pull --ff-only && git checkout -b feature/form-page-shell
```

- [ ] **Step 2: เพิ่มท้าย `constant/permissions.ts`**

```ts
function collectPermissionKeys(node: unknown, out: Set<string>): void {
  if (typeof node === "string") {
    out.add(node);
    return;
  }
  if (node && typeof node === "object")
    for (const value of Object.values(node)) collectPermissionKeys(value, out);
}

const permissionKeys = new Set<string>();
collectPermissionKeys(PERMISSIONS, permissionKeys);

/** ทุก key ที่ประกาศใน `PERMISSIONS` — ใช้กันการ gate ด้วย key ผีที่ประกอบจาก prefix */
export const PERMISSION_KEYS: ReadonlySet<string> = permissionKeys;

/**
 * key ที่ประกอบแบบ dynamic (`buildPermissionKey`) อยู่ใน catalog จริงไหม — prefix ของ
 * leaf ที่ใช้ permission ระดับโมดูล (`operation_plan.view` → `operation_plan.update`)
 * ประกอบได้ key ที่ไม่มีทั้งในไฟล์นี้และใน tb_permission; gate ด้วย key แบบนั้น =
 * non-admin โดน denied ทุกคนโดย admin ไม่เห็น (bypass)
 */
export function isKnownPermission(key: string): key is Permission {
  return PERMISSION_KEYS.has(key);
}
```

- [ ] **Step 3: gate + commit**

```bash
bun run typecheck && bun run lint && git add constant/permissions.ts && git commit -m "feat(permissions): PERMISSION_KEYS + isKnownPermission กันการ gate ด้วย key ที่ไม่มีใน catalog"
```

Expected: typecheck สะอาด · lint 137 warnings 0 error

---

### Task 2: `FormPageShell` + `FormPageSkeleton`

**Files:**
- Create: `components/share/form-page-shell.tsx`
- Create: `components/loader/form-page-skeleton.tsx`

**Interfaces:**
- Produces: `FormPageShell({ header, width?, footer?, ref?, tabIndex?, children })` · `FormPageSkeleton({ width? })`
- Consumes: `SettingSectionSkeleton` จาก `@/components/ui/setting-section` (มีอยู่แล้ว) · `Skeleton` จาก `@/components/ui/skeleton`

- [ ] **Step 1: เขียน `components/share/form-page-shell.tsx`**

```tsx
import type { ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";

interface FormPageShellProps {
  /** FormToolbar / wrapper โมดูล / DocFormHeader — เรียกแบบ flush เสมอ shell ให้ gutter แล้ว */
  readonly header: ReactNode;
  /** default = max-w-4xl · wide = ไม่จำกัด (ตารางหลายคอลัมน์: product, price-list, rfp, workflow detail) */
  readonly width?: "default" | "wide";
  /** SummaryFooterBar — มีแล้ว wrapper ยืดเต็มจอให้ `mt-auto` ของ footer ทำงานตอนเนื้อสั้น */
  readonly footer?: ReactNode;
  /** ฟอร์มที่ย้าย focus กลับมาที่หน้าหลัง save (location) */
  readonly ref?: Ref<HTMLDivElement>;
  readonly tabIndex?: number;
  readonly children: ReactNode;
}

/**
 * โครงหน้า form ทุกหน้า (spec 2026-10-01-form-page-shell-design.md §2.1) — padding
 * safe-area ค่าเดียว · ความกว้างสองค่า · ช่องว่าง header→body `mt-6` ค่าเดียว
 * อย่าเขียน `p-[max(1rem,env(safe-area-inset-bottom))]` หรือ `max-w-4xl` ที่หน้าเอง
 * (`components/share/__tests__/form-page-shell.usage.test.ts` ดักอยู่)
 */
export function FormPageShell({
  header,
  width = "default",
  footer,
  ref,
  tabIndex,
  children,
}: FormPageShellProps) {
  return (
    <div
      ref={ref}
      tabIndex={tabIndex}
      className={cn(
        "mx-auto w-full p-[max(1rem,env(safe-area-inset-bottom))] outline-none",
        width === "default" && "max-w-4xl",
        footer && "flex min-h-full flex-col",
      )}
    >
      {header}
      <div className={cn("mt-6 min-w-0", footer && "flex-1")}>{children}</div>
      {footer}
    </div>
  );
}
```

- [ ] **Step 2: เขียน `components/loader/form-page-skeleton.tsx`**

```tsx
import { FormPageShell } from "@/components/share/form-page-shell";
import { SettingSectionSkeleton } from "@/components/ui/setting-section";
import { Skeleton } from "@/components/ui/skeleton";

function HeaderSkeleton() {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-8 w-20 rounded-md" />
    </div>
  );
}

/**
 * loading state ของหน้า form ที่อยู่ใน FormPageShell — โครงเดียวกับหน้าจริง (หัว +
 * SettingSection สองก้อน) แทน `FormSkeleton` ที่เป็น hero + sidebar 22rem full-bleed
 * ซึ่งไม่มีหน้าไหนในกลุ่มนี้เป็นแบบนั้น
 */
export function FormPageSkeleton({
  width,
}: {
  readonly width?: "default" | "wide";
}) {
  return (
    <FormPageShell header={<HeaderSkeleton />} width={width}>
      <SettingSectionSkeleton first fields={["half", "half", "half", "half"]} />
      <SettingSectionSkeleton fields={["half", "half", "full"]} />
    </FormPageShell>
  );
}
```

- [ ] **Step 3: gate + commit**

```bash
bun run typecheck && bun run lint && git add components/share/form-page-shell.tsx components/loader/form-page-skeleton.tsx && git commit -m "feat(form): FormPageShell โครงหน้า form เดียวกัน + FormPageSkeleton"
```

---

### Task 3: `DocFormHeader` — `onBack` optional, ตัด `workflowStep`

**Files:**
- Modify: `components/share/doc-form-header.tsx`

**Interfaces:**
- Produces: `DocFormHeaderProps` ไม่มี `workflowStep` / `workflowStepBelow` · `backLabel?` `onBack?` (ไม่ส่ง `onBack` = ไม่มีปุ่ม back)

- [ ] **Step 1: ยืนยันว่าไม่มีผู้เรียก prop ที่จะตัด**

```bash
grep -rnE 'workflowStep(Below)?=' routes components
```

Expected: ไม่มีผลลัพธ์ (ตัวแปรชื่อ `workflowStep` ใน po/pr/sr-header เป็น local ไม่ใช่ prop)

- [ ] **Step 2: แก้ props**

แทน

```ts
  readonly backLabel: string;
  readonly onBack: () => void;
  readonly badges?: ReactNode;
  readonly actions?: ReactNode;
  readonly ribbon?: ReactNode;
  readonly workflowStep?: ReactNode;
  /**
   * วาง workflowStep เป็นแถวแยกใต้ ribbon แทนคอลัมน์ขวาข้าง ribbon — ใช้เมื่อ
   * ribbon เป็น grid ที่ต้อง align คอลัมน์กับ form body (เช่น PO): workflowStep
   * ข้างขวาจะหักความกว้าง ribbon ทำให้คอลัมน์ drift
   */
  readonly workflowStepBelow?: boolean;
  readonly leading?: ReactNode;
```

ด้วย

```ts
  /** ไม่ส่ง = ใช้ `common.goBack` ของ BackButton */
  readonly backLabel?: string;
  /** ไม่ส่ง = ไม่มีปุ่มย้อนกลับ (หน้า settings ที่เป็น leaf ของเมนู ไม่มี list ให้กลับ) */
  readonly onBack?: () => void;
  readonly badges?: ReactNode;
  readonly actions?: ReactNode;
  readonly ribbon?: ReactNode;
  readonly leading?: ReactNode;
```

ลบ `workflowStep,` และ `workflowStepBelow = false,` ออกจาก destructuring

- [ ] **Step 3: แก้ markup**

BackButton:

```tsx
          {onBack && (
            <BackButton
              onClick={onBack}
              label={backLabel}
              className="absolute top-1/2 left-0 -translate-x-[calc(100%+0.25rem)] -translate-y-1/2"
            />
          )}
```

บล็อก ribbon ทั้งก้อน (ตั้งแต่ `{ribbon &&` ถึง `))}`) แทนด้วย

```tsx
        {ribbon && (
          <div className="flex items-center gap-2 pt-4">
            <div className="-ml-4 flex min-w-0 flex-1 items-center gap-2">
              {ribbon}
            </div>
          </div>
        )}
```

และแก้ comment เหนือ ribbon ให้เหลือแค่ประโยค "ribbon เป็น grid ที่ align คอลัมน์กับ form body (PO/PR/GRN/CN/SR); ml-4 ของตัว ribbon เอง cancel -ml-4 นี้ ให้ content ตัวแรกเสมอกับ title"

- [ ] **Step 4: gate + commit**

```bash
bun run typecheck && bun run lint && git add components/share/doc-form-header.tsx && git commit -m "refactor(form): DocFormHeader — onBack เป็น optional, ตัด workflowStep ที่ไม่มีผู้เรียก"
```

Expected: typecheck สะอาด (ไม่มีใครส่ง prop ที่ตัด)

---

### Task 4: `FormToolbar` v2 + เทสต์ + เปลี่ยนชื่อ `statusBadge` ที่ 3 call site

**Files:**
- Modify: `components/share/form-toolbar.tsx` (เขียนทับทั้งไฟล์)
- Modify: `components/share/form-toolbar.test.tsx` (เพิ่ม 2 เคส)
- Modify: `routes/config/department/department-form.tsx:247` · `routes/config/location/location-form.tsx:257` · `routes/procurement/purchase-request-template/prt-form.tsx:169` — `statusBadge=` → `badges=`

**Interfaces:**
- Consumes: `isKnownPermission` (Task 1)
- Produces: `FormToolbarProps` ตาม spec §2.3 — `entity?` `title?` `titleMuted?` `subtitle?: ReactNode` `badges?` `leading?` `submitLabel?` `writeDisabledReason?` `onBack?`; ลำดับปุ่ม Edit(primary) | Cancel · Save(primary) ; Delete(outline, view+edit) ; Activity ; children

- [ ] **Step 1: เขียนทับ `components/share/form-toolbar.tsx`**

```tsx
import type { ReactNode } from "react";
import { useTranslations } from "use-intl";
import { History, Pencil, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openActivity } from "@/components/share/activity-sheet-host";
import { DocFormHeader } from "@/components/share/doc-form-header";
import { useCan } from "@/hooks/use-can";
import { usePermissionPrefix } from "@/hooks/use-permission-prefix";
import { dispatchPermissionDenied } from "@/components/permission-denied-dialog";
import {
  buildPermissionKey,
  isKnownPermission,
  type Permission,
  type PermissionAction,
} from "@/constant/permissions";
import { cn } from "@/lib/utils";
import type { FormMode } from "@/types/form";

interface FormToolbarProps {
  /** ชื่อ entity สำหรับ title ที่ derive ตามโหมด ("Add X" / "Edit X" / X) — ไม่ต้องส่งถ้าส่ง `title` */
  readonly entity?: string;
  readonly mode: FormMode;
  readonly formId: string;
  readonly isPending: boolean;
  /** ไม่ส่ง = ไม่มีปุ่มย้อนกลับ (หน้า settings) */
  readonly onBack?: () => void;
  readonly onCancel: () => void;
  readonly onEdit?: () => void;
  readonly onDelete?: () => void;
  readonly deleteIsPending?: boolean;
  /** ทับ title ที่ derive จาก entity ทุกโหมด (เลขที่เอกสาร / ชื่อสดจาก useWatch / placeholder) */
  readonly title?: string;
  readonly titleMuted?: boolean;
  readonly subtitle?: ReactNode;
  readonly badges?: ReactNode;
  readonly leading?: ReactNode;
  /** label ของปุ่ม Save ตอน idle — ตอน pending ยังใช้ form.creating/saving */
  readonly submitLabel?: string;
  /** แทนปุ่ม Save ทั้งปุ่ม (product: disabled จน dirty · IA: ตั้ง doc_status ตอนคลิก) */
  readonly submitSlot?: ReactNode;
  /** ปิด Edit/Save/Delete พร้อม title อธิบาย — ทางเดียวกับ license (interface หมดอายุ) */
  readonly writeDisabledReason?: string;
  /** ปุ่มเพิ่มของหน้า (Print, Send email) ต่อท้าย Activity */
  readonly children?: ReactNode;
  readonly editTitle?: string;
  readonly permissionPrefix?: string;
  /**
   * ส่งต่อ `DocFormHeader.flush` — default true: ใน FormPageShell ไม่มี px-4 ของตัวเอง
   * shell ให้ gutter แล้ว header ต้อง flush เพื่อให้ title ตรงกับ body
   */
  readonly flush?: boolean;
  /** เปิดปุ่ม Activity — ไม่ส่ง = ไม่มีปุ่ม (เช่นโหมด add ที่ยังไม่มี id) */
  readonly activity?: { id: string; label?: string };
}

/**
 * ชุดปุ่มมาตรฐานของหัวฟอร์มทุกหน้า (spec 2026-10-01-form-page-shell-design.md §2.3):
 * Edit (primary) | Cancel · Save (primary) ; Delete (outline, view+edit) ; Activity ; children
 *
 * ที่เดียวที่เช็ค license `canWrite` และ permission — permission gate เฉพาะ key ที่อยู่ใน
 * `PERMISSIONS` จริง (leaf ที่ใช้ permission ระดับโมดูลประกอบได้ key ผี เช่น
 * `operation_plan.update` ซึ่งต้องไม่ gate)
 */
export function FormToolbar({
  entity,
  mode,
  formId,
  isPending,
  onBack,
  onCancel,
  onEdit,
  onDelete,
  deleteIsPending = false,
  title,
  titleMuted,
  subtitle,
  badges,
  leading,
  submitLabel,
  submitSlot,
  writeDisabledReason,
  children,
  editTitle,
  permissionPrefix,
  flush = true,
  activity,
}: FormToolbarProps) {
  const tc = useTranslations("common");
  const tf = useTranslations("form");
  const tActivity = useTranslations("activity");
  const tl = useTranslations("license");
  const { can, isAdmin, canWrite } = useCan();
  const autoPrefix = usePermissionPrefix();
  const prefix = permissionPrefix ?? autoPrefix;
  const isView = mode === "view";
  const isAdd = mode === "add";

  // สัญญาหมดอายุ/ถูกระงับ → ปิดปุ่มเขียนจริง (native disabled + title อธิบาย) ต่างจาก
  // permission ที่ยังคลิกได้แล้วเด้ง dialog — license มาก่อนเสมอเพราะแก้คนละวิธี
  // (ต่ออายุ ไม่ใช่ขอสิทธิ์) · writeDisabledReason ของหน้าใช้ทางเดียวกัน
  const disabledReason = !canWrite
    ? tl("writeDisabledTitle")
    : writeDisabledReason;
  const writeDisabled = disabledReason !== undefined;

  const resolvedTitle =
    title ??
    (mode === "add"
      ? tf("addTitle", { entity: entity ?? "" })
      : mode === "edit"
        ? (editTitle ?? tf("editTitle", { entity: entity ?? "" }))
        : (entity ?? ""));
  const submit = submitLabel ?? (isAdd ? tc("create") : tc("save"));
  const pending = isAdd ? tf("creating") : tf("saving");

  // key ต่อ action — undefined เมื่อไม่มี prefix หรือ key ไม่อยู่ใน catalog (= ไม่ gate)
  const keyFor = (action: PermissionAction): Permission | undefined => {
    if (!prefix) return undefined;
    const key = buildPermissionKey(prefix, action);
    return isKnownPermission(key) ? key : undefined;
  };
  const savePermission = keyFor(isAdd ? "create" : "update");
  const updatePermission = keyFor("update");
  const deletePermission = keyFor("delete");
  const denied = (key: Permission | undefined) =>
    !!key && !isAdmin && !can(key);
  const saveDenied = denied(savePermission);
  const editDenied = denied(updatePermission);
  const deleteDenied = denied(deletePermission);

  const actions = (
    <>
      {/* key + type="button" กัน React reuse DOM node ข้ามโหมด — ถ้าปุ่ม Edit
          กลายร่างเป็นปุ่ม type=submit ระหว่างคลิก ฟอร์มจะถูก submit ทันที
          (เจอจริงใน role-form-hero ตอนเติมปุ่ม Print หน้า Edit) */}
      {isView && onEdit ? (
        <Button
          key="edit"
          type="button"
          size="sm"
          onClick={
            writeDisabled
              ? undefined
              : editDenied
                ? () => dispatchPermissionDenied(updatePermission)
                : onEdit
          }
          disabled={writeDisabled}
          title={disabledReason}
          aria-disabled={!writeDisabled && editDenied ? true : undefined}
          className={cn(!writeDisabled && editDenied && "opacity-50")}
        >
          <Pencil />
          {tc("edit")}
        </Button>
      ) : !isView ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isPending}
          >
            <X />
            {tc("cancel")}
          </Button>
          {submitSlot ??
            (writeDisabled ? (
              <Button type="button" size="sm" disabled title={disabledReason}>
                <Save />
                {submit}
              </Button>
            ) : saveDenied ? (
              <Button
                type="button"
                size="sm"
                onClick={() => dispatchPermissionDenied(savePermission)}
                aria-disabled
                className="opacity-50"
              >
                <Save />
                {submit}
              </Button>
            ) : (
              <Button
                type="submit"
                size="sm"
                form={formId}
                disabled={isPending}
              >
                <Save />
                {isPending ? pending : submit}
              </Button>
            ))}
        </>
      ) : null}
      {!isAdd && onDelete && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={
            writeDisabled
              ? undefined
              : deleteDenied
                ? () => dispatchPermissionDenied(deletePermission)
                : onDelete
          }
          disabled={
            writeDisabled || (!deleteDenied && (isPending || deleteIsPending))
          }
          title={disabledReason}
          aria-disabled={!writeDisabled && deleteDenied ? true : undefined}
          className={cn(!writeDisabled && deleteDenied && "opacity-50")}
        >
          <Trash2 />
          {tc("delete")}
        </Button>
      )}
      {/* ประวัติเป็นการ "ดู" อยู่ท้ายกลุ่มถัดจากปุ่มที่เปลี่ยนข้อมูล — ลำดับเดียว
          กับทุกหน้าเอกสารในแอป: Edit · Delete · Activity · Print */}
      {activity && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => openActivity(activity.id, activity.label)}
        >
          <History />
          {tActivity("title")}
        </Button>
      )}
      {children}
    </>
  );

  return (
    <DocFormHeader
      title={resolvedTitle}
      titleMuted={titleMuted}
      subtitle={subtitle}
      backLabel={tc("goBack")}
      onBack={onBack}
      badges={badges}
      leading={leading}
      actions={actions}
      flush={flush}
    />
  );
}
```

- [ ] **Step 2: เปลี่ยนชื่อ prop ที่ 3 call site**

แก้ `statusBadge={` → `badges={` ใน `department-form.tsx` · `location-form.tsx` · `prt-form.tsx` (ไฟล์ละ 1 จุด) แล้ว `grep -rn 'statusBadge' routes components` ต้องไม่เจออะไร

- [ ] **Step 3: เพิ่ม 2 เคสท้าย `components/share/form-toolbar.test.tsx`**

```tsx
describe("FormToolbar — permission gate only for keys that exist in the catalog", () => {
  it("unknown prefix (module-level leaf) never gates: Save is a real submit even when can() is false", async () => {
    setCan({ canWrite: true, can: () => false });
    renderToolbar({ mode: "edit", permissionPrefix: "operation_plan" });
    const save = screen.getByRole("button", { name: /save/i });
    expect(save).toHaveAttribute("type", "submit");
    expect(save).not.toHaveAttribute("aria-disabled");
    await userEvent.click(save);
    expect(dispatchPermissionDenied).not.toHaveBeenCalled();
  });

  it("writeDisabledReason disables Edit/Save/Delete with that title, like the license path", () => {
    setCan({ canWrite: true, can: () => true });
    renderToolbar({
      mode: "edit",
      onDelete: () => {},
      writeDisabledReason: "expired",
    });
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /save/i })).toHaveAttribute(
      "title",
      "expired",
    );
    expect(screen.getByRole("button", { name: /delete/i })).toBeDisabled();
  });
});
```

- [ ] **Step 4: รันเทสต์ + gate + commit**

```bash
bun test:run components/share/form-toolbar.test.tsx && bun run typecheck && bun run lint && git add components/share/form-toolbar.tsx components/share/form-toolbar.test.tsx routes/config/department/department-form.tsx routes/config/location/location-form.tsx routes/procurement/purchase-request-template/prt-form.tsx && git commit -m "feat(form): FormToolbar เป็นชุดปุ่มมาตรฐาน — รับ title/badges/leading/submitLabel, Edit primary, gate เฉพาะ key ใน catalog"
```

Expected: 12/12 pass (เดิม 10 + ใหม่ 2)

---

### Task 5: กลุ่ม A — department · location · PR template · physical-count (8 หน้า) + skeleton

**Files:**
- Modify: `routes/config/department/department-form.tsx:235-256,421,454` · `routes/config/location/location-form.tsx:239-264,502,535` · `routes/procurement/purchase-request-template/prt-form.tsx:165-183,204,237` · `routes/inventory-management/physical-count/pc-form.tsx:88-92,156`
- Modify: `routes/config/department/department-edit-content.tsx` · `routes/config/location/location-edit-content.tsx` · `routes/procurement/purchase-request-template/prt-edit-content.tsx` · `routes/inventory-management/physical-count/pc-edit-content.tsx` (`FormSkeleton` → `FormPageSkeleton`)

**Interfaces:**
- Consumes: `FormPageShell` · `FormPageSkeleton` (Task 2) · `FormToolbar` (Task 4)

สูตรเดียวกันทุกไฟล์: wrapper `<div className="mx-auto w-full max-w-4xl p-[…]">` → `<FormPageShell header={…}>` · FormToolbar ย้ายเข้า `header` (รวม `<Reveal>` ที่ห่อมัน) · ลบ `<div className="mt-6">` ที่ห่อ body (ปล่อยลูกของมันเป็น children ของ shell ตรง ๆ) · dialog ท้ายไฟล์เป็น children ต่อไป (portal ไม่สน layout) · `</div>` ปิดท้าย → `</FormPageShell>`

- [ ] **Step 1: department-form**

แทน

```tsx
    <div className="mx-auto w-full max-w-4xl p-[max(1rem,env(safe-area-inset-bottom))]">
      <AnimationStyles />
      {/* ── Toolbar ─────────── */}
      <Reveal>
        <FormToolbar
```

ด้วย

```tsx
    <FormPageShell
      header={
        <Reveal>
          <FormToolbar
```

ปิด `/>` ของ toolbar ด้วย `</Reveal>` + `}` + `>` แล้ว `<AnimationStyles />` ย้ายมาเป็น child ตัวแรก · ลบ `<div className="mt-6">` (บรรทัด 256) กับ `</div>` คู่ของมัน (บรรทัด 421) · `</div>` สุดท้าย (454) → `</FormPageShell>` · import: เพิ่ม `import { FormPageShell } from "@/components/share/form-page-shell";`

ผลลัพธ์ที่ต้องได้ (โครง):

```tsx
  return (
    <FormPageShell
      header={
        <Reveal>
          <FormToolbar
            entity={department?.name || t("entity")}
            … (props เดิม, badges={codeBadge})
          />
        </Reveal>
      }
    >
      <AnimationStyles />
      {/* ── General Info ─────────── */}
      <Reveal delay={80}>
        <form id={FORM_ID} …>
          …
        </form>
      </Reveal>
      <DiscardDialog … />
      …
    </FormPageShell>
  );
```

- [ ] **Step 2: location-form** — เหมือน department แต่ wrapper มี `ref`/`tabIndex`:

```tsx
    <FormPageShell
      ref={containerRef}
      tabIndex={-1}
      header={
        <Reveal>
          <FormToolbar
```

(`outline-none` อยู่ใน shell แล้ว)

- [ ] **Step 3: prt-form** — ไม่มี Reveal: `header={<FormToolbar … />}` · ลบ `<div className="mt-6">`/`</div>` (183/204)

- [ ] **Step 4: pc-form** — `<div className="space-y-4 px-4">` + comment 3 บรรทัดเหนือมัน → `<FormPageShell header={<FormToolbar …>{children Print}</FormToolbar>}>` · `<form … className="space-y-4">` คงไว้ · `</div>` ปิด → `</FormPageShell>`

- [ ] **Step 5: skeleton 4 ไฟล์** — ใน `department-edit-content.tsx` `location-edit-content.tsx` `prt-edit-content.tsx` `pc-edit-content.tsx`:

```tsx
// เดิม
import { FormSkeleton } from "@/components/loader/form-skeleton";
  if (isLoading) return <FormSkeleton />;
// ใหม่
import { FormPageSkeleton } from "@/components/loader/form-page-skeleton";
  if (isLoading) return <FormPageSkeleton />;
```

Expected: `grep -c FormPageSkeleton routes/config/department/department-edit-content.tsx` → `2`

- [ ] **Step 6: prettier + gate + เทสต์เดิม + commit**

```bash
bunx prettier --write routes/config/department/department-form.tsx routes/config/location/location-form.tsx routes/procurement/purchase-request-template/prt-form.tsx routes/inventory-management/physical-count/pc-form.tsx && bun run typecheck && bun run lint && bun test:run routes/config routes/inventory-management/physical-count routes/procurement/purchase-request-template && git add routes/config routes/procurement/purchase-request-template routes/inventory-management/physical-count && git commit -m "refactor(form): department/location/PR template/physical-count ใช้ FormPageShell + FormPageSkeleton"
```

Expected: typecheck สะอาด · lint 137/0 · characterization tests ของ department/location/pc เขียวโดยไม่แก้

---

### Task 6: กลุ่ม C — vendor · price-list · price-list-template · request-price-list (8 หน้า) + skeleton

**Files:**
- Modify: `routes/vendor-management/vendor/vendor-form.tsx:219-295,359` · `routes/vendor-management/price-list/pl-form.tsx:168-250,301` · `routes/vendor-management/price-list-template/plt-form.tsx:115-195,404` · `routes/vendor-management/request-price-list/rfp-form.tsx:164-245,420`
- Modify: `vendor-edit-content.tsx` · `pl-edit-content.tsx` · `plt-edit-content.tsx` · `rfp-edit-content.tsx` (ใต้ `routes/vendor-management/<feature>/`)

**Interfaces:**
- Consumes: `FormToolbar` props `title` `titleMuted` `badges` `activity` `children` (Task 4) · `FormPageShell width="wide"` (Task 2)

สูตร: บล็อก `<div className="mb-6"><DocFormHeader … actions={…} /></div>` ทั้งก้อน → `header={<FormToolbar …/>}` · wrapper → `FormPageShell` · บล็อก `actions` ที่เขียนเอง (Edit/Cancel/Save/Delete/Activity) หายทั้งก้อน เหลือเป็น prop · ตัวแปร/ import ที่ไม่ได้ใช้แล้ว (`submitLabel`, `getSubmitLabel`, `tActivity`, `tform` ถ้าเหลือใช้แค่ที่นี่, `openActivity`, `Button`, `History/Pencil/Save/Trash2/X`, `DocFormHeader`) ลบตาม ESLint `no-unused-vars` (error) ชี้ — **อย่าลบไอคอนที่ยังใช้ในส่วนอื่นของไฟล์**

- [ ] **Step 1: vendor-form** — header ใหม่:

```tsx
    <FormPageShell
      header={
        <FormToolbar
          mode={f.mode}
          formId={FORM_ID}
          isPending={isPending}
          title={watchedName || t("namePlaceholder")}
          titleMuted={!watchedName}
          badges={
            <>
              {watchedCode && (
                <span className="text-muted-foreground shrink-0 text-sm">
                  · {watchedCode}
                </span>
              )}
              {!isAdd && <StatusBadge active={watchedActive} />}
            </>
          }
          onBack={f.handleBack}
          onCancel={f.handleCancel}
          onEdit={f.handleEdit}
          onDelete={vendor ? () => setShowDelete(true) : undefined}
          deleteIsPending={deleteVendor.isPending}
          activity={vendor && { id: vendor.id, label: vendor.code }}
        />
      }
    >
```

`</div>` ปิดท้าย (359) → `</FormPageShell>` · ลบ `const submitLabel = …` (217)

- [ ] **Step 2: pl-form** — เหมือน vendor; `width="wide"` (เดิมไม่มี max-w); `badges` = บล็อก plNo + `StatusIconLabel` เดิม; `activity={priceList && { id: priceList.id, label: priceList.no }}`; `onDelete={priceList ? () => setShowDelete(true) : undefined}` `deleteIsPending={deletePriceList.isPending}`

- [ ] **Step 3: plt-form** — `mode={mode}` `onBack={actions.handleBack}` `onCancel={actions.handleCancel}` `onEdit={() => setMode("edit")}` `onDelete={priceListTemplate ? () => actions.setShowDelete(true) : undefined}` `deleteIsPending={actions.isDeletePending}` `isPending={actions.isPending}` `badges={<StatusIconLabel … />}` `activity={priceListTemplate && { id: priceListTemplate.id, label: priceListTemplate.name }}`

- [ ] **Step 4: rfp-form** — `width="wide"` (เดิม 5xl); ไม่มี badges; Print เป็น children:

```tsx
        <FormToolbar
          mode={f.mode}
          formId={FORM_ID}
          isPending={isPending}
          title={watchedName || t("namePlaceholder")}
          titleMuted={!watchedName}
          onBack={f.handleBack}
          onCancel={f.handleCancel}
          onEdit={f.handleEdit}
          onDelete={requestPriceList ? () => setShowDelete(true) : undefined}
          deleteIsPending={deleteRfp.isPending}
          activity={
            requestPriceList && {
              id: requestPriceList.id,
              label: requestPriceList.name,
            }
          }
        >
          {isView && requestPriceList?.id && (
            <PrintDocumentButton
              documentType="RFP"
              documentId={requestPriceList.id}
              filters={
                requestPriceList.name
                  ? { DocumentNo: requestPriceList.name }
                  : undefined
              }
            />
          )}
        </FormToolbar>
```

- [ ] **Step 5: skeleton 4 ไฟล์** — แก้ import + JSX เหมือน Task 5 Step 5 ใน `vendor-edit-content.tsx` `pl-edit-content.tsx` `plt-edit-content.tsx` `rfp-edit-content.tsx` โดย `pl-edit-content` กับ `rfp-edit-content` ใช้ `<FormPageSkeleton width="wide" />`

- [ ] **Step 6: prettier + gate + เทสต์เดิม + commit**

```bash
bunx prettier --write 'routes/vendor-management/**/*.tsx' && bun run typecheck && bun run lint && bun test:run routes/vendor-management && git add routes/vendor-management && git commit -m "refactor(form): vendor-management 4 ฟอร์มใช้ FormToolbar + FormPageShell แทนหัวและปุ่มที่เขียนเอง"
```

Expected: characterization tests vendor/pl/rfp เขียว (หาปุ่มด้วย `en.common.edit`/`delete` — ชื่อไม่เปลี่ยน) · lint 0 error (import ที่ไม่ใช้ลบครบ)

---

### Task 7: workflow/new

**Files:**
- Modify: `routes/system-admin/workflow/wf-new-form.tsx:93-128,248` + import

- [ ] **Step 1: แทน wrapper + header**

```tsx
    <FormPageShell
      header={
        <FormToolbar
          entity={t("entity")}
          mode="add"
          formId="new-workflow-form"
          isPending={isPending}
          submitLabel={t("createWorkflow")}
          onBack={handleLeave}
          onCancel={handleLeave}
        />
      }
    >
```

`</div>` ปิดท้าย (248) → `</FormPageShell>` · ลบ import `Plus` `Spinner` `Button` `DocFormHeader` ถ้าไม่เหลือผู้ใช้ (ESLint ชี้; `Info` ยังใช้ในฟอร์ม) · **Ruling:** ปุ่ม Save ใช้ไอคอน `Save` + Cancel ได้ไอคอน `X` ตามชุดมาตรฐาน (เดิม Plus/ไม่มี) — ประกาศใน PR body

- [ ] **Step 2: gate + commit**

```bash
bunx prettier --write routes/system-admin/workflow/wf-new-form.tsx && bun run typecheck && bun run lint && bun test:run routes/system-admin/workflow && git add routes/system-admin/workflow/wf-new-form.tsx && git commit -m "refactor(form): workflow/new ใช้ FormToolbar + FormPageShell"
```

---

### Task 8: guard test `form-page-shell.usage.test.ts`

**Files:**
- Create: `components/share/__tests__/form-page-shell.usage.test.ts`

**Interfaces:**
- Consumes: `components/share/form-page-shell.tsx` (Task 2) — เทสต์อ่าน source ยืนยัน signature padding

- [ ] **Step 1: เขียนไฟล์**

```ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const ROOT = join(import.meta.dirname, "../../..");

/**
 * ลายเซ็นของโครง/หัวฟอร์มที่ประกอบเอง — ต้องมาจาก FormPageShell / FormToolbar /
 * BackButton เท่านั้น (spec 2026-10-01-form-page-shell-design.md §5)
 *
 * - `<ArrowLeft` — ปุ่มย้อนกลับต้องเป็น BackButton (doc ของ back-button.tsx)
 * - `navigate(-1)` — ปลายทางย้อนกลับต้องเป็น path ของ list ไม่ใช่ history
 * - padding safe-area ของโครง — มาจาก FormPageShell ไม่เขียนที่หน้า
 * - `<DocFormHeader` เรียกตรง — หัวฟอร์มผ่าน FormToolbar (ยกเว้นที่ระบุเหตุผล)
 *
 * `ChevronLeft` ไม่อยู่ในนี้: ใช้ถูกต้องเป็นลูกศรเลื่อนใน gallery/lightbox/timeline
 */
const SIGNATURES = [
  /<ArrowLeft\b/g,
  /navigate\(-1\)/g,
  /p-\[max\(1rem,env\(safe-area-inset-bottom\)\)\]/g,
  /<DocFormHeader\b/g,
];

function tsxFiles(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) return tsxFiles(rel);
    return e.name.endsWith(".tsx") && !e.name.endsWith(".test.tsx")
      ? [rel]
      : [];
  });
}

const sources = tsxFiles("routes").map((file) => ({
  file,
  src: readFileSync(join(ROOT, file), "utf-8"),
}));

/**
 * หน้าที่ยังไม่ย้าย — หดลงทุก PR ของงานนี้ ค่า = จำนวนลายเซ็นที่พบในไฟล์
 * (เปลี่ยนเมื่อแตะไฟล์ = ต้องมาอัปเดตที่นี่)
 */
const ALLOWED: Record<string, number> = {
  // ── ถาวร
  "routes/legal/legal-page.tsx": 1, // ArrowLeft ลิงก์กลับแอป ไม่ใช่ฟอร์ม
  "routes/inventory-management/period-end/pe-review.tsx": 1, // DFH ตรง — ไม่ใช่ฟอร์ม (PR 2 ย้ายเข้า shell แต่ยังเรียก DFH)
  // ── PR 2 (wrapper โมดูล + ฟอร์มของมัน)
  "routes/inventory-management/inventory-adjustment/ia-form-hero.tsx": 1,
  "routes/inventory-management/inventory-adjustment/ia-form.tsx": 1,
  "routes/operation-plan/category/recipe-category-form.tsx": 1,
  "routes/operation-plan/category/recipe-category-toolbar.tsx": 1,
  "routes/operation-plan/cuisine/cuisine-form.tsx": 1,
  "routes/operation-plan/cuisine/cuisine-toolbar.tsx": 1,
  "routes/operation-plan/recipe/recipe-form.tsx": 1,
  "routes/operation-plan/recipe/recipe-toolbar.tsx": 1,
  "routes/operation-plan/equipment/eq-form.tsx": 1,
  "routes/operation-plan/equipment/eq-toolbar.tsx": 1,
  "routes/product-management/product/pd-form-toolbar.tsx": 1,
  "routes/system-admin/role/role-form-hero.tsx": 1,
  "routes/system-admin/workflow/wf-header.tsx": 1,
  // ── PR 3 (h1 เขียนเอง + หน้าพิเศษ)
  "routes/system-admin/notification-template/noti-tmpl-form.tsx": 2,
  "routes/system-admin/user/user-assigned-form.tsx": 1,
  "routes/system-admin/company-profile/company-profile-component.tsx": 1,
  "routes/system-admin/default-setting/default-setting-component.tsx": 1,
  "routes/system-admin/interface/interface-page-layout.tsx": 1,
  "routes/system-admin/interface/interface-detail.route.tsx": 1,
  "routes/inventory-management/physical-count/pc-review-component.tsx": 1,
  "routes/inventory-management/spot-check/sc-review-component.tsx": 1,
  "routes/procurement/goods-receive-note/from-po/from-po-content.tsx": 1,
  "routes/procurement/purchase-order/from-pr/from-pr-content.tsx": 1,
  "routes/procurement/purchase-order/from-pr/step-result.tsx": 1,
  "routes/procurement/purchase-order/from-price-list/from-price-list-content.tsx": 1,
  "routes/procurement/purchase-request/from-template/from-template-content.tsx": 1,
  "routes/procurement/purchase-request/from-template/qty-step.tsx": 1,
  // ── ระลอกเอกสาร (procurement / accounting) — spec §8
  "routes/procurement/credit-note/cn-header.tsx": 1,
  "routes/procurement/goods-receive-note/grn-header.tsx": 1,
  "routes/procurement/purchase-order/po-header.tsx": 1,
  "routes/procurement/purchase-request/pr-header.tsx": 1,
  "routes/procurement/purchase-request/pr-form-dialogs.tsx": 1,
  "routes/store-operation/store-requisition/sr-header.tsx": 1,
  "routes/accounting/accounts-payable/ap-invoice-detail.tsx": 1,
  "routes/accounting/accounts-payable/ap-payment-detail.tsx": 1,
  "routes/accounting/accounts-receivable/ar-invoice-detail.tsx": 1,
  "routes/accounting/documents/accounting-document-detail.tsx": 1,
  // ── orphan: ไม่ได้ลงทะเบียนใน router (spec §8 — ลบหรือลงทะเบียนเป็นการตัดสินใจแยก)
  "routes/system-admin/config-email/config-email-component.tsx": 2,
};

function countSignatures(src: string): number {
  return SIGNATURES.reduce((n, re) => n + (src.match(re)?.length ?? 0), 0);
}

describe("form pages go through FormPageShell / FormToolbar / BackButton", () => {
  it("only hand-built form shells listed with a reason remain", () => {
    const counts: Record<string, number> = {};
    for (const { file, src } of sources) {
      const n = countSignatures(src);
      if (n > 0) counts[file] = n;
    }
    expect(counts).toEqual(ALLOWED);
  });

  it("still finds every signature it claims to guard", () => {
    // กัน regex ตาบอดเงียบ ๆ — แก้ class ใน shell แล้วลืมมาแก้ที่นี่ เทสต์บนจะเขียว
    // เพราะไม่ match อะไรเลย ไม่ใช่เพราะย้ายครบ
    const probe = [
      `<ArrowLeft className="size-4" />`,
      `onClick={() => navigate(-1)}`,
      `<div className="mx-auto w-full max-w-4xl p-[max(1rem,env(safe-area-inset-bottom))]">`,
      `<DocFormHeader title="x" backLabel="y" onBack={fn} />`,
    ].join("\n");
    expect(countSignatures(probe)).toBe(4);
  });

  it("matches the padding as the shell actually writes it", () => {
    const shell = readFileSync(
      join(ROOT, "components/share/form-page-shell.tsx"),
      "utf-8",
    );
    expect(shell).toMatch(SIGNATURES[2]);
  });
});
```

- [ ] **Step 2: รัน — ถ้า `ALLOWED` ไม่ตรง ให้เชื่อผลจริงแล้วแก้รายการ** (ไฟล์ที่ไม่อยู่ในขอบเขต PR นี้เท่านั้น — ถ้าไฟล์ของ Task 5–7 โผล่ แปลว่าย้ายไม่ครบ กลับไปแก้หน้านั้น)

```bash
bun test:run components/share/__tests__/form-page-shell.usage.test.ts
```

Expected: 3/3 pass

- [ ] **Step 3: commit**

```bash
bun run lint && git add components/share/__tests__/form-page-shell.usage.test.ts && git commit -m "test(form): guard กันหน้า form ประกอบโครง/หัว/ปุ่มย้อนกลับเอง — allowlist เหลือหน้าของ PR 2–3 และระลอกเอกสาร"
```

---

### Task 9: ตรวจทั้ง branch + PR

- [ ] **Step 1: static + suite**

```bash
bun run typecheck && bun run lint && bun test:run > .superpowers/sdd/2026-10-01-form-page-shell-pr1/tests.log 2>&1; tail -15 .superpowers/sdd/2026-10-01-form-page-shell-pr1/tests.log
```

Expected: ผ่านทั้งหมด ยกเว้น 2 เคสใน `ap-mock-repository.test.ts` (แดงบน main อยู่แล้ว)

- [ ] **Step 2: เบราว์เซอร์ (dev server + claude-in-chrome)** — desktop แล้ว iframe 596px

| หน้า | ดูอะไร |
|---|---|
| `/config/department/<id>` | Edit primary · Delete outline · Activity หลัง Delete · กด Edit → Cancel/Save · ระยะ header→body |
| `/config/location/<id>` | กด Edit → Save → หลัง toast `document.activeElement` เป็น div ของ shell (Review Focus 4) |
| `/inventory-management/physical-count/new` | 596px: ปุ่ม back ครบทั้งปุ่ม ไม่โดนตัด (Review Focus 1) · Print ไม่โผล่ในโหมด add |
| `/vendor-management/vendor/<id>` | title/badge code/status · ปุ่ม 4 ตัวเรียง Edit · Delete · Activity |
| `/vendor-management/price-list/<id>` | เต็มความกว้าง (wide) · ตาราง item ไม่แคบลง |
| `/vendor-management/request-price-list/<id>` | wide · Print อยู่ท้ายสุดหลัง Activity |
| `/system-admin/workflow/new` | Cancel (X) + Create workflow (Save icon) · back กลับ list |
| edit-content ตอนโหลด (throttle network) | skeleton เป็นหัว + 2 section ไม่ใช่ hero/sidebar |

- [ ] **Step 3: push + PR** (title/body อังกฤษ)

```bash
git push -u origin feature/form-page-shell
gh pr create --base main --title "feat(form): FormPageShell + FormToolbar as the standard form header (wave 1: config, vendor-management, workflow/new)" --body-file .superpowers/sdd/2026-10-01-form-page-shell-pr1/pr-body.md
```

PR body ต้องมี: spec link · ของกลาง 4 ชิ้น · 17 หน้าที่ย้าย · **พฤติกรรมที่เปลี่ยน**: Edit เป็น primary ทุกหน้า · vendor/price-list เริ่ม gate permission (key ตรง catalog) และปิดปุ่มเขียนเมื่อ license หมดอายุ · rfp/pl เป็น wide (rfp จาก 5xl) · pc-form เป็น max-w-4xl กลางจอ (จาก full-width) · wf-new ไอคอน Save/X · skeleton ใหม่ 8 หน้า · guard allowlist 40 ไฟล์ (ระบุว่าจะหดใน PR 2–3)
