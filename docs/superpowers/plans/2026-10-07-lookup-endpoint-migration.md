# Lookup Endpoint Migration (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move 12 master-data lookups from per-entity list endpoints to the backend's generic `GET /api/:bu_code/lookup/:resource`, with a 400ms search debounce and earlier scroll-triggered paging for every lookup.

**Architecture:** One new hook `useLookupResource(resource, options)` replaces `useLookupPagination` + the per-entity list hook for the migrated lookups. It returns the same shape as `useLookupPagination`, so each component changes only its hook call, item type and label getters. `LookupCombobox`, `PagedChecklist` and `VirtualCommandList` get the debounce/spinner/threshold changes that apply to all lookups.

**Tech Stack:** React 19, TanStack Query, TanStack Virtual, use-intl, Vite, Bun.

**Spec:** `docs/superpowers/specs/2026-10-07-lookup-endpoint-migration-design.md`

## Global Constraints

- **No new test files** (user's global CLAUDE.md overrides TDD): skip every "write failing test" step; still run `bun run typecheck`, `bun run lint`, `bun test:run` — existing suites must stay green.
- Commit messages in **Thai** (repo CLAUDE.md); code/identifiers in English.
- Branch: `feature/lookup-endpoint` (already exists, spec committed at `70f7d763`). Do **not** stage `CLAUDE.md`, `package.json` or `.claude/skills/license-gating/` — they are someone else's uncommitted work in the same tree.
- Debounce = **400ms**. Scroll prefetch threshold = **5 rows** (`5 × estimateSize`).
- Endpoint: `GET /api/proxy/api/${buCode}/lookup/${resource}` → `{ data: LookupItem[], paginate: { total, page, perpage, pages } }`; `perpage` max 100; `ids` max 100.
- `filter`/`sort` on the lookup endpoint accept only `code|name|description|status` — never send `is_active|…`, `id|string:…` or `product_status_type|…` to it (400 `LOOKUP_INVALID_FIELD`).
- `department` must send `scope=all` (backend `mine` = only departments assigned to the user).
- Do not touch `hooks/use-lookup-pagination.ts`, `hooks/use-entities-by-ids.ts` or the per-entity list hooks — group 2/3 lookups still use them.
- Module boundary: new files live in `hooks/`, `types/`, `constant/` (shared layer) — they must not import from `routes/`.

## Review Focus

1. **Selected value whose row is inactive or beyond page 1** — the trigger button must still show its name (fetched via `?ids=`). Manual check in Task 5.
2. **Typing fast then stopping** — exactly one request 400ms after the last keystroke; a slow response for an older search term must never overwrite the newer list. Covered by query-key-per-search in Task 1, manual check in Task 5.
3. **Department list** — shows every department in the BU, not only the user's own. Task 3 sends `scope: "all"`; manual check in Task 5.
4. **Creating a unit through the "+" dialog** — the new unit is selected and its name shows on the button immediately. Task 3 invalidates `["lookup", buCode, "unit"]`; manual check in Task 5.
5. **App-id allowlist** — if the inventory app is not `allow_all`, every lookup call returns 401 and the user is logged out. Not testable in code; Task 5 curls before any deploy.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `types/lookup.ts` | create | `LookupItem`, `LookupResource`, `LookupScope`, `lookupLabel()` |
| `constant/api-endpoints.ts` | modify | add `LOOKUP` |
| `hooks/use-lookup-resource.ts` | create | paging + selected-ids fetching against the lookup endpoint; `useInvalidateLookup` |
| `components/lookup/lookup-combobox.tsx` | modify | 400ms debounce + pending spinner |
| `components/lookup/paged-checklist.tsx` | modify | 400ms debounce |
| `components/ui/virtual-command-list.tsx` | modify | 5-row prefetch threshold |
| `components/lookup/lookup-{unit,cuisine,equipment-category,extra-cost,shelf,cn-reason,delivery-point,department,prt}.tsx` | modify | switch to `useLookupResource` |
| `components/lookup/lookup-{vendor,product,category}.tsx` + 5 caller files | modify | switch to `useLookupResource`; callers handle `name: string \| null` |

---

### Task 1: Lookup types, endpoint and `useLookupResource` hook

**Files:**
- Create: `types/lookup.ts`
- Create: `hooks/use-lookup-resource.ts`
- Modify: `constant/api-endpoints.ts` (next to `UNITS` at line ~475)

**Interfaces:**
- Produces:
  - `type LookupItem = { id: string; code: string | null; name: string | null; description: string | null; status: string }`
  - `type LookupResource = "unit" | "recipe_cuisine" | "recipe_equipment_category" | "extra_cost_type" | "location_shelf" | "credit_note_reason" | "delivery_point" | "department" | "pricelist_template" | "vendor" | "product" | "product_category"`
  - `type LookupScope = "mine" | "all"`
  - `lookupLabel(item: LookupItem): string` → `name ?? code ?? ""`
  - `API_ENDPOINTS.LOOKUP(buCode: string): string`
  - `useLookupResource(resource: LookupResource, options: UseLookupResourceOptions): { items: LookupItem[]; selectedItems: LookupItem[]; isLoading: boolean; isLoadingMore: boolean; hasMore: boolean; loadMore: () => void; total: number; error: Error | null; refetch: () => void }`
  - `useInvalidateLookup(resource: LookupResource): () => void`

- [ ] **Step 1: Create `types/lookup.ts`**

```ts
/**
 * แถวของ `GET /api/:bu_code/lookup/:resource` — ทุก resource คืน shape เดียวกัน
 * ฟิลด์ที่ตารางไม่มีเป็น `null` (เช่น `unit.code`) · `status` เป็น "active" /
 * "inactive" / "deleted" หรือค่า enum ของตารางนั้น
 */
export interface LookupItem {
  id: string;
  code: string | null;
  name: string | null;
  description: string | null;
  status: string;
}

/**
 * resource ที่ FE ใช้จริง — ชื่อต้องตรงกับ `LOOKUP_CATALOG` ของ backend
 * (`apps/backend-gateway/src/application/lookup/lookup-catalog.ts`)
 * เพิ่มเมื่อย้าย lookup ตัวใหม่ ไม่ดึง catalog ตอน runtime
 */
export type LookupResource =
  | "unit"
  | "recipe_cuisine"
  | "recipe_equipment_category"
  | "extra_cost_type"
  | "location_shelf"
  | "credit_note_reason"
  | "delivery_point"
  | "department"
  | "pricelist_template"
  | "vendor"
  | "product"
  | "product_category";

/** `mine` = ค่าเริ่มต้นของ backend · master ที่ผูก user (department/location) `mine` คืนเฉพาะที่ assign ให้ user */
export type LookupScope = "mine" | "all";

/** ป้ายสำรองของแถว lookup — `name` ก่อน ไม่มีค่อยใช้ `code` */
export const lookupLabel = (item: LookupItem): string =>
  item.name ?? item.code ?? "";
```

- [ ] **Step 2: Add the endpoint to `constant/api-endpoints.ts`**

Insert directly after the `UNITS:` line:

```ts
  LOOKUP: (buCode: string) => `/api/proxy/api/${buCode}/lookup`,
```

- [ ] **Step 3: Create `hooks/use-lookup-resource.ts`**

```ts
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/lib/build-query-string";
import { ApiError } from "@/lib/api-error";
import { CACHE_DYNAMIC } from "@/lib/cache-config";
import { MAX_PERPAGE } from "@/lib/fetch-all-pages";
import type { PaginatedResponse } from "@/types/params";
import type { LookupItem, LookupResource, LookupScope } from "@/types/lookup";

interface UseLookupResourceOptions {
  /** คำค้น (combobox debounce ให้แล้ว) — เปลี่ยนแล้วเริ่มหน้า 1 ใหม่ */
  search: string;
  /** ไม่ส่ง = `mine` ของ backend · department ต้องส่ง `"all"` */
  scope?: LookupScope;
  /** id ที่เลือกอยู่ — ดึงตาม id แยกเสมอ ให้ปุ่มแสดงชื่อได้แม้อยู่หลังหน้าแรกหรือถูกปิดใช้งานแล้ว */
  selectedIds?: readonly string[];
  /** false = ไม่ดึงรายการ (lazy คู่กับ `onOpenChange`) — ไม่มีผลกับ `selectedIds` */
  enabled?: boolean;
  /** กรองฝั่ง client หลังโหลด (เช่น excludeIds) — ค่าที่เลือกอยู่ผ่านเสมอ */
  filter?: (item: LookupItem) => boolean;
  perpage?: number;
}

// reference คงที่ — ผู้เรียกเอาไปใส่ deps ได้โดยไม่คำนวณใหม่ทุก render
const EMPTY: LookupItem[] = [];

// Number(undefined) เป็น NaN ซึ่ง `??` ไม่จับ — คืน undefined เพื่อให้ตกไป fallback ถัดไป
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

async function fetchLookup(
  buCode: string,
  resource: LookupResource,
  params: Record<string, string | number | undefined>,
): Promise<PaginatedResponse<LookupItem>> {
  const url = buildUrl(`${API_ENDPOINTS.LOOKUP(buCode)}/${resource}`, params);
  const res = await httpClient.get(url);
  if (!res.ok) throw await ApiError.from(res, `Failed to fetch ${resource}`);
  return res.json();
}

/**
 * รายการของ lookup แบบแบ่งหน้าจาก `GET /api/:bu_code/lookup/:resource`
 *
 * คืน shape เดียวกับ `useLookupPagination` — component ที่ย้ายมาเปลี่ยนแค่บรรทัดเรียก hook
 * endpoint กรอง active ให้เอง จึงไม่มี `serverFilter` · ค่าที่เลือกดึงผ่าน `?ids=`
 * ซึ่ง backend ข้ามตัวกรอง active/page ให้
 *
 * @param resource - ชื่อ resource ใน catalog ของ backend
 * @param options - search / scope / selectedIds / enabled / filter / perpage
 * @returns items, selectedItems, สถานะโหลด, loadMore สำหรับเลื่อนแล้วโหลดต่อ
 * @example
 * ```ts
 * const lookup = useLookupResource("unit", {
 *   search, enabled: hasOpened, selectedIds: value ? [value] : [],
 * });
 * ```
 */
export function useLookupResource(
  resource: LookupResource,
  {
    search,
    scope,
    selectedIds,
    enabled = true,
    filter,
    perpage = 30,
  }: UseLookupResourceOptions,
) {
  const buCode = useBuCode();
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<LookupItem[]>([]);
  // จำ pages/total ล่าสุด — ระหว่างโหลดหน้าถัดไป `data` เป็น undefined
  // ถ้าไม่จำ hasMore จะกลายเป็น false (เลื่อนแล้วไม่โหลดต่อ)
  const [lastPaginate, setLastPaginate] = useState<{
    pages: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    setPage(1);
    setAllItems([]);
    setLastPaginate(null);
  }, [resource, search, scope]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["lookup", buCode, resource, scope, search, page, perpage],
    queryFn: () =>
      fetchLookup(buCode!, resource, {
        page,
        perpage,
        search: search || undefined,
        scope,
      }),
    ...CACHE_DYNAMIC,
    enabled: enabled && !!buCode,
  });

  // รับเฉพาะ response ของหน้าที่ขออยู่ แล้วตัดตัวซ้ำด้วย id
  useEffect(() => {
    if (!data) return;
    if (data.paginate?.page != null && Number(data.paginate.page) !== page)
      return;
    const pages = num(data.paginate?.pages);
    const total = num(data.paginate?.total);
    if (pages !== undefined && total !== undefined) {
      setLastPaginate({ pages, total });
    }
    const newItems = data.data ?? [];
    setAllItems((prev) => {
      if (page === 1) return newItems;
      const seen = new Set(prev.map((it) => it.id));
      return [...prev, ...newItems.filter((it) => !seen.has(it.id))];
    });
  }, [data, page]);

  const totalPages = num(data?.paginate?.pages) ?? lastPaginate?.pages ?? 1;
  // error ต้องหยุดแบ่งหน้า — ไม่งั้น auto-load ของ list จะข้ามหน้าที่พังไปเรื่อย ๆ
  const hasMore = page < totalPages && !error;

  // เรียง id ก่อนสร้าง key ให้ทุกผู้เรียกที่เลือกชุดเดียวกันใช้ cache ร่วมกัน
  const ids = [...new Set((selectedIds ?? []).filter(Boolean))]
    .sort()
    .slice(0, MAX_PERPAGE);
  const { data: selectedData } = useQuery({
    queryKey: ["lookup", buCode, resource, scope, "ids", ids],
    queryFn: () =>
      fetchLookup(buCode!, resource, {
        ids: ids.join(","),
        perpage: ids.length,
        scope,
      }),
    ...CACHE_DYNAMIC,
    enabled: ids.length > 0 && !!buCode,
  });

  const known = new Map<string, LookupItem>();
  for (const it of allItems) known.set(it.id, it);
  for (const it of selectedData?.data ?? EMPTY) known.set(it.id, it);
  const selectedItems = (selectedIds ?? [])
    .map((id) => known.get(id))
    .filter((it): it is LookupItem => it !== undefined);

  const selectedSet = new Set(selectedIds ?? []);
  const items = filter
    ? allItems.filter((it) => selectedSet.has(it.id) || filter(it))
    : allItems;

  // StrictMode รัน effect auto-load สองรอบด้วย closure เดิม — เทียบกับ `page`
  // ของ closure ทำให้เรียกซ้ำกี่ครั้งก็ขยับได้หน้าเดียว (กันข้ามหน้า 2)
  const loadMore = () => {
    if (hasMore && !isLoading) {
      setPage((p) => (p === page ? p + 1 : p));
    }
  };

  return {
    items,
    selectedItems,
    isLoading: isLoading && page === 1,
    isLoadingMore: isLoading && page > 1,
    hasMore,
    loadMore,
    total: num(data?.paginate?.total) ?? lastPaginate?.total ?? allItems.length,
    error: (error as Error | null) ?? null,
    refetch: () => {
      void refetch();
    },
  };
}

/**
 * คืนฟังก์ชันล้าง cache ของ lookup resource หนึ่งใน BU ปัจจุบัน — เรียกหลังสร้าง/แก้แถว
 * ผ่าน dialog ในตัว lookup (mutation ของ config crud invalidate แค่ key ของ list เดิม)
 */
export function useInvalidateLookup(resource: LookupResource) {
  const queryClient = useQueryClient();
  const buCode = useBuCode();
  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["lookup", buCode, resource],
    });
  };
}
```

Note: `CACHE_DYNAMIC` (1 min stale) instead of `CACHE_STATIC` because config-crud mutations elsewhere invalidate only their own list keys, not `["lookup", …]` — a short stale time bounds how long a row created on another page stays invisible.

- [ ] **Step 4: Type-check and lint**

Run: `bun run typecheck && bunx eslint hooks/use-lookup-resource.ts types/lookup.ts constant/api-endpoints.ts`
Expected: no errors. If `ApiError.from` or `httpClient.get` signatures differ, mirror their use in `lib/config-crud.ts:38-46`.

- [ ] **Step 5: Commit**

```bash
git add types/lookup.ts hooks/use-lookup-resource.ts constant/api-endpoints.ts
git commit -m "feat(lookup): เพิ่ม useLookupResource เรียก Lookup API ของ backend แบบแบ่งหน้า + ดึงค่าที่เลือกด้วย ids"
```

---

### Task 2: Debounce 400ms, pending spinner, 5-row prefetch

**Files:**
- Modify: `components/lookup/lookup-combobox.tsx:166` (debounce) and `:310-317` (CommandInput block)
- Modify: `components/lookup/paged-checklist.tsx:80`
- Modify: `components/ui/virtual-command-list.tsx:25` (JSDoc) and `:63-70` (`handleScroll`)

**Interfaces:**
- Consumes: nothing new.
- Produces: `LOOKUP_SEARCH_DEBOUNCE_MS = 400` exported from `components/lookup/lookup-combobox.tsx` (used by `paged-checklist.tsx`).

- [ ] **Step 1: Combobox debounce constant**

In `components/lookup/lookup-combobox.tsx`, above `const SKELETON_WIDTHS`, add:

```ts
/**
 * หน่วงก่อนส่งคำค้นให้ server — สั้นกว่านี้ยิงทุกตัวอักษร ยาวกว่านี้ (เคยคุยกันที่ 2 วิ)
 * ผู้ใช้หยุดพิมพ์แล้วนึกว่าค้าง ระหว่างรอมี spinner ในช่องค้นหา
 */
export const LOOKUP_SEARCH_DEBOUNCE_MS = 400;
```

Replace `const debouncedSearch = useDebouncedValue(search, 150);` with:

```ts
  const debouncedSearch = useDebouncedValue(search, LOOKUP_SEARCH_DEBOUNCE_MS);
  // พิมพ์แล้วยังไม่ครบเวลาหน่วง — โชว์ spinner ให้รู้ว่ากำลังจะค้น
  const isSearchPending = search !== debouncedSearch;
```

- [ ] **Step 2: Spinner in the search input**

Replace the block

```tsx
          <div className="relative w-full">
            <CommandInput
              placeholder={resolvedSearchPlaceholder}
              className={cn("placeholder:text-xs", headerSlot && "pr-8")}
              value={search}
              onValueChange={setSearch}
            />
            {headerSlot}
          </div>
```

with

```tsx
          <div className="relative w-full">
            <CommandInput
              placeholder={resolvedSearchPlaceholder}
              className={cn(
                "placeholder:text-xs",
                headerSlot ? "pr-14" : isSearchPending && "pr-8",
              )}
              value={search}
              onValueChange={setSearch}
            />
            {isSearchPending && (
              <Loader2
                aria-hidden="true"
                className={cn(
                  "text-muted-foreground absolute top-1/2 size-3.5 -translate-y-1/2 animate-spin",
                  headerSlot ? "right-9" : "right-2",
                )}
              />
            )}
            {headerSlot}
          </div>
```

(`Loader2` is already imported at the top of the file.)

- [ ] **Step 3: PagedChecklist debounce**

In `components/lookup/paged-checklist.tsx` add `import { LOOKUP_SEARCH_DEBOUNCE_MS } from "./lookup-combobox";` and replace `useDebouncedValue(search, 150)` with `useDebouncedValue(search, LOOKUP_SEARCH_DEBOUNCE_MS)`.

- [ ] **Step 4: 5-row prefetch in `VirtualCommandList`**

In `components/ui/virtual-command-list.tsx`, above the component add:

```ts
/** เริ่มโหลดหน้าถัดไปเมื่อเหลืออีกกี่แถวก่อนถึงท้าย — ข้อมูลมาทันก่อนผู้ใช้เลื่อนถึง */
const PREFETCH_ROWS = 5;
```

Replace `handleScroll` with:

```ts
  const handleScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el || !onLoadMore || !hasMore || isLoadingMore) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight - scrollTop - clientHeight < PREFETCH_ROWS * estimateSize) {
      onLoadMore();
    }
  }, [onLoadMore, hasMore, isLoadingMore, estimateSize]);
```

Leave the auto-fill `useEffect` (`el.scrollHeight - el.clientHeight < 50` = "not scrollable") unchanged. In the JSDoc change `(trigger เมื่อ scroll ใกล้ถึงขอบ 50px)` to `(trigger เมื่อเหลืออีก 5 แถวก่อนถึงท้าย)`.

- [ ] **Step 5: Verify**

Run: `bun run typecheck && bunx eslint components/lookup/lookup-combobox.tsx components/lookup/paged-checklist.tsx components/ui/virtual-command-list.tsx && bun test:run components/lookup`
Expected: all pass. If `lookup-combobox.test.tsx` uses fake timers advanced by 150ms, change those advances to `LOOKUP_SEARCH_DEBOUNCE_MS` (import it) — that is updating an existing test, not adding one.

- [ ] **Step 6: Commit**

```bash
git add components/lookup/lookup-combobox.tsx components/lookup/paged-checklist.tsx components/ui/virtual-command-list.tsx components/lookup/lookup-combobox.test.tsx
git commit -m "feat(lookup): หน่วงค้นหา 400ms พร้อม spinner และโหลดหน้าถัดไปล่วงหน้า 5 แถว"
```

---

### Task 3: Migrate the 9 id/name-only lookups

**Files (all modify):** `components/lookup/lookup-unit.tsx`, `lookup-cuisine.tsx`, `lookup-equipment-category.tsx`, `lookup-extra-cost.tsx`, `lookup-shelf.tsx`, `lookup-cn-reason.tsx`, `lookup-delivery-point.tsx`, `lookup-department.tsx`, `lookup-prt.tsx`

**Interfaces:**
- Consumes: `useLookupResource`, `useInvalidateLookup` (Task 1), `LookupItem`, `lookupLabel` (Task 1).
- Produces: unchanged public props, except the item type passed to callbacks becomes `LookupItem` (see per-file notes).

Resource map:

| file | resource | extra option |
|---|---|---|
| lookup-unit | `"unit"` | `useInvalidateLookup("unit")` after dialog create |
| lookup-cuisine | `"recipe_cuisine"` | |
| lookup-equipment-category | `"recipe_equipment_category"` | keep `filter` for `excludeIds` |
| lookup-extra-cost | `"extra_cost_type"` | |
| lookup-shelf | `"location_shelf"` | `onItemChange` type → `LookupItem` |
| lookup-cn-reason | `"credit_note_reason"` | delete the "ไม่มีคอลัมน์ is_active" comment |
| lookup-delivery-point | `"delivery_point"` | `onItemChange` keeps `{ id: string; name: string }` → pass `{ id: item.id, name: lookupLabel(item) }` |
| lookup-department | `"department"` | `scope: "all"` with comment |
| lookup-prt | `"pricelist_template"` | `onValueChange` 2nd arg type → `LookupItem`; delete the `status\|string:active` comment |

- [ ] **Step 1: Apply the same transformation to each file**

For every file in the table, using `lookup-cuisine.tsx` as the worked example:

Imports — remove the entity list hook (`useCuisine`), `ACTIVE_ONLY_FILTER`/`useLookupPagination`, and the entity type (`Cuisine`); add:

```ts
import { useLookupResource } from "@/hooks/use-lookup-resource";
import { lookupLabel } from "@/types/lookup";
```

Hook call — replace

```ts
  } = useLookupPagination<Cuisine>({
    useListHook: useCuisine,
    search,
    serverFilter: ACTIVE_ONLY_FILTER,
    enabled: hasOpened,
    selectedIds: value ? [value] : [],
  });
```

with

```ts
  } = useLookupResource("recipe_cuisine", {
    search,
    enabled: hasOpened,
    selectedIds: value ? [value] : [],
  });
```

(keep any `filter:` line, e.g. equipment-category's `excludeIds`, as-is — `c.id` exists on `LookupItem`).

Label — replace `getLabel={(c) => c.name}` with `getLabel={lookupLabel}`. Any other `x.name` / `x.code` read inside the component's JSX becomes `lookupLabel(x)` / `x.code ?? ""`.

Update each component's JSDoc line that says "ดึงข้อมูลผ่าน `useXxx` hook" to "ดึงข้อมูลผ่าน Lookup API (`useLookupResource`)", and drop "filter เฉพาะ `is_active = true`" (the endpoint filters active itself).

- [ ] **Step 2: Per-file specifics**

`lookup-department.tsx` — hook call:

```ts
    useLookupResource("department", {
      search,
      // ของเดิมเห็นทั้ง BU — `mine` (ค่าเริ่มต้นของ backend) คืนเฉพาะแผนกที่ assign ให้ user
      scope: "all",
      enabled: hasOpened,
      selectedIds: value ? [value] : [],
    });
```

`lookup-unit.tsx` — add after the hook call:

```ts
  const invalidateUnits = useInvalidateLookup("unit");
```

and change the dialog's `onSuccess`:

```tsx
        onSuccess={(id) => {
          // UnitDialog invalidate แค่ key ของ list เดิม — lookup ต้องล้างเองไม่งั้นชื่อของ id ใหม่ไม่ขึ้น
          invalidateUnits();
          onValueChange(id);
        }}
```

Import: `import { useInvalidateLookup, useLookupResource } from "@/hooks/use-lookup-resource";`

`lookup-shelf.tsx` — prop `readonly onItemChange?: (shelf: LookupItem) => void;` and `import type { LookupItem } from "@/types/lookup";` (no caller passes `onItemChange` today).

`lookup-delivery-point.tsx` — keep the prop type; in `onValueChange` change `if (item) onItemChange?.(item);` to:

```ts
        if (item) onItemChange?.({ id: item.id, name: lookupLabel(item) });
```

`lookup-prt.tsx` — prop `readonly onValueChange: (value: string, template?: LookupItem) => void;` (the only caller, `rfp-form.tsx:240`, uses the value only).

- [ ] **Step 3: Verify**

Run: `bun run typecheck && bunx eslint components/lookup && bun test:run components/lookup`
Expected: no errors. A type error in a caller means it read a field `LookupItem` lacks — stop and report it (the audit found none for these 9).

- [ ] **Step 4: Commit**

```bash
git add components/lookup/lookup-{unit,cuisine,equipment-category,extra-cost,shelf,cn-reason,delivery-point,department,prt}.tsx
git commit -m "refactor(lookup): ย้าย lookup 9 ตัวที่ใช้แค่ id/ชื่อ ไปใช้ Lookup API"
```

---

### Task 4: Migrate vendor, product, category and their callers

**Files:**
- Modify: `components/lookup/lookup-vendor.tsx`, `lookup-product.tsx`, `lookup-category.tsx`
- Modify callers: `routes/procurement/goods-receive-note/grn-form-header.tsx:78`, `routes/procurement/purchase-order/po-general-fields.tsx:112-114`, `routes/procurement/purchase-request/pr-item-expand.tsx:247-249`, `routes/inventory-management/transaction/transaction-component.tsx:229`, `routes/product-management/product/pd-tab-general.tsx:100-102`
- Check (no change expected): `routes/vendor-management/price-list/pl-item-cells.tsx:88` (`product?.name` → `string | null | undefined` passed to `confirmDuplicate`)

**Interfaces:**
- Consumes: `useLookupResource`, `LookupItem`, `lookupLabel` (Task 1).
- Produces: `LookupVendor.onItemChange: (vendor: LookupItem) => void`; `LookupProduct.onValueChange: (value: string, product?: LookupItem) => void`; `LookupCategory.onValueChange: (value: string, item?: LookupItem) => void`.

- [ ] **Step 1: `lookup-vendor.tsx`**

Imports: drop `useVendor`, `ACTIVE_ONLY_FILTER`/`useLookupPagination`, `Vendor`; add `useLookupResource`, `type LookupItem`, `lookupLabel`.
Prop: `readonly onItemChange?: (vendor: LookupItem) => void;`
Hook:

```ts
  } = useLookupResource("vendor", {
    search,
    enabled: hasOpened,
    selectedIds: value ? [value] : [],
    filter: excludeIds ? (v) => !excludeIds.has(v.id) : undefined,
  });
```

Getters:

```tsx
      getLabel={lookupLabel}
      getSearchValue={(v) => `${v.code ?? ""} ${v.name ?? ""}`}
      renderItem={(v) => (
        <>
          <Badge size="xs" variant="secondary" className="shrink-0">
            {v.code}
          </Badge>
          <span className="flex-1 truncate text-left">{v.name}</span>
        </>
      )}
      renderSelected={(v) => `${v.code ?? ""} - ${lookupLabel(v)}`}
```

- [ ] **Step 2: `lookup-product.tsx`**

Imports: drop `useProduct`, `useLookupPagination`, `Product`; add `useLookupResource`, `type LookupItem`, `lookupLabel`.
Prop: `readonly onValueChange: (value: string, product?: LookupItem) => void;`
Hook (the `product_status_type` filter is gone — the endpoint filters active itself):

```ts
  } = useLookupResource("product", {
    search,
    // defaultOpen = เปิด popover ทันทีตอน mount (ฟอร์มพากรอกทีละช่อง) ต้องมีรายการรอ
    enabled: hasOpened || !!defaultOpen,
    selectedIds: value ? [value] : [],
    filter: excludedSet ? (p) => !excludedSet.has(p.id) : undefined,
  });
```

Getters: `getLabel={(p) => \`${p.code ?? ""} — ${lookupLabel(p)}\`}`, `getSearchValue={(p) => \`${p.code ?? ""} ${p.name ?? ""}\`}`; `renderItem` unchanged (JSX renders `null` as nothing). Remove the JSDoc `@example` line that reads `product.inventory_unit_id` if present (no real caller uses it — audit 2026-10-07).

- [ ] **Step 3: `lookup-category.tsx`**

Imports: drop `useCategory`, `ACTIVE_ONLY_FILTER`/`useLookupPagination`, `CategoryDto`; add `useLookupResource`, `type LookupItem`, `lookupLabel`.
Prop: `readonly onValueChange: (value: string, item?: LookupItem) => void;`
Hook: `useLookupResource("product_category", { search, enabled: hasOpened, selectedIds: value ? [value] : [] })`.
Getters: same pattern as product (`code — name`, search on code+name).

- [ ] **Step 4: Fix callers for `name: string | null`**

`grn-form-header.tsx:78`:

```tsx
                onItemChange={(v) => form.setValue("vendor_name", v.name ?? "")}
```

`po-general-fields.tsx:112-114`:

```tsx
              onItemChange={(vendor) => {
                form.setValue("vendor_name", vendor.name ?? "");
              }}
```

`pr-item-expand.tsx:247-249`:

```tsx
                  onItemChange={(vendor) =>
                    form.setValue(`items.${index}.vendor_name`, vendor.name ?? "")
                  }
```

`transaction-component.tsx:229`: `else if (item) setCategoryLabel(item.name ?? "");`

`pd-tab-general.tsx`: change `const handleCategoryChange = (id: string, item?: CategoryDto) => {` to `(id: string, item?: LookupItem) => {` and add `import type { LookupItem } from "@/types/lookup";`. Keep the `CategoryDto` import only if something else in the file still uses it (`bunx eslint` will flag an unused import).

`pl-item-cells.tsx:88`: if typecheck complains that `confirmDuplicate` expects `string | undefined`, pass `product?.name ?? undefined`.

- [ ] **Step 5: Verify**

Run: `bun run typecheck && bun run lint && bun test:run`
Expected: all green. `routes/procurement/purchase-request/pr-vendor-pick.test.tsx` mocks `LookupVendor` wholesale (`vi.mock("@/components/lookup/lookup-vendor")`) so it should be unaffected; if it fails, fix the mock's prop types only.

- [ ] **Step 6: Commit**

```bash
git add components/lookup/lookup-{vendor,product,category}.tsx routes/procurement/goods-receive-note/grn-form-header.tsx routes/procurement/purchase-order/po-general-fields.tsx routes/procurement/purchase-request/pr-item-expand.tsx routes/inventory-management/transaction/transaction-component.tsx routes/product-management/product/pd-tab-general.tsx routes/vendor-management/price-list/pl-item-cells.tsx
git commit -m "refactor(lookup): ย้าย lookup vendor/product/category ไปใช้ Lookup API และให้ผู้เรียกรับ name ที่เป็น null ได้"
```

(Drop `pl-item-cells.tsx` from `git add` if it was not changed.)

---

### Task 5: Manual verification against a backend that has #784

**Files:** none (verification only).

- [ ] **Step 1: Get a backend with the lookup API**

`../carmen-turborepo-backend-v2` working tree was at `460626297` (before #784) when the plan was written, and other Claude sessions may be using it ([[parallel-claude-sessions-same-repo]]). **Ask the user** before `git pull` there; `turbo run dev` serves from that working tree, so pulling changes :4000 for everyone. Then confirm:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $TOKEN" -H "x-app-id: $X_APP_ID" "http://localhost:4000/api/$BU/lookup/unit?perpage=5"
```

Expected: `200`. `401`/`403` = app-id allowlist problem → stop and report (spec §6). Use shell variables for the token — never paste a live token into a file ([[never-commit-live-tokens]]).

- [ ] **Step 2: Check `ids` behaviour**

```bash
curl -s -H "Authorization: Bearer $TOKEN" -H "x-app-id: $X_APP_ID" "http://localhost:4000/api/$BU/lookup/unit?ids=$INACTIVE_UNIT_ID" | jq '.data[0].status'
```

Expected: `"inactive"` (a row filtered out of the normal list still resolves by id). If it returns no row, the selected-label path is broken for inactive values — stop and report.

- [ ] **Step 3: Browser checks** (`bun dev` against :4000, see repo CLAUDE.md)

- Product form → Category: opens, search "a" shows one request ~400ms after typing stops with a spinner meanwhile; scrolling loads page 2 before reaching the bottom; no duplicate rows.
- Product form → Unit "+": create a unit → it is selected and its name shows on the button.
- An existing document whose vendor/unit is beyond page 1 or now inactive → button shows the name, not the placeholder.
- Physical count → Department: lists all BU departments (compare count with `/config/department`).
- PR (vendor pick), GRN (extra cost), CN (reason), RFP (price list template), recipe (cuisine), equipment (category), PR item (delivery point), product locations (shelf): select a value, save, reopen — value and label persist.
- Network tab: no request to the old list endpoints (`/config/:bu/units` etc.) from these 12 lookups; no `400` from `/lookup/`.

- [ ] **Step 4: Report** results to the user; open the PR only after they confirm (PR body in English, per repo CLAUDE.md).
