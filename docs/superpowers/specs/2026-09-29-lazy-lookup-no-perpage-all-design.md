# Lazy lookup — เลิกใช้ `perpage=-1` ใน lookup และ filter (ช่วง 1–2)

วันที่: 2026-09-29 · สถานะ: รออนุมัติ

## 1. ที่มาและเป้าหมาย

ตอนนี้ FE ดึงข้อมูลแบบ `perpage=-1` (ขอทุกแถว) อยู่ 81 จุด เป้าหมายของ user มี 3 ข้อ:

- **A. ความเร็ว** — ทะเบียนใหญ่ (vendor T02 = 858 แถว ≈ 435 KB) ถูกลากมาทั้งก้อนเพื่อทำ dropdown
- **B. เตรียมปิด `-1` ที่ backend** — ยังไม่มีกำหนดเวลา ต้องทำ FE ให้เลิกพึ่งให้ครบก่อนแล้วค่อยปิด
- **C. dropdown ทำงานแบบเดียวกันทั้งแอป** — ค้นหาที่ server และเลื่อนเพื่อโหลดเพิ่ม

### การแบ่งช่วง

| ช่วง | ขอบเขต | spec |
|---|---|---|
| 1 | โครงร่วม: `useLookupPagination` ดึงรายการที่เลือกไว้ตาม id ได้ + `useEntitiesByIds` | **เอกสารนี้** |
| 2 | ย้าย `components/lookup/*` และ `components/filter/*` + chip ใน `use-list-filters.ts` | **เอกสารนี้** |
| 3 | ย้ายจุด `-1` ใน `routes/` (~45 จุด: filter options หน้า list, ตาราง id→ชื่อ) + `useAllUsers`/`useAllProducts` | spec แยก |
| 4 | จุดที่ต้องได้ครบจริง (permission catalog, category tree, report templates) + ปิด `-1` ที่ backend | spec แยก |

### ข้อจำกัดที่ห้ามถอย

commit `56bc6d7e` และ `c2291c6a` เปลี่ยน lookup หลายตัว**ไปเป็น** `-1` โดยตั้งใจ เพราะค่าที่บันทึกไว้แต่
อยู่หลัง 30 แถวแรกหรือถูกปิดใช้งานแล้ว ขึ้นเป็นช่องว่าง การกลับมาใช้ lazy load **ต้องไม่ทำให้บั๊กนี้กลับมา**
ค่าที่เลือกไว้ต้องแสดงชื่อได้เสมอ แม้ไม่อยู่ในหน้าที่โหลดมาหรือถูกปิดใช้งานไปแล้ว

## 2. ข้อเท็จจริงจาก backend (ตรวจแล้ว 2026-09-29 บน T02 ผ่าน gateway :4000)

- `paginate.query.ts` แปลงค่า filter ที่คั่นด้วยจุลภาคเป็น `IN`: `filter=id|string:a,b` → `{ id: { in: [a, b] } }`
- ยิงจริงแล้วได้แถวตรงตาม id: `config/T02/vendors`, `config/T02/departments`, `config/T02/currencies`
- `T02/users` ไม่มีฟิลด์ `id` — ใช้ `filter=user_id|string:…` (ยืนยันแล้วว่าได้ 1 แถว)
- list hook จาก `createConfigCrud` รับ `ParamsDto.filter` อยู่แล้ว — ไม่ต้องเขียน fetcher ใหม่

**ยังไม่ได้ตรวจ (ต้องทำเป็นขั้นแรกของ plan):** `is_active|boolean:true` บน endpoint ทั้ง 13 ตัวในช่วง 2,
`product_category_id|string:…` บน sub-category, `type|string:…` บน notification template,
`id|string:…` บน endpoint ที่เหลือ และวิธีส่งหลาย clause พร้อมกัน ถ้ามีตัวไหนไม่รับ
ให้ใช้ `filter` ฝั่ง client เฉพาะตัวนั้นแล้วบันทึกลง §7

