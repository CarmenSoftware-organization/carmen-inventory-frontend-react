# Activity sheet ทุกโมดูล — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ขยาย activity sheet จากใบขอซื้อหน้าเดียวไปยัง 20 หน้ารายละเอียดและ 32 จุดในแถวของ list โดยไม่แตะ backend

**Architecture:** ย้าย `PrActivitySheet` ออกมาเป็น `components/share/activity-sheet.tsx` ที่ไม่ผูกกับโมดูล แล้ว mount host ตัวเดียวที่ `root-layout.tsx` ซึ่งฟัง CustomEvent จาก `openActivity()` — ตามรอย `dispatchPermissionDenied` ที่ repo ใช้อยู่ ทุกจุดต่อสายจึงเหลือการเรียกฟังก์ชันบรรทัดเดียว ไม่ต้องถือ state เอง

**Tech Stack:** React 19 · TypeScript · React Router 7 · TanStack Table · Radix UI · use-intl · Tailwind 4

## Global Constraints

- สเปกต้นทาง: `docs/superpowers/specs/2026-08-04-activity-sheet-all-modules-design.md`
- ห้ามแก้ backend — endpoint / registry / permission ใช้ของเดิมทั้งหมด
- ห้ามเปลี่ยนหน้าตาหรือพฤติกรรมของ sheet (ไทม์ไลน์ · accordion · โหลด diff ตอนกางเท่านั้น)
- **ไม่เขียนไฟล์เทสต์ใหม่** — ย้ายไฟล์เทสต์เดิมเท่านั้น (ผู้ใช้กำหนดไว้ใน CLAUDE.md ส่วนตัว) เทสต์เดิมทั้งหมดต้องเขียว 100%
- Gate ทุก task: `bunx tsc --noEmit` และ `bun run lint` ต้องสะอาด
- คอมเมนต์และ commit message เป็นภาษาไทย · identifier เป็นภาษาอังกฤษ
- ข้อความ UI ต้องมีทั้ง `messages/en.json` และ `messages/th.json` ครบทุก key
- ปุ่ม/เมนู Activity ใช้ไอคอน `History` จาก lucide-react เสมอ

---

## File Structure

| ไฟล์ | หน้าที่ |
|---|---|
| `components/share/activity-sheet.tsx` | **สร้าง** — sheet ไทม์ไลน์ + diff renderer (ย้ายจาก `pr-activity-sheet.tsx`) รับ `entityId` / `label` |
| `components/share/activity-sheet-host.tsx` | **สร้าง** — `openActivity()` + `<ActivitySheetHost />` ตัวเบาที่ `lazy()` โหลด sheet ตอนเปิดครั้งแรก |
| `components/share/activity-sheet.test.tsx` | **ย้าย** — จาก `routes/procurement/purchase-request/pr-activity-sheet.test.tsx` |
| `routes/root-layout.tsx` | **แก้** — mount `<ActivitySheetHost />` ต่อจาก `<MissingDepartmentDialog />` |
| `components/ui/data-grid/data-grid-row-actions.tsx` | **แก้** — เพิ่ม `DropdownMenuItem` Activity |
| `components/ui/data-grid/columns.tsx` | **แก้** — `actionColumn` รับ option `activity` |
| `components/ui/data-grid/use-config-table.ts` | **แก้** — ส่ง option `activity` ต่อ |
| `components/ui/form-toolbar.tsx` | **แก้** — เพิ่ม prop `activity` ให้เรนเดอร์ปุ่มเอง |
| `messages/{en,th}.json` | **แก้** — namespace ใหม่ `activity` (8 key) · เติม `history.action*` 4 key · ลบ 2 key |
| 27 × `use-*-table.tsx` | **แก้** — เปิดสวิตช์บรรทัดเดียว |
| 4 × `use-*-table.tsx` | **แก้** — ส่ง argument ที่สองให้ `actionColumn()` |
| `routes/product-management/category/tree-node.tsx` | **แก้** — เพิ่มปุ่มไอคอน History |
| 19 × header/toolbar | **แก้** — ปุ่ม Activity ในหน้า |
| PR 4 ไฟล์ | **แก้/ลบ** — เลิกใช้ state เดิม |

---

## Task 1: แกนกลาง — sheet ของกลาง, host, i18n, และแปลง PR มาใช้

**Files:**
- Create: `components/share/activity-sheet.tsx`
- Create: `components/share/activity-sheet-host.tsx`
- Move: `routes/procurement/purchase-request/pr-activity-sheet.test.tsx` → `components/share/activity-sheet.test.tsx`
- Delete: `routes/procurement/purchase-request/pr-activity-sheet.tsx`
- Modify: `routes/root-layout.tsx`
- Modify: `messages/en.json`, `messages/th.json`
- Modify: `routes/procurement/purchase-request/pr-form-actions.tsx`
- Modify: `routes/procurement/purchase-request/pr-form-dialogs.tsx`
- Modify: `routes/procurement/purchase-request/use-pr-form-actions.ts`
- Modify: `routes/procurement/purchase-request/pr-form.tsx`

