# Lazy Lookup ช่วง 3b (checklist เลือกหลายค่าในฟอร์มโหลดทีละหน้า) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เลิกดึงทะเบียนทั้งก้อนใน checklist เลือกหลายค่าสามจุด (ผู้รับรายงานของ schedule, แผนกใน routing ของ workflow, role ของผู้ใช้) โดยใช้ component กลาง `PagedChecklist` ที่ค้นที่ server โหลดทีละหน้า และขึ้นชื่อของค่าที่เลือกไว้ผ่าน `selectedIds`

**Architecture:** `PagedChecklist<T>` (ใหม่ใน `components/lookup/`) ห่อ `useLookupPagination` (ไม่ lazy) + `Command shouldFilter={false}` + `CommandInput` + `VirtualCommandList` ตามแบบ `EntityMultiFilter` เพิ่มแถว badge ของค่าที่เลือก และ `renderItem` ให้ผู้เรียกวาดแถวเอง (การ์ด role) · แก้ `loadMore` ให้เรียกซ้ำใน closure เดียวไม่ข้ามหน้า และเพิ่ม `measureRows` ให้ `VirtualCommandList` วัดความสูงแถวจริง (การ์ด role สูงไม่เท่ากัน) · สามจุดใน `routes/` เปลี่ยนมาใช้ `PagedChecklist` แล้วลบ `DepartmentCheckboxList`

**Tech Stack:** React 19 + React Compiler, TanStack Query v5, `@tanstack/react-virtual` 3, react-hook-form, `use-intl`, cmdk (`Command`)

**Spec:** `docs/superpowers/specs/2026-09-29-lazy-lookup-phase3b-checklists-design.md`

## Global Constraints

- **ไม่เขียนเทสต์ใหม่ ไม่สร้างไฟล์ `*.test.ts(x)` / `*.spec.ts(x)`** (preference ของ user — override TDD) ทุก task จบด้วย `bun run typecheck` + `bun run lint` (0 error; warning เดิมไม่ต้องแก้) + รันเทสต์เดิมของโฟลเดอร์ที่แตะ (`bun test:run <path>`) + ตรวจมือ + commit · ถ้าเทสต์เดิมพังเพราะโครงเปลี่ยน ให้แก้เทสต์นั้น (ไม่เพิ่ม case ใหม่) · Task สุดท้ายรัน `bun test:run` ทั้งชุด
- commit message ภาษาไทย รูปแบบ conventional (`feat(lookup): …`, `refactor(workflow): …`) — **ห้าม** `git commit --amend` / squash · ห้าม push
- backend ไม่มีการเปลี่ยนแปลง · DB :4000 เป็น shared dev DB — ตรวจด้วยมือ **อ่านอย่างเดียว** ห้ามกด Save/Create/Delete ถ้าไม่ได้ถาม user
- module boundary (ESLint): `components/` ห้าม import จาก `routes/` · `PagedChecklist` วางที่ `components/lookup/` (ผูก data hook) ไม่ใช่ `components/ui/`
- `perpage` ของรายการ = 30 (ค่า default ของ `useLookupPagination`) — ไม่ส่งซ้ำ
- **users ห้ามส่ง `is_active`** (ได้ 0 แถว) → `serverFilter={null}`, `getId: u => u.user_id`, `idFilterKey: "user_id"`
- แผนกใน routing **ค่าคือชื่อ** ไม่ใช่ id: `getId: d => d.name`, `idFilterKey: "name"` (probe T02: `departments` รับ `name|string:A,B`, 59 แผนก, ไม่มีชื่อที่มี `,`)
- roles: `application-roles` รับ `id|string:` และ `is_active` (probe T02, 6 แถว) → ใช้ serverFilter default (`ACTIVE_ONLY_FILTER`)
- **ไม่แตะ** จุดที่ spec §1.2 เลื่อนไปช่วง 4 (`components/ui/transfer.tsx`, `user-assigned-locations`, `tree-product-lookup`, `wf-products` / `wf-stage-users` / `wf-routing-category-list`) — `useAllUsers` / `useAllProducts` ยังอยู่
- ไม่เพิ่มคีย์ i18n — ใช้คีย์ที่มีอยู่แล้วทั้งหมด: `common.search` (`Search...`), `common.loading`, `common.noSearchResult`, `lookup.remove` (`Remove {name}`), `lookup.search` (`Search {entity}...`), `field.user`, `field.department`, `reportSchedule.recipients`, `reportSchedule.noUsersFound`, `systemAdmin.workflow.departments`, `systemAdmin.workflow.noDepartments`, `systemAdmin.user.noRolesAvailable` / `noRolesAvailableDesc`
- `"use no memo";` ที่มีอยู่ในไฟล์ใด ห้ามลบ

### จุดที่ spec ไม่ตรงกับโค้ดจริง (ตัดสินแล้วในแผนนี้)