## 3. แนวทางที่เลือก

ขยาย `hooks/use-lookup-pagination.ts` ที่มีอยู่ (lookup 15 ตัวใช้อยู่แล้ว) โดยเพิ่มความสามารถใหม่แบบ opt-in
ทั้งหมด ถ้าไม่ส่ง option ใหม่ hook ต้องทำงานเหมือนเดิมทุกอย่าง

แนวทางที่ไม่เลือก:
- **hook ใหม่บน `useInfiniteQuery`** — ต้องเพิ่ม `useInfiniteList` ใน `createConfigCrud` และจะมี hook สองตัวที่ทำงานเดียวกัน
  ภายหลังเปลี่ยนภายใน `useLookupPagination` ไปใช้ได้โดยไม่ต้องแตะผู้เรียก
- **ให้แต่ละ component ใช้ `defaultLabel` เอง** — เป็นสภาพปัจจุบันและเป็นต้นเหตุของบั๊กใน `56bc6d7e`

## 4. ส่วนที่ 1 — โครงร่วม

### 4.1 `useEntitiesByIds` (ใหม่, `hooks/use-entities-by-ids.ts`)

```ts
useEntitiesByIds<T>({
  useListHook,              // list hook เดียวกับ useLookupPagination
  ids: string[],
  idFilterKey?: string,     // default "id"
  enabled?: boolean,        // default true — ปิดเองเมื่อ ids ว่าง
}): { items: T[]; isLoading: boolean }
```

- เรียก `useListHook({ filter: "<idFilterKey>|string:<ids.join(',')>", perpage: ids.length })`
- **เรียง `ids` ก่อนสร้าง filter** เพื่อให้ query key คงที่เมื่อลำดับการเลือกเปลี่ยน react-query จะได้ใช้ cache ร่วมกัน
- `ids` ว่าง → ไม่ยิง
- อยู่ใน `hooks/` เพราะ `use-list-filters.ts` (อยู่ใน `hooks/`) และ `useLookupPagination` ใช้ร่วมกัน

### 4.2 `useLookupPagination` — option ใหม่

```ts
useLookupPagination<T>({
  useListHook,                         // signature ขยายให้รับ filter ด้วย
  search, perpage, filter, resetDeps, enabled,   // เดิม
  selectedIds?: string[],              // ใหม่
  getId?: (item: T) => string,         // ใหม่ — default (x) => (x as { id: string }).id
  idFilterKey?: string,                // ใหม่ — default "id"
  serverFilter?: string,               // ใหม่ — ส่งต่อเป็น filter= ของ API
})
// คืนค่า: { items, selectedItems, isLoading, isLoadingMore, hasMore, loadMore }
```

พฤติกรรม:

1. **ดึงรายการที่เลือกไว้** — `selectedIds` ทั้งหมดส่งให้ `useEntitiesByIds` ดึงเสมอ (ไม่สนใจ `enabled`)
   ไม่ตัด id ที่อยู่ในหน้าที่โหลดแล้วออก เพื่อให้ query key ตรงกับ chip ใน `use-list-filters.ts`
2. **`items`** = รายการในหน้าที่โหลดแล้วที่ผ่าน `filter` (ค่าที่เลือกอยู่ผ่านเสมอ) — **ไม่เอาค่าที่เลือก
   ไปต่อบนสุด** เพราะจะโผล่ในผลค้นหาที่ไม่ตรงคำค้น label ของค่าที่ไม่อยู่ใน `items` หาจาก prop ใหม่
   `LookupCombobox.selectedItems` แทน ส่วน filter แบบเลือกหลายค่าแสดง `selectedItems` บนสุดเอง
3. **`selectedItems`** — รายการที่ตรงกับ `selectedIds` (จากหน้าที่โหลดมาหรือจากการดึงตาม id) เรียงตาม `selectedIds`
4. **`serverFilter`** — ส่งเป็น `filter` ของหน้า list และนับเป็น reset dep อัตโนมัติ
5. **ผลคำค้นเก่ามาทีหลัง** — effect ที่ต่อรายการรับข้อมูลเฉพาะเมื่อ `data.paginate.page === page`
6. `perpage` ค่าเริ่มต้นยังเป็น 30