**Interfaces:**
- Produces:
  - `openActivity(id: string, label?: string): void` จาก `@/components/share/activity-sheet-host`
  - `ActivitySheetHost(): JSX.Element` จากไฟล์เดียวกัน
  - `ActivitySheet` (props: `entityId?: string`, `label?: string`, `open: boolean`, `onOpenChange: (open: boolean) => void`) จาก `@/components/share/activity-sheet`
  - i18n namespace `activity` (`title` · `description` · `empty` · `noChanges` · `loadError` · `added` · `removed` · `updated`)
  - i18n key `history.actionCancelled` · `history.actionVoided` · `history.actionPrinted` · `history.actionCommented`

- [ ] **Step 1: สร้าง `components/share/activity-sheet.tsx`**

ก๊อปเนื้อทั้งหมดจาก `routes/procurement/purchase-request/pr-activity-sheet.tsx` แล้วแก้ 4 จุด:

1. เปลี่ยน `useTranslations("procurement.purchaseRequest")` ทุกที่เป็น `useTranslations("activity")` และเปลี่ยนคีย์ตามตาราง:
   `t("activity")`→`t("title")` · `t("activityDesc")`→`t("description")` · `t("activityEmpty")`→`t("empty")` ·
   `t("activityNoChanges")`→`t("noChanges")` · `t("activityLoadError")`→`t("loadError")` ·
   `t("activityAdded")`→`t("added")` · `t("activityRemoved")`→`t("removed")` · `t("activityUpdated")`→`t("updated")`

2. แทน `ACTION_TITLE_KEY` และ `ALERT_ACTIONS` ด้วย:

```tsx
/**
 * action → key หัวข้อใน namespace `history` (action นอกรายการนี้ตกไปที่ humanize)
 *
 * ครอบทั้ง action ของ CRUD และของ workflow เพราะ backend เขียนทั้งสองชุดลง
 * activity log เดียวกัน รายการนี้ตรงกับ enum `enum_activity_action` ฝั่ง DB
 * เฉพาะค่าที่ registry ของ micro-business บันทึกจริง — `view` / `login` /
 * `export` ฯลฯ มีในเอนัมแต่ไม่มี handler ไหนเขียนให้เอกสารหรือข้อมูลหลัก
 */
const ACTION_TITLE_KEY: Record<string, string> = {
  create: "actionCreated",
  update: "actionUpdated",
  delete: "actionDeleted",
  save: "actionSaved",
  submit: "actionSubmitted",
  approve: "actionApproved",
  review: "actionReviewed",
  reject: "actionRejected",
  cancel: "actionCancelled",
  void: "actionVoided",
  print: "actionPrinted",
  comment: "actionCommented",
};

/**
 * action ที่ทำลายข้อมูลหรือออกนอกทางปกติของ workflow — ย้อมจุด marker เป็นสีเตือน
 * เจตนาเดียวกับ `ALERT_ACTIONS` ของ workflow history (กวาดตาไทม์ไลน์แล้วเจอทันที
 * ว่ารายการนี้เคยถูกปฏิเสธ ยกเลิก หรือถูกลบอะไรไป) แต่คำศัพท์ไม่ตรงกัน —
 * activity log เก็บ action เป็นรูปฐาน (`delete` / `reject`) ส่วน
 * `workflow_history` เก็บเป็นรูปอดีต (`rejected`) จึงก๊อปมาแปลงรูปไม่ได้ตรง ๆ
 */
const ALERT_ACTIONS = new Set(["delete", "reject", "cancel", "void"]);
```

3. เปลี่ยนชื่อ interface และฟังก์ชัน export:

```tsx
interface ActivitySheetProps {
  readonly entityId: string | undefined;
  /** เลขที่เอกสารหรือชื่อรายการ — ขึ้นในคำอธิบายหัว sheet */
  readonly label?: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function ActivitySheet({
  entityId,
  label,
  open,
  onOpenChange,
}: ActivitySheetProps) {
```

4. ในตัว component เปลี่ยน `prId` → `entityId`, `prNo` → `label` และหัว sheet เป็น:

```tsx
<SheetTitle className="text-sm">{t("title")}</SheetTitle>
<SheetDescription className="text-xs">
  {label ? `${label} · ${t("description")}` : t("description")}
</SheetDescription>
```

JSDoc ของ component ให้เขียนใหม่ว่าเป็น sheet ของกลางที่ใช้ได้กับทุก entity ที่ backend บันทึกกิจกรรม

- [ ] **Step 2: สร้าง `components/share/activity-sheet-host.tsx`**

