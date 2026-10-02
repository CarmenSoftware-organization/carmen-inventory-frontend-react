# Lazy lookup ช่วง 3b — checklist เลือกหลายค่าในฟอร์มโหลดทีละหน้า

ต่อจากช่วง 1–2 (PR #197) และ 3a (PR #199) ของงานเลิก `perpage=-1`
spec แม่: `docs/superpowers/specs/2026-09-29-lazy-lookup-no-perpage-all-design.md`

## 1. ขอบเขต

### 1.1 ทำในรอบนี้

| # | จุด | ของเดิม | หลังย้าย |
|---|---|---|---|
| 1 | `hooks/use-lookup-pagination.ts` `loadMore` | `setPage(p => p + 1)` — ใต้ StrictMode effect auto-load ของ `VirtualCommandList` ยิงสองรอบในการ mount เดียว → ข้ามหน้า 2 | `setPage(p => (p === page ? p + 1 : p))` เรียกซ้ำด้วย closure เดิมไม่ขยับเกินหนึ่งหน้า |
| 2 | `components/lookup/paged-checklist.tsx` (ใหม่) | — | component กลาง §2 |
| 3 | `routes/report/schedules/schedule-recipients-field.tsx` | `useAllUsers()` ทั้งก้อน + `ScrollArea` checklist + badge ชื่อจาก map ทั้งทะเบียน | `PagedChecklist` ใช้ `useUsers`, `getId: u => u.user_id`, `idFilterKey: "user_id"`, `serverFilter: null` (users ห้ามส่ง `is_active`) |
| 4 | `routes/system-admin/workflow/wf-routing.tsx` + `wf-routing-department-list.tsx` | `useDepartment({ perpage: -1 })` + `DepartmentCheckboxList` | `PagedChecklist` ใช้ `useDepartment`, **ค่าคือชื่อ**: `getId: d => d.name`, `idFilterKey: "name"`, serverFilter active · ลบ `DepartmentCheckboxList` |
| 5 | `routes/system-admin/user/user-assigned-form.tsx` + `user-assigned-roles.tsx` | `useRole({ perpage: -1 })` → `RolesSection` วนการ์ดทุก role | `RolesSection` render `PagedChecklist` ด้วย `renderItem` = `RoleToggleCard` เดิม · เลิก prop `roles`/`isLoading` · หัว section ยังนับ `watchedRoleIds.length` เหมือนเดิม |

### 1.2 เลื่อนไปช่วง 4 (ตัดสินกับ user 2026-09-29)

ต้องใช้ทะเบียนทั้งก้อนจริง (จัดกลุ่ม / ติ๊กทั้งกลุ่ม / เลือกทั้งหมด / นับตามประเภท) — ต้องออกแบบ UX ใหม่หรือเพิ่ม endpoint backend:

- `components/ui/transfer.tsx` ที่ `location-form` (users) และ `department-form` (dept users + HOD)
- `user-assigned-locations` (ตารางติ๊ก + นับตามประเภท location)
- `components/share/tree-product-lookup.tsx` ที่ `location-form` และ `plt-item-fields`
- `wf-edit-content` → `wf-products` (ต้นไม้ + select all), `wf-stage-users` (assign all), `wf-routing-category-list` (หมวดจาก `allProducts`)

**id→ชื่อในไฟล์กลุ่มนี้ไม่แตะรอบนี้** (อีเมลในตารางอ่านอย่างเดียวของ location/department form, ชื่อสินค้าบนการ์ด plt, ตาราง wf-products) — ไฟล์ยังดึงทั้งก้อนเพื่อป้อน Transfer/ต้นไม้อยู่ ย้าย id→ชื่อตอนนี้มีแต่ request เพิ่ม ย้ายพร้อมกันในช่วง 4 · `useAllUsers` / `useAllProducts` จึงยังอยู่จนช่วง 4

หมายเหตุ: "Transfer" ในขอบเขต 3b เดิมหมายถึง widget `components/ui/transfer.tsx` ไม่ใช่ฟีเจอร์โอนสินค้า — product picker ของเอกสาร (PR/PO/SR/IA/GRN/CN/PRT) paged อยู่แล้วทั้งหมด

### 1.3 เกณฑ์เสร็จ

- `grep -rnE "perpage:\s*-1|useAllUsers" routes/report/schedules routes/system-admin/workflow/wf-routing*.tsx routes/system-admin/user/user-assigned-form.tsx` = 0
- typecheck + lint (0 error) + `bun test:run` ทั้งชุดผ่าน · ไม่เขียนเทสต์ใหม่ (preference ของ user)
- ตรวจในเบราว์เซอร์ §4

## 2. `PagedChecklist<T>`

```ts
interface PagedChecklistProps<T> {
  readonly useListHook: LookupListHook<T>;       // เหมือน useLookupPagination
  readonly getId: (item: T) => string;
  readonly getLabel: (item: T) => string;
  readonly idFilterKey?: string;                  // default "id"
  readonly serverFilter?: string | null;          // undefined = ACTIVE_ONLY_FILTER, null = ไม่กรอง
  readonly value: string[];
  readonly onChange: (value: string[]) => void;
  readonly disabled?: boolean;
  readonly renderItem?: (item: T, checked: boolean, toggle: () => void) => ReactNode;
  readonly showSelectedBadges?: boolean;          // default true
  readonly maxHeight?: number;                    // px ของรายการ (default 160 = h-40 เดิม)
  readonly searchPlaceholder?: string;
  readonly emptyMessage?: ReactNode;
}
```

โครง (บนลงล่าง): แถว badge ของ `value` (ชื่อจาก `selectedItems`, ยังไม่ resolve = แสดงค่าดิบ, กด × เอาออก) → ช่องค้น (ส่ง `search` ไป server) → `VirtualCommandList` ของ checkbox (default render: `Checkbox` + label แบบ schedule-recipients เดิม) โหลดหน้าต่อเมื่อเลื่อน หรือเองเมื่อรายการสั้น (PR #199)

- ใช้ `useLookupPagination({ useListHook, search, serverFilter, getId, idFilterKey, selectedIds: value })` — **ไม่ lazy** (ไม่ส่ง `enabled`) เพราะ checklist แสดงในฟอร์มตลอด ไม่มี popover ให้รอเปิด
- ค่าที่เลือกแต่ไม่อยู่ในหน้าที่โหลด/ถูกปิดใช้งาน: badge ขึ้นชื่อผ่าน `selectedIds` (ไม่ขึ้นกับ `serverFilter`)
- ใช้ `Command shouldFilter={false}` + `CommandInput` แบบ `EntityMultiFilter` เพื่อให้ `VirtualCommandList` ใช้ได้ตามเดิม
- `disabled` = ปิดทั้ง checkbox และปุ่ม × แต่ยังค้น/เลื่อนดูได้
- วางใน `components/lookup/` (ผูกกับ data hook) ไม่ใช่ `components/ui/`

## 3. รายละเอียดต่อจุด

- **schedule-recipients:** label = `getUserFullName` (export จาก `components/lookup/lookup-user`) · ข้อความว่างเดิม `t("noUsersFound")` · `aria-label` ของปุ่ม × ใช้ `tl("remove", { name })` เดิม
- **wf-routing แผนก:** probe T02 (2026-09-29): `departments` รับ `name|string:A,B` (IN ได้ 2), มี 59 แผนก, ไม่มีชื่อที่มี `,` · แผนกที่เปลี่ยนชื่อหลังบันทึก rule → badge แสดงชื่อเดิมดิบและเอาออกได้ (ของเดิมหายไปเฉย ๆ) · ความสูงเดิม `max-h-32` (128px) · label เดิม `t("departments")` / ว่าง `t("noDepartments")`
- **roles:** probe T02: `application-roles` 6 แถว รับ `id|string:` และ `is_active` · `renderItem` คืน `RoleToggleCard` เดิม · `showSelectedBadges={false}` (การ์ดแสดงสถานะติ๊กเอง) · กรอบ `divide-y rounded-lg border` เดิมห่อรายการ · `EmptyState` เดิมเมื่อไม่มี role เลย

## 4. ตรวจในเบราว์เซอร์ (อ่านอย่างเดียว :4000)

1. schedule report: เปิด schedule ที่มีผู้รับแล้ว → badge ขึ้นชื่อทันที · ค้นชื่อ → ได้คนหลังหน้าแรก
2. workflow edit → routing → เงื่อนไขแผนก: เลือกแผนกที่ 31+ ได้ (เลื่อนโหลดต่อ) · rule เดิมติ๊กครบ
3. user → assigned: role ที่ assign ไว้ติ๊กครบ, การ์ดมีคำอธิบายเหมือนเดิม
4. Network: ไม่มี `perpage=-1` จากสามหน้านี้
5. `bun dev`: checklist สั้น ๆ ไม่ข้ามหน้า 2 (ข้อ 1.1 #1)

## 5. ความเสี่ยง

- ค้นชื่อเต็ม "ชื่อ นามสกุล" ของ user ไม่เจอ — backend ค้นทีละฟิลด์ (ข้อจำกัดเดิม)
- แผนกผูกด้วยชื่อ — เปลี่ยนชื่อแผนกแล้ว rule เดิมไม่ match (พฤติกรรมเดิม ไม่แก้รอบนี้)
- checklist ไม่ lazy → เปิดฟอร์มยิงหน้าแรก 30 แถวทันที (ของเดิมยิงทั้งทะเบียน) ยอมรับได้