## 5. ส่วนที่ 2 — component ที่ต้องย้าย

หลักร่วม: ใช้ `serverFilter: "is_active|boolean:true"` แทนการกรอง `is_active` ฝั่ง client และส่ง `selectedIds`
ทุกตัว (lookup เดี่ยว = `value ? [value] : []`) คง props สาธารณะของทุก component ไว้เหมือนเดิม
**call site ใน `routes/` ต้องไม่ต้องแก้** ถ้ามี `defaultLabel` อยู่ ให้คงไว้เป็นค่าแสดงชั่วคราวระหว่างรอผลดึงตาม id

### กลุ่ม A — `<Select>` → `LookupCombobox` (6 ตัว)

`lookup-currency` · `lookup-credit-term` · `lookup-tax-profile` · `lookup-cn-reason` · `lookup-extra-cost` · `lookup-shelf`

- เปลี่ยน UI เป็น `LookupCombobox` ข้อความในช่องแสดงเหมือนเดิม (เช่น currency = `code`)
- คง `readOnly`, `error`, `fullWidth`, `disableTooltip`, `excludeIds`, `onItemChange`
- tooltip รายละเอียดของ currency (code/symbol/name) ต้องยังอยู่

### กลุ่ม B — combobox ที่ดึง `-1` → `useLookupPagination` (7 ตัว)

| component | สิ่งที่เปลี่ยน |
|---|---|
| `lookup-category` | ใช้ `useLookupPagination` |
| `lookup-sub-category` | ย้าย `filterCategoryId` → `serverFilter` (`product_category_id\|string:<id>`) รวมกับ `is_active` |
| `lookup-item-group` | ใช้ `useLookupPagination` (ถ้ากรองตาม sub-category ให้ย้ายไป `serverFilter` เหมือนกัน) |
| `lookup-department` | ใช้ `useLookupPagination` |
| `lookup-physical-count-period` | ใช้ `useLookupPagination` |
| `lookup-noti-tmpl` | เลิกส่ง `perpage: -1` ย้าย `channelType` → `serverFilter` (`type\|string:<channel>`) |
| `lookup-user` | เลิกใช้ `useAllUsers` → `useUser` + `idFilterKey: "user_id"` + `getId: (u) => u.user_id` |

การรวมหลายเงื่อนไขใน `serverFilter`: backend อ่าน `filter` เป็น array ของ clause (`this.filter.map(...)`)
ต้องตรวจว่า `ParamsDto.filter` ส่งหลาย clause ได้อย่างไร (query param ซ้ำ หรือรูปแบบอื่น) เป็นส่วนหนึ่งของขั้นตรวจใน §2
ถ้าส่งหลาย clause ไม่ได้ ให้ `serverFilter` เป็นเงื่อนไขหลักที่แคบที่สุด (หมวด/channel) แล้วกรอง `is_active` ฝั่ง client

### กลุ่ม C — filter แบบเลือกหลายค่า (3 ตัว)

`filter-vendor` · `filter-department` · `filter-requester`

- เลิก `perpage: -1` และเลิกค้นหาฝั่ง client → `useLookupPagination` + ส่ง `search` แบบ debounce ให้ server
  + `selectedIds` ที่ parse จาก clause (`vendor_id|string:a,b`)
- รายการใน popover ใช้ `VirtualCommandList` (โหลดหน้าถัดไปอัตโนมัติเมื่อเลื่อนใกล้ท้าย) checkbox ยังอยู่
- รายการที่เลือกไว้แสดงบนสุดเสมอ (จาก `selectedItems`) เพื่อให้ยกเลิกได้แม้ไม่อยู่ในผลค้นหาปัจจุบัน
- ปุ่ม "ชื่อแรก +N" ใช้ `selectedItems` → แสดงชื่อได้ทันทีเมื่อเปิดจาก deep link หรือ saved view
- `enabled` ของหน้า list ยังเป็น `open || inline` การดึงตาม id ยิงเสมอเมื่อมีค่าที่เลือกไว้

