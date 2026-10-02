# Lazy lookup ช่วง 4a — FE เลิกส่ง perpage=-1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ไม่มีโค้ด FE จุดไหนส่ง `perpage=-1` อีก — ทะเบียนที่ต้องได้ครบวนดึงทีละหน้า (หน้าละ 100) และประวัติ spot-check แบ่งหน้าที่ server

**Architecture:** `lib/fetch-all-pages.ts` วนหน้า (หน้า 1 ก่อน แล้วหน้าที่เหลือคู่ขนาน) · `createConfigCrud` ได้ `useListAll` ที่ใช้ helper นี้ · call site ของทะเบียนเล็กเปลี่ยนแค่ต้นน้ำ · ประวัติ spot-check ใช้ `useLookupPagination` เดิม + ตัวกรองส่งไป server

**Tech Stack:** Vite + React 19 (React Compiler), TanStack Query v5, use-intl, bun

**Spec:** `docs/superpowers/specs/2026-09-29-lazy-lookup-phase4a-fetch-all-pages-design.md`

## Global Constraints

- **ห้ามเขียนเทสต์ใหม่ / ห้ามสร้างไฟล์ `*.test.ts(x)`** (preference ของ user) — ข้ามทุกขั้น TDD · เทสต์เดิมต้องผ่าน ถ้าต้องแก้ mock ให้ตรง hook ใหม่ได้ แต่ห้ามลบ assertion
- gate ทุก task: `bun run typecheck` สะอาด · `bun run lint` 0 error · `bun test:run` ทั้งชุดผ่าน
- `MAX_PERPAGE = 100` — ห้ามส่ง `perpage` เกิน 100 จากที่ไหน
- module boundary (ESLint): `routes/<A>` ห้าม import `routes/<B>` · `components/ hooks/ lib/ constant/ types/` ห้าม import `routes/`
- users ห้ามส่ง `is_active` (ได้ 0 แถว) · spot-check ห้ามส่ง `is_active`
- ค่าตัวกรอง `doc_status` ที่ส่ง server ต้องอยู่ใน enum backend `pending | in_progress | void | completed` เท่านั้น — ค่าอื่น (`voided`, `cancelled`) ได้ **400** (probe T02 2026-09-29)
- commit message ภาษาไทย รูป `<type>(<scope>): <ข้อความ>` · ข้อความในโค้ด (comment) ภาษาไทยตามไฟล์รอบข้าง
- React Compiler อยู่ — ไม่ต้องใส่ `useMemo`/`useCallback` ใหม่ แต่ห้ามถอดของเดิมที่ไม่เกี่ยว

## Review Focus

1. ตัวกรอง status ของประวัติ spot-check ส่ง `voided`/`cancelled` → server 400 → ทั้ง view ประวัติขึ้น ErrorState · คาดหวัง: ตัวเลือก status มีแค่ 4 ค่าใน enum (Task 3)
2. พิมพ์ในช่องค้นทีละตัวตอนอยู่ view ประวัติ → ยิง request ทุกตัวอักษร · คาดหวัง: debounce 300ms (Task 3)
3. `fetchAllPages` เจอ `paginate` หาย / `pages` = 0 / `data` = null → ต้องได้ array (หน้าเดียว) ไม่ throw (Task 1)
4. `useListAll` ไม่ถูก invalidate หลัง create/update/delete ใน crud เดียวกัน → หน้า category/currency โชว์ของเก่า · คาดหวัง: queryKey ขึ้นต้นด้วย `queryKey` เดิม จึงโดน prefix invalidate (Task 1)
5. สลับ view ไปมาระหว่าง locations/history ขณะมีคำค้น → history ต้องไม่ยิงตอนอยู่ view locations และกลับมาแล้วเริ่มหน้า 1 ใหม่ถูก (Task 3)

ตรวจทั้งห้าข้อด้วย typecheck + อ่านโค้ด + browser check ของ user (ไม่มีเทสต์ใหม่ตาม preference)

---

### Task 1: โครงกลาง — `fetchAllPages`, `useListAll`, `useLookupPagination` คืน total/error/refetch, `useAll*` เลิก `-1`