| spec | โค้ดจริง | แผนนี้ |
|---|---|---|
| §1.1 #3 ใช้ `useUsers` | hook ชื่อ `useUser` (`@/hooks/use-user`, `crud.useList`) — ตัวเดียวกับที่ `lookup-user.tsx` ใช้ | ใช้ `useUser` |
| §2 `serverFilter?: string \| null` ส่งต่อให้ `useLookupPagination` | `useLookupPagination.serverFilter` รับแค่ `string \| undefined` | `PagedChecklist` แปลง: `null` → `undefined`, `undefined` → `ACTIVE_ONLY_FILTER` |
| §3 roles: `renderItem` = `RoleToggleCard` + "กรอบ `divide-y rounded-lg border` เดิมห่อรายการ" | `VirtualCommandList` วางแถวแบบ absolute ด้วย `estimateSize` คงที่ — การ์ดที่มี/ไม่มีคำอธิบายสูงไม่เท่ากันจะซ้อน/เว้นช่อง · และแถว virtual เป็นลูกของ div ภายในที่ผู้เรียกไม่ได้ถือ `divide-y` จากข้างนอกจึงไม่มีผล | เพิ่ม prop opt-in `measureRows` ให้ `VirtualCommandList` (`ref={virtualizer.measureElement}` + `data-index` แบบเดียวกับ `components/ui/transfer.tsx:278-280`) `PagedChecklist` เปิดเสมอ · เส้นคั่นใช้ selector `[&_[data-index]:not(:last-child)]:border-b` บนกรอบแทน `divide-y` · เพิ่ม prop `estimateSize` และ `className` ให้ `PagedChecklist` |
| §2 ค่าที่เลือกแต่ไม่อยู่ในหน้าที่โหลด "badge ขึ้นชื่อ" | roles ใช้ `showSelectedBadges={false}` → role ที่ assign ไว้แต่ถูกปิดใช้งาน (serverFilter active) หรืออยู่หลังหน้าแรก **จะไม่ขึ้นที่ไหนเลย** เอาออกไม่ได้ (ของเดิมโชว์ทุก role) | `PagedChecklist` ปักแถวของค่าที่เลือกซึ่ง **ยังไม่อยู่ในหน้าที่โหลด** ไว้บนสุดของรายการเสมอ (แถวที่โหลดแล้วอยู่ที่เดิม ติ๊กแล้วไม่กระโดด) — ใช้กับทั้งสามจุด |
| §1.1 #4 "`wf-routing-department-list.tsx` → `PagedChecklist` · ลบ `DepartmentCheckboxList`" | ไฟล์นั้นมีแค่ `DepartmentCheckboxList` | `git rm` ทั้งไฟล์ แล้ววาง `Field` + `PagedChecklist` ใน `wf-routing.tsx` ตรงจุดเดิม |
| §3 roles "`EmptyState` เดิมเมื่อไม่มี role เลย" | slot ว่างของ `VirtualCommandList` ขึ้นทั้งตอนไม่มี role และตอนค้นไม่เจอ | ส่ง `EmptyState` เป็น `emptyMessage` — ค้นไม่เจอก็ขึ้น "No roles available" (ยอมรับ: มี 6 role) |

## Review Focus

1. **ค่าที่บันทึกไว้แต่อยู่หลังหน้าแรก / ถูกปิดใช้งาน / แผนกที่เปลี่ยนชื่อไปแล้ว** → badge ขึ้นชื่อ (หรือค่าดิบถ้า resolve ไม่ได้) ทันทีที่เปิดฟอร์ม และติ๊กออกได้ทั้งจาก badge × และจากแถวที่ปักไว้บนสุด; สำหรับ role (ไม่มี badge) การ์ดของ role ที่ assign ไว้ต้องมองเห็นเสมอ · pin: Task 1 Step 3 (`rows` ปักค่าที่ยังไม่โหลด) + Task 4 Step 5 ข้อ 2 + Task 5 ข้อ 1–3
2. **กด Enter ในช่องค้นของ checklist ที่อยู่ใน `<form>`** (user assigned form, workflow form, dialog schedule) → ต้องไม่ submit ฟอร์ม (cmdk `Command` เรียก `preventDefault` บน Enter เอง — ตรวจว่ายังจริง) · pin: Task 2 Step 5 ข้อ 3, Task 4 Step 5 ข้อ 3
3. **โหมด view / กำลังบันทึก (`disabled`)** → ติ๊ก checkbox, กด badge ×, คลิกการ์ด role ไม่มีผล แต่ยังพิมพ์ค้นและเลื่อนโหลดหน้าต่อได้ · pin: Task 1 Step 3 (`toggle` no-op เมื่อ `disabled`) + Task 3 Step 6 ข้อ 3 + Task 4 Step 5 ข้อ 4
4. **การ์ด role ที่มีและไม่มีคำอธิบายปนกัน** → การ์ดไม่ซ้อนกันหรือเว้นช่องว่าง เส้นคั่นอยู่ระหว่างการ์ด ไม่มีเส้นซ้อนที่ขอบล่าง · pin: Task 1 Step 2 (`measureRows`) + Task 4 Step 5 ข้อ 1
5. **dev server (StrictMode) ที่รายการสั้นกว่ากล่อง** → โหลดหน้า 2 ครั้งเดียว ไม่กระโดดไปหน้า 3 (ข้ามหน้า 2) · สลับ rule ใน routing แล้วช่องค้นของแผนกไม่ค้างคำค้นของ rule ก่อน · pin: Task 1 Step 1 + Task 3 Step 3 (`key={safeIndex}`) + Task 5 ข้อ 5

---

## File Structure

| ไฟล์ | หน้าที่ | Task |
|---|---|---|
| `hooks/use-lookup-pagination.ts` | `loadMore` idempotent ต่อ closure | 1 |
| `components/ui/virtual-command-list.tsx` | prop `measureRows` + `data-index` บนแถว | 1 |
| `components/lookup/paged-checklist.tsx` (ใหม่) | `PagedChecklist<T>` | 1 |
| `routes/report/schedules/schedule-recipients-field.tsx` | ผู้รับรายงาน → `PagedChecklist` + `useUser` | 2 |
| `routes/system-admin/workflow/wf-routing.tsx` | เงื่อนไขแผนก → `PagedChecklist` + `useDepartment` | 3 |
| `routes/system-admin/workflow/wf-routing-department-list.tsx` | **ลบ** | 3 |
| `routes/system-admin/user/user-assigned-roles.tsx` | `RolesSection` render `PagedChecklist` + `useRole` เอง | 4 |
| `routes/system-admin/user/user-assigned-form.tsx` | เลิก `useRole({ perpage: -1 })` และ prop `roles`/`isLoading` | 4 |