```tsx
import { Suspense, lazy, useEffect, useState } from "react";

const ActivitySheet = lazy(() =>
  import("./activity-sheet").then((mod) => ({ default: mod.ActivitySheet })),
);

export const ACTIVITY_SHEET_EVENT = "open-activity";

interface ActivityTarget {
  id: string;
  label?: string;
}

/**
 * เปิด activity sheet ของรายการหนึ่ง เรียกได้จากทุกที่ในแอปโดยไม่ต้องถือ state
 *
 * ใช้ CustomEvent ชุดเดียวกับ `dispatchPermissionDenied` เพราะจุดเรียกกระจายอยู่
 * 52 แห่ง — ถ้าให้แต่ละหน้าถือ state เองจะได้โค้ดซ้ำ ~600 บรรทัด และ
 * `DataGridRowActions` ซึ่งเป็นใบไม้ลึกใน column def จะต้องรับ callback ไล่ขึ้นสามชั้น
 * @param id - entity id ของรายการ (UUID ไม่ซ้ำข้ามตาราง จึงไม่ต้องส่งชื่อตาราง)
 * @param label - เลขที่เอกสารหรือชื่อรายการ ใช้แสดงในคำอธิบายหัว sheet
 * @example
 * openActivity(purchaseOrder.id, purchaseOrder.po_no);
 */
export function openActivity(id: string, label?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ActivityTarget>(ACTIVITY_SHEET_EVENT, {
      detail: { id, label },
    }),
  );
}

/**
 * ตัวรับ event ของ activity sheet — mount ครั้งเดียวที่ `root-layout.tsx`
 *
 * ตัวมันเองเบามาก (state + listener) ส่วน sheet จริงถูก `lazy()` ไว้ เพราะ
 * diff renderer ข้างในหนักและผู้ใช้ส่วนใหญ่ไม่เคยกดเปิด — ถ้ารวมเป็นไฟล์เดียว
 * โค้ดก้อนนั้นจะติดไปกับ chunk ของ shell ตลอด
 * @returns React element ของ sheet (หรือ null เมื่อยังไม่เคยเปิด)
 */
export function ActivitySheetHost() {
  const [target, setTarget] = useState<ActivityTarget | null>(null);

  useEffect(() => {
    const handler = (e: CustomEvent<ActivityTarget>) => setTarget(e.detail);
    globalThis.window.addEventListener(
      ACTIVITY_SHEET_EVENT,
      handler as EventListener,
    );
    return () => {
      globalThis.window.removeEventListener(
        ACTIVITY_SHEET_EVENT,
        handler as EventListener,
      );
    };
  }, []);

  if (!target) return null;

  return (
    <Suspense fallback={null}>
      <ActivitySheet
        entityId={target.id}
        label={target.label}
        open
        onOpenChange={(open) => !open && setTarget(null)}
      />
    </Suspense>
  );
}
```

- [ ] **Step 3: mount host ที่ `routes/root-layout.tsx`**

เพิ่ม import และวาง `<ActivitySheetHost />` ต่อจาก `<MissingDepartmentDialog />`:

```tsx
import { ActivitySheetHost } from "@/components/share/activity-sheet-host";
```
```tsx
      <KeyboardShortcutsDialog />
      <MissingDepartmentDialog />
      <ActivitySheetHost />
```

- [ ] **Step 4: ย้าย i18n**

ใน `messages/en.json` — ลบ 8 key `activity*` ออกจาก `procurement.purchaseRequest` แล้วเพิ่ม namespace ใหม่ระดับบนสุด:

```json
"activity": {
  "title": "Activity",
  "description": "Everything done to this record, newest first",
  "empty": "No activity recorded yet",
  "noChanges": "Nothing changed",
  "loadError": "Could not load activity",
  "added": "added",
  "removed": "removed",
  "updated": "updated"
}
```

ใน `history` ของ `en.json` — ลบ `actionPurchased` และ `actionSentBack` แล้วเพิ่ม:

```json
"actionCancelled": "Cancelled",
"actionVoided": "Voided",
"actionPrinted": "Printed",
"actionCommented": "Commented"
```

ทำเหมือนกันใน `messages/th.json` ด้วยค่าไทย:

```json
"activity": {
  "title": "กิจกรรม",
  "description": "ทุกอย่างที่เกิดขึ้นกับรายการนี้ ล่าสุดขึ้นก่อน",
  "empty": "ยังไม่มีกิจกรรมที่บันทึกไว้",
  "noChanges": "ไม่มีอะไรเปลี่ยน",
  "loadError": "โหลดกิจกรรมไม่สำเร็จ",
  "added": "เพิ่ม",
  "removed": "ลบ",
  "updated": "แก้ไข"
}
```
```json
"actionCancelled": "ยกเลิกแล้ว",
"actionVoided": "ยกเลิกใบแล้ว",
"actionPrinted": "พิมพ์",
"actionCommented": "แสดงความเห็น"
```

- [ ] **Step 5: ย้ายไฟล์เทสต์เดิม**

