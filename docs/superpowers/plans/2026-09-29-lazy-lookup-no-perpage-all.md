# Lazy Lookup (เลิก `perpage=-1` ใน lookup/filter) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ให้ lookup/filter ใน `components/` เลิกดึง `perpage=-1` แล้วใช้ lazy load (ค้นหาที่ server + เลื่อนแล้วโหลดเพิ่ม) โดยที่ค่าที่เลือกไว้ยังแสดงชื่อได้เสมอ

**Architecture:** เพิ่ม `useEntitiesByIds` (ดึงเฉพาะรายการที่เลือกไว้ด้วย `filter=<key>|string:a,b`) และขยาย `useLookupPagination` ให้รับ `selectedIds` / `serverFilter` / `sort` แล้วคืน `selectedItems` แยกจาก `items` — `LookupCombobox` ได้ prop ใหม่ `selectedItems` ไว้หา label เมื่อค่าที่เลือกไม่อยู่ใน `items` filter แบบเลือกหลายค่า 3 ตัวรวมเป็น component กลาง `EntityMultiFilter`

**Tech Stack:** React 19 + React Compiler, TanStack Query v5, `use-intl`, cmdk (`Command`), `@tanstack/react-virtual` (`VirtualCommandList`)

**Spec:** `docs/superpowers/specs/2026-09-29-lazy-lookup-no-perpage-all-design.md`

## Global Constraints

- **ไม่เขียนเทสต์ใหม่** (preference ของ user) — ทุก task จบด้วย `bun run typecheck` + `bun run lint` + commit; เทสต์เดิมต้องผ่าน (`bun test:run`)
- commit message เป็นภาษาไทย รูปแบบ conventional (`feat(lookup): …`)
- ห้ามแก้ call site ใน `routes/` — props สาธารณะของทุก component คงเดิม
- ห้าม import จาก `routes/` ใน `components/` / `hooks/` (ESLint บังคับ)
- `perpage` ค่าเริ่มต้นของ lookup = 30
- รูปแบบ filter ที่ backend รับ (ยิงยืนยันแล้ว 2026-09-29 บน T02):
  - IN: `id|string:a,b` · user ใช้ `user_id|string:a,b`
  - หลายเงื่อนไข (AND) คั่นด้วย `,` ใน `filter` เดียว: `is_active|boolean:true,product_category_id|string:X`
  - **ส่ง `filter` ซ้ำหลายตัวไม่ได้** (backend เอาแค่ตัวเดียว)
  - `is_active|boolean:true` **ใช้ไม่ได้** กับ `credit-note-reasons`, `physical-count-periods` (400) และ `users` (ได้ 0 แถว) — ห้ามส่งให้ 3 endpoint นี้
  - `physical-count-periods` ไม่มีฟิลด์ `counting_period_from_date` (sort ด้วยฟิลด์นี้ได้ 400)

## Review Focus

1. **ค่าที่บันทึกไว้แต่อยู่หลังหน้าแรก / ถูกปิดใช้งาน** → ช่องต้องแสดงชื่อ ไม่ใช่ placeholder (บั๊กเดิมของ `56bc6d7e`) — ตรวจใน Task 6 ข้อ 2
2. **พิมพ์ค้นแล้วลบเร็ว ๆ / เลื่อนเร็วตอนกำลังโหลด** → ไม่มีรายการซ้ำ ไม่มีผลของคำค้นเก่าค้าง — guard `paginate.page` + dedupe ใน Task 1, ตรวจใน Task 6 ข้อ 3
3. **เปิดหน้า list จาก saved view / deep link ที่มี filter vendor หรือผู้ขอ** → ปุ่มและ chip แสดงชื่อทันทีโดยไม่ต้องเปิด popover — Task 4 + 5, ตรวจใน Task 6 ข้อ 4
4. **sub-category / item-group ที่ถูกจำกัดด้วยหมวดแม่** → หน้าแรกต้องไม่ว่าง (กรองที่ server ไม่ใช่กรองหลังโหลด 30 แถว) — Task 3, ตรวจใน Task 6 ข้อ 5
5. **เปลี่ยนหมวดแม่ (`filterCategoryId`) หรือ `channelType` ขณะ popover เปิดอยู่** → รายการเริ่มหน้า 1 ใหม่ ไม่ต่อท้ายของเก่า — `serverFilter` อยู่ใน reset deps (Task 1)

---

## File Structure

| ไฟล์ | หน้าที่ |
|---|---|
| `hooks/use-entities-by-ids.ts` (ใหม่) | type `LookupListHook` ร่วม + ดึงรายการตาม id |
| `hooks/use-lookup-pagination.ts` (แก้) | option ใหม่ + `selectedItems` + guard หน้าเก่า |
| `components/lookup/lookup-combobox.tsx` (แก้) | prop `selectedItems` ใช้หา label |
| `components/lookup/lookup-{currency,credit-term,tax-profile,cn-reason,extra-cost,shelf}.tsx` | `<Select>` → `LookupCombobox` |
| `components/lookup/lookup-{category,sub-category,item-group,department,noti-tmpl,user}.tsx` | `-1` → `useLookupPagination` |
| `components/filter/entity-multi-filter.tsx` (ใหม่) | UI กลางของ filter เลือกหลายค่า |
| `components/filter/filter-{vendor,department,requester}.tsx` | ห่อ `EntityMultiFilter` |
| `hooks/use-list-filters.ts` (แก้) | chip ดึงชื่อตาม id |

**ตัดออกจาก plan นี้:** `lookup-physical-count-period.tsx` — ตรวจแล้วพบว่า**พังอยู่แล้วก่อนงานนี้**: API คืน `tb_inventory_period.start_at/end_at` แต่ FE อ่าน `counting_period_from_date` (ไม่มีใน response) → `new Date(undefined) <= today` เป็น false → รายการว่างเสมอ ต้องแก้ type + label ก่อน ซึ่งเป็นงานแยก (บันทึกใน spec §7 ใน Task 1)

---

### Task 1: โครงร่วม — `useEntitiesByIds` + ขยาย `useLookupPagination` + prop `selectedItems`

**Files:**
- Create: `hooks/use-entities-by-ids.ts`
- Modify: `hooks/use-lookup-pagination.ts` (ทั้งไฟล์)
- Modify: `components/lookup/lookup-combobox.tsx` (interface ~L48-99, destructure ~L101-140, `selectedItem` ~L171-174)
- Modify: `docs/superpowers/specs/2026-09-29-lazy-lookup-no-perpage-all-design.md` (§4.2 ข้อ 1–2, §7)

**Interfaces:**
- Produces:
  - `interface LookupListParams { search?: string; perpage: number; page?: number; filter?: string; sort?: string }`
  - `type LookupListHook<T> = (params: LookupListParams, options?: { enabled?: boolean }) => { data: PaginatedResponse<T> | undefined; isLoading: boolean }`
  - `useEntitiesByIds<T>({ useListHook, ids, idFilterKey?, enabled? }): { items: T[]; isLoading: boolean }`
  - `ACTIVE_ONLY_FILTER = "is_active|boolean:true"` (export จาก `use-lookup-pagination.ts`)
  - `useLookupPagination<T>({ useListHook, search, perpage?, filter?, resetDeps?, enabled?, selectedIds?, getId?, idFilterKey?, serverFilter?, sort? })` → `{ items, selectedItems, isLoading, isLoadingMore, hasMore, loadMore }`
  - `LookupCombobox` prop ใหม่ `selectedItems?: T[]`