ไม่มีเทสต์เดิมอ้าง `DepartmentCheckboxList`, `RolesSection`, `ScheduleRecipientsField` หรือ mock `useAllUsers` ให้ schedule (ตรวจแล้ว — `useAllUsers` ถูก mock แค่ใน `location-form` / `department-form` characterization test ซึ่งไม่แตะ) และไม่มีเทสต์ของ `useLookupPagination` / `VirtualCommandList` โดยตรง

---

### Task 1: `loadMore` ไม่ข้ามหน้า + `measureRows` + `PagedChecklist`

**Files:**
- Modify: `hooks/use-lookup-pagination.ts:118-122` (`loadMore`)
- Modify: `components/ui/virtual-command-list.tsx` (props + แถว virtual)
- Create: `components/lookup/paged-checklist.tsx`

**Interfaces:**
- Consumes (มีอยู่แล้ว): `useLookupPagination`, `ACTIVE_ONLY_FILTER` จาก `@/hooks/use-lookup-pagination` · `LookupListHook<T>` จาก `@/hooks/use-entities-by-ids` · `useDebouncedValue` จาก `@/hooks/use-debounced-value` · `Command`, `CommandInput` จาก `@/components/ui/command` · `VirtualCommandList` · `Badge`, `Checkbox`
- Produces:
  - `VirtualCommandList` prop ใหม่ `measureRows?: boolean` (default `false` — ผู้เรียกเดิมไม่เปลี่ยนพฤติกรรม)
  - `export function PagedChecklist<T>(props: PagedChecklistProps<T>)` จาก `@/components/lookup/paged-checklist` โดย
    ```ts
    interface PagedChecklistProps<T> {
      readonly useListHook: LookupListHook<T>;
      readonly getId: (item: T) => string;
      readonly getLabel: (item: T) => string;
      readonly idFilterKey?: string;               // default "id"
      readonly serverFilter?: string | null;       // undefined = ACTIVE_ONLY_FILTER, null = ไม่กรอง
      readonly value: string[];
      readonly onChange: (value: string[]) => void;
      readonly disabled?: boolean;
      readonly renderItem?: (item: T, checked: boolean, toggle: () => void) => ReactNode;
      readonly showSelectedBadges?: boolean;       // default true
      readonly maxHeight?: number;                 // default 160
      readonly estimateSize?: number;              // default 28 (ความสูงแถวโดยประมาณ ก่อนวัดจริง)
      readonly searchPlaceholder?: string;         // default common.search
      readonly emptyMessage?: ReactNode;           // default common.noSearchResult
      readonly className?: string;                 // ต่อท้าย class ของกรอบ (Command)
    }
    ```

- [ ] **Step 1: `loadMore` เรียกซ้ำใน closure เดียวไม่ขยับเกินหนึ่งหน้า**

ใน `hooks/use-lookup-pagination.ts` แทน

```ts
  const loadMore = () => {
    if (hasMore && !isLoading) {
      setPage((p) => p + 1);
    }
  };
```

ด้วย

```ts
  // ใต้ StrictMode effect auto-load ของ VirtualCommandList รันสองรอบใน mount เดียว
  // ด้วย closure เดิม — `p + 1` เฉย ๆ จะขยับสองหน้าแล้วข้ามหน้า 2 ไป · เทียบกับ `page`
  // ของ closure ทำให้เรียกซ้ำกี่ครั้งก็ขยับได้แค่หน้าเดียว
  const loadMore = () => {
    if (hasMore && !isLoading) {
      setPage((p) => (p === page ? p + 1 : p));
    }
  };
```

- [ ] **Step 2: `VirtualCommandList` วัดความสูงแถวจริงเมื่อขอ**

ใน `components/ui/virtual-command-list.tsx`:

(ก) เพิ่ม prop ท้าย interface

```ts
interface VirtualCommandListProps<T> {
  readonly items: T[];
  readonly estimateSize?: number;
  readonly maxHeight?: number;
  readonly emptyMessage?: ReactNode;
  readonly children: (item: T, index: number) => ReactNode;
  readonly onLoadMore?: () => void;
  readonly hasMore?: boolean;
  readonly isLoadingMore?: boolean;
  /**
   * วัดความสูงแถวจริงแทนการเชื่อ `estimateSize` — เปิดเมื่อแถวสูงไม่เท่ากัน
   * (เช่นการ์ดที่มี/ไม่มีบรรทัดคำอธิบาย) ไม่งั้นแถวจะซ้อนหรือเว้นช่อง
   */
  readonly measureRows?: boolean;
}
```

(ข) รับ prop ใน destructure (ต่อจาก `isLoadingMore,`)

```ts
  isLoadingMore,
  measureRows = false,
}: VirtualCommandListProps<T>) {
```

(ค) แทน div ของแถว virtual

```tsx
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            className="absolute top-0 left-0 w-full"
            style={{ transform: `translateY(${virtualRow.start}px)` }}
          >
            {children(items[virtualRow.index], virtualRow.index)}
          </div>
        ))}
```

ด้วย

```tsx
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={measureRows ? virtualizer.measureElement : undefined}
            className="absolute top-0 left-0 w-full"
            style={{ transform: `translateY(${virtualRow.start}px)` }}
          >
            {children(items[virtualRow.index], virtualRow.index)}
          </div>
        ))}
```

(`data-index` ใส่ทุกกรณี — `measureElement` ต้องใช้ และ `PagedChecklist` ใช้เป็น selector ของเส้นคั่น ไม่มีผลกับผู้เรียกเดิม)

- [ ] **Step 3: สร้าง `components/lookup/paged-checklist.tsx`**