```bash
git mv routes/procurement/purchase-request/pr-activity-sheet.test.tsx \
       components/share/activity-sheet.test.tsx
```

แก้ในไฟล์เทสต์: path ของ import (`./pr-activity-sheet` → `./activity-sheet`), ชื่อ component
(`PrActivitySheet` → `ActivitySheet`), prop (`prId` → `entityId`, `prNo` → `label`) และ mock
ของ `useTranslations` ถ้ามีการอ้าง namespace `procurement.purchaseRequest`

- [ ] **Step 6: แปลง PR มาใช้ host**

`pr-form-actions.tsx` — ลบ prop `onActivity` ออกจาก interface/destructure/JSDoc แล้วเปลี่ยนปุ่ม:

```tsx
{hasRecord && prId && (
  <Button
    type="button"
    size="sm"
    variant="outline"
    onClick={() => openActivity(prId, prNo)}
  >
    <History />
    {tActivity("title")}
  </Button>
)}
```

เพิ่ม `import { openActivity } from "@/components/share/activity-sheet-host";` และ
`const tActivity = useTranslations("activity");`

`pr-form-dialogs.tsx` — ลบ `const PrActivitySheet = lazy(...)`, ลบ props `showActivity` /
`setShowActivity` จาก interface และ destructure, ลบ JSX `<PrActivitySheet … />`

`use-pr-form-actions.ts` — ลบ `const [showActivity, setShowActivity] = useState(false);`
และลบ `showActivity` / `setShowActivity` ออกจาก object ที่ return

`pr-form.tsx` — ลบ props `showActivity={actions.showActivity}` และ
`setShowActivity={actions.setShowActivity}` ที่ส่งให้ `PrFormDialogs` และลบ `onActivity`
ที่ส่งให้ `PrFormActions`

- [ ] **Step 7: ลบไฟล์เดิม**

```bash
git rm routes/procurement/purchase-request/pr-activity-sheet.tsx
```

- [ ] **Step 8: ตรวจและ commit**

```bash
bunx tsc --noEmit && bun run lint && bun test:run
```
คาดหวัง: ผ่านทั้งหมด ไม่มี error

```bash
git add -A
git commit -m "feat(activity): แยก activity sheet เป็นของกลางและ mount host ที่ shell"
```

---

## Task 2: เมนู Activity ในแถวของ DataGrid + เปิด 27 list

**Files:**
- Modify: `components/ui/data-grid/data-grid-row-actions.tsx`
- Modify: `components/ui/data-grid/columns.tsx`
- Modify: `components/ui/data-grid/use-config-table.ts`
- Modify: 27 ไฟล์ `use-*-table.tsx` (รายชื่อใน Step 4)

**Interfaces:**
- Consumes: `openActivity(id, label?)` จาก Task 1
- Produces:
  - `DataGridRowActions` รับ prop `activity?: { id: string; label?: string }`
  - `actionColumn<T>(onDelete, options?)` โดย `options` เพิ่มฟิลด์
    `activity?: { id: (row: T) => string | undefined; label?: (row: T) => string | undefined }`
  - `useConfigTable<T>({ …, activity? })` รับ option ชื่อและรูปแบบเดียวกับข้างบน

- [ ] **Step 1: `data-grid-row-actions.tsx`**

เพิ่ม `History` เข้า import ของ lucide-react และเพิ่ม prop:

```tsx
  /** เปิดเมนู Activity — ไม่ส่ง = ไม่มีเมนู (list ที่ backend ไม่ได้บันทึกกิจกรรม) */
  readonly activity?: { id: string; label?: string };
```

เพิ่ม `activity` เข้า destructure และเพิ่ม import:

```tsx
import { openActivity } from "@/components/share/activity-sheet-host";
```

เพิ่ม `const tActivity = useTranslations("activity");` แล้วแทรกเมนูก่อน separator ของ delete:

```tsx
          {activity?.id && (
            <DropdownMenuItem
              className="cursor-pointer"
              // onSelect ไม่ใช่ onClick — Radix ต้องปิดเมนูและคืน focus ให้เสร็จ
              // ก่อน Sheet จะ mount ไม่งั้นสองตัวแย่ง focus กัน
              onSelect={() => openActivity(activity.id, activity.label)}
            >
              <History className="size-3" />
              {tActivity("title")}
            </DropdownMenuItem>
          )}
          {activity?.id && onDelete && <DropdownMenuSeparator />}
```

และเปลี่ยนเงื่อนไข separator เดิมเป็น `{onEdit && (activity?.id || onDelete) && <DropdownMenuSeparator />}`
เพื่อไม่ให้เกิด separator ซ้อนกันสองเส้น

- [ ] **Step 2: `columns.tsx`**

