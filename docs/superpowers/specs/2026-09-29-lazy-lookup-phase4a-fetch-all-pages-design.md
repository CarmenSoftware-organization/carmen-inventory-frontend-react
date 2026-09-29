# Lazy lookup ช่วง 4a — FE เลิกส่ง `perpage=-1` ทุกจุด

ต่อจากช่วง 1–2 (PR #197), 3a (#199), 3b (#200) ของงานเลิก `perpage=-1`
spec แม่: `docs/superpowers/specs/2026-09-29-lazy-lookup-no-perpage-all-design.md`

## 0. การแตกช่วง 4 (ตัดสินกับ user 2026-09-29)

เป้า backend: **ปฏิเสธ `-1` (400) + เพดาน `perpage` = 100** — probe T02 วันนี้ backend
ไม่มีเพดานเลย (`perpage=5000` คืนสินค้าครบ 2,595 แถว) การแค่ห้าม `-1` จึงไม่ต่างจากเดิม

| ช่วง | ขอบเขต |
|---|---|
| **4a (spec นี้)** | FE ไม่ส่ง `-1` อีกเลยสักจุด — ทะเบียนเล็กที่ต้องได้ครบใช้ `fetchAllPages` (วนหน้าละ 100) · ประวัติ spot-check แบ่งหน้าที่ server · `useAllUsers`/`useAllProducts` ใช้ `fetchAllPages` ชั่วคราว |
| 4b | UX ใหม่: Transfer (location/department form), ต้นไม้สินค้า (location/plt/wf-products), assign-all (wf-stage-users) + id→ชื่อในไฟล์เหล่านั้น → ลบ `useAll*` |
| 4c | backend: 400 เมื่อ `-1` + เพดาน 100 · ต้องตรวจ mobile / carmen-platform ก่อน |

4a ทำให้ 4c deploy ได้โดยไม่ต้องรอ 4b · ราคาที่ยอมจ่าย (user ตกลง): ต้นไม้สินค้า 3 จุดยิง
26 request คู่ขนาน (2,595 แถว) แทน 1 request จนกว่า 4b เสร็จ

ขนาดทะเบียน T02 (probe GET 2026-09-29): products 2,595 · permissions 307 · item-groups 74 ·
locations 47 · sub-categories 47 · report-forms 24 · spot-checks 22 · categories 13 ·
inventory-periods 12 · users 11 · exchange-rates/currencies ~10

## 1. ขอบเขต

### 1.1 โครงกลาง

| # | ไฟล์ | งาน |
|---|---|---|
| 1 | `lib/fetch-all-pages.ts` (ใหม่) | `MAX_PERPAGE = 100` + `fetchAllPages` §2.1 |
| 2 | `hooks/use-config-crud.ts` | เพิ่ม `useListAll` ใน `createConfigCrud` §2.2 |
| 3 | `hooks/use-lookup-pagination.ts` | คืน `total` เพิ่ม (`data?.paginate?.total ?? allItems.length`) — ใช้โดย spot-check |

### 1.2 ทะเบียนที่ต้องได้ครบ → `useListAll` (logic ใต้ต้นน้ำไม่แตะ)

| ไฟล์ | ของเดิม | ของใหม่ |
|---|---|---|
| `routes/system-admin/role/permission-picker.tsx:66` | `usePermission({perpage:-1})` | `usePermissionAll()` |
| `routes/system-admin/role/use-role-print.ts:31` | เหมือนบน | `usePermissionAll()` |
| `routes/system-admin/role/permission-catalog.ts:146` | comment อ้าง `perpage=-1` | แก้ comment ให้อ้าง `usePermissionAll` |
| `routes/product-management/category/category-component.tsx:52-58` | 3 × `perpage:-1` | `useCategoryAll` / `useSubCategoryAll` / `useItemGroupAll` |
| `routes/system-admin/inventory-period/inventory-period-component.tsx:158` | `useInventoryPeriod({perpage:-1})` (`allData`) | `useInventoryPeriodAll()` |
| `routes/config/exchange-rate/exchange-rate-component.tsx:109` | `useCurrency({perpage:-1})` | `useCurrencyAll()` |
| `routes/system-admin/user/user-assigned-locations.tsx:102` | `useLocation({perpage:-1},{enabled})` | `useLocationAll(undefined, { enabled: !isDisabled })` |
| `routes/system-admin/default-setting/use-report-form-templates.ts:28` | fetch เอง `?perpage=-1` | queryFn เดิมห่อด้วย `fetchAllPages` (endpoint ตอบ `paginate` ปกติ — probe: 24 แถว) |
| `routes/system-admin/workflow/wf-edit-content.tsx:20-22` | `useUser`/`useProduct` `perpage:-1` | `useUserAll()` / `useProductAll()` (ชั่วคราวจน 4b) |
| `hooks/use-all-users.ts`, `hooks/use-all-products.ts` | `buildUrl(..., {perpage:-1})` | queryFn ใช้ `fetchAllPages` · สัญญากับผู้เรียก (คืน `T[]`, queryKey, `enabled`) คงเดิม (ชั่วคราวจน 4b) |

hook `*All` แต่ละตัว export ข้างตัว `useList` เดิมในไฟล์ของมัน (`export const useXAll = crud.useListAll;`)
ทุกตัวสร้างด้วย `createConfigCrud` (ตรวจแล้ว: permission, category, sub-category, item-group,
inventory-period, currency, location, user, product)

call site เปลี่ยนจาก `data?.data ?? []` เป็น `data ?? []` — ห้ามเปลี่ยน logic อื่น

### 1.3 ประวัติ spot-check → แบ่งหน้าที่ server

`routes/inventory-management/spot-check/sc-component.tsx` — §3

### 1.4 ไม่อยู่ในรอบนี้

- Transfer / ต้นไม้สินค้า / assign-all / id→ชื่อใน location-form, department-form, plt-item-fields, wf-* → 4b
- backend → 4c

### 1.5 เกณฑ์เสร็จ

- `grep -rnE "perpage:\s*-1|perpage=-1" components hooks routes lib --include='*.ts' --include='*.tsx'` (ไม่นับ `*.test.*`) = 0
- typecheck + lint (0 error) + `bun test:run` ทั้งชุดผ่าน · ไม่เขียนเทสต์ใหม่ (preference ของ user) — test เดิมที่ mock hook เก่าแก้ mock ให้ตรง hook ใหม่ได้ แต่ห้ามลบ assertion
- ตรวจในเบราว์เซอร์ §5

## 2. โครงกลาง

### 2.1 `lib/fetch-all-pages.ts`

```ts
export const MAX_PERPAGE = 100;

export async function fetchAllPages<T>(
  fetchPage: (page: number, perpage: number) => Promise<PaginatedResponse<T>>,
): Promise<T[]>;
```

- ยิงหน้า 1 (`perpage = MAX_PERPAGE`) → อ่าน `paginate.pages` (ไม่มี `paginate` = หน้าเดียว)
- ยิงหน้า 2..pages ด้วย `Promise.all` → ต่อ `data` ตามลำดับหน้า
- หน้าไหน reject = ทั้งก้อน reject (ไม่คืนครึ่งเดียว) — ให้ React Query จัดการ error/retry ตามปกติ
- `data` ที่ไม่ใช่ array (null) นับเป็น `[]`

### 2.2 `createConfigCrud(...).useListAll`

```ts
useListAll: (
  params?: Omit<ParamsDto, "page" | "perpage">,
  options?: Omit<UseQueryOptions<T[]>, "queryKey" | "queryFn">,
) => UseQueryResult<T[]>;
```

- queryKey `[queryKey, buCode, "all", params]` — ไม่ชน cache ของ `useList` แต่ invalidate
  ด้วย prefix `[queryKey]` เดิมถูกล้างไปด้วย (mutation ของ crud ใช้ prefix อยู่แล้ว — ตรวจตอนเขียน plan)
- queryFn `fetchAllPages((page, perpage) => api.getList(buCode!, { ...params, page, perpage }))`
- cache profile + `enabled` เหมือน `useList`

## 3. ประวัติ spot-check

probe T02 (GET): `filter` รองรับ `doc_status|string:a,b` (IN), `method|string:…`,
`location_id|string:…` และ AND หลาย clause · `search` ค้น `spot_check_no` + ชื่อ location
**แต่ไม่ค้นรหัส location** · `sort=created_at:desc` ใช้ได้ (ลำดับ default ของ server ไม่เรียงตามวัน)

- `useLookupPagination({ useListHook: useSpotCheck, search, serverFilter, sort: "created_at:desc", perpage: 30, enabled: view === "history" })`
- `serverFilter` = clause ที่ไม่ว่างของ `doc_status|string:<historyStatus>`, `method|string:<historyMethod>`,
  `location_id|string:<historyLocation>` ต่อกันด้วย `,` · ไม่มีเลย = `undefined`
  (ห้ามส่ง `is_active` — spot-check ไม่ใช่ทะเบียน)
- `filteredHistory` / `locationOptions` ที่คำนวณฝั่ง client ลบทิ้ง · section ใช้ `items` จาก hook ตรง
- ปุ่ม "โหลดเพิ่ม" ใต้ section ประวัติเมื่อ `hasMore` (แสดง loading ตอน `isLoadingMore`) —
  ข้อความ i18n ใหม่ใน `messages/{en,th}.json` namespace ของ spot-check
- `StatusHero.total` ใน view ประวัติ = `total` จาก hook (จำนวนที่ตรงตัวกรองบน server)
- ตัวกรอง location: `MultiSelectFilter` ที่ป้อน option จากแถว → `EntityMultiFilter`
  (`fieldKey: "location_id"`, `useListHook: useLocation`, `getLabel: l => \`${l.code} · ${l.name}\``, `bareIds`)
  ค่าใน state ยังเป็น id เปล่าคั่น `,` เหมือนเดิม · ตัวกรอง status / method คง `MultiSelectFilter` (option คงที่)
- refetch / error ของ view ประวัติยังต้องทำงาน — `useLookupPagination` ไม่คืน `error`/`refetch`
  → ตัดสินตอนเขียน plan หลังอ่านโค้ด error state จริง (ทางเลือก: invalidate `QUERY_KEYS.SPOT_CHECKS`)

ข้อเสียที่ user ยอมรับ: พิมพ์รหัส location (เช่น "1EG01") ในช่องค้นประวัติไม่เจอแล้ว —
ใช้ตัวกรอง location แทน · ตัวเลือก location แสดงทุก location ที่ active ไม่ใช่เฉพาะที่มีประวัติ

## 4. ความเสี่ยง

- `fetchAllPages` ยิงหน้า 2+ พร้อมกัน — ทะเบียนใหญ่ (products 26 หน้า) กิน connection ของ
  browser ช่วงสั้น ๆ ยอมรับจนกว่า 4b
- หน้าไหนพังระหว่างวน = ทั้งทะเบียนไม่ขึ้น (ดีกว่าขึ้นครึ่งเดียวเงียบ ๆ)
- ถ้าเพิ่มแถวระหว่างวนหน้า อาจได้แถวซ้ำ/ตกหล่นหนึ่งแถวที่รอยต่อหน้า — ทะเบียน config เปลี่ยนช้า ยอมรับ
- mobile / carmen-platform อาจยังส่ง `-1` — ตรวจใน 4c ก่อนแตะ backend

## 5. ตรวจในเบราว์เซอร์ (อ่านอย่างเดียว :4000)

1. role → permission picker: ครบ 307 สิทธิ์ จัดกลุ่มเหมือนเดิม · พิมพ์ role ได้
2. category: ต้นไม้ครบสามระดับ (13 / 47 / 74) · stats ตรง
3. inventory period: timeline ครบ · ปุ่ม generate นับงวด open ถูก
4. exchange rate: สกุลเงินครบ · เทียบเรทได้ (ไม่กดบันทึก)
5. user → assigned locations: ครบ 47 · นับตามประเภทตรง
6. default setting: dropdown report form ทุกกลุ่มมีตัวเลือก
7. location form edit: ต้นไม้สินค้าครบ 2,595 · Transfer ผู้ใช้ครบ · workflow edit: product/user ครบ
8. spot-check → ประวัติ: กรอง status/method/location ถูก · ค้นเลขเอกสารได้ · โหลดเพิ่มได้ · ตัวเลขรวมตรงตัวกรอง
9. Network ทุกหน้าข้างบน: ไม่มี `perpage=-1` และไม่มี `perpage` เกิน 100