```tsx
import { useState, type ReactNode } from "react";
import { useTranslations } from "use-intl";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandInput } from "@/components/ui/command";
import { VirtualCommandList } from "@/components/ui/virtual-command-list";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { LookupListHook } from "@/hooks/use-entities-by-ids";
import {
  ACTIVE_ONLY_FILTER,
  useLookupPagination,
} from "@/hooks/use-lookup-pagination";
import { cn } from "@/lib/utils";

interface PagedChecklistProps<T> {
  readonly useListHook: LookupListHook<T>;
  readonly getId: (item: T) => string;
  readonly getLabel: (item: T) => string;
  /** คอลัมน์ id ฝั่ง backend ตอนดึงชื่อของค่าที่เลือก — default "id" */
  readonly idFilterKey?: string;
  /** undefined = ACTIVE_ONLY_FILTER, null = ไม่กรอง (users ห้ามส่ง is_active) */
  readonly serverFilter?: string | null;
  readonly value: string[];
  readonly onChange: (value: string[]) => void;
  /** ปิดการติ๊ก/เอาออก แต่ยังค้นและเลื่อนดูได้ */
  readonly disabled?: boolean;
  /** วาดแถวเอง (เช่นการ์ด) — default คือ Checkbox + label */
  readonly renderItem?: (
    item: T,
    checked: boolean,
    toggle: () => void,
  ) => ReactNode;
  readonly showSelectedBadges?: boolean;
  /** ความสูงสูงสุดของรายการ (px) */
  readonly maxHeight?: number;
  /** ความสูงแถวโดยประมาณก่อนวัดจริง (px) */
  readonly estimateSize?: number;
  readonly searchPlaceholder?: string;
  readonly emptyMessage?: ReactNode;
  /** ต่อท้าย class ของกรอบ (ช่องค้น + รายการ) */
  readonly className?: string;
}

const ROW_CLASS =
  "hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-sm px-2 py-1 text-sm select-none";

/**
 * checklist เลือกหลายค่าจากทะเบียนในฟอร์ม — ค้นที่ server และโหลดทีละหน้า
 * (ไม่ lazy: แสดงในฟอร์มตลอด ไม่มี popover ให้รอเปิด)
 *
 * ชื่อของค่าที่เลือกไว้ดึงตาม id เสมอ (`selectedIds` ไม่ผ่าน `serverFilter`) badge จึงขึ้นชื่อ
 * ได้ทันทีแม้ค่าอยู่หลังหน้าแรกหรือถูกปิดใช้งานไปแล้ว · ค่าที่เลือกแต่ยังไม่อยู่ในหน้าที่โหลด
 * ถูกปักไว้บนสุดของรายการ ให้ติ๊กออกได้แม้ปิด badge (`showSelectedBadges={false}`)
 */
export function PagedChecklist<T>({
  useListHook,
  getId,
  getLabel,
  idFilterKey,
  serverFilter,
  value,
  onChange,
  disabled = false,
  renderItem,
  showSelectedBadges = true,
  maxHeight = 160,
  estimateSize = 28,
  searchPlaceholder,
  emptyMessage,
  className,
}: PagedChecklistProps<T>) {
  const tc = useTranslations("common");
  const tl = useTranslations("lookup");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 150);

  const { items, selectedItems, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination<T>({
      useListHook,
      search: debouncedSearch,
      serverFilter:
        serverFilter === null
          ? undefined
          : (serverFilter ?? ACTIVE_ONLY_FILTER),
      getId,
      idFilterKey,
      selectedIds: value,
    });

  const selectedSet = new Set(value);
  const toggle = (id: string) => {
    if (disabled) return;
    onChange(
      selectedSet.has(id) ? value.filter((v) => v !== id) : [...value, id],
    );
  };

  const labelById = new Map(
    selectedItems.map((it) => [getId(it), getLabel(it)] as const),
  );

  // ค่าที่เลือกแต่ยังไม่อยู่ในหน้าที่โหลด (หลังหน้าแรก / ถูกปิดใช้งาน) ขึ้นบนสุด —
  // แถวที่โหลดแล้วอยู่ที่เดิม ติ๊กแล้วไม่กระโดด
  const loadedIds = new Set(items.map((it) => getId(it)));
  const rows = [
    ...selectedItems.filter((it) => !loadedIds.has(getId(it))),
    ...items,
  ];

  return (
    <div className="flex flex-col gap-2">
      {showSelectedBadges && value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((id) => {
            // resolve ไม่ได้ (เช่นแผนกที่เปลี่ยนชื่อไปแล้ว) = แสดงค่าดิบ ยังเอาออกได้
            const name = labelById.get(id) ?? id;
            return (
              <Badge key={id} asChild variant="default" className="gap-1">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(id)}
                  aria-label={tl("remove", { name })}
                  className="disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {name}
                  <X className="size-3" aria-hidden="true" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      <Command
        shouldFilter={false}
        className={cn("h-auto rounded-md border bg-transparent", className)}
      >
        <CommandInput
          placeholder={searchPlaceholder ?? tc("search")}
          value={search}
          onValueChange={setSearch}
        />
        {isLoading ? (
          <div className="text-muted-foreground px-3 py-2 text-xs">
            {tc("loading")}
          </div>
        ) : (
          <VirtualCommandList
            items={rows}
            maxHeight={maxHeight}
            estimateSize={estimateSize}
            measureRows
            onLoadMore={loadMore}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            emptyMessage={
              emptyMessage ?? (
                <span className="text-muted-foreground text-xs">
                  {tc("noSearchResult")}
                </span>
              )
            }
          >
            {(item) => {
              const id = getId(item);
              const checked = selectedSet.has(id);
              if (renderItem) return renderItem(item, checked, () => toggle(id));
              return (
                <label
                  className={cn(
                    ROW_CLASS,
                    disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={() => toggle(id)}
                  />
                  <span className="truncate">{getLabel(item)}</span>
                </label>
              );
            }}
          </VirtualCommandList>
        )}
      </Command>
    </div>
  );
}
```