```tsx
export interface ActionColumnActivity<T> {
  /** entity id ของแถว — คืน undefined เพื่อซ่อนเมนูเฉพาะแถวนั้น */
  id: (row: T) => string | undefined;
  /** ป้ายชื่อที่ขึ้นในหัว sheet เช่นเลขที่เอกสารหรือรหัส */
  label?: (row: T) => string | undefined;
}

export function actionColumn<T>(
  onDelete: (item: T) => void,
  options?: {
    deleteDenied?: boolean;
    deletePermission?: Permission;
    activity?: ActionColumnActivity<T>;
  },
): ColumnDef<T> {
  return {
    id: "action",
    header: () => "",
    cell: ({ row }) => {
      const activityId = options?.activity?.id(row.original);
      return (
        <DataGridRowActions
          onDelete={() => onDelete(row.original)}
          deleteDenied={options?.deleteDenied}
          deletePermission={options?.deletePermission}
          activity={
            activityId
              ? {
                  id: activityId,
                  label: options?.activity?.label?.(row.original),
                }
              : undefined
          }
        />
      );
    },
    enableSorting: false,
    size: 60,
    meta: {
      headerClassName: "text-right print:hidden",
      cellClassName: "text-right print:hidden",
      skeleton: null,
    },
  };
}
```

- [ ] **Step 3: `use-config-table.ts`**

เพิ่มเข้า `UseConfigTableOptions<T>`:

```tsx
  /**
   * เปิดเมนู Activity ในแถว — ไม่ส่ง = ไม่มีเมนู
   *
   * เปิดเฉพาะ list ที่ backend บันทึกกิจกรรมให้จริง (ดู activity-registry.ts
   * ฝั่ง micro-business) เปิดให้ตารางที่ไม่มีใน registry จะได้เมนูที่กดแล้วว่าง
   */
  activity?: ActionColumnActivity<T>;
```

เพิ่ม `activity` เข้า destructure และส่งต่อ:

```tsx
    ...(onDelete
      ? [actionColumn<T>(onDelete, { deleteDenied, deletePermission, activity })]
      : []),
```

import `ActionColumnActivity` เพิ่มจาก `./columns`

- [ ] **Step 4: เปิดสวิตช์ 27 list**

แต่ละไฟล์เพิ่มบรรทัดเดียวใน object ที่ส่งให้ `useConfigTable(...)` โดยใช้ฟิลด์ที่มีจริงในแถว
เป็น label (เรียงตามลำดับความชัดเจน: เลขที่เอกสาร → code → name)

| ไฟล์ | บรรทัดที่เพิ่ม |
|---|---|
| `routes/config/adjustment-type/use-adjustment-type-table.tsx` | `activity: { id: (r) => r.id, label: (r) => r.name },` |
| `routes/config/business-type/use-business-type-table.tsx` | `activity: { id: (r) => r.id, label: (r) => r.name },` |
| `routes/config/credit-note-reason/use-credit-note-reason-table.tsx` | `activity: { id: (r) => r.id, label: (r) => r.name },` |
| `routes/config/credit-term/use-credit-term-table.tsx` | `activity: { id: (r) => r.id, label: (r) => r.name },` |
| `routes/config/currency/use-currency-table.tsx` | `activity: { id: (r) => r.id, label: (r) => r.code },` |
| `routes/config/delivery-point/use-delivery-point-table.tsx` | `activity: { id: (r) => r.id, label: (r) => r.name },` |
| `routes/config/department/use-department-table.tsx` | `activity: { id: (r) => r.id, label: (r) => r.name },` |
| `routes/config/extra-cost/use-extra-cost-table.tsx` | `activity: { id: (r) => r.id, label: (r) => r.name },` |
| `routes/config/location/use-location-table.tsx` | `activity: { id: (r) => r.id, label: (r) => r.name },` |
| `routes/config/tax-profile/use-tax-profile-table.tsx` | `activity: { id: (r) => r.id, label: (r) => r.name },` |
| `routes/config/unit/use-unit-table.tsx` | `activity: { id: (r) => r.id, label: (r) => r.name },` |
| `routes/inventory-management/inventory-adjustment/use-ia-table.tsx` | ใช้เลขที่เอกสารของแถว |
| `routes/inventory-management/physical-count/use-pc-table.tsx` | ใช้เลขที่เอกสารของแถว |
| `routes/inventory-management/spot-check/use-sc-table.tsx` | ใช้เลขที่เอกสารของแถว |
| `routes/operation-plan/category/use-recipe-category-table.tsx` | `label: (r) => r.name` |
| `routes/operation-plan/cuisine/use-cuisine-table.tsx` | `label: (r) => r.name` |
| `routes/operation-plan/equipment-category/use-equipment-category-table.tsx` | `label: (r) => r.name` |
| `routes/operation-plan/recipe-equipment-category/use-recipe-equipment-category-table.tsx` | `label: (r) => r.name` |
| `routes/procurement/credit-note/use-cn-table.tsx` | ใช้เลขที่เอกสารของแถว |
| `routes/procurement/goods-receive-note/use-grn-table.tsx` | ใช้เลขที่เอกสารของแถว |
| `routes/procurement/purchase-order/use-po-table.tsx` | ใช้เลขที่เอกสารของแถว |
| `routes/procurement/purchase-request-template/use-prt-table.tsx` | `label: (r) => r.name` |
| `routes/system-admin/notification-template/use-noti-tmpl-table.tsx` | `label: (r) => r.name` |
| `routes/system-admin/running-code/use-running-code-table.tsx` | `label: (r) => r.name` |
| `routes/system-admin/workflow/wf-table.tsx` | `label: (r) => r.name` |
| `routes/vendor-management/request-price-list/use-rfp-table.tsx` | ใช้เลขที่เอกสารของแถว |
| `routes/vendor-management/vendor/use-vendor-table.tsx` | `label: (r) => r.name` |