- [ ] **Step 1: สร้าง `hooks/use-entities-by-ids.ts`**

```ts
import type { PaginatedResponse } from "@/types/params";

export interface LookupListParams {
  search?: string;
  perpage: number;
  page?: number;
  filter?: string;
  sort?: string;
}

export type LookupListHook<T> = (
  params: LookupListParams,
  options?: { enabled?: boolean },
) => {
  data: PaginatedResponse<T> | undefined;
  isLoading: boolean;
};

interface UseEntitiesByIdsOptions<T> {
  useListHook: LookupListHook<T>;
  ids: readonly string[];
  /** คอลัมน์ id ฝั่ง backend — ทะเบียนผู้ใช้ไม่มี `id` ต้องใช้ `user_id` */
  idFilterKey?: string;
  enabled?: boolean;
}

// reference คงที่ — ผู้เรียกเอาผลไปใส่ deps ของ useMemo ได้โดยไม่คำนวณใหม่ทุก render
const EMPTY: never[] = [];

/**
 * ดึงเฉพาะแถวที่ id อยู่ใน `ids` ด้วย `filter=<key>|string:a,b` (backend แปลงเป็น IN)
 * แทนการลากทะเบียนทั้งก้อนมาหาชื่อ — เรียง id ก่อนสร้าง filter ให้ query key
 * ตรงกันทุกผู้เรียก (popover กับ chip) react-query จึงยิงครั้งเดียว
 */
export function useEntitiesByIds<T>({
  useListHook,
  ids,
  idFilterKey = "id",
  enabled = true,
}: UseEntitiesByIdsOptions<T>) {
  const sorted = [...new Set(ids.filter(Boolean))].sort();
  const hasIds = sorted.length > 0;

  const { data, isLoading } = useListHook(
    {
      perpage: Math.max(sorted.length, 1),
      filter: hasIds ? `${idFilterKey}|string:${sorted.join(",")}` : undefined,
    },
    { enabled: enabled && hasIds },
  );

  return {
    items: (hasIds ? data?.data : undefined) ?? (EMPTY as T[]),
    isLoading: hasIds && isLoading,
  };
}
```

- [ ] **Step 2: เขียน `hooks/use-lookup-pagination.ts` ใหม่ทั้งไฟล์**

```ts
import { useState, useEffect } from "react";
import {
  useEntitiesByIds,
  type LookupListHook,
} from "@/hooks/use-entities-by-ids";

/** clause มาตรฐานของ lookup — ใช้ไม่ได้กับ credit-note-reasons / physical-count-periods / users */
export const ACTIVE_ONLY_FILTER = "is_active|boolean:true";

interface UseLookupPaginationOptions<T> {
  useListHook: LookupListHook<T>;
  search: string;
  perpage?: number;
  /** กรองฝั่ง client หลังโหลด — ใช้กับเงื่อนไขที่ server ทำไม่ได้เท่านั้น */
  filter?: (item: T) => boolean;
  resetDeps?: unknown[];
  /**
   * ถ้า false จะไม่ fetch รายการหน้า (lazy) — ใช้คู่กับ `onOpenChange` ของ lookup
   * การดึงรายการที่เลือกไว้ (`selectedIds`) ไม่ขึ้นกับค่านี้
   */
  enabled?: boolean;
  /**
   * id ที่เลือกอยู่ — ดึงตาม id แยกเสมอ ให้ช่องแสดงชื่อได้แม้ค่านั้นอยู่หลังหน้าแรก
   * หรือถูกปิดใช้งานไปแล้ว (เอกสารเก่า) โดยไม่ต้องรอผู้ใช้เปิด dropdown
   */
  selectedIds?: readonly string[];
  getId?: (item: T) => string;
  idFilterKey?: string;
  /** ส่งต่อเป็น `filter=` ของ API หลายเงื่อนไขคั่นด้วย `,` (AND) — เปลี่ยนแล้วเริ่มหน้า 1 ใหม่ */
  serverFilter?: string;
  sort?: string;
}

const defaultGetId = (item: unknown) => (item as { id: string }).id;

export function useLookupPagination<T>({
  useListHook,
  search,
  perpage = 30,
  filter,
  resetDeps = [],
  enabled = true,
  selectedIds,
  getId = defaultGetId,
  idFilterKey,
  serverFilter,
  sort,
}: UseLookupPaginationOptions<T>) {
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<T[]>([]);

  // Reset when search, server filter or parent filter changes
  useEffect(() => {
    setPage(1);
    setAllItems([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, serverFilter, sort, ...resetDeps]);

  const { data, isLoading } = useListHook(
    {
      search: search || undefined,
      perpage,
      page,
      filter: serverFilter,
      sort,
    },
    { enabled },
  );

  // Append new page data — รับเฉพาะ response ของหน้าที่ขออยู่ (หน้าเก่าที่ตอบช้า
  // หรือ placeholder ของหน้าก่อนจะไม่ถูกต่อซ้ำ) และตัดตัวซ้ำด้วย id
  useEffect(() => {
    if (!data) return;
    if (data.paginate && Number(data.paginate.page) !== page) return;
    const newItems = data.data ?? [];
    setAllItems((prev) => {
      if (page === 1) return newItems;
      const seen = new Set(prev.map(getId));
      return [...prev, ...newItems.filter((it) => !seen.has(getId(it)))];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, page]);

  const totalPages = data?.paginate?.pages ?? 1;
  const hasMore = page < totalPages;

  const ids = selectedIds ?? [];
  const { items: fetchedSelected } = useEntitiesByIds({
    useListHook,
    ids,
    idFilterKey,
  });
  const known = new Map<string, T>();
  for (const it of allItems) known.set(getId(it), it);
  for (const it of fetchedSelected) known.set(getId(it), it);
  const selectedItems = ids
    .map((id) => known.get(id))
    .filter((it): it is T => it !== undefined);

  // ค่าที่เลือกอยู่ผ่าน filter เสมอ (เช่นถูกปิดใช้งานไปแล้วแต่เอกสารบันทึกไว้)
  const selectedSet = new Set(ids);
  const items = filter
    ? allItems.filter((it) => selectedSet.has(getId(it)) || filter(it))
    : allItems;

  const loadMore = () => {
    if (hasMore && !isLoading) {
      setPage((p) => p + 1);
    }
  };

  return {
    items,
    selectedItems,
    isLoading: isLoading && page === 1,
    isLoadingMore: isLoading && page > 1,
    hasMore,
    loadMore,
  };
}
```

- [ ] **Step 3: เพิ่ม prop `selectedItems` ใน `components/lookup/lookup-combobox.tsx`**

ใน `interface LookupComboboxProps<T>` ต่อจาก `readonly items: T[];`:

```ts
  /**
   * รายการที่เลือกอยู่ซึ่งอาจไม่อยู่ใน `items` (อยู่หลังหน้าแรก / ถูกปิดใช้งาน)
   * — ใช้หา label บนปุ่มเท่านั้น ไม่แสดงในรายการ
   */
  readonly selectedItems?: T[];
```

เพิ่ม `selectedItems,` ใน destructure (ต่อจาก `items,`) แล้วแก้บล็อก `selectedItem`:

```ts
  const selectedItem = value
    ? (items.find((item) => getId(item) === value) ??
      selectedItems?.find((item) => getId(item) === value) ??
      (pickedItem && getId(pickedItem) === value ? pickedItem : undefined))
    : undefined;
```

- [ ] **Step 4: แก้ spec ให้ตรงกับดีไซน์ที่ปรับ**

ใน spec §4.2 แทนข้อ 1–2 ด้วย:

```markdown
1. **ดึงรายการที่เลือกไว้** — `selectedIds` ทั้งหมดส่งให้ `useEntitiesByIds` ดึงเสมอ (ไม่สนใจ `enabled`)
   ไม่ตัด id ที่อยู่ในหน้าที่โหลดแล้วออก เพื่อให้ query key ตรงกับ chip ใน `use-list-filters.ts`
2. **`items`** = รายการในหน้าที่โหลดแล้วที่ผ่าน `filter` (ค่าที่เลือกอยู่ผ่านเสมอ) — **ไม่เอาค่าที่เลือก
   ไปต่อบนสุด** เพราะจะโผล่ในผลค้นหาที่ไม่ตรงคำค้น label ของค่าที่ไม่อยู่ใน `items` หาจาก prop ใหม่
   `LookupCombobox.selectedItems` แทน ส่วน filter แบบเลือกหลายค่าแสดง `selectedItems` บนสุดเอง
```

และแทนเนื้อหา §7 ด้วย:

```markdown
- `is_active|boolean:true` ใช้ไม่ได้กับ `credit-note-reasons`, `physical-count-periods` (400 Unknown argument)
  และ `users` (ได้ 0 แถว) → ไม่ส่ง
- ส่ง `filter` ซ้ำหลายตัวไม่ได้ — หลายเงื่อนไขต้องคั่น `,` ใน filter เดียว (ยืนยันแล้วว่าเป็น AND)
- `lookup-physical-count-period` ตัดออกจากงานนี้: พังอยู่ก่อนแล้ว — API คืน `tb_inventory_period.start_at/end_at`
  แต่ FE อ่าน `counting_period_from_date` ที่ไม่มีใน response → รายการว่างเสมอ ต้องแก้แยก
```

- [ ] **Step 5: static checks**

Run: `bun run typecheck && bun run lint`
Expected: ผ่าน — lookup 15 ตัวเดิมยังคอมไพล์ได้เพราะ option ใหม่เป็น optional ทั้งหมด และ `LookupListHook` รับ `crud.useList` ได้ (`ParamsDto` กว้างกว่า `LookupListParams`)

- [ ] **Step 6: เทสต์เดิม**

Run: `bun test:run components/lookup hooks`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add hooks/use-entities-by-ids.ts hooks/use-lookup-pagination.ts components/lookup/lookup-combobox.tsx docs/superpowers/specs/2026-09-29-lazy-lookup-no-perpage-all-design.md
git commit -m "feat(lookup): useLookupPagination ดึงค่าที่เลือกไว้ตาม id ได้ + serverFilter"
```

---

### Task 2: กลุ่ม A — `<Select>` → `LookupCombobox` (6 ตัว)

**Files:**
- Modify (เขียนใหม่ทั้งไฟล์): `components/lookup/lookup-currency.tsx`, `lookup-credit-term.tsx`, `lookup-tax-profile.tsx`, `lookup-cn-reason.tsx`, `lookup-extra-cost.tsx`, `lookup-shelf.tsx`

**Interfaces:**
- Consumes: `useLookupPagination`, `ACTIVE_ONLY_FILTER`, `LookupCombobox.selectedItems` (Task 1)
- Produces: props สาธารณะเดิมทุกตัว (ไม่เปลี่ยน signature)

หมายเหตุร่วม: `LookupCombobox` มี error icon + tooltip ของ `error` และ tooltip ของ label ในตัวอยู่แล้ว จึงลบ `Tooltip`/`Select` ที่เขียนเองทิ้งได้ทั้งหมด `size` เดิมที่เป็น `"xs" | "sm" | "default"` ส่งต่อได้ตรง

- [ ] **Step 1: `lookup-currency.tsx`**

```tsx
import { useState } from "react";
import { useTranslations } from "use-intl";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/use-currency";
import {
  ACTIVE_ONLY_FILTER,
  useLookupPagination,
} from "@/hooks/use-lookup-pagination";
import type { Currency } from "@/types/currency";
import { LookupCombobox } from "./lookup-combobox";

interface LookupCurrencyProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly onItemChange?: (currency: Currency) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly size?: "xs" | "sm" | "default";
  readonly disableTooltip?: boolean;
  readonly excludeIds?: Set<string>;
  readonly error?: string;
  readonly readOnly?: boolean;
  readonly fullWidth?: boolean;
}