- [ ] **Step 4: static checks + เทสต์เดิม**

Run: `bun run typecheck && bun run lint`
Expected: 0 error — ถ้า tsc แดงที่ `ref={measureRows ? virtualizer.measureElement : undefined}` ให้เช็คว่า `useVirtualizer` ไม่ได้ระบุ generic ของ element ผิด (ค่า default ของ `@tanstack/react-virtual` 3 คือ `Element` ใช้กับ `HTMLDivElement` ได้ — `components/ui/transfer.tsx:280` ทำแบบเดียวกัน)

Run: `bun test:run components hooks`
Expected: PASS (ไม่มีเทสต์ของ `PagedChecklist` — component ยังไม่มีผู้เรียก)

- [ ] **Step 5: ตรวจมือ (regression ของ lookup เดิม)** — `VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev` login `admin@zebra.com` BU T02 → หน้า product list เปิดตัวกรอง category (EntityMultiFilter) และเปิด lookup vendor ในฟอร์ม PO → Network กรอง `perpage`: เลื่อนลงแล้วได้ `page=2`, `page=3` ต่อกันไม่มีเลขหาย · แถวไม่ซ้อน/เว้นช่อง (lookup เดิมไม่เปิด `measureRows` ต้องเหมือนเดิมทุกอย่าง)

- [ ] **Step 6: Commit**

```bash
git add hooks/use-lookup-pagination.ts components/ui/virtual-command-list.tsx components/lookup/paged-checklist.tsx
git commit -m "feat(lookup): PagedChecklist checklist เลือกหลายค่าโหลดทีละหน้า + loadMore ไม่ข้ามหน้าใต้ StrictMode + VirtualCommandList วัดความสูงแถวจริง"
```

---

### Task 2: ผู้รับรายงานของ schedule → `PagedChecklist`

**Files:**
- Modify: `routes/report/schedules/schedule-recipients-field.tsx` (เขียนใหม่ทั้งไฟล์)

**Interfaces:**
- Consumes: `PagedChecklist` (Task 1) · `useUser` จาก `@/hooks/use-user` · `getUserFullName` จาก `@/components/lookup/lookup-user` · `User` จาก `@/types/workflows`
- Produces: `ScheduleRecipientsField({ form, disabled })` — signature เดิม ผู้เรียก (`create-schedule-dialog.tsx:202`) ไม่ต้องแก้

- [ ] **Step 1: เขียน `schedule-recipients-field.tsx` ใหม่ทั้งไฟล์**

```tsx
import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Field, FieldLabel } from "@/components/ui/field";
import { PagedChecklist } from "@/components/lookup/paged-checklist";
import { getUserFullName } from "@/components/lookup/lookup-user";
import { useUser } from "@/hooks/use-user";
import type { User } from "@/types/workflows";
import type { ScheduleFormValues } from "./schedule-form-schema";

interface ScheduleRecipientsFieldProps {
  readonly form: UseFormReturn<ScheduleFormValues>;
  readonly disabled: boolean;
}

export function ScheduleRecipientsField({
  form,
  disabled,
}: ScheduleRecipientsFieldProps) {
  const t = useTranslations("reportSchedule");
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");

  return (
    <Controller
      control={form.control}
      name="recipients"
      render={({ field }) => (
        <Field>
          <FieldLabel>{t("recipients")}</FieldLabel>
          {/* ทะเบียนผู้ใช้ไม่มีคอลัมน์ id / is_active — อ้างด้วย user_id และห้ามส่ง
              is_active (backend ตอบ 0 แถว) */}
          <PagedChecklist<User>
            useListHook={useUser}
            getId={(u) => u.user_id}
            getLabel={getUserFullName}
            idFilterKey="user_id"
            serverFilter={null}
            value={field.value}
            onChange={field.onChange}
            disabled={disabled}
            searchPlaceholder={tl("search", { entity: tfl("user") })}
            emptyMessage={
              <span className="text-muted-foreground text-xs">
                {t("noUsersFound")}
              </span>
            }
          />
        </Field>
      )}
    />
  );
}
```

- [ ] **Step 2: ยืนยันว่า `useAllUsers` หายจากโฟลเดอร์นี้**

Run: `grep -rnE "perpage:\s*-1|useAllUsers" routes/report/schedules`
Expected: ไม่มีผลลัพธ์ (exit 1)

- [ ] **Step 3: static checks**

Run: `bun run typecheck && bun run lint`
Expected: 0 error — ถ้า tsc แดงที่ `useListHook={useUser}` ให้ดู `components/lookup/lookup-user.tsx:63` ซึ่งส่ง `useUser` เป็น `LookupListHook<User>` อยู่แล้ว (ต้องผ่านเหมือนกัน)

- [ ] **Step 4: เทสต์เดิม**

Run: `bun test:run routes/report`
Expected: PASS

- [ ] **Step 5: ตรวจมือ** — `bun dev` (:4000, T02) → Report → Schedules:
  1. เปิด schedule ที่มีผู้รับอยู่แล้ว (โหมดแก้ไข แต่ **ไม่กด Save**) → badge ขึ้นชื่อเต็มทันที · Network มี `users?…filter=user_id%7Cstring%3A…` และรายการ `users?perpage=30&page=1` **ไม่มี** `is_active` และไม่มี `perpage=-1`
  2. พิมพ์นามสกุลของคนที่อยู่หลังหน้าแรก → request มี `search=` และได้คนนั้น · ติ๊ก → badge เพิ่ม · กด × บน badge → หายและ checkbox ถูกเอาออก
  3. โฟกัสช่องค้นแล้วกด Enter → dialog **ไม่** submit/ปิด (Review Focus 2)
  4. เลื่อนรายการลงสุด → `page=2` ตามมาหนึ่งครั้ง