**Files:**
- Create: `lib/fetch-all-pages.ts`
- Modify: `hooks/use-config-crud.ts` (เพิ่ม `useListAll` ใน type ที่ return + implementation + return object)
- Modify: `hooks/use-entities-by-ids.ts:11-17` (`LookupListHook` return type)
- Modify: `hooks/use-lookup-pagination.ts` (คืน `total`, `error`, `refetch`)
- Modify: `hooks/use-all-users.ts`, `hooks/use-all-products.ts`

**Interfaces:**
- Produces:
  - `MAX_PERPAGE: 100` และ `fetchAllPages<T>(fetchPage: (page: number, perpage: number) => Promise<PaginatedResponse<T>>): Promise<T[]>` จาก `@/lib/fetch-all-pages`
  - `createConfigCrud(...).useListAll(params?: Omit<ParamsDto, "page" | "perpage">, options?: Omit<UseQueryOptions<T[]>, "queryKey" | "queryFn">): UseQueryResult<T[]>`
  - `useLookupPagination` คืนเพิ่ม `total: number`, `error: Error | null`, `refetch: () => void`
  - `useAllUsers(enabled?)` / `useAllProducts()` — สัญญาเดิม (queryKey, `T[]`, cache) ไม่เปลี่ยน

- [ ] **Step 1: สร้าง `lib/fetch-all-pages.ts`**

```ts
import type { PaginatedResponse } from "@/types/params";

/** เพดาน perpage ที่ backend ยอมรับ (ช่วง 4c ปิด `-1` และบังคับเพดานนี้) — ห้ามส่งเกิน */
export const MAX_PERPAGE = 100;

/**
 * ดึงทุกแถวของ list endpoint แบบวนหน้า แทน `perpage=-1`
 *
 * ยิงหน้า 1 ก่อนเพื่อรู้จำนวนหน้า แล้วยิงหน้าที่เหลือพร้อมกัน ต่อผลตามลำดับหน้า
 * หน้าไหนพัง = ทั้งก้อน reject (ไม่คืนข้อมูลครึ่งเดียวเงียบ ๆ)
 * ใช้กับทะเบียนที่ต้องได้ครบจริงเท่านั้น (จัดกลุ่ม / ติ๊กทั้งกลุ่ม / พิมพ์) —
 * dropdown ทั่วไปใช้ `useLookupPagination`
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number, perpage: number) => Promise<PaginatedResponse<T>>,
): Promise<T[]> {
  const first = await fetchPage(1, MAX_PERPAGE);
  const pages = Math.max(1, Number(first?.paginate?.pages) || 1);
  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, i) => fetchPage(i + 2, MAX_PERPAGE)),
  );
  return [first, ...rest].flatMap((r) =>
    Array.isArray(r?.data) ? r.data : [],
  );
}
```

- [ ] **Step 2: เพิ่ม `useListAll` ใน `hooks/use-config-crud.ts`**

เพิ่ม import `import { fetchAllPages } from "@/lib/fetch-all-pages";`

ใน return type ของ `createConfigCrud` ต่อจาก `useList: (...) => UseQueryResult<PaginatedResponse<T>>;` เพิ่ม:

```ts
  useListAll: (
    params?: Omit<ParamsDto, "page" | "perpage">,
    options?: Omit<UseQueryOptions<T[]>, "queryKey" | "queryFn">,
  ) => UseQueryResult<T[]>;
```

ต่อจาก function `useList` เพิ่ม:

```ts
  /**
   * Hook ดึงทุกแถวของ entity (วนหน้าละ `MAX_PERPAGE` ผ่าน `fetchAllPages`) แทน `perpage=-1`
   *
   * ใช้กับทะเบียนที่ต้องได้ครบจริง (จัดกลุ่ม / ติ๊กทั้งกลุ่ม / พิมพ์) เท่านั้น
   * queryKey ขึ้นต้นด้วย `queryKey` เดียวกับ `useList` — mutation ของ crud นี้ invalidate ไปด้วย
   *
   * @example
   * ```ts
   * const { data: permissions = [] } = usePermissionAll();
   * ```
   */
  function useListAll(
    params?: Omit<ParamsDto, "page" | "perpage">,
    options?: Omit<UseQueryOptions<T[]>, "queryKey" | "queryFn">,
  ) {
    const buCode = useBuCode();

    return useQuery<T[]>({
      queryKey: [queryKey, buCode, "all", params],
      queryFn: () =>
        fetchAllPages((page, perpage) =>
          api.getList(buCode!, { ...params, page, perpage }),
        ),
      ...cacheProfile,
      ...options,
      enabled: (options?.enabled ?? true) && !!buCode,
    });
  }
```