**ชื่อฟิลด์จริงให้ยืนยันจาก type ของแถวในแต่ละไฟล์ก่อนเขียน** — ห้ามเดา ถ้าไม่มีฟิลด์
เลขที่/ชื่อที่ชัดเจน ให้ละ `label` ไปเลย (sheet จะแสดงคำอธิบายกลาง ๆ แทน)

**ห้ามเปิด 7 list นี้:** `config/certification` · `config/eco` · `operation-plan/equipment` ·
`operation-plan/recipe` · `system-admin/period` · `system-admin/activity-log` ·
`system-admin/user-activity`

- [ ] **Step 5: ตรวจและ commit**

```bash
bunx tsc --noEmit && bun run lint && bun test:run
```

```bash
git add -A
git commit -m "feat(activity): เพิ่มเมนู Activity ในแถวของ DataGrid และเปิดให้ 27 list"
```

---

## Task 3: list ที่เรียก `actionColumn()` ตรง + tree ของหมวดสินค้า

**Files:**
- Modify: `routes/store-operation/store-requisition/use-sr-table.tsx:195`
- Modify: `routes/product-management/product/use-product-table.tsx:195`
- Modify: `routes/vendor-management/price-list/use-pl-table.tsx:139`
- Modify: `routes/vendor-management/price-list-template/use-plt-table.tsx:131`
- Modify: `routes/product-management/category/tree-node.tsx`

**Interfaces:**
- Consumes: `actionColumn<T>(onDelete, { activity })` จาก Task 2 · `openActivity` จาก Task 1

- [ ] **Step 1: สี่ list ที่เรียก `actionColumn` ตรง**

เปลี่ยนจาก `actionColumn<T>(onDelete)` เป็นส่ง option ที่สอง เช่นใน `use-sr-table.tsx`:

```tsx
    actionColumn<StoreRequisition>(onDelete, {
      activity: { id: (r) => r.id, label: (r) => r.sr_no },
    }),
```

ทำแบบเดียวกันกับ `Product` (label = `r.name`), `PriceList` (label = เลขที่/ชื่อของแถว) และ
`PriceListTemplate` (label = `r.name`) โดยยืนยันชื่อฟิลด์จาก type ก่อนเขียน

- [ ] **Step 2: `tree-node.tsx`**

tree นี้ใช้ปุ่มไอคอนเรียงกันไม่ใช่ dropdown จึงเพิ่มปุ่มที่สามต่อจาก `Pencil` ก่อน `Trash2`:

```tsx
<Button
  variant="ghost"
  size="icon-xs"
  onClick={() => openActivity(node.id, node.name)}
  aria-label={tActivity("title")}
  title={tActivity("title")}
>
  <History className="h-3 w-3" />
</Button>
```

เพิ่ม `History` เข้า import ของ lucide-react, `openActivity` จาก host และ
`const tActivity = useTranslations("activity");`
ปุ่มนี้ใช้ได้กับทั้งสามระดับของ tree (category · sub-category · item-group) เพราะ
`tree-node.tsx` เรนเดอร์ตัวเองซ้ำทุกระดับ

**ยืนยันชื่อ prop ของ node ก่อนเขียน** — ถ้า `node` ไม่มี `name` ให้ใช้ฟิลด์ชื่อที่มีจริง

- [ ] **Step 3: ตรวจและ commit**

```bash
bunx tsc --noEmit && bun run lint && bun test:run
```

```bash
git add -A
git commit -m "feat(activity): เปิด activity ให้ list ที่เรียก actionColumn ตรงและ tree หมวดสินค้า"
```

---

## Task 4: `FormToolbar` + 7 หน้าที่ใช้ร่วมกัน

**Files:**
- Modify: `components/ui/form-toolbar.tsx`
- Modify: `routes/config/department/department-form.tsx`
- Modify: `routes/config/location/location-form.tsx`
- Modify: `routes/inventory-management/physical-count/pc-form.tsx`
- Modify: `routes/procurement/credit-note/cn-header.tsx`
- Modify: `routes/procurement/goods-receive-note/grn-header.tsx`
- Modify: `routes/procurement/purchase-request-template/prt-form.tsx`
- Modify: `routes/product-management/product/pd-form-toolbar.tsx`