### chip ใน `hooks/use-list-filters.ts`

- เลิก `useDepartment/useUser/useVendor({ perpage: -1 })` → `useEntitiesByIds` ด้วย id ใน clause
  (requester ใช้ `idFilterKey: "user_id"`)
- query key ตรงกับของ popover (ผ่าน `useEntitiesByIds` ตัวเดียวกัน + เรียง id) → react-query ไม่ยิงซ้ำ
- ระหว่างรอผล chip แสดงเป็นจำนวนเหมือนเดิม
- ข้อจำกัดที่ยอมรับ: เลือก 100 รายการ → URL ยาว ≈ 3.7 KB ยังต่ำกว่าเพดานทั่วไป (8 KB) ไม่ทำอะไรเพิ่ม

### ไม่แตะในรอบนี้

- `useAllUsers` / `useAllProducts` — ยังมีผู้เรียกใน `routes/` 6 จุด (location-form, department-form,
  activity-log, user-activity, schedule-recipients, plt-item-fields) → ช่วง 3
- lookup 15 ตัวที่ใช้ `useLookupPagination` อยู่แล้ว — ไม่บังคับย้ายมาใช้ `selectedIds`
- จุด `-1` ทั้งหมดใน `routes/`

## 6. การตรวจสอบ

ตาม preference ของ user: **ไม่เขียนเทสต์ใหม่**

1. **ก่อนลงมือ** — ยิง curl (GET อย่างเดียว) ตรวจ filter ทุกตัวใน §2 ที่ยังไม่ได้ตรวจ และวิธีส่งหลาย clause
2. **static** — `bun run typecheck` + `bun run lint`
3. **เทสต์เดิม** — `bun test:run` ต้องผ่าน `lookup-sub-category.test.tsx` น่าจะต้องแก้ให้ตรงกับการกรองที่ server
   (แก้เทสต์เดิม ไม่ได้เพิ่มเทสต์ใหม่)
4. **เบราว์เซอร์** (ตรวจ network ทีละข้อ):
   1. หน้า PO ที่มี currency → ไม่มี `perpage=-1` และช่องแสดง `THB` ทันที
   2. เอกสารที่บันทึก department / credit term ที่ถูกปิดใช้งานแล้ว → ช่องยังแสดงชื่อ
   3. lookup vendor/user ที่มีหลายหน้า → เลื่อนแล้วโหลดหน้าถัดไป พิมพ์ค้นแล้วได้ผลจาก server
   4. หน้า list เปิดจาก saved view ที่มี filter vendor → chip แสดงชื่อ network ดึงแค่ id ที่เลือก
   5. sub-category หลังเลือก category → หน้าแรกไม่ว่าง
   6. หลังจบงาน `grep -rn 'perpage.\{0,6\}-1' components/lookup components/filter hooks/use-list-filters.ts` ต้องว่าง

## 7. บันทึกระหว่างทำ

- `is_active|boolean:true` ใช้ไม่ได้กับ `credit-note-reasons`, `physical-count-periods` (400 Unknown argument)
  และ `users` (ได้ 0 แถว) → ไม่ส่ง
- ส่ง `filter` ซ้ำหลายตัวไม่ได้ — หลายเงื่อนไขต้องคั่น `,` ใน filter เดียว (ยืนยันแล้วว่าเป็น AND)
- `lookup-physical-count-period` ตัดออกจากงานนี้: พังอยู่ก่อนแล้ว — API คืน `tb_inventory_period.start_at/end_at`
  แต่ FE อ่าน `counting_period_from_date` ที่ไม่มีใน response → รายการว่างเสมอ ต้องแก้แยก