แก้ return: `return { useList, useListAll, useById, useCreate, useUpdate, useDelete };`
และ JSDoc `@returns` ของ factory ให้ระบุ `useListAll`

ตรวจ `hooks/use-api-mutation.ts` ว่า `invalidateKeys: [queryKey]` invalidate ด้วย prefix (`queryClient.invalidateQueries({ queryKey: [key] })`) — ถ้าไม่ใช่ prefix ให้รายงานใน report (อย่าแก้ use-api-mutation)

- [ ] **Step 3: `LookupListHook` รับ error/refetch แบบ optional** — `hooks/use-entities-by-ids.ts:11-17`

```ts
export type LookupListHook<T> = (
  params: LookupListParams,
  options?: { enabled?: boolean },
) => {
  data: PaginatedResponse<T> | undefined;
  isLoading: boolean;
  error?: Error | null;
  refetch?: () => unknown;
};
```

- [ ] **Step 4: `useLookupPagination` คืน total / error / refetch** — `hooks/use-lookup-pagination.ts`

แก้บรรทัด destructure ของ `useListHook(...)` เป็น `const { data, isLoading, error, refetch } = useListHook(`
แล้วใน return object เพิ่ม (ไม่แตะ field เดิม):

```ts
    /** จำนวนแถวที่ตรงเงื่อนไขทั้งหมดบน server (ไม่ใช่แค่ที่โหลดมาแล้ว) */
    total: Number(data?.paginate?.total ?? allItems.length),
    error: error ?? null,
    /** ยิงหน้าปัจจุบันซ้ำ — ใช้กับปุ่มลองใหม่ของ ErrorState */
    refetch: () => {
      void refetch?.();
    },
```

- [ ] **Step 5: `hooks/use-all-users.ts` เลิก `-1`**

แทน queryFn เดิมด้วย:

```ts
    queryFn: () =>
      fetchAllPages<User>(async (page, perpage) => {
        const url = buildUrl(API_ENDPOINTS.USERS(buCode!), { page, perpage });
        const res = await httpClient.get(url);
        if (!res.ok) throw new Error("Failed to fetch users");
        return res.json();
      }),
```

import `fetchAllPages` จาก `@/lib/fetch-all-pages` · ลบ import `PaginatedResponse` ถ้าไม่ได้ใช้แล้ว ·
แก้ JSDoc บรรทัดแรกเป็น `Hook ดึงผู้ใช้ทั้งหมด (วนหน้าละ 100 ผ่าน fetchAllPages) — ชั่วคราวจนช่วง 4b เปลี่ยน Transfer ของ location/department form`
queryKey / enabled / `CACHE_NORMAL` คงเดิม

- [ ] **Step 6: `hooks/use-all-products.ts` เลิก `-1`** — เหมือน Step 5:

```ts
    queryFn: () =>
      fetchAllPages<Product>(async (page, perpage) => {
        const url = buildUrl(API_ENDPOINTS.PRODUCTS(buCode!), {
          page,
          perpage,
        });
        const res = await httpClient.get(url);
        if (!res.ok) throw new Error("Failed to fetch products");
        return res.json();
      }),
```

JSDoc บรรทัดแรก: `Hook ดึงสินค้าทั้งหมด (วนหน้าละ 100 ผ่าน fetchAllPages) — ชั่วคราวจนช่วง 4b เปลี่ยนต้นไม้สินค้า`

- [ ] **Step 7: gate** — `bun run typecheck && bun run lint && bun test:run` ผ่าน (lint 0 error)

- [ ] **Step 8: commit**

```bash
git add lib/fetch-all-pages.ts hooks/use-config-crud.ts hooks/use-entities-by-ids.ts hooks/use-lookup-pagination.ts hooks/use-all-users.ts hooks/use-all-products.ts
git commit -m "feat(lookup): fetchAllPages วนหน้าละ 100 แทน perpage=-1, useListAll ใน createConfigCrud และ useLookupPagination คืน total/error/refetch"
```

---

### Task 2: ทะเบียนที่ต้องได้ครบย้ายไป `useListAll` / `fetchAllPages`