- [ ] **Step 6: Commit**

```bash
git add routes/report/schedules/schedule-recipients-field.tsx
git commit -m "refactor(report): ผู้รับรายงานของ schedule ใช้ PagedChecklist ค้นที่ server โหลดทีละหน้า เลิกดึงผู้ใช้ทั้งทะเบียน"
```

---

### Task 3: แผนกในเงื่อนไข routing ของ workflow → `PagedChecklist` + ลบ `DepartmentCheckboxList`

**Files:**
- Modify: `routes/system-admin/workflow/wf-routing.tsx` (import L20-34, L57-63, L394-406)
- Delete: `routes/system-admin/workflow/wf-routing-department-list.tsx`

**Interfaces:**
- Consumes: `PagedChecklist` (Task 1) · `useDepartment` จาก `@/hooks/use-department` · `Department` จาก `@/types/department`
- Produces: ไม่มี (props ของ `WfRouting` เดิม)

- [ ] **Step 1: import**

ใน `wf-routing.tsx` แทน

```ts
import { useDepartment } from "@/hooks/use-department";
import type { Product } from "@/types/workflows";
```

ด้วย

```ts
import { useDepartment } from "@/hooks/use-department";
import { PagedChecklist } from "@/components/lookup/paged-checklist";
import type { Department } from "@/types/department";
import type { Product } from "@/types/workflows";
```

และลบบรรทัด

```ts
import { DepartmentCheckboxList } from "./wf-routing-department-list";
```

- [ ] **Step 2: เลิกดึงแผนกทั้งก้อน**

แทน

```ts
  // perpage: -1 — ไม่ส่งแล้ว backend ให้แค่ 10 แผนกแรก เงื่อนไข routing ตามแผนก
  // จึงเลือกแผนกที่ 11 ขึ้นไปไม่ได้ (เหตุเดียวกับ lookup-department.tsx)
  const { data: deptData } = useDepartment({ perpage: -1 });
  const departments = deptData?.data ?? [];
  const t = useTranslations("systemAdmin.workflow");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");
```

ด้วย

```ts
  const t = useTranslations("systemAdmin.workflow");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");
  const tl = useTranslations("lookup");
```

- [ ] **Step 3: แทน `DepartmentCheckboxList`**

แทน

```tsx
                {watchedField === "department" && (
                  <DepartmentCheckboxList
                    departments={departments}
                    value={watchedConditionValue ?? []}
                    onChange={(val) =>
                      form.setValue(
                        `data.routing_rules.${safeIndex}.condition.value`,
                        val,
                      )
                    }
                    isDisabled={isDisabled}
                  />
                )}
```

ด้วย

```tsx
                {watchedField === "department" && (
                  <Field>
                    <FieldLabel>{t("departments")}</FieldLabel>
                    {/* ค่าของเงื่อนไขคือ "ชื่อแผนก" ไม่ใช่ id — ดึงชื่อที่เลือกด้วย name|string:
                        แผนกที่เปลี่ยนชื่อหลังบันทึก rule จะขึ้นเป็นชื่อเดิมดิบและเอาออกได้
                        key={safeIndex}: สลับ rule แล้วช่องค้นเริ่มใหม่ ไม่ค้างคำค้นของ rule ก่อน */}
                    <PagedChecklist<Department>
                      key={safeIndex}
                      useListHook={useDepartment}
                      getId={(d) => d.name}
                      getLabel={(d) => d.name}
                      idFilterKey="name"
                      value={watchedConditionValue ?? []}
                      onChange={(val) =>
                        form.setValue(
                          `data.routing_rules.${safeIndex}.condition.value`,
                          val,
                        )
                      }
                      disabled={isDisabled}
                      maxHeight={128}
                      searchPlaceholder={tl("search", {
                        entity: tfl("department"),
                      })}
                      emptyMessage={
                        <span className="text-muted-foreground text-xs">
                          {t("noDepartments")}
                        </span>
                      }
                    />
                  </Field>
                )}
```

- [ ] **Step 4: ลบไฟล์เดิม + ยืนยัน**

Run: `git rm routes/system-admin/workflow/wf-routing-department-list.tsx`

Run: `grep -rn "DepartmentCheckboxList\|wf-routing-department-list" routes components hooks; grep -nE "perpage:\s*-1|useAllUsers" routes/system-admin/workflow/wf-routing*.tsx`
Expected: ไม่มีผลลัพธ์ทั้งสองคำสั่ง

- [ ] **Step 5: static checks + เทสต์เดิม**

Run: `bun run typecheck && bun run lint`
Expected: 0 error — ถ้า lint เตือน `departments` / `deptData` unused แปลว่า Step 2 ลบไม่ครบ

Run: `bun test:run routes/system-admin/workflow`
Expected: PASS (`wf-new-form.discard.test.tsx` render ฟอร์มแต่ไม่เปิดเงื่อนไขแผนก — ไม่ควรกระทบ)