**Interfaces:**
- Consumes: `openActivity` จาก Task 1
- Produces: `FormToolbar` รับ prop `activity?: { id: string; label?: string }`

- [ ] **Step 1: `form-toolbar.tsx`**

เพิ่มเข้า `FormToolbarProps`:

```tsx
  /**
   * เปิดปุ่ม Activity ในแถบปุ่ม — ไม่ส่ง = ไม่มีปุ่ม
   *
   * วางไว้ที่ toolbar กลางแทนที่จะให้แต่ละหน้ายัดผ่าน `viewActions` เพื่อให้
   * ทั้ง 7 หน้าที่ใช้ toolbar นี้ได้ปุ่มตำแหน่งเดียวกันโดยไม่ต้องก๊อป JSX
   */
  readonly activity?: { id: string; label?: string };
```

เพิ่ม `activity` เข้า destructure, เพิ่ม `History` เข้า import ของ lucide-react,
เพิ่ม `import { openActivity } from "@/components/share/activity-sheet-host";` และ
`const tActivity = useTranslations("activity");`

แทรกปุ่มเป็นตัวแรกใน `actions` (ก่อน `{isView && viewActions}`) เพื่อให้ปุ่มประวัติอยู่ซ้ายสุด
ของกลุ่มปุ่มเสมอไม่ว่าจะโหมดไหน:

```tsx
      {activity?.id && (
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
```

- [ ] **Step 2: ส่ง prop จาก 7 หน้า**

แต่ละหน้าเพิ่มบรรทัดเดียวใน JSX ของ `<FormToolbar …>` โดยส่งเฉพาะเมื่อ record มีอยู่จริง
(โหมด add ยังไม่มี id) เช่นใน `department-form.tsx`:

```tsx
  activity={department?.id ? { id: department.id, label: department.name } : undefined}
```

| ไฟล์ | id / label ที่ใช้ |
|---|---|
| `department-form.tsx` | `department.id` / `department.name` |
| `location-form.tsx` | `location.id` / `location.name` |
| `pc-form.tsx` | id ของใบตรวจนับ / เลขที่เอกสาร |
| `cn-header.tsx` | `creditNote.id` / `creditNote.cn_no` |
| `grn-header.tsx` | id ของ GRN / เลขที่ GRN |
| `prt-form.tsx` | id ของ template / ชื่อ template |
| `pd-form-toolbar.tsx` | `product.id` / `product.name` |

**ยืนยันชื่อตัวแปรและฟิลด์จริงในแต่ละไฟล์ก่อนเขียน** — ชื่อ prop ของแต่ละหน้าไม่เหมือนกัน

- [ ] **Step 3: ตรวจและ commit**

```bash
bunx tsc --noEmit && bun run lint && bun test:run
```

```bash
git add -A
git commit -m "feat(activity): เพิ่มปุ่ม Activity ที่ FormToolbar และ 7 หน้าที่ใช้ร่วมกัน"
```

---

## Task 5: ปุ่มใน 12 หน้าที่มี header เฉพาะตัว

**Files:**
- Modify: `routes/procurement/purchase-order/po-header.tsx`
- Modify: `routes/store-operation/store-requisition/sr-header.tsx`
- Modify: `routes/inventory-management/inventory-adjustment/ia-form-hero.tsx`
- Modify: `routes/inventory-management/spot-check/sc-form.tsx`
- Modify: `routes/vendor-management/request-price-list/rfp-form.tsx`
- Modify: `routes/vendor-management/vendor/vendor-form.tsx`
- Modify: `routes/vendor-management/price-list/pl-form.tsx`
- Modify: `routes/vendor-management/price-list-template/plt-form.tsx`
- Modify: `routes/system-admin/notification-template/noti-tmpl-form.tsx`
- Modify: `routes/operation-plan/category/recipe-category-toolbar.tsx`
- Modify: `routes/operation-plan/cuisine/cuisine-toolbar.tsx`
- Modify: `routes/system-admin/workflow/wf-header.tsx`

**Interfaces:**
- Consumes: `openActivity` จาก Task 1

- [ ] **Step 1: ปุ่มมาตรฐานที่ใช้ทั้ง 12 หน้า**

แต่ละไฟล์เพิ่ม import สามบรรทัด:

```tsx
import { History } from "lucide-react";          // รวมเข้ากับ import lucide เดิม
import { Button } from "@/components/ui/button";  // ถ้ายังไม่มี
import { openActivity } from "@/components/share/activity-sheet-host";
```

และ `const tActivity = useTranslations("activity");` ในตัว component แล้ววาง:

```tsx
{record?.id && (
  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={() => openActivity(record.id, record.doc_no)}
  >
    <History />
    {tActivity("title")}
  </Button>
)}
```