**Files:**
- Modify (export hook ใหม่): `routes/system-admin/role/use-permission.ts`, `hooks/use-category.ts`, `hooks/use-sub-category.ts`, `hooks/use-item-group.ts`, `routes/system-admin/inventory-period/use-inventory-period.ts`, `hooks/use-currency.ts`, `hooks/use-location.ts`, `hooks/use-user.ts`, `hooks/use-product.ts`
- Modify (call site): `routes/system-admin/role/permission-picker.tsx:66-67`, `routes/system-admin/role/use-role-print.ts:2,31,35`, `routes/system-admin/role/permission-catalog.ts:146`, `routes/product-management/category/category-component.tsx:51-59,89-91`, `routes/system-admin/inventory-period/inventory-period-component.tsx:158-159`, `routes/config/exchange-rate/exchange-rate-component.tsx:107-109,116`, `routes/system-admin/user/user-assigned-locations.tsx:101-104,114`, `routes/system-admin/default-setting/use-report-form-templates.ts`, `routes/system-admin/workflow/wf-edit-content.tsx:18-28`

**Interfaces:**
- Consumes (Task 1): `crud.useListAll` → `UseQueryResult<T[]>`; `fetchAllPages` จาก `@/lib/fetch-all-pages`
- Produces: `usePermissionAll`, `useCategoryAll`, `useSubCategoryAll`, `useItemGroupAll`, `useInventoryPeriodAll`, `useCurrencyAll`, `useLocationAll`, `useUserAll`, `useProductAll` — แต่ละตัว `= crud.useListAll`

- [ ] **Step 1: export hook `*All`** — ในแต่ละไฟล์ข้างล่าง เพิ่มบรรทัดใต้ `export const useX = crud.useList;` ของไฟล์นั้น:

| ไฟล์ | บรรทัดที่เพิ่ม |
|---|---|
| `routes/system-admin/role/use-permission.ts` | `export const usePermissionAll = crud.useListAll;` |
| `hooks/use-category.ts` | `export const useCategoryAll = crud.useListAll;` |
| `hooks/use-sub-category.ts` | `export const useSubCategoryAll = crud.useListAll;` |
| `hooks/use-item-group.ts` | `export const useItemGroupAll = crud.useListAll;` |
| `routes/system-admin/inventory-period/use-inventory-period.ts` | `export const useInventoryPeriodAll = crud.useListAll;` |
| `hooks/use-currency.ts` | `export const useCurrencyAll = crud.useListAll;` |
| `hooks/use-location.ts` | `export const useLocationAll = crud.useListAll;` |
| `hooks/use-user.ts` | `export const useUserAll = crud.useListAll;` |
| `hooks/use-product.ts` | `export const useProductAll = crud.useListAll;` |

(ถ้าไฟล์ไหนตั้งชื่อตัวแปร factory ไม่ใช่ `crud` ให้ใช้ชื่อจริงของไฟล์นั้น)

- [ ] **Step 2: permissions**

`permission-picker.tsx`:
```ts
  const { data: permData, isLoading } = usePermissionAll();
  const permissions = (permData ?? []) as PermissionRecord[];
```
แก้ import จาก `usePermission` เป็น `usePermissionAll` (ไฟล์ `./use-permission`) — ถ้า `usePermission` ยังถูกใช้ที่อื่นในไฟล์ให้คงไว้

`use-role-print.ts`: import `usePermissionAll` แทน `usePermission` · บรรทัด 31 → `const { data: permData } = usePermissionAll();` · บรรทัด 35 → `const permissions = (permData ?? []) as PermissionRecord[];`

`permission-catalog.ts:146` — แก้ comment `@param permissions - ผลลัพธ์ \`data\` จาก \`GET /permissions?perpage=-1\`` เป็น `@param permissions - ทุกแถวของ \`GET /permissions\` (ดึงครบผ่าน \`usePermissionAll\`)`

- [ ] **Step 3: category tree** — `category-component.tsx`

```ts
  const { data: catData, isLoading: catLoading } = useCategoryAll();
  const { data: subData, isLoading: subLoading } = useSubCategoryAll();
  const { data: igData, isLoading: igLoading } = useItemGroupAll();
```
และที่ส่งเข้า `useCategoryTree` (บรรทัด ~89-91): `categories: catData ?? []`, `subCategories: subData ?? []`, และตัวที่สามของ item groups เป็น `igData ?? []` · แก้ import ตามชื่อใหม่ · ค้นในไฟล์ว่ามี `catData?.data` / `subData?.data` / `igData?.data` ที่อื่นหรือไม่ แก้ให้หมด