- [ ] **Step 6: ตรวจมือ** — `bun dev` (:4000, T02) → System admin → Workflow → เปิด workflow ที่มี routing rule เงื่อนไขแผนก (ถ้าไม่มี ใช้โหมด edit เพิ่ม rule ชั่วคราวแล้ว **Cancel/Discard ไม่ Save**):
  1. rule เดิม → badge ชื่อแผนกขึ้นครบ, checkbox ของแผนกเดิมติ๊กอยู่ · Network มี `departments?…filter=name%7Cstring%3A…` และหน้า 1 `filter=is_active%7Cboolean%3Atrue` ไม่มี `perpage=-1`
  2. เลื่อนรายการ → โหลดหน้า 2 แล้วติ๊กแผนกที่ 31+ ได้ · พิมพ์ชื่อแผนก → ค้นที่ server
  3. โหมด view → ติ๊ก/กด × ไม่ได้ แต่ยังค้นและเลื่อนได้ (Review Focus 3)
  4. สลับไป rule อื่นที่เป็นเงื่อนไขแผนก → ช่องค้นว่าง, ค่าที่ติ๊กเป็นของ rule นั้น
  5. โฟกัสช่องค้นแล้วกด Enter → ฟอร์ม workflow ไม่ submit

- [ ] **Step 7: Commit**

```bash
git add routes/system-admin/workflow/wf-routing.tsx routes/system-admin/workflow/wf-routing-department-list.tsx
git commit -m "refactor(workflow): เงื่อนไขแผนกของ routing ใช้ PagedChecklist โหลดทีละหน้า เลือกแผนกที่ 31+ ได้ และลบ DepartmentCheckboxList"
```

---

### Task 4: role ของผู้ใช้ → `RolesSection` render `PagedChecklist`

**Files:**
- Modify: `routes/system-admin/user/user-assigned-roles.tsx` (imports + `RolesSection` ทั้งส่วน; `RoleToggleCard` ไม่แตะ)
- Modify: `routes/system-admin/user/user-assigned-form.tsx` (L14, L43-49, L219-226)

**Interfaces:**
- Consumes: `PagedChecklist` (Task 1) · `useRole` จาก `routes/system-admin/shared/use-role.ts` (`(params?: ParamsDto, options?: { enabled?: boolean }) => UseQueryResult<PaginatedResponse<Role>>` — ใช้เป็น `useListHook` อยู่แล้วที่ `routes/system-admin/role/role-component.tsx:42`)
- Produces: `RolesSection({ form, isDisabled, count, first? })` — **ตัด prop `roles` และ `isLoading`**

- [ ] **Step 1: imports ของ `user-assigned-roles.tsx`**

แทน

```ts
import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Check, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/role";
import { AssignSection, EmptyState } from "./user-assigned-ui";
import type { UserAssignedFormValues } from "./user-assigned-form-schema";
```

ด้วย

```ts
import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Check, Shield } from "lucide-react";
import { PagedChecklist } from "@/components/lookup/paged-checklist";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/role";
import { useRole } from "../shared/use-role";
import { AssignSection, EmptyState } from "./user-assigned-ui";
import type { UserAssignedFormValues } from "./user-assigned-form-schema";
```

- [ ] **Step 2: แทน `RolesSection` ทั้งส่วน** (ตั้งแต่ `interface RolesSectionProps` ถึงท้ายไฟล์)

```tsx
interface RolesSectionProps {
  readonly form: UseFormReturn<UserAssignedFormValues>;
  readonly isDisabled: boolean;
  readonly count: number;
  readonly first?: boolean;
}

// เส้นคั่นระหว่างการ์ด — แถว virtual เป็นลูกของ div ภายใน VirtualCommandList
// `divide-y` บนกรอบจึงไม่ถึง ต้องเลือกแถวด้วย data-index แทน
const ROLE_LIST_CLASS =
  "rounded-lg [&_[data-index]]:border-border/60 [&_[data-index]:not(:last-child)]:border-b";

export function RolesSection({
  form,
  isDisabled,
  count,
  first,
}: RolesSectionProps) {
  const t = useTranslations("systemAdmin.user");
  return (
    <AssignSection
      title={t("assignRoles")}
      description={t("assignRolesDesc")}
      count={count}
      first={first}
    >
      <Controller
        control={form.control}
        name="role_ids"
        render={({ field }) => (
          // การ์ดแสดงสถานะติ๊กเองจึงปิด badge — role ที่ assign ไว้แต่ยังไม่อยู่ในหน้าที่โหลด
          // (ปิดใช้งาน/หลังหน้าแรก) PagedChecklist ปักไว้บนสุดให้เห็นและเอาออกได้
          <PagedChecklist<Role>
            useListHook={useRole}
            getId={(r) => r.id}
            getLabel={(r) => r.name}
            value={field.value ?? []}
            onChange={field.onChange}
            disabled={isDisabled}
            showSelectedBadges={false}
            maxHeight={360}
            estimateSize={52}
            className={ROLE_LIST_CLASS}
            renderItem={(role, checked, toggle) => (
              <RoleToggleCard
                role={role}
                checked={checked}
                disabled={isDisabled}
                onChange={() => toggle()}
              />
            )}
            emptyMessage={
              <EmptyState
                icon={Shield}
                title={t("noRolesAvailable")}
                desc={t("noRolesAvailableDesc")}
              />
            }
          />
        )}
      />
    </AssignSection>
  );
}
```

- [ ] **Step 3: `user-assigned-form.tsx` เลิกดึง role ทั้งก้อน**

ลบบรรทัด 14

```ts
import { useRole } from "../shared/use-role";
```

แทนบรรทัด 43-49

```ts
  // perpage: -1 — ไม่ส่งแล้ว backend ให้แค่ 10 role แรก role ที่ assign ไว้เกินจากนั้น
  // ไม่ขึ้นใน checklist เลย (เอาออกไม่ได้) และ role ที่ 11+ ก็ assign ไม่ได้
  const { data: rolesData, isLoading: rolesLoading } = useRole({
    perpage: -1,
  });
  const updateUser = useUpdateUser();
  const roles = rolesData?.data ?? [];
```

ด้วย

```ts
  // รายการ role โหลดทีละหน้าใน RolesSection เอง (PagedChecklist)
  const updateUser = useUpdateUser();
```

แทนบรรทัด 219-226