export function LookupCurrency({
  value,
  onValueChange,
  onItemChange,
  disabled,
  placeholder,
  className,
  size,
  disableTooltip,
  excludeIds,
  error,
  readOnly,
  fullWidth,
}: LookupCurrencyProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");
  const [hasOpened, setHasOpened] = useState(false);

  const { items, selectedItems, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination<Currency>({
      useListHook: useCurrency,
      search,
      serverFilter: ACTIVE_ONLY_FILTER,
      enabled: hasOpened,
      selectedIds: value ? [value] : [],
      filter: excludeIds ? (c) => !excludeIds.has(c.id) : undefined,
    });

  return (
    <LookupCombobox
      size={size}
      value={value}
      onValueChange={(id, item) => {
        onValueChange(id);
        if (item) onItemChange?.(item);
      }}
      onOpenChange={(open) => {
        if (open) setHasOpened(true);
      }}
      items={items}
      selectedItems={selectedItems}
      getId={(c) => c.id}
      getLabel={(c) => c.code}
      getSearchValue={(c) => `${c.code} ${c.name}`}
      renderItem={(c) => (
        <>
          <span className="w-10 shrink-0 font-semibold">{c.code}</span>
          <span className="text-muted-foreground flex-1 truncate text-left">
            {c.name}
          </span>
        </>
      )}
      placeholder={placeholder ?? tl("select", { entity: tfl("currency") })}
      searchPlaceholder={tl("search", { entity: tfl("currency") })}
      disabled={disabled}
      disableTooltip={disableTooltip}
      className={cn(fullWidth ? "w-full" : "w-fit", className)}
      popoverWidth="w-72"
      popoverAlign="end"
      serverSideSearch
      onSearchChange={setSearch}
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      isLoading={isLoading}
      error={error}
      readOnly={readOnly}
    />
  );
}
```

(tooltip เดิมแสดง `code (symbol)` + `name` — `LookupCombobox` แสดง label บน tooltip อยู่แล้ว ส่วน `name` เห็นในรายการ ยอมรับการเปลี่ยนนี้)

- [ ] **Step 2: `lookup-credit-term.tsx`**

```tsx
import { useState } from "react";
import { useTranslations } from "use-intl";
import { cn } from "@/lib/utils";
import { useCreditTerm } from "@/hooks/use-credit-term";
import {
  ACTIVE_ONLY_FILTER,
  useLookupPagination,
} from "@/hooks/use-lookup-pagination";
import type { CreditTerm } from "@/types/credit-term";
import { LookupCombobox } from "./lookup-combobox";

interface LookupCreditTermProps {
  readonly value: string;
  readonly onValueChange: (value: string, creditTerm?: CreditTerm) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly size?: "xs" | "sm" | "default";
  readonly error?: string;
}

export function LookupCreditTerm({
  value,
  onValueChange,
  disabled,
  placeholder,
  className,
  size,
  error,
}: LookupCreditTermProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");
  const [hasOpened, setHasOpened] = useState(false);

  const { items, selectedItems, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination<CreditTerm>({
      useListHook: useCreditTerm,
      search,
      serverFilter: ACTIVE_ONLY_FILTER,
      enabled: hasOpened,
      selectedIds: value ? [value] : [],
    });

  return (
    <LookupCombobox
      size={size}
      value={value}
      onValueChange={onValueChange}
      onOpenChange={(open) => {
        if (open) setHasOpened(true);
      }}
      items={items}
      selectedItems={selectedItems}
      getId={(c) => c.id}
      getLabel={(c) => c.name}
      placeholder={placeholder ?? tl("select", { entity: tfl("creditTerm") })}
      searchPlaceholder={tl("search", { entity: tfl("creditTerm") })}
      disabled={disabled}
      className={cn("w-full", className)}
      serverSideSearch
      onSearchChange={setSearch}
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      isLoading={isLoading}
      error={error}
    />
  );
}
```

- [ ] **Step 3: `lookup-tax-profile.tsx`** (callback เดิมส่ง `taxRate`, `taxProfileName` — ต้องคงไว้)

```tsx
import { useState } from "react";
import { useTranslations } from "use-intl";
import { cn } from "@/lib/utils";
import { useTaxProfile } from "@/hooks/use-tax-profile";
import {
  ACTIVE_ONLY_FILTER,
  useLookupPagination,
} from "@/hooks/use-lookup-pagination";
import type { TaxProfile } from "@/types/tax-profile";
import { LookupCombobox } from "./lookup-combobox";

interface LookupTaxProfileProps {
  readonly value: string;
  readonly onValueChange: (
    value: string,
    taxRate: number,
    taxProfileName: string,
  ) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly size?: "xs" | "sm" | "default";
  readonly error?: string;
}

export function LookupTaxProfile({
  value,
  onValueChange,
  disabled,
  placeholder,
  className,
  size = "sm",
  error,
}: LookupTaxProfileProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");
  const [hasOpened, setHasOpened] = useState(false);

  const { items, selectedItems, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination<TaxProfile>({
      useListHook: useTaxProfile,
      search,
      serverFilter: ACTIVE_ONLY_FILTER,
      enabled: hasOpened,
      selectedIds: value ? [value] : [],
    });

  return (
    <LookupCombobox
      size={size}
      value={value}
      onValueChange={(id, tp) =>
        onValueChange(id, tp?.tax_rate ?? 0, tp?.name ?? "")
      }
      onOpenChange={(open) => {
        if (open) setHasOpened(true);
      }}
      items={items}
      selectedItems={selectedItems}
      getId={(tp) => tp.id}
      getLabel={(tp) => tp.name}
      placeholder={placeholder ?? tl("select", { entity: tfl("taxProfile") })}
      searchPlaceholder={tl("search", { entity: tfl("taxProfile") })}
      disabled={disabled}
      className={cn("w-full", className)}
      serverSideSearch
      onSearchChange={setSearch}
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      isLoading={isLoading}
      error={error}
    />
  );
}
```

ก่อนแก้ ตรวจว่า `LookupCombobox` เรียก `onValueChange` แบบไม่มี `item` ตอนไหนบ้าง: `grep -n "onValueChange(" components/lookup/lookup-combobox.tsx` — กรณีนั้นผลคือ `(id, 0, "")` ซึ่งตรงกับพฤติกรรมเดิมของ `FieldSelect` (หา profile ไม่เจอ → 0, "")

- [ ] **Step 4: `lookup-cn-reason.tsx`** (**ห้ามส่ง `ACTIVE_ONLY_FILTER`** — endpoint ตอบ 400)

```tsx
import { useState } from "react";
import { useTranslations } from "use-intl";
import { cn } from "@/lib/utils";
import { useCnReason } from "@/hooks/use-cn-reason";
import { useLookupPagination } from "@/hooks/use-lookup-pagination";
import type { CnReason } from "@/types/cn-reason";
import { LookupCombobox } from "./lookup-combobox";

interface LookupCnReasonProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly size?: "xs" | "sm" | "default";
  readonly error?: string;
  readonly readOnly?: boolean;
}

export function LookupCnReason({
  value,
  onValueChange,
  disabled,
  placeholder,
  className,
  size = "sm",
  error,
  readOnly,
}: LookupCnReasonProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");
  const [hasOpened, setHasOpened] = useState(false);

  // credit-note-reasons ไม่มีคอลัมน์ is_active — ส่ง is_active filter แล้ว 400
  const { items, selectedItems, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination<CnReason>({
      useListHook: useCnReason,
      search,
      enabled: hasOpened,
      selectedIds: value ? [value] : [],
    });

  return (
    <LookupCombobox
      size={size}
      value={value}
      onValueChange={(id) => onValueChange(id)}
      onOpenChange={(open) => {
        if (open) setHasOpened(true);
      }}
      items={items}
      selectedItems={selectedItems}
      getId={(r) => r.id}
      getLabel={(r) => r.name}
      placeholder={placeholder ?? tl("select", { entity: tfl("cnReason") })}
      searchPlaceholder={tl("search", { entity: tfl("cnReason") })}
      disabled={disabled}
      className={cn("w-full", className)}
      serverSideSearch
      onSearchChange={setSearch}
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      isLoading={isLoading}
      error={error}
      readOnly={readOnly}
    />
  );
}
```

- [ ] **Step 5: `lookup-extra-cost.tsx`**

```tsx
import { useState } from "react";
import { useTranslations } from "use-intl";
import { cn } from "@/lib/utils";
import { useExtraCost } from "@/hooks/use-extra-cost";
import {
  ACTIVE_ONLY_FILTER,
  useLookupPagination,
} from "@/hooks/use-lookup-pagination";
import type { ExtraCost } from "@/types/extra-cost";
import { LookupCombobox } from "./lookup-combobox";

interface LookupExtraCostProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly size?: "xs" | "sm" | "default";
  readonly error?: string;
}

export function LookupExtraCost({
  value,
  onValueChange,
  disabled,
  placeholder,
  className,
  size = "sm",
  error,
}: LookupExtraCostProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");
  const [hasOpened, setHasOpened] = useState(false);

  const { items, selectedItems, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination<ExtraCost>({
      useListHook: useExtraCost,
      search,
      serverFilter: ACTIVE_ONLY_FILTER,
      enabled: hasOpened,
      selectedIds: value ? [value] : [],
    });

  return (
    <LookupCombobox
      size={size}
      value={value}
      onValueChange={(id) => onValueChange(id)}
      onOpenChange={(open) => {
        if (open) setHasOpened(true);
      }}
      items={items}
      selectedItems={selectedItems}
      getId={(c) => c.id}
      getLabel={(c) => c.name}
      placeholder={placeholder ?? tl("select", { entity: tfl("extraCost") })}
      searchPlaceholder={tl("search", { entity: tfl("extraCost") })}
      disabled={disabled}
      disableTooltip
      className={cn("w-full", className)}
      serverSideSearch
      onSearchChange={setSearch}
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      isLoading={isLoading}
      error={error}
    />
  );
}
```

(`disableTooltip` — ตัวเดิมไม่มี tooltip ของ label มีแต่ของ error)

- [ ] **Step 6: `lookup-shelf.tsx`** (ตัวเลือก "—" เดิม = ล้างค่า → ใช้ `prependItems` แบบเดียวกับ `lookup-item-group`)

```tsx
import { useState } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "use-intl";
import { cn } from "@/lib/utils";
import { useShelf } from "@/hooks/use-shelf";
import {
  ACTIVE_ONLY_FILTER,
  useLookupPagination,
} from "@/hooks/use-lookup-pagination";
import type { Shelf } from "@/types/shelf";
import { LookupCombobox } from "./lookup-combobox";

interface LookupShelfProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly onItemChange?: (shelf: Shelf) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly readOnly?: boolean;
}

export function LookupShelf({
  value,
  onValueChange,
  onItemChange,
  disabled,
  placeholder,
  className,
  readOnly,
}: LookupShelfProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");
  const [hasOpened, setHasOpened] = useState(false);

  const { items, selectedItems, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination<Shelf>({
      useListHook: useShelf,
      search,
      serverFilter: ACTIVE_ONLY_FILTER,
      enabled: hasOpened,
      selectedIds: value ? [value] : [],
    });

  return (
    <LookupCombobox
      size="sm"
      value={value}
      onValueChange={(id, shelf) => {
        onValueChange(id);
        if (shelf) onItemChange?.(shelf);
      }}
      onOpenChange={(open) => {
        if (open) setHasOpened(true);
      }}
      items={items}
      selectedItems={selectedItems}
      getId={(s) => s.id}
      getLabel={(s) => s.name}
      placeholder={placeholder ?? tl("select", { entity: tfl("shelf") })}
      searchPlaceholder={tl("search", { entity: tfl("shelf") })}
      disabled={disabled}
      className={cn("w-full", className)}
      serverSideSearch
      onSearchChange={setSearch}
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      isLoading={isLoading}
      readOnly={readOnly}
      prependItems={
        <button
          type="button"
          aria-pressed={!value}
          className={cn(
            "relative flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-hidden select-none",
            "hover:bg-accent hover:text-accent-foreground",
          )}
          onClick={() => onValueChange("")}
        >
          —
          <Check
            className={cn(
              "ml-auto h-4 w-4 shrink-0",
              value ? "opacity-0" : "opacity-100",
            )}
          />
        </button>
      }
    />
  );
}
```

- [ ] **Step 7: ตรวจ call site ว่า props ยังตรง (ไม่แก้ routes)**

Run: `bun run typecheck`
Expected: ผ่าน — ถ้ามี call site ส่ง prop ที่ตัวใหม่ไม่ได้ประกาศ ให้**เพิ่ม prop นั้นกลับใน component** ไม่ใช่แก้ routes

- [ ] **Step 8: lint + เทสต์เดิม + ยืนยันว่า `-1` หายจาก 6 ไฟล์**

Run: `bun run lint && bun test:run components && grep -n "perpage" components/lookup/lookup-{currency,credit-term,tax-profile,cn-reason,extra-cost,shelf}.tsx`
Expected: lint/เทสต์ผ่าน, grep ไม่พบอะไร

- [ ] **Step 9: Commit**

```bash
git add components/lookup/lookup-currency.tsx components/lookup/lookup-credit-term.tsx components/lookup/lookup-tax-profile.tsx components/lookup/lookup-cn-reason.tsx components/lookup/lookup-extra-cost.tsx components/lookup/lookup-shelf.tsx
git commit -m "feat(lookup): currency/credit term/tax/CN reason/extra cost/shelf เปลี่ยนเป็น combobox แบบ lazy load"
```

---

### Task 3: กลุ่ม B — combobox ที่ดึง `-1` → `useLookupPagination` (6 ตัว)

**Files:**
- Modify: `components/lookup/lookup-category.tsx`, `lookup-sub-category.tsx`, `lookup-item-group.tsx`, `lookup-department.tsx`, `lookup-noti-tmpl.tsx`, `lookup-user.tsx`
- Delete: `components/lookup/lookup-sub-category.test.tsx`

**Interfaces:**
- Consumes: `useLookupPagination`, `ACTIVE_ONLY_FILTER`, `LookupCombobox.selectedItems` (Task 1)
- Produces: props เดิมทุกตัว; `getUserFullName` ยัง export จาก `lookup-user.tsx`

ทุกตัวใช้รูปแบบเดียวกัน: เพิ่ม state `search`, เรียก hook, ส่ง `items`/`selectedItems`/`serverSideSearch`/`onSearchChange`/`onLoadMore`/`hasMore`/`isLoadingMore` ให้ `LookupCombobox` — JSX ส่วนอื่น (`renderItem`, `prependItems`, placeholder ฯลฯ) **คงเดิมทุกบรรทัด** ใน JSX ทุกตัว แทน `items={<ตัวแปรเดิม>}` ด้วยบล็อกนี้:

```tsx
      items={items}
      selectedItems={selectedItems}
      serverSideSearch
      onSearchChange={setSearch}
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
```

และ import ที่ต้องเพิ่ม (ยกเว้นที่ระบุไว้ต่างออกไป):

```tsx
import {
  ACTIVE_ONLY_FILTER,
  useLookupPagination,
} from "@/hooks/use-lookup-pagination";
```

- [ ] **Step 1: `lookup-category.tsx`** — แทนบล็อกตั้งแต่ `const [hasOpened…` ถึง `const categories = …` ด้วย:

```tsx
  const [search, setSearch] = useState("");
  // Lazy: ยิงรายการตอนเปิด popover ครั้งแรก — ชื่อของค่าที่เลือกไว้ดึงตาม id แยก
  const [hasOpened, setHasOpened] = useState(false);

  const { items, selectedItems, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination<CategoryDto>({
      useListHook: useCategory,
      search,
      serverFilter: ACTIVE_ONLY_FILTER,
      enabled: hasOpened,
      selectedIds: value ? [value] : [],
    });
```

- [ ] **Step 2: `lookup-sub-category.tsx`** — ก่อนลบ ยืนยันว่าไม่มีผู้ใช้ `filterActiveSubCategories` นอกไฟล์นี้กับเทสต์ของมัน: `grep -rn filterActiveSubCategories --include='*.ts*' components hooks lib routes` จากนั้นลบ `export function filterActiveSubCategories` (L22-32) แล้วแทนบล็อก fetch + `const subCategories = …` ด้วย:

```tsx
  const [search, setSearch] = useState("");
  const [hasOpened, setHasOpened] = useState(false);

  // กรองตามหมวดที่ server — กรองหลังโหลดทีละ 30 แถว หน้าแรกอาจว่างทั้งที่มีข้อมูล
  const serverFilter = filterCategoryId
    ? `${ACTIVE_ONLY_FILTER},product_category_id|string:${filterCategoryId}`
    : ACTIVE_ONLY_FILTER;

  const { items, selectedItems, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination<SubCategoryDto>({
      useListHook: useSubCategory,
      search,
      serverFilter,
      enabled: hasOpened,
      selectedIds: value ? [value] : [],
    });
```

- [ ] **Step 3: ลบ `lookup-sub-category.test.tsx`** — ทั้งไฟล์ทดสอบ `filterActiveSubCategories` ที่ถูกลบ (การกรองย้ายไป server) ยืนยันก่อน: `grep -n "describe(" components/lookup/lookup-sub-category.test.tsx` ต้องได้บรรทัดเดียว (`describe("filterActiveSubCategories"`) ถ้ามีมากกว่านั้น ให้ลบเฉพาะบล็อกนั้นและ import ของมัน ไม่ใช่ทั้งไฟล์

```bash
git rm components/lookup/lookup-sub-category.test.tsx
```

- [ ] **Step 4: `lookup-item-group.tsx`** — แทนบล็อก fetch + `const itemGroups = …` ด้วย:

```tsx
  const [search, setSearch] = useState("");
  const [hasOpened, setHasOpened] = useState(false);

  const serverFilter = filterSubCategoryId
    ? `${ACTIVE_ONLY_FILTER},product_subcategory_id|string:${filterSubCategoryId}`
    : ACTIVE_ONLY_FILTER;

  const { items, selectedItems, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination<ItemGroupDto>({
      useListHook: useItemGroup,
      search,
      serverFilter,
      enabled: hasOpened,
      selectedIds: value ? [value] : [],
    });
```

- [ ] **Step 5: `lookup-department.tsx`** — ลบคอมเมนต์ `perpage: -1 = …` 3 บรรทัด แทนบล็อก fetch + `const departments = …` ด้วย:

```tsx
  const [search, setSearch] = useState("");
  // Lazy: ยิงรายการตอนเปิด popover ครั้งแรก — ชื่อของค่าที่เลือกไว้ดึงตาม id แยก
  const [hasOpened, setHasOpened] = useState(false);

  const { items, selectedItems, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination<Department>({
      useListHook: useDepartment,
      search,
      serverFilter: ACTIVE_ONLY_FILTER,
      enabled: hasOpened,
      selectedIds: value ? [value] : [],
    });
```

import เพิ่มอีกตัว: `import type { Department } from "@/types/department";`

- [ ] **Step 6: `lookup-noti-tmpl.tsx`** — แทนการเรียก `useLookupPagination` เดิม (L40-50) ด้วย:

```tsx
  const { items, selectedItems, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination<NotificationTemplate>({
      useListHook: useNotificationTemplates,
      search,
      // template ที่ stage ผูกไว้คงแสดงแม้ถูกปิดใช้งาน — มาทาง selectedItems
      serverFilter: `${ACTIVE_ONLY_FILTER},type|string:${channelType}`,
      enabled: hasOpened,
      selectedIds: value ? [value] : [],
    });
```

(`resetDeps: [channelType]` ไม่ต้องใช้แล้ว — `serverFilter` เปลี่ยนตาม `channelType` และเป็น reset dep อัตโนมัติ) import เดิมมี `useLookupPagination` แล้ว เพิ่มแค่ `ACTIVE_ONLY_FILTER`; JSX เพิ่ม `selectedItems={selectedItems}` ต่อจาก `items={items}` (props load-more มีอยู่แล้ว)

- [ ] **Step 7: `lookup-user.tsx`** — **ห้ามส่ง `ACTIVE_ONLY_FILTER`** (users ได้ 0 แถว) imports: ลบ `import { useAllUsers } from "@/hooks/use-all-users";` เพิ่ม `import { useUser } from "@/hooks/use-user";` และ `import { useLookupPagination } from "@/hooks/use-lookup-pagination";` (ไม่ต้อง import `ACTIVE_ONLY_FILTER`) แทนบล็อก fetch + `const users = …` ด้วย:

```tsx
  const [search, setSearch] = useState("");
  const [hasOpened, setHasOpened] = useState(false);

  // ทะเบียนผู้ใช้ไม่มีคอลัมน์ id / is_active — อ้างด้วย user_id และไม่กรอง active
  const { items, selectedItems, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination<User>({
      useListHook: useUser,
      search,
      enabled: hasOpened,
      selectedIds: value ? [value] : [],
      getId: (u) => u.user_id,
      idFilterKey: "user_id",
      filter: excludeIds ? (u) => !excludeIds.has(u.user_id) : undefined,
    });
```

JSX: แทน `items={users}` ด้วยบล็อกร่วม (search ของ users ค้นทั้งชื่อและอีเมลที่ server — ยืนยันแล้ว) แก้ JSDoc ที่เขียนว่า "ดึงข้อมูลผ่าน `useAllUsers()` (client-side filter ไม่ใช้ pagination)" เป็น "ดึงทีละหน้าผ่าน `useUser` + ค้นที่ server"

- [ ] **Step 8: static checks + เทสต์เดิม + ยืนยัน `-1` หาย**

Run: `bun run typecheck && bun run lint && bun test:run components && grep -n "perpage" components/lookup/lookup-{category,sub-category,item-group,department,noti-tmpl,user}.tsx`
Expected: ผ่าน, grep ไม่พบอะไร

- [ ] **Step 9: Commit**

```bash
git add components/lookup/
git commit -m "feat(lookup): category/sub-category/item group/department/noti template/user เลิกดึง perpage=-1"
```

---

### Task 4: filter แบบเลือกหลายค่า — `EntityMultiFilter` + 3 ตัวห่อ

**Files:**
- Create: `components/filter/entity-multi-filter.tsx`
- Modify (เขียนใหม่ทั้งไฟล์): `components/filter/filter-vendor.tsx`, `filter-department.tsx`, `filter-requester.tsx`

**Interfaces:**
- Consumes: `useLookupPagination`, `ACTIVE_ONLY_FILTER`, `LookupListHook` (Task 1)
- Produces:
  - `EntityMultiFilter<T>` props: `{ value; onChange; className?; fieldKey; label; useListHook: LookupListHook<T>; getId; getLabel; serverFilter?; idFilterKey? }`
  - `FilterVendor` / `FilterDepartment` / `FilterRequester` props เดิม (`value`, `onChange`, `className`; requester มี `fieldKey?`, `label?`)

- [ ] **Step 1: ตรวจชื่อจริงก่อนเขียน** (ผลใช้แทนค่าในโค้ด Step 2-5 ถ้าไม่ตรง)

```bash
grep -n "FilterInlineContext" components/filter/filter-vendor.tsx      # path ของ context
grep -n "string:" components/filter/filter-department.tsx               # fieldKey ของแผนก (คาด department_id)
grep -n 'tfl("' components/filter/filter-requester.tsx components/filter/filter-department.tsx  # i18n key ของ label
sed -n 1,60p components/ui/virtual-command-list.tsx                      # ชื่อ prop maxHeight / emptyMessage
grep -n "export function useDebouncedValue" hooks/use-debounced-value.ts
```

- [ ] **Step 2: สร้าง `components/filter/entity-multi-filter.tsx`**

```tsx
import { useContext, useState } from "react";
import { useTranslations } from "use-intl";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandInput } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { FilterInlineContext } from "@/components/ui/filter-inline-context";
import { VirtualCommandList } from "@/components/ui/virtual-command-list";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { LookupListHook } from "@/hooks/use-entities-by-ids";
import { useLookupPagination } from "@/hooks/use-lookup-pagination";
import { cn } from "@/lib/utils";

interface EntityMultiFilterProps<T> {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly className?: string;
  /** คอลัมน์ที่ clause ชี้ — ค่าที่ส่งออกเป็น `<fieldKey>|string:id1,id2` */
  readonly fieldKey: string;
  readonly label: string;
  readonly useListHook: LookupListHook<T>;
  readonly getId: (item: T) => string;
  readonly getLabel: (item: T) => string;
  readonly serverFilter?: string;
  readonly idFilterKey?: string;
}

const ROW_CLASS = cn(
  "relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs select-none",
  "hover:bg-accent hover:text-accent-foreground",
);

/**
 * ตัวกรองเลือกหลายค่าจากทะเบียน (vendor / แผนก / ผู้ใช้) — ค้นที่ server และโหลดทีละหน้า
 * รายการยิงเมื่อเปิด popover เท่านั้น ส่วนชื่อของค่าที่เลือกไว้ดึงตาม id เสมอ ปุ่มจึง
 * "ชื่อแรก +N" ได้ทันทีแม้เปิดจาก deep link / saved view
 */
export function EntityMultiFilter<T>({
  value,
  onChange,
  className,
  fieldKey,
  label,
  useListHook,
  getId,
  getLabel,
  serverFilter,
  idFilterKey,
}: EntityMultiFilterProps<T>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 150);
  const inline = useContext(FilterInlineContext);
  const tc = useTranslations("common");

  const prefix = `${fieldKey}|string:`;
  const selectedIds =
    value && value.startsWith(prefix)
      ? value.slice(prefix.length).split(",").filter(Boolean)
      : [];
  const selectedSet = new Set(selectedIds);

  const { items, selectedItems, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination<T>({
      useListHook,
      search: debouncedSearch,
      serverFilter,
      // inline (submenu ของ ListFilterMenu) ไม่มีจังหวะ "เปิด popover" — fetch เลย
      enabled: open || inline,
      selectedIds,
      getId,
      idFilterKey,
    });

  const handleToggle = (id: string) => {
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next.size === 0 ? "" : `${prefix}${Array.from(next).join(",")}`);
  };

  // ที่เลือกไว้อยู่บนสุดเสมอ — ยกเลิกได้แม้ไม่อยู่ในผลค้นหาปัจจุบัน
  const rows = [
    ...selectedItems,
    ...items.filter((it) => !selectedSet.has(getId(it))),
  ];

  const selectedCount = selectedIds.length;
  const firstName = selectedItems[0] ? getLabel(selectedItems[0]) : undefined;
  const valueText =
    selectedCount > 0
      ? `${firstName ?? `${label} (${selectedCount})`}${
          firstName && selectedCount > 1 ? ` +${selectedCount - 1}` : ""
        }`
      : label;

  const list = (
    <Command shouldFilter={false}>
      <CommandInput
        placeholder={label}
        className="placeholder:text-xs"
        value={search}
        onValueChange={setSearch}
      />
      <div className="p-1">
        <label className={ROW_CLASS}>
          <Checkbox
            checked={selectedCount === 0}
            onCheckedChange={() => onChange("")}
          />
          <span className="truncate">{tc("all")}</span>
        </label>
        {isLoading ? (
          <div className="text-muted-foreground px-2 py-1.5 text-xs">…</div>
        ) : (
          <VirtualCommandList
            items={rows}
            maxHeight={240}
            onLoadMore={loadMore}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
          >
            {(item) => {
              const id = getId(item);
              return (
                <label key={id} className={ROW_CLASS}>
                  <Checkbox
                    checked={selectedSet.has(id)}
                    onCheckedChange={() => handleToggle(id)}
                  />
                  <span className="truncate">{getLabel(item)}</span>
                </label>
              );
            }}
          </VirtualCommandList>
        )}
      </div>
    </Command>
  );

  if (inline) {
    return list;
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setSearch("");
      }}
      modal
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("justify-between", className)}
        >
          <span
            className={cn(
              "truncate",
              !selectedCount && "text-muted-foreground text-xs",
            )}
          >
            {valueText}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        {list}
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 3: `filter-vendor.tsx`**

```tsx
import { useTranslations } from "use-intl";
import { useVendor } from "@/hooks/use-vendor";
import { ACTIVE_ONLY_FILTER } from "@/hooks/use-lookup-pagination";
import type { Vendor } from "@/types/vendor";
import { EntityMultiFilter } from "./entity-multi-filter";

interface FilterVendorProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly className?: string;
}

/** ตัวกรอง vendor แบบเลือกหลายค่า — clause `vendor_id|string:id1,id2` */
export function FilterVendor({ value, onChange, className }: FilterVendorProps) {
  const tfl = useTranslations("field");
  return (
    <EntityMultiFilter<Vendor>
      value={value}
      onChange={onChange}
      className={className}
      fieldKey="vendor_id"
      label={tfl("vendor")}
      useListHook={useVendor}
      getId={(v) => v.id}
      getLabel={(v) => v.name}
      serverFilter={ACTIVE_ONLY_FILTER}
    />
  );
}
```

- [ ] **Step 4: `filter-department.tsx`** (ถ้าไฟล์เดิมมี props อื่นนอกจาก `value/onChange/className` ให้คงไว้และส่งต่อ)

```tsx
import { useTranslations } from "use-intl";
import { useDepartment } from "@/hooks/use-department";
import { ACTIVE_ONLY_FILTER } from "@/hooks/use-lookup-pagination";
import type { Department } from "@/types/department";
import { EntityMultiFilter } from "./entity-multi-filter";

interface FilterDepartmentProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly className?: string;
}

/** ตัวกรองแผนกแบบเลือกหลายค่า — clause `department_id|string:id1,id2` */
export function FilterDepartment({
  value,
  onChange,
  className,
}: FilterDepartmentProps) {
  const tfl = useTranslations("field");
  return (
    <EntityMultiFilter<Department>
      value={value}
      onChange={onChange}
      className={className}
      fieldKey="department_id"
      label={tfl("department")}
      useListHook={useDepartment}
      getId={(d) => d.id}
      getLabel={(d) => d.name}
      serverFilter={ACTIVE_ONLY_FILTER}
    />
  );
}
```

- [ ] **Step 5: `filter-requester.tsx`** (ไม่มี `is_active` — ไม่ส่ง `serverFilter`)

```tsx
import { useTranslations } from "use-intl";
import { useUser } from "@/hooks/use-user";
import type { User } from "@/types/workflows";
import { EntityMultiFilter } from "./entity-multi-filter";

interface FilterRequesterProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly className?: string;
  /**
   * ชื่อคอลัมน์จริงใน DB ที่ clause จะชี้ — default `requestor_id` (สะกดตาม
   * schema ฝั่ง backend ไม่ใช่ requester) — PO ใช้ `created_by_id` กรองผู้จัดซื้อ
   */
  readonly fieldKey?: string;
  readonly label?: string;
}

function getUserFullName(user: User) {
  return [user.firstname, user.middlename, user.lastname]
    .filter(Boolean)
    .join(" ");
}

export function FilterRequester({
  value,
  onChange,
  className,
  fieldKey = "requestor_id",
  label,
}: FilterRequesterProps) {
  const tfl = useTranslations("field");
  return (
    <EntityMultiFilter<User>
      value={value}
      onChange={onChange}
      className={className}
      fieldKey={fieldKey}
      label={label || tfl("requester")}
      useListHook={useUser}
      getId={(u) => u.user_id}
      getLabel={getUserFullName}
      idFilterKey="user_id"
    />
  );
}
```

- [ ] **Step 6: static checks + เทสต์เดิม + ยืนยัน `-1` หาย**

Run: `bun run typecheck && bun run lint && bun test:run components && grep -n "perpage" components/filter/*.tsx`
Expected: ผ่าน, grep ไม่พบอะไร

- [ ] **Step 7: Commit**

```bash
git add components/filter/
git commit -m "feat(filter): ตัวกรอง vendor/แผนก/ผู้ขอ ค้นที่ server + โหลดทีละหน้า รวมเป็น EntityMultiFilter"
```

---

### Task 5: chip ใน `use-list-filters.ts` ดึงชื่อตาม id

**Files:**
- Modify: `hooks/use-list-filters.ts` (imports ~L5-8, บล็อก fetch ~L221-249, บล็อก label ~L280-310, deps ~L329)

**Interfaces:**
- Consumes: `useEntitiesByIds` (Task 1); `clauseTokens` (มีอยู่แล้วในไฟล์ L26)
- Produces: ไม่เปลี่ยน API ของ `useListFilters`

- [ ] **Step 1: แทนคอมเมนต์ + บล็อก `hasDepartmentField` … `useVendor(...)` (L221-249) ด้วย**

```ts
  // id ที่ถูกเลือกอยู่ในทุก field ของแต่ละชนิด — ดึงเฉพาะแถวเหล่านั้นมาทำชื่อบน chip
  // (query key เดียวกับ EntityMultiFilter เพราะ useEntitiesByIds เรียง id ก่อน
  // react-query จึงไม่ยิงซ้ำเมื่อเปิด popover)
  const idsOf = (control: string) =>
    fields
      .filter((f) => f.control === control)
      .flatMap((f) => clauseTokens(values[f.key] ?? ""));
  const { items: departmentItems } = useEntitiesByIds({
    useListHook: useDepartment,
    ids: idsOf("department"),
  });
  const { items: userItems } = useEntitiesByIds({
    useListHook: useUser,
    ids: idsOf("requester"),
    idFilterKey: "user_id",
  });
  const { items: vendorItems } = useEntitiesByIds({
    useListHook: useVendor,
    ids: idsOf("vendor"),
  });
```

- [ ] **Step 2: ในบล็อก label (L280-310)** แทน `departmentData?.data ?? []` → `departmentItems`, `vendorData?.data ?? []` → `vendorItems`, `userData?.data ?? []` → `userItems` และแก้คอมเมนต์ L280 เป็น `// แผนก/ผู้ขอ/ผู้ขาย: id → ชื่อจริง (ดึงตาม id; ระหว่างโหลดตก fallback เป็นจำนวน)`

- [ ] **Step 3: แก้ deps ของ `useMemo` (L329)** `departmentData, userData, vendorData` → `departmentItems, userItems, vendorItems`

- [ ] **Step 4: import** เพิ่ม `import { useEntitiesByIds } from "@/hooks/use-entities-by-ids";` (คง `useDepartment/useUser/useVendor` ไว้ — ยังใช้เป็น `useListHook`)

- [ ] **Step 5: static checks + เทสต์เดิม + ยืนยัน `-1` หาย**

Run: `bun run typecheck && bun run lint && bun test:run && grep -n "perpage" hooks/use-list-filters.ts`
Expected: ผ่านทั้งหมด (`config-list-template.license.test.tsx` mock `use-list-filters` ทั้งโมดูลจึงไม่กระทบ), grep ไม่พบอะไร
หมายเหตุ: `idsOf` สร้าง array ใหม่ทุก render แต่ `useEntitiesByIds` สร้าง filter string จากค่าที่เรียงแล้ว query key จึงคงที่ ไม่ยิงซ้ำ และ `items` ที่คืนมาเป็น reference คงที่ (`data.data` ของ react-query หรือ `EMPTY` ระดับโมดูล) deps ของ `useMemo` จึงไม่เปลี่ยนทุก render

- [ ] **Step 6: Commit**

```bash
git add hooks/use-list-filters.ts
git commit -m "feat(list-filter): chip แผนก/ผู้ขอ/ผู้ขาย ดึงชื่อเฉพาะ id ที่เลือก เลิกลากทะเบียนทั้ง BU"
```

---

### Task 6: ตรวจรวมในเบราว์เซอร์ + gate สุดท้าย

**Files:** ไม่มี (ตรวจอย่างเดียว; ถ้าเจอบั๊กให้แก้ในไฟล์ของ task ที่เป็นเจ้าของแล้ว commit แยก)

- [ ] **Step 1: gate รวม**

Run: `bun run typecheck && bun run lint && bun test:run`
Expected: ผ่านทั้งหมด

- [ ] **Step 2: ยืนยันไม่มี `-1` เหลือในขอบเขต**

Run: `grep -rn 'perpage.\{0,6\}-1' components/lookup components/filter hooks/use-list-filters.ts hooks/use-lookup-pagination.ts`
Expected: พบแค่ `components/lookup/lookup-physical-count-period.tsx` (ตัดออกโดยตั้งใจ — ดู File Structure)

- [ ] **Step 3: ตรวจในเบราว์เซอร์** — รัน `VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev` login `admin@zebra.com` BU T02 เปิด DevTools → Network กรอง `perpage`

1. เปิด PO ที่มีอยู่ (หน้าแก้ไข) → ไม่มี request `perpage=-1` สำหรับ currency; ช่อง currency แสดงรหัส (เช่น `THB`) ทันทีโดยไม่ต้องคลิก และมี request `filter=id|string:…`
2. เปิดเอกสารที่ credit term หรือ department ถูกปิดใช้งานแล้ว → ช่องยังแสดงชื่อ (ถ้าต้องปิดใช้งานชั่วคราวใน config เพื่อทดสอบ **ต้องเปิดกลับทันที** — DB นี้เป็น dev ที่ใช้ร่วมกัน และต้องถาม user ก่อนเขียน)
3. lookup vendor ในฟอร์ม PO: เลื่อนลง → มี request `page=2`; พิมพ์ค้นแล้วลบเร็ว ๆ → ไม่มีรายการซ้ำหรือผลของคำค้นเก่าค้าง
4. หน้า list PR: ตั้ง filter ผู้ขอ + แผนก → copy URL → เปิดแท็บใหม่ → ปุ่มและ chip แสดงชื่อทันที, network มีแค่ `filter=user_id|string:…` / `filter=id|string:…` ไม่มี `perpage=-1`
5. ฟอร์ม product: เลือก category แล้วเปิด sub-category → หน้าแรกมีข้อมูลและเป็นของหมวดนั้นเท่านั้น; เปลี่ยน category แล้วเปิดใหม่ → รายการเปลี่ยนตาม
6. lookup shelf: เลือก "—" แล้วค่าถูกล้าง

- [ ] **Step 4: บันทึกผลการตรวจ** — ถ้าข้อไหนไม่ผ่าน แก้แล้ว commit แยกต่อ task เจ้าของ ถ้าผ่านครบไม่ต้อง commit