- [ ] **Step 4: inventory period** — `inventory-period-component.tsx:158-159`

```ts
  const { data: allData } = useInventoryPeriodAll();
  const allPeriods = allData ?? [];
```
import `useInventoryPeriodAll` จาก `./use-inventory-period` (คง `useInventoryPeriod` เพราะ list แบ่งหน้าบรรทัด ~111 ยังใช้)

- [ ] **Step 5: exchange rate** — `exchange-rate-component.tsx`

```ts
  const { data: currencyData, isLoading: isLoadingCurrencies } =
    useCurrencyAll();
```
บรรทัด ~116 `const currencies = currencyData?.data;` → `const currencies = currencyData;` · แก้ import (คง `useCurrency` ถ้ายังถูกใช้ที่อื่นในไฟล์)

- [ ] **Step 6: user-assigned-locations** — `user-assigned-locations.tsx:101-104,114`

```ts
  const { data: allLocationsData, isLoading } = useLocationAll(undefined, {
    enabled: !isDisabled,
  });
```
บรรทัด ~114 `(allLocationsData?.data ?? [])` → `(allLocationsData ?? [])` · deps ของ `useMemo` คงเดิม

- [ ] **Step 7: report form templates** — `use-report-form-templates.ts`

import `fetchAllPages` จาก `@/lib/fetch-all-pages` · แทนช่วงตั้งแต่ `const res = await httpClient.get(` ถึง `: [];` ด้วย:

```ts
      const rows = await fetchAllPages<ReportFormTemplate>(
        async (page, perpage) => {
          const res = await httpClient.get(
            `${API_ENDPOINTS.REPORT_TEMPLATE_FORMS}?page=${page}&perpage=${perpage}`,
            { silentForbidden: true },
          );
          if (!res.ok) {
            throw await ApiError.from(
              res,
              "Failed to fetch report form templates",
            );
          }
          // envelope = { paginate, data: [...], status, success } — backend PR #248
          // (a2031c4f0) แก้ double-nest แล้วและยิงยืนยันกับ dev stack จริง
          const json = await res.json();
          return {
            data: Array.isArray(json.data) ? json.data : [],
            paginate: json.paginate,
          };
        },
      );
```
คง comment `silentForbidden` เดิมไว้เหนือบล็อกนี้ · แก้ JSDoc ของ hook: `ยิงโดยไม่ส่ง \`group\` แล้ววนหน้าจนครบ (fetchAllPages) แทนการยิงทีละ document type — หน้า Default Setting ต้องใช้ครบทุกกลุ่มพร้อมกันอยู่แล้ว`

- [ ] **Step 8: workflow edit** — `wf-edit-content.tsx:18-28`

```ts
  // ต้องได้ user/product ครบ — picker ของ workflow ยังเลือกจากทะเบียนทั้งก้อน
  // (ต้นไม้สินค้า / assign all) ช่วง 4b จะเปลี่ยนเป็นแบบโหลดทีละหน้า
  const { data: userData, isLoading: userLoading } = useUserAll();
  const { data: productData, isLoading: productLoading } = useProductAll();
```
`const users = userData ?? [];` · `const products = (productData ?? []).map((p) => ({` (ส่วน map คงเดิม) · แก้ import เป็น `useUserAll` จาก `@/hooks/use-user` และ `useProductAll` จาก `@/hooks/use-product` (ลบ `useUser`/`useProduct` ถ้าไม่ได้ใช้แล้ว)

- [ ] **Step 9: เกณฑ์ grep** — ต้องได้ว่าง:

```bash
grep -rnE "perpage:\s*-1|perpage=-1" components hooks routes lib --include='*.ts' --include='*.tsx' | grep -v "\.test\."
```
(ยกเว้นบรรทัดใน `routes/inventory-management/spot-check/sc-component.tsx` ซึ่งเป็นของ Task 3 — ถ้ามีแค่จุดนั้นถือว่าผ่าน)

- [ ] **Step 10: gate** — `bun run typecheck && bun run lint && bun test:run` ผ่าน

- [ ] **Step 11: commit**