```tsx
          <RolesSection
            first
            form={form}
            roles={roles}
            isLoading={rolesLoading}
            isDisabled={isDisabled}
            count={roleCount}
          />
```

ด้วย

```tsx
          <RolesSection
            first
            form={form}
            isDisabled={isDisabled}
            count={roleCount}
          />
```

(`watchedRoleIds` / `roleCount` L131-136 คงเดิม — หัว section นับจากค่าในฟอร์ม)

- [ ] **Step 4: static checks + เทสต์เดิม**

Run: `bun run typecheck && bun run lint`
Expected: 0 error — tsc แดงที่ `roles=` / `isLoading=` แปลว่า Step 3 ไม่ครบ · lint เตือน `Skeleton` unused แปลว่า Step 1 ไม่ครบ

Run: `grep -nE "perpage:\s*-1|useAllUsers" routes/system-admin/user/user-assigned-form.tsx`
Expected: ไม่มีผลลัพธ์

Run: `bun test:run routes/system-admin/user`
Expected: PASS

- [ ] **Step 5: ตรวจมือ** — `bun dev` (:4000, T02) → System admin → User → เปิดผู้ใช้ที่มี role:
  1. การ์ด role ที่มีคำอธิบายกับไม่มีคำอธิบายไม่ซ้อนกัน/ไม่เว้นช่อง, มีเส้นคั่นระหว่างการ์ด ไม่มีเส้นหนาซ้อนที่ขอบล่าง, การ์ดมีคำอธิบายเหมือนเดิม (Review Focus 4)
  2. role ที่ assign ไว้ติ๊กครบ, ตัวเลขที่หัว section = จำนวน role ที่ติ๊ก · Network `application-roles?…filter=id%7Cstring%3A…` + หน้า 1 `filter=is_active%7Cboolean%3Atrue` ไม่มี `perpage=-1`
  3. กด Edit → คลิกการ์ด → ติ๊ก/เอาออกได้ ตัวเลขหัว section เปลี่ยนตาม · โฟกัสช่องค้นแล้วกด Enter → ฟอร์ม **ไม่** submit (ไม่มี toast, ไม่เด้งกลับ list) · กด Cancel → Discard (**ไม่ Save**)
  4. โหมด view → คลิกการ์ดไม่มีผล (การ์ดจาง) แต่ยังพิมพ์ค้นได้

- [ ] **Step 6: Commit**

```bash
git add routes/system-admin/user/user-assigned-roles.tsx routes/system-admin/user/user-assigned-form.tsx
git commit -m "refactor(system-admin): role ของผู้ใช้โหลดทีละหน้าผ่าน PagedChecklist ใน RolesSection เลิกดึง role ทั้งก้อน"
```

---

### Task 5: ด่านสุดท้าย — เกณฑ์เสร็จ spec §1.3 + ตรวจในเบราว์เซอร์ §4

**Files:** ไม่มีไฟล์ใหม่ (ถ้าข้อไหนไม่ผ่าน แก้ในไฟล์ของ task เจ้าของแล้ว commit แยก `fix(…): …`)

- [ ] **Step 1: grep ตามเกณฑ์ spec §1.3**

Run: `grep -rnE "perpage:\s*-1|useAllUsers" routes/report/schedules routes/system-admin/workflow/wf-routing*.tsx routes/system-admin/user/user-assigned-form.tsx`
Expected: ไม่มีผลลัพธ์ (0 บรรทัด)

- [ ] **Step 2: static checks ทั้งรีโป**

Run: `bun run typecheck && bun run lint`
Expected: 0 error

- [ ] **Step 3: เทสต์ทั้งชุด**

Run: `bun test:run`
Expected: PASS ทั้งหมด (รวม `lib/__tests__/status-ink-contrast.test.ts`, `components/ui/type-ladder.test.ts` — `PagedChecklist` ใช้แค่ `text-xs` / `text-sm` ที่อยู่ใน ladder)

- [ ] **Step 4: ตรวจในเบราว์เซอร์ตาม spec §4** — `VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev`, `admin@zebra.com`, BU T02, DevTools → Network กรอง `perpage` · **อ่านอย่างเดียว**

| # | ตรวจ | ผ่านเมื่อ | Task |
|---|---|---|---|
| 1 | schedule report ที่มีผู้รับแล้ว | badge ขึ้นชื่อทันที · ค้นชื่อได้คนหลังหน้าแรก · request users ไม่มี `is_active` (Review Focus 1) | 2 |
| 2 | workflow edit → routing → เงื่อนไขแผนก | เลือกแผนกที่ 31+ ได้ (เลื่อนโหลดต่อ) · rule เดิมติ๊กครบ | 3 |
| 3 | user → assigned | role ที่ assign ไว้ติ๊กครบ, การ์ดมีคำอธิบายเหมือนเดิม ไม่ซ้อน (Review Focus 4) | 4 |
| 4 | Network ทั้งสามหน้า | ไม่มี `perpage=-1` | 2–4 |
| 5 | `bun dev` (StrictMode) → checklist ที่หน้าแรกสั้นกว่ากล่อง (ค้นคำที่ได้ผลไม่กี่แถวแต่มีหลายหน้า หรือ role list) | request `page=` ไล่ 1 → 2 ไม่กระโดดข้าม 2 (Review Focus 5) | 1 |
| 6 | Enter ในช่องค้นของทั้งสามจุด | ฟอร์ม/dialog ไม่ submit (Review Focus 2) | 2–4 |

- [ ] **Step 5: ยืนยันสถานะ git** — ทุกการเปลี่ยนถูก commit แล้ว ไม่ push

Run: `git status --short && git log --oneline -6`
Expected: working tree สะอาด · เห็น commit ของ Task 1–4 (และ `fix(…)` ถ้ามีจาก Step 4)