โดย `record` / `doc_no` แทนด้วยตัวแปรจริงของหน้านั้น

- [ ] **Step 2: ตำแหน่งของปุ่มในแต่ละหน้า**

| ไฟล์ | ตำแหน่ง | id / label |
|---|---|---|
| `po-header.tsx` | ต่อจาก `<CommentButton …/>` (บรรทัด ~170) | `purchaseOrder.id` / `purchaseOrder.po_no` |
| `sr-header.tsx` | ต่อจาก `<CommentButton …/>` (บรรทัด ~179) ก่อน `PrintDocumentButton` | `storeRequisition.id` / `storeRequisition.sr_no` |
| `ia-form-hero.tsx` | ข้าง `PrintDocumentButton` | id ของใบปรับปรุง / เลขที่เอกสาร |
| `sc-form.tsx` | ท้ายแถบปุ่มบน | id ของ spot check / เลขที่เอกสาร |
| `rfp-form.tsx` | ท้ายแถบปุ่มบน | id ของ RFP / เลขที่เอกสาร |
| `vendor-form.tsx` | ท้ายแถบปุ่มบน | `vendor.id` / `vendor.name` |
| `pl-form.tsx` | ท้ายแถบปุ่มบน | id / เลขที่ price list |
| `plt-form.tsx` | ท้ายแถบปุ่มบน | id / ชื่อ template |
| `noti-tmpl-form.tsx` | ท้ายแถบปุ่มบน | id / ชื่อ template |
| `recipe-category-toolbar.tsx` | ท้ายแถบปุ่มบน | id / ชื่อหมวด |
| `cuisine-toolbar.tsx` | ท้ายแถบปุ่มบน | id / ชื่อ cuisine |
| `wf-header.tsx` | ท้ายแถบปุ่มบน | `workflow.id` / `workflow.name` |

**ยืนยันชื่อตัวแปรและฟิลด์จริงในแต่ละไฟล์ก่อนเขียน**

- [ ] **Step 3: ตรวจและ commit**

```bash
bunx tsc --noEmit && bun run lint && bun test:run
```

```bash
git add -A
git commit -m "feat(activity): เพิ่มปุ่ม Activity ใน 12 หน้าที่มี header เฉพาะตัว"
```

---

## Task 6: ตรวจสอบรวมและอัปเดตเอกสาร

**Files:**
- Modify: `CLAUDE.md` (ถ้ามีข้อมูลที่คนทำงานต่อควรรู้)

- [ ] **Step 1: ตรวจว่าไม่มี key i18n ตกค้าง**

```bash
rg -n "purchaseRequest.*activity|activityDesc|activityNoChanges|actionPurchased|actionSentBack" messages/ routes/ components/
```
คาดหวัง: ไม่มีผลลัพธ์

- [ ] **Step 2: ตรวจว่า en กับ th มี key ครบเท่ากัน**

```bash
python3 -c "
import json
def keys(d,p=''):
    out=set()
    for k,v in d.items():
        q=f'{p}.{k}' if p else k
        out |= keys(v,q) if isinstance(v,dict) else {q}
    return out
en=keys(json.load(open('messages/en.json')))
th=keys(json.load(open('messages/th.json')))
print('en only:', sorted(en-th))
print('th only:', sorted(th-en))
"
```
คาดหวัง: ทั้งสองบรรทัดเป็นลิสต์ว่าง

- [ ] **Step 3: ตรวจว่าไม่มีการอ้าง `PrActivitySheet` เหลือ**

```bash
rg -n "PrActivitySheet|pr-activity-sheet"
```
คาดหวัง: ไม่มีผลลัพธ์

- [ ] **Step 4: gate สุดท้าย**

```bash
bunx tsc --noEmit && bun run lint && bun test:run && bun run build
```
คาดหวัง: ผ่านทั้งหมด

- [ ] **Step 5: commit และเปิด PR**

```bash
git add -A
git commit -m "docs: บันทึกจุดเข้าถึง activity ที่เพิ่มเข้ามาใน CLAUDE.md"
git push -u origin feature/activity-sheet-all-modules
```

---

## สิ่งที่ยังต้องตรวจด้วยมือ (คนตรวจ ไม่ใช่ CI)

1. **focus ตอนเปิดจาก dropdown** — กด ⋯ → Activity แล้ว focus ต้องอยู่ที่ Sheet ไม่ใช่เด้ง
   กลับปุ่ม ⋯ (jsdom จับไม่ได้)
2. **หัวข้อภาษาไทย** — เปิดเอกสารที่มีประวัติจริง (PO20260500006 · SR260800001) แล้วสลับ
   ภาษา ต้องไม่มีหัวข้อค้างเป็นอังกฤษ
3. **dark mode** ของ sheet ที่เปิดจากหน้าใหม่
4. **หน้าที่ยังไม่มี record** (โหมด add) ต้องไม่มีปุ่ม Activity