```bash
git add routes/system-admin/role routes/product-management/category/category-component.tsx routes/system-admin/inventory-period routes/config/exchange-rate/exchange-rate-component.tsx routes/system-admin/user/user-assigned-locations.tsx routes/system-admin/default-setting/use-report-form-templates.ts routes/system-admin/workflow/wf-edit-content.tsx hooks/use-category.ts hooks/use-sub-category.ts hooks/use-item-group.ts hooks/use-currency.ts hooks/use-location.ts hooks/use-user.ts hooks/use-product.ts
git commit -m "refactor(lookup): ทะเบียนที่ต้องได้ครบ (permission, หมวดหมู่, งวดบัญชี, สกุลเงิน, คลังของผู้ใช้, report form, workflow) ดึงผ่าน useListAll แทน perpage=-1"
```

---

### Task 3: ประวัติ spot-check แบ่งหน้าที่ server

**Files:**
- Modify: `routes/inventory-management/spot-check/sc-component.tsx`
- Modify: `messages/en.json`, `messages/th.json` (namespace `inventoryManagement.spotCheck` — `en.json:2879`, `th.json:2875`)

**Interfaces:**
- Consumes (Task 1): `useLookupPagination` คืน `{ items, total, isLoading, isLoadingMore, hasMore, loadMore, error, refetch }`
- Consumes (มีอยู่แล้ว): `EntityMultiFilter` (`@/components/filter/entity-multi-filter`) props `value, onChange, fieldKey, label, useListHook, getId, getLabel, serverFilter?, bareIds?, className?` · `ACTIVE_ONLY_FILTER` จาก `@/hooks/use-lookup-pagination` · `useLocation` จาก `@/hooks/use-location` · `useDebouncedValue(value, delay)` จาก `@/hooks/use-debounced-value` · `Location` จาก `@/types/location`

- [ ] **Step 1: status ที่เลือกได้เหลือแค่ค่าใน enum backend**

```ts
// ค่าที่ server รับจริง (enum_spot_check_status) — ค่าอื่นได้ 400 ทั้ง request
const HISTORY_STATUS_KEYS: SpotCheckStatus[] = [
  "pending",
  "in_progress",
  "completed",
  "void",
];
```
(ไม่แตะ type `SpotCheckStatus`)

- [ ] **Step 2: แทน `useSpotCheck({ perpage: -1 }, ...)` ด้วย `useLookupPagination`**

import `useLookupPagination, ACTIVE_ONLY_FILTER` จาก `@/hooks/use-lookup-pagination` และ `useDebouncedValue` จาก `@/hooks/use-debounced-value`

แทนบล็อก `const { data: historyData, ... } = useSpotCheck({ perpage: -1 }, { enabled: view === "history" });` ด้วย:

```ts
  const debouncedSearch = useDebouncedValue(search, 300);
  // ตัวกรองทั้งหมดทำที่ server — หลาย clause คั่นด้วย `,` (AND) ค่าในแต่ละ clause เป็น IN
  const historyFilter =
    [
      historyStatus && `doc_status|string:${historyStatus}`,
      historyMethod && `method|string:${historyMethod}`,
      historyLocation && `location_id|string:${historyLocation}`,
    ]
      .filter(Boolean)
      .join(",") || undefined;
  const {
    items: historyItems,
    total: historyTotal,
    isLoading: isLoadingHistory,
    isLoadingMore: isLoadingMoreHistory,
    hasMore: hasMoreHistory,
    loadMore: loadMoreHistory,
    error: historyError,
    refetch: refetchHistory,
  } = useLookupPagination<SpotCheck>({
    useListHook: useSpotCheck,
    // server ค้น spot_check_no + ชื่อ location (ไม่ค้นรหัส location — ใช้ตัวกรอง location แทน)
    search: view === "history" ? debouncedSearch : "",
    serverFilter: historyFilter,
    sort: "created_at:desc",
    enabled: view === "history",
  });
```

ลบ `const historyItems: SpotCheck[] = historyData?.data ?? [];` · ลบ `locationOptions` ทั้งบล็อก · ลบ `filteredHistory` ทั้งบล็อก ·
`historySections[0].items` → `historyItems`

ถ้า typecheck ฟ้องว่า `useSpotCheck` ไม่ตรง `LookupListHook<SpotCheck>` ให้ห่อ: `useListHook: (params, options) => useSpotCheck(params, options)` — ห้ามแก้ `use-sc.ts`

