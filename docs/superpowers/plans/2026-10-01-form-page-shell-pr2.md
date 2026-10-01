# FormPageShell — PR 2 (wrapper โมดูล: operation-plan · product · role · workflow · inventory-adjustment + pe-review) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ทำให้ wrapper โมดูล 8 ตัว (op-plan 4 · `PdFormToolbar` · `RoleHero` · `WfHeader` · `IaFormHero`) render `FormToolbar` แทนประกอบปุ่มเอง แล้วย้ายฟอร์ม 15 หน้า + pe-review เข้า `FormPageShell` พร้อม `FormPageSkeleton` 10 ไฟล์ และหด guard allowlist จาก 40 เหลือ 27 ไฟล์

**Architecture:** ของกลางครบจาก PR 1 (#211) — PR นี้ไม่สร้างคอมโพเนนต์ใหม่ · wrapper ยังอยู่ (ถือ useWatch / dialog / mutation ของตัวเอง) แต่เหลือแค่คำนวณ `title`/`badges`/`subtitle`/`leading`/`submitSlot`/`children` แล้วส่งให้ `FormToolbar` · ปุ่ม Edit/Cancel/Save/Delete/Activity มาจาก FormToolbar ทั้งหมด (Edit primary · Delete outline ใน view+edit · Activity หลัง Delete) · ฟอร์มที่มี sibling หลายตัวใน body (wf-detail, pe-review) ห่อ children ด้วย div ที่ถือ `space-y-*` เดิม เพราะ shell ให้แค่ `mt-6` คั่น header

**Tech Stack:** React 19 + React Compiler · react-router 7 · Tailwind v4 · use-intl · Vitest + Testing Library · bun

**Spec:** `docs/superpowers/specs/2026-10-01-form-page-shell-design.md` (§3 wrapper · §4 PR 2 · §5 guard) · plan ก่อนหน้า: `docs/superpowers/plans/2026-10-01-form-page-shell-pr1.md`

## Global Constraints

- ภาษาสื่อสาร/commit = ไทย · PR title/body อังกฤษ (CLAUDE.md)
- `components/` ห้าม import จาก `routes/` · ไม่มี barrel
- ไม่แตะ query / schema / field / i18n key / การ navigate — เปลี่ยนเฉพาะ wrapper + header + loading state
- stacked PR: branch `feature/form-page-shell-wave-2` จาก `feature/form-page-shell` (HEAD ของ #211) · PR base = `feature/form-page-shell` จนกว่า #211 จะ merge แล้วค่อย `gh pr edit --base main` · ห้าม `--delete-branch` ตอน merge #211 (memory `stacked-pr-merge-no-delete-branch`)
- gate ทุก task: `bun run typecheck && bun run lint` (baseline 137 warnings / 0 error) · **gate→commit ต่อด้วย `&&` เท่านั้น ห้าม `| grep` ห้าม `;`** (PR 1 หลุด commit แดงเพราะ grep)
- ก่อน PR: `bun test:run` เขียว ยกเว้น 2 เคสแดงเดิมใน `ap-mock-repository.test.ts`
- ไม่เขียนเทสต์ใหม่ (preference ผู้ใช้) **ยกเว้น** mock `use-can` ใน `cuisine-form.characterization.test.tsx` (ก๊อปจาก department test) เพราะ CuisineToolbar จะเรียก FormToolbar → useCan ซึ่งไม่มี license query ใน test → `canWrite=false` → ปุ่ม Edit disabled → เทสต์เดิมแดง · characterization tests อื่น (category · recipe · eq · role) mock อยู่แล้ว ต้องเขียวโดยไม่แก้ assertion
- hook บล็อก `rm -rf` / `git checkout --` / `git commit --amend` — คืนไฟล์ด้วย `git show HEAD:<file> > <file>`, แก้ด้วย commit ใหม่
- เบราว์เซอร์: มือถือผ่าน iframe 596px · ปุ่ม Radix กดด้วย JS `.click()`

## Review Focus

1. **wf-detail / pe-review เสียระยะห่างระหว่าง sibling ใน body** — wrapper เดิมถือ `space-y-3` / `space-y-5` ให้ลูกทุกตัว (validation panel · diagram · Card / skeleton · cards) shell ให้แค่ `mt-6` หลัง header → Task 5/7 ห่อ children ด้วย `<div className="space-y-3">` / `<div className="animate-fade-in-up space-y-5">` · Task 9 ดูสองหน้านี้ว่าบล็อกไม่ชนกัน
2. **IA footer ไม่ pin ก้นจอ** — `AdjSummaryFooter` (`SummaryFooterBar` `mt-auto`) ต้องอยู่ใน slot `footer` ของ shell ไม่ใช่ children; shell ใส่ `flex min-h-full flex-col` + body `flex-1` เมื่อมี footer → Task 6 ย้ายออกจาก children · Task 9 เปิดใบ IA ที่มีรายการน้อย footer ต้องติดก้นจอ และตอน `AdjSummaryFooter` คืน null (ไม่มีรายการ+ไม่มีปุ่ม) หน้าต้องไม่เพี้ยน
3. **Save ผ่าน `submitSlot` (product, IA) ไม่ผ่าน gate license/permission ของ FormToolbar** — Edit ยัง gate (เข้าโหมดแก้ไม่ได้ถ้า `!canWrite`) แต่โหมด add กด Create ได้แล้วโดน 403 จาก backend (ยอมรับได้ตาม CLAUDE.md: LicenseInterceptor คือตัวบังคับจริง) → บันทึกเป็น ruling ใน Task 3/6 + PR body
4. **role / workflow / product เริ่ม gate permission** (`system_admin.role.*` `system_admin.workflow.*` `product_management.product.*` อยู่ใน catalog) + license ปิดปุ่มเขียน — เดิมไม่เช็คเลย → PR body ประกาศ · Task 9 ยืนยันด้วย admin ว่าปุ่มทำงาน · op-plan / IA ไม่ gate (key ไม่อยู่ใน catalog; guard test ของ PR 1 ตรวจ literal แต่หน้าพวกนี้ใช้ auto-prefix)
5. **Delete โผล่ในโหมด view ของ op-plan / product และโหมด edit ของ workflow** (เดิม op-plan/product โชว์เฉพาะ edit, wf โชว์เฉพาะ view) — ตามกติกา spec §0 ไม่ใช่หลุด → PR body ประกาศ · Task 9 กด Delete ในโหมด view ของ recipe category ต้องเปิด DeleteDialog เดิม

---

### Task 1: branch

- [ ] **Step 1**

```bash
git checkout feature/form-page-shell && git pull --ff-only && git checkout -b feature/form-page-shell-wave-2
```

Expected: HEAD = `fe356ac1` หรือใหม่กว่า (commit guard fix ของ #211)

---

### Task 2: operation-plan — toolbar 4 ตัว + ฟอร์ม 4 ไฟล์ (8 หน้า) + skeleton + cuisine test mock

**Files:**
- Modify: `routes/operation-plan/category/recipe-category-toolbar.tsx` · `routes/operation-plan/cuisine/cuisine-toolbar.tsx` · `routes/operation-plan/equipment/eq-toolbar.tsx` · `routes/operation-plan/recipe/recipe-toolbar.tsx` (เขียนทับทั้งไฟล์)
- Modify: `routes/operation-plan/category/recipe-category-form.tsx:95-106,148` · `routes/operation-plan/cuisine/cuisine-form.tsx:83-94,131` · `routes/operation-plan/equipment/eq-form.tsx:149-159,210` · `routes/operation-plan/recipe/recipe-form.tsx:131-143,199`
- Modify: `recipe-category-edit-content.tsx` · `cuisine-edit-content.tsx` · `eq-edit-content.tsx` · `recipe-edit-content.tsx` (`FormSkeleton`→`FormPageSkeleton`)
- Modify: `routes/operation-plan/cuisine/cuisine-form.characterization.test.tsx` (เพิ่ม mock use-can)

**Interfaces:**
- Consumes: `FormToolbar` props `title` `badges` `activity` `deleteIsPending` (PR 1) · `FormPageShell` · `FormPageSkeleton`
- Produces: props ของ toolbar ทั้ง 4 **ไม่เปลี่ยน** (form, mode, isPending, isDeleting, onBack, onEdit, onCancel, onDelete?, activityId? — eq/recipe ไม่มี activityId) ฟอร์มเรียกเหมือนเดิม

- [ ] **Step 1: `recipe-category-toolbar.tsx`**

```tsx
import { useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { FormToolbar } from "@/components/share/form-toolbar";
import { cn } from "@/lib/utils";
import type { FormMode } from "@/types/form";
import type { RecipeCategoryFormValues } from "./recipe-category-form-schema";

interface RecipeCategoryToolbarProps {
  readonly form: UseFormReturn<RecipeCategoryFormValues>;
  readonly mode: FormMode;
  readonly isPending: boolean;
  readonly isDeleting: boolean;
  readonly onBack: () => void;
  readonly onEdit: () => void;
  readonly onCancel: () => void;
  readonly onDelete?: () => void;
  /**
   * id ของหมวดที่บันทึกไว้แล้ว — เปิดปุ่ม Activity
   *
   * toolbar เห็นแต่ค่าในฟอร์ม ไม่เห็นตัว record จึงต้องรับ id มาจากฟอร์มแม่
   * (ไม่ส่ง = โหมด add ที่ยังไม่มีประวัติให้ดู)
   */
  readonly activityId?: string;
}

export function RecipeCategoryToolbar({
  form,
  mode,
  isPending,
  isDeleting,
  onBack,
  onEdit,
  onCancel,
  onDelete,
  activityId,
}: RecipeCategoryToolbarProps) {
  const tr = useTranslations("operationPlan.recipeCategory");
  const code = useWatch({ control: form.control, name: "code" });
  const name = useWatch({ control: form.control, name: "name" });
  const isAdd = mode === "add";

  const badges = (
    <span
      className={cn(
        "text-micro-legal inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold tracking-wider uppercase",
        code
          ? "bg-foreground text-background"
          : "text-muted-foreground border border-dashed",
      )}
    >
      {code && (
        <span
          className="bg-background/70 size-1 rounded-full"
          aria-hidden="true"
        />
      )}
      {code || tr("noCode")}
    </span>
  );

  return (
    <FormToolbar
      mode={mode}
      formId="recipe-category-form"
      isPending={isPending}
      title={isAdd ? tr("add") : name || tr("untitledCategory")}
      badges={badges}
      onBack={onBack}
      onCancel={onCancel}
      onEdit={onEdit}
      onDelete={onDelete}
      deleteIsPending={isDeleting}
      activity={activityId ? { id: activityId, label: code || name } : undefined}
    />
  );
}
```

- [ ] **Step 2: `cuisine-toolbar.tsx`** — เหมือน Step 1 แต่ (a) type `CuisineFormValues` / `CuisineToolbarProps` / `CuisineToolbar` (b) ไม่มี `code`; เพิ่ม `const ts = useTranslations("status"); const tr = useTranslations("operationPlan.cuisine"); const isActive = useWatch({ control: form.control, name: "is_active" });` (c) ไม่ import `cn` (d)

```tsx
  const badges = !isAdd && (
    <StatusDotBadge
      tone={isActive ? "success" : "neutral"}
      size="xs"
      className="tracking-wider uppercase"
    >
      {isActive ? ts("active") : ts("inactive")}
    </StatusDotBadge>
  );
```

(import `StatusDotBadge` จาก `@/components/ui/status-dot-badge`) (e) `formId="cuisine-form"` · `title={isAdd ? tr("add") : name || tr("untitledCuisine")}` · `activity={activityId ? { id: activityId, label: name } : undefined}`

- [ ] **Step 3: `eq-toolbar.tsx`** — เหมือน Step 1 (มี `code` pill + `cn`) **บวก** StatusDotBadge แบบ cuisine ต่อท้ายใน fragment `<>…</>` (`{!isAdd && <StatusDotBadge …/>}`) · type `EquipmentFormValues` / `EqToolbarProps` / `EqToolbar` · `tr = useTranslations("operationPlan.equipment")` + `ts` · `formId="equipment-form"` · `title={isAdd ? tr("add") : name || tr("untitledEquipment")}` · **ไม่มี `activityId` / `activity`** (props เดิมไม่มี)

- [ ] **Step 4: `recipe-toolbar.tsx`** — คง import `StatusDotBadge, DotTone` · `Select*` · `RECIPE_STATUS_OPTIONS` · `cn` · `STATUS_DOT_TONE` · `badges` ทั้งก้อนเดิม (code pill ที่ fallback `"—"` + view: StatusDotBadge / edit: `<Select>`) ไม่แตะ · ลบ `Button` `Pencil/Save/Trash2/X` `DocFormHeader` `tc` `tform` `submitLabel` `isEdit` `actions` · return:

```tsx
  return (
    <FormToolbar
      mode={mode}
      formId="recipe-form"
      isPending={isPending}
      title={isAdd ? tr("add") : name || tr("untitledRecipe")}
      badges={badges}
      onBack={onBack}
      onCancel={onCancel}
      onEdit={onEdit}
      onDelete={onDelete}
      deleteIsPending={isDeleting}
    />
  );
```

(`isView` ยังใช้ใน badges — คงไว้)

- [ ] **Step 5: ฟอร์ม 4 ไฟล์** — แต่ละไฟล์: บล็อก

```tsx
    <div className="mx-auto w-full max-w-4xl space-y-4 p-[max(1rem,env(safe-area-inset-bottom))]">
      <XToolbar
        …props เดิม
      />

      <form
```

→

```tsx
    <FormPageShell
      header={
        <XToolbar
          …props เดิม
        />
      }
    >
      <form
```

และ `    </div>\n  );\n}` ตัวแรกหลัง return (บรรทัด 148 / 131 / 210 / 199) → `    </FormPageShell>\n  );\n}` · เพิ่ม `import { FormPageShell } from "@/components/share/form-page-shell";` ถัดจาก import ของ toolbar (recipe-form มี helper หลัง component — แทนเฉพาะ occurrence แรกหลัง `<FormPageShell`)

- [ ] **Step 6: skeleton 4 ไฟล์** — `import { FormSkeleton } from "@/components/loader/form-skeleton";` → `import { FormPageSkeleton } from "@/components/loader/form-page-skeleton";` และ `<FormSkeleton />` → `<FormPageSkeleton />`

- [ ] **Step 7: cuisine test** — ใน `cuisine-form.characterization.test.tsx` ก่อน `const { CuisineForm } = await import("./cuisine-form");` เพิ่ม

```ts
// FormToolbar ปิดปุ่ม Edit เมื่อไม่มีสิทธิ์ — เทสต์นี้สนใจเส้นทางหลัง save
// ไม่ใช่ permission ให้ผ่านหมดไปเลย
vi.mock("@/hooks/use-can", () => ({
  useCan: () => ({
    can: () => true,
    canAny: () => true,
    canAll: () => true,
    guard: (_p: unknown, fn: () => void) => fn,
    isAdmin: true,
    permissions: [],
    canWrite: true,
  }),
}));
```

- [ ] **Step 8: prettier + gate + เทสต์ + commit**

```bash
bunx prettier --write 'routes/operation-plan/**/*.tsx' && bun run typecheck && bun run lint && bun test:run routes/operation-plan && git add routes/operation-plan && git commit -m "refactor(form): operation-plan toolbar 4 ตัวใช้ FormToolbar, ฟอร์ม 8 หน้าเข้า FormPageShell"
```

Expected: lint 0 error (import ที่ไม่ใช้ลบครบ — `History`/`openActivity`/`tActivity`/`tc`/`tform` ในทุก toolbar) · characterization tests category/cuisine/eq/recipe เขียว · ไฟล์อื่นใน `routes/operation-plan` ที่ prettier แตะเพราะไม่เคย clean ให้ปล่อยและประกาศใน PR body

---

### Task 3: product — `PdFormToolbar` + pd-form (2 หน้า) + skeleton

**Files:**
- Modify: `routes/product-management/product/pd-form-toolbar.tsx` (ชื่อ export + ปุ่ม)
- Modify: `routes/product-management/product/pd-form.tsx:29,401-413,514`
- Modify: `routes/product-management/product/pd-edit-content.tsx:6,12,28`

**Interfaces:**
- Produces: `export const PdFormToolbar = memo(PdFormToolbarInner)` — props เดิมทุกตัว (`product? form mode isPending deleteIsPending hasPendingImages? onBack onEdit onCancel onDelete`)

- [ ] **Step 1: `pd-form-toolbar.tsx`** — คงการคำนวณ `displayName` `isDirty` `saveDisabled` `statusTone/statusLabel` `getButtonLabel` `badges` `subtitle` ทั้งหมด · ลบ `actions` ทั้งก้อน · import เหลือ `memo` `useWatch` `Save` (lucide) `useTranslations` `Button` `StatusDotBadge, DotTone` `FormToolbar` types · ลบ `tActivity` `History/Pencil/Trash2/X` `DocFormHeader` `openActivity` · interface → `PdFormToolbarProps` · function → `PdFormToolbarInner` · return:

```tsx
  // Save ต้อง disabled จน dirty (หรือมีรูปรอ) จึงเป็น submitSlot — ปุ่มนี้ไม่ผ่าน
  // gate license/permission ของ FormToolbar (Edit ยัง gate อยู่ คนที่ไม่มีสิทธิ์
  // เข้าโหมดแก้ไม่ได้ตั้งแต่แรก; โหมด add ตกที่ 403 ของ backend)
  const submitSlot = (
    <Button
      type="submit"
      size="sm"
      form="product-form"
      disabled={saveDisabled}
    >
      <Save className="size-4" aria-hidden="true" />
      {getButtonLabel()}
    </Button>
  );

  return (
    <FormToolbar
      mode={mode}
      formId="product-form"
      isPending={isPending}
      title={displayName}
      subtitle={subtitle}
      badges={badges}
      submitSlot={submitSlot}
      onBack={onBack}
      onCancel={onCancel}
      onEdit={onEdit}
      onDelete={product ? onDelete : undefined}
      deleteIsPending={deleteIsPending}
      activity={product ? { id: product.id, label: product.code } : undefined}
    />
  );
}

export const PdFormToolbar = memo(PdFormToolbarInner);
```

(`displayName` อาจเป็น `undefined` เมื่อ `product?.name ?? watchedName` ว่างทั้งคู่ — ส่ง `title={displayName ?? ""}` ถ้า typecheck ฟ้อง)

- [ ] **Step 2: `pd-form.tsx`** — `import FormToolbar from "./pd-form-toolbar";` → `import { PdFormToolbar } from "./pd-form-toolbar";` + `import { FormPageShell } from "@/components/share/form-page-shell";` · `<div className="mx-auto w-full space-y-4 px-4">\n      <FormToolbar\n` → `<FormPageShell\n      width="wide"\n      header={\n        <PdFormToolbar\n` · ปิด `      />\n\n      <form` → `        />\n      }\n    >\n      <form` · `</div>` ปิดท้าย (514) → `</FormPageShell>`

- [ ] **Step 3: `pd-edit-content.tsx`** — import → `FormPageSkeleton`; ทั้ง 2 จุด (`if (isLoading) return` และ `Suspense fallback`) → `<FormPageSkeleton width="wide" />`

- [ ] **Step 4: gate + commit**

```bash
bunx prettier --write routes/product-management/product/pd-form-toolbar.tsx routes/product-management/product/pd-form.tsx routes/product-management/product/pd-edit-content.tsx && bun run typecheck && bun run lint && bun test:run routes/product-management && git add routes/product-management/product && git commit -m "refactor(form): product — PdFormToolbar ใช้ FormToolbar (แก้ชื่อชนกับของกลาง), pd-form เข้า FormPageShell แบบ wide"
```

**Ruling:** Save ของ product ผ่าน `submitSlot` ไม่ gate license/permission (Review Focus 3)

---

### Task 4: role — `RoleHero` + role-form (2 หน้า) + skeleton

**Files:**
- Modify: `routes/system-admin/role/role-form-hero.tsx` (เขียนทับ)
- Modify: `routes/system-admin/role/role-form.tsx:119-135,221`
- Modify: `routes/system-admin/role/role-edit-content.tsx:5,11`

**Interfaces:**
- Produces: `RoleHero` props เปลี่ยน `isView: boolean` → `mode: FormMode`; `canDelete` ยังมี

- [ ] **Step 1: `role-form-hero.tsx`**

```tsx
import { Printer } from "lucide-react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { FormToolbar } from "@/components/share/form-toolbar";
import type { FormMode } from "@/types/form";

interface RoleHeroProps {
  readonly name: string;
  readonly mode: FormMode;
  readonly canDelete: boolean;
  readonly isDeleting: boolean;
  readonly isSaving: boolean;
  readonly onBack: () => void;
  readonly onDelete: () => void;
  readonly onEdit: () => void;
  readonly onCancel: () => void;
  readonly onPrint: () => void;
}

export function RoleHero({
  name,
  mode,
  canDelete,
  isDeleting,
  isSaving,
  onBack,
  onDelete,
  onEdit,
  onCancel,
  onPrint,
}: RoleHeroProps) {
  const t = useTranslations("systemAdmin.role");
  const tc = useTranslations("common");

  return (
    <FormToolbar
      mode={mode}
      formId="role-form"
      isPending={isSaving}
      title={name?.trim() || t("untitled")}
      onBack={onBack}
      onCancel={onCancel}
      onEdit={onEdit}
      onDelete={canDelete ? onDelete : undefined}
      deleteIsPending={isDeleting}
    >
      {/* Print เป็นปุ่มเฉพาะหน้า — อยู่ท้ายชุดมาตรฐาน (Edit · Delete · Activity · Print) */}
      {mode === "view" && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onPrint}
        >
          <Printer className="size-3.5" aria-hidden="true" />
          {tc("print")}
        </Button>
      )}
    </FormToolbar>
  );
}
```

- [ ] **Step 2: `role-form.tsx`** — `<div className="mx-auto w-full max-w-4xl space-y-4 px-4">` + comment 2 บรรทัดเหนือมัน + `<AnimationStyles />` + `{/* ── Hero ── */}` + `<Reveal>\n        <RoleHero` → `<FormPageShell\n      header={\n        <Reveal>\n          <RoleHero` · ใน RoleHero: `isView={isView}` → `mode={f.mode}` · `canDelete={isView && !!role}` → `canDelete={!!role}` · ปิด `        />\n      </Reveal>\n\n      {/* ── Form ── */}` → `          />\n        </Reveal>\n      }\n    >\n      <AnimationStyles />\n      {/* ── Form ── */}` · `</div>` ปิดท้าย (221) → `</FormPageShell>` · เพิ่ม import shell · ถ้า `isView` ไม่มีผู้ใช้เหลือ ESLint จะชี้ — ลบจาก destructuring

- [ ] **Step 3: `role-edit-content.tsx`** → `FormPageSkeleton`

- [ ] **Step 4: gate + commit**

```bash
bunx prettier --write routes/system-admin/role/role-form-hero.tsx routes/system-admin/role/role-form.tsx routes/system-admin/role/role-edit-content.tsx && bun run typecheck && bun run lint && bun test:run routes/system-admin/role && git add routes/system-admin/role && git commit -m "refactor(form): role — RoleHero ใช้ FormToolbar (Print เป็นปุ่มเพิ่ม), role-form เข้า FormPageShell"
```

Expected: `role-form.characterization.test.tsx` เขียว (หา Edit ด้วยชื่อ) · ปุ่ม Create ในโหมด add ใช้ `common.create` แทน `common.save` (ชุดมาตรฐาน — ประกาศ)

---

### Task 5: workflow detail — `WfHeader` + wf-detail (1 หน้า) + skeleton

**Files:**
- Modify: `routes/system-admin/workflow/wf-header.tsx`
- Modify: `routes/system-admin/workflow/wf-detail.tsx:127-137,305`
- Modify: `routes/system-admin/workflow/wf-edit-content.tsx:6,51`

- [ ] **Step 1: `wf-header.tsx`** — คง state/dialog/mutation/availability/`docBadges`/`badges`/`subtitle`/`handleDelete` ทั้งหมด · ลบ `activityButton` และ `actions` · import: ลบ `History, Pencil, Trash2` `Button` `DocFormHeader` `openActivity`; เพิ่ม `FormToolbar` · ลบ `tActivity` `tf` ถ้าไม่เหลือผู้ใช้ · return:

```tsx
  return (
    <>
      <FormToolbar
        mode={isEditing ? "edit" : "view"}
        formId={formId}
        isPending={isPending}
        title={isEditing ? t("editWorkflow") : workflow.name}
        subtitle={subtitle}
        badges={badges}
        submitLabel={t("saveChanges")}
        onBack={() => toList()}
        onCancel={onCancel}
        onEdit={onEdit}
        onDelete={handleDelete}
        deleteIsPending={deleteWorkflow.isPending}
        activity={{ id: workflow.id, label: workflow.name }}
      />

      <WarningDialog … เดิม />
      <DeleteDialog … เดิม />
    </>
  );
```

- [ ] **Step 2: `wf-detail.tsx`** — comment + `<div className="space-y-3 px-4">\n      <WfHeader` → `<FormPageShell\n      width="wide"\n      header={\n        <WfHeader` · ปิด `      />\n\n      {hasStages && validationResult && (` → `        />\n      }\n    >\n      <div className="space-y-3">\n      {hasStages && validationResult && (` · ก่อน `<DiscardDialog` ท้ายไฟล์ (บรรทัด ~296) ปิด `</div>` ของ space-y-3 · `</div>` ปิดท้าย (305) → `</FormPageShell>` · import shell

- [ ] **Step 3: `wf-edit-content.tsx`** → `<FormPageSkeleton width="wide" />`

- [ ] **Step 4: gate + commit**

```bash
bunx prettier --write routes/system-admin/workflow/wf-header.tsx routes/system-admin/workflow/wf-detail.tsx routes/system-admin/workflow/wf-edit-content.tsx && bun run typecheck && bun run lint && bun test:run routes/system-admin/workflow && git add routes/system-admin/workflow && git commit -m "refactor(form): workflow detail — WfHeader ใช้ FormToolbar, wf-detail เข้า FormPageShell แบบ wide"
```

---

### Task 6: inventory-adjustment — `IaFormHero` + ia-form (2 หน้า) + footer slot + skeleton

**Files:**
- Modify: `routes/inventory-management/inventory-adjustment/ia-form-hero.tsx`
- Modify: `routes/inventory-management/inventory-adjustment/ia-form.tsx:329-349,351-358,382-393,476`
- Modify: `ia-edit-content.tsx:8,37,57,65` · `ia-new-content.tsx` (spinner → skeleton)

- [ ] **Step 1: `ia-form-hero.tsx`** — คง `leading` `badges` `docNo` `canDelete` `canPrint` `saveAsDraft` · ลบ `actions` · import: ลบ `History, Pencil, Trash2, X` `DocFormHeader` `openActivity` (คง `Save` `Button` `PrintDocumentButton`); เพิ่ม `FormToolbar` · ลบ `tActivity` · return:

```tsx
  // Save ตั้ง doc_status=draft ตอนคลิกก่อน submit จึงเป็น submitSlot (ไม่ผ่าน gate
  // license/permission ของ FormToolbar — Edit ยัง gate; โหมด add ตกที่ backend)
  const submitSlot = (
    <Button
      type="submit"
      size="sm"
      form={formId}
      disabled={isPending}
      onClick={saveAsDraft}
    >
      <Save />
      {tc("save")}
    </Button>
  );

  return (
    <FormToolbar
      mode={mode}
      formId={formId}
      isPending={isPending}
      title={docNo || typeLabel}
      leading={leading}
      badges={badges}
      submitSlot={submitSlot}
      onBack={onBack}
      onCancel={onCancel}
      onEdit={isReadOnly ? undefined : onEdit}
      onDelete={canDelete ? onDelete : undefined}
      deleteIsPending={deleteIsPending}
      activity={
        inventoryAdjustment
          ? { id: inventoryAdjustment.id, label: docNo || undefined }
          : undefined
      }
    >
      {canPrint && (
        <PrintDocumentButton
          documentType={adjustmentType === "stock-in" ? "SI" : "SO"}
          documentId={inventoryAdjustment!.id}
        />
      )}
    </FormToolbar>
  );
```

- [ ] **Step 2: `ia-form.tsx`** — comment 4 บรรทัด + `<div className="mx-auto flex min-h-full max-w-4xl flex-col p-[…]">\n      <IaFormHero` → `<FormPageShell\n      header={\n        <IaFormHero` · ปิด `      />\n\n      <form` → `        />\n      }\n      footer={\n        <AdjSummaryFooter\n          …props เดิมทั้งก้อน (ย้ายมาจากบรรทัด 383-393)\n        />\n      }\n    >\n      <form` · ลบ `{/* footer อยู่นอก form … */}` + บล็อก `<AdjSummaryFooter …/>` เดิมใน children · `<form … className="mt-6 min-w-0">` → `className="min-w-0"` (shell ให้ mt-6 แล้ว; ลบ comment 2 บรรทัดเหนือ className ที่พูดถึง sidebar ได้ถ้าอยู่ติดกัน — ไม่บังคับ) · `</div>` ปิดท้าย (476) → `</FormPageShell>` · import shell

- [ ] **Step 3: skeleton** — `ia-edit-content.tsx`: import + 2 จุด → `FormPageSkeleton`, แก้ JSDoc บรรทัด 57 ให้พูดถึง `FormPageSkeleton` · `ia-new-content.tsx`: ลบ `Loader2` import, `fallback={<FormPageSkeleton />}` + import

- [ ] **Step 4: gate + commit**

```bash
bunx prettier --write 'routes/inventory-management/inventory-adjustment/*.tsx' && bun run typecheck && bun run lint && bun test:run routes/inventory-management/inventory-adjustment && git add routes/inventory-management/inventory-adjustment && git commit -m "refactor(form): inventory-adjustment — IaFormHero ใช้ FormToolbar, ia-form เข้า FormPageShell พร้อม footer slot"
```

**Ruling:** Save ของ IA ผ่าน `submitSlot` ไม่ gate license/permission (Review Focus 3)

---

### Task 7: period-end review — shell + DocFormHeader ตรง

**Files:**
- Modify: `routes/inventory-management/period-end/pe-review.tsx:116,163,411`

- [ ] **Step 1** — `<div className="animate-fade-in-up space-y-5 p-3 md:p-4">\n      <DocFormHeader` → `<FormPageShell\n      width="wide"\n      header={\n        <DocFormHeader` · ปิด `        flush\n      />\n\n      {isLoading && (` → `          flush\n        />\n      }\n    >\n      <div className="animate-fade-in-up space-y-5">\n      {isLoading && (` · ก่อน `    </div>\n  );\n}` ท้ายไฟล์ (411) ปิด `</div>` ของ space-y-5 แล้ว `</div>` สุดท้าย → `</FormPageShell>` · import shell

**Ruling:** `width="wide"` — pe-review มีตารางคลัง/สถานะเต็มความกว้างอยู่เดิม (spec §2.1 ไม่ได้ระบุ)

- [ ] **Step 2: gate + commit**

```bash
bunx prettier --write routes/inventory-management/period-end/pe-review.tsx && bun run typecheck && bun run lint && git add routes/inventory-management/period-end/pe-review.tsx && git commit -m "refactor(form): period-end review เข้า FormPageShell (DocFormHeader ตรง ไม่ใช่ฟอร์ม)"
```

---

### Task 8: guard allowlist

**Files:**
- Modify: `components/share/__tests__/form-page-shell.usage.test.ts` — ลบ 13 บรรทัดใต้ `// ── PR 2` (ia-form-hero · ia-form · op-plan 8 · pd-form-toolbar · role-form-hero · wf-header) และบรรทัด comment `// ── PR 2 …`; `pe-review` คงไว้ (ถาวร)

- [ ] **Step 1: แก้แล้วรัน**

```bash
bun test:run components/share/__tests__/form-page-shell.usage.test.ts
```

Expected: 4/4 — ถ้า `toEqual` ชี้ไฟล์ของ Task 2–7 ที่ยังมี signature แปลว่าย้ายไม่ครบ กลับไปแก้หน้านั้น ไม่ใช่แก้ allowlist

- [ ] **Step 2: commit**

```bash
bun run lint && git add components/share/__tests__/form-page-shell.usage.test.ts && git commit -m "test(form): guard allowlist หดเหลือ 27 ไฟล์หลังย้าย wrapper โมดูล"
```

---

### Task 9: ตรวจทั้ง branch + PR

- [ ] **Step 1**

```bash
bun run typecheck && bun run lint && bun test:run > .superpowers/sdd/2026-10-01-form-page-shell-pr2/tests.log 2>&1; tail -15 .superpowers/sdd/2026-10-01-form-page-shell-pr2/tests.log
```

Expected: ผ่านทั้งหมดยกเว้น 2 เคส `ap-mock-repository.test.ts`

- [ ] **Step 2: เบราว์เซอร์** (desktop; มือถือ iframe 596px ที่ recipe category)

| หน้า | ดูอะไร |
|---|---|
| `/operation-plan/category/<id>` | view: Edit primary · **Delete โผล่** · Activity ท้าย; กด Delete เปิด DeleteDialog; 596px ปุ่ม back ครบ |
| `/operation-plan/recipe/<id>` → Edit | `<Select>` สถานะอยู่ใน badges ข้าง title ยังใช้ได้ |
| `/product-management/product/<id>` | wide · subtitle แถบตัวตน · Save disabled จน dirty (กด Edit → Save เทา → พิมพ์ → Save ติด) |
| `/system-admin/role/<id>` | Edit · Delete · Print (ท้าย) · กด Edit → Cancel/Save |
| `/system-admin/workflow/<id>` | wide · validation panel / diagram / Card ไม่ชนกัน (space-y-3) · Delete ทั้ง view และ edit |
| `/inventory-management/inventory-adjustment/<id>` ที่มีรายการน้อย | footer ติดก้นจอ · ไอคอนประเภทหน้า title · Print ท้าย (view) |
| `/inventory-management/period-end/review` | wide · header + skeleton/cards มีช่องว่าง (space-y-5) · ปุ่ม Refresh/Close คงเดิม |
| edit-content ตอนโหลด | skeleton ใน shell (product/wf เป็น wide) |

- [ ] **Step 3: push + PR** (base = `feature/form-page-shell` ถ้า #211 ยังไม่ merge)

```bash
git push -u origin feature/form-page-shell-wave-2
gh pr create --base feature/form-page-shell --title "refactor(form): module form headers go through FormToolbar (wave 2: operation-plan, product, role, workflow, inventory-adjustment)" --body-file .superpowers/sdd/2026-10-01-form-page-shell-pr2/pr-body.md
```

PR body ต้องมี: spec/plan link · wrapper 8 ตัวที่บางลง · 15 หน้า + pe-review · skeleton 10 ไฟล์ · **พฤติกรรมที่เปลี่ยน**: Delete ใน view (op-plan/product) และใน edit (workflow) · role/workflow/product เริ่ม gate permission + license · Save ของ product/IA ผ่าน submitSlot ไม่ gate · role add ใช้ label Create · wf-header เลิก `text-sm`/`size-3` ของตัวเอง · pe-review/wf-detail/product เป็น wide · guard allowlist 40→27 · prettier churn ถ้ามี