`error`/`refetch` ของ view ประวัติ (บรรทัด `const error = isLocationsView ? locationsError : historyError;` และ `refetch`) ใช้ของใหม่ได้ตรง ๆ — `onRetry={() => refetch()}` เดิมยังใช้ได้

- [ ] **Step 3: ตัวเลข `StatusHero`** — `total={isLocationsView ? counts.all : historyTotal}`

- [ ] **Step 4: ตัวกรอง location เป็น `EntityMultiFilter`**

ใน `HistoryFilters`: ลบ prop `locationOptions` (type + destructure + ที่ส่งจาก `ScComponent`) และแทน `MultiSelectFilter` ตัวแรกด้วย:

```tsx
      <EntityMultiFilter<Location>
        value={locationValue}
        onChange={onLocationChange}
        fieldKey="location_id"
        label={labels.location}
        useListHook={useLocation}
        getId={(l) => l.id}
        getLabel={(l) => `${l.code} · ${l.name}`}
        serverFilter={ACTIVE_ONLY_FILTER}
        bareIds
      />
```
import `EntityMultiFilter` จาก `@/components/filter/entity-multi-filter`, `useLocation` จาก `@/hooks/use-location`, `type Location` จาก `@/types/location` · ถ้า `EntityMultiFilter` ไม่รับ generic แบบ JSX ให้ตัด `<Location>` ออกแล้วใส่ type ที่ `getLabel={(l: Location) => ...}` · ถ้า `bareIds` ทำให้ `onChange` ส่งค่ารูปอื่นที่ไม่ใช่ id คั่น `,` ให้หยุดแล้วรายงาน (ค่าต้องเป็น id เปล่าคั่น `,` เหมือนเดิม เพราะประกอบ clause เองใน Step 2)

- [ ] **Step 5: ปุ่มโหลดเพิ่มใต้ประวัติ**

ใต้ `<InvStatusSectionsList<SpotCheck> .../>` ของ view ประวัติ (ในบล็อก `{!isLocationsView && (...)}` — ห่อด้วย fragment):

```tsx
      {!isLocationsView && (
        <>
          <InvStatusSectionsList<SpotCheck>
            {/* props เดิมทั้งหมด */}
          />
          {hasMoreHistory && (
            <div className="mt-4 flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadMoreHistory}
                disabled={isLoadingMoreHistory}
              >
                {isLoadingMoreHistory ? t("loadingMoreHistory") : t("loadMoreHistory")}
              </Button>
            </div>
          )}
        </>
      )}
```

- [ ] **Step 6: i18n** — ใน namespace `inventoryManagement.spotCheck` ต่อจาก `"noHistory"`:
  - `messages/en.json`: `"loadMoreHistory": "Load more",` และ `"loadingMoreHistory": "Loading…",`
  - `messages/th.json`: `"loadMoreHistory": "โหลดเพิ่ม",` และ `"loadingMoreHistory": "กำลังโหลด…",`
  (ห้ามใส่ `{` `}` ในข้อความ — ICU)

- [ ] **Step 7: เกณฑ์ grep ทั้ง repo** — ต้องว่างทั้งหมด:

```bash
grep -rnE "perpage:\s*-1|perpage=-1" components hooks routes lib --include='*.ts' --include='*.tsx' | grep -v "\.test\."
```

- [ ] **Step 8: gate** — `bun run typecheck && bun run lint && bun test:run` ผ่าน · `routes/inventory-management/spot-check/sc-form.characterization.test.tsx` mock `./use-sc` อยู่ — ถ้าพังเพราะ sc-component ต้องมีอะไรเพิ่มใน mock ให้เพิ่มเท่าที่จำเป็น ห้ามลบ assertion

- [ ] **Step 9: commit**

```bash
git add routes/inventory-management/spot-check/sc-component.tsx messages/en.json messages/th.json
git commit -m "refactor(spot-check): ประวัติกรอง/ค้น/เรียงที่ server และโหลดทีละหน้า เลิกดึงทั้งก้อน · ตัวกรอง status เหลือแค่ค่าที่ backend รับ"
```

---

## หลังทุก task (controller)

ตรวจในเบราว์เซอร์ตาม spec §5 (user ทำเอง — อ่านอย่างเดียว :4000) · PR ภาษาอังกฤษพร้อม checklist §5
