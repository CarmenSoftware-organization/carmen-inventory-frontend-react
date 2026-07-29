# Price List — คอลัมน์ Created / Updated พร้อม Sort

**วันที่:** 2026-07-24
**หน้า:** `/vendor-management/price-list` (list view)
**ขอบเขต:** งาน frontend ล้วน — ไม่แตะ backend, ไม่แตะ i18n messages

## เป้าหมาย

เพิ่มคอลัมน์ **Created** และ **Updated** ในตาราง price list list โดยทั้งสองคอลัมน์
**sort ได้** (server-side) แสดงวันเวลาจริง (ตาม `date_time_format` ของ BU) + ชื่อผู้สร้าง/แก้ไข

> **อัปเดต (หลัง implement):** ดีไซน์เดิมแสดง relative time ("5 months ago") + tooltip
> วันเวลาเต็ม ต่อมา user ขอเปลี่ยนเป็น **วันเวลาจริง** — cell จึงแสดง
> `formatDate(at, dateTimeFormat)` ตรงๆ และ **ตัด tooltip ออก** (ข้อมูลซ้ำกับที่ cell แสดงแล้ว)
> เอกสารนี้สะท้อนสถานะจริงหลังเปลี่ยน

## ผลตรวจ backend (ยืนยันแล้ว, BU = T02, local gateway :4000)

- List endpoint `GET /api/config/{buCode}/pricelists` **ส่ง `audit` มาทุก row** —
  `audit.created` และ `audit.updated` แต่ละอันมี `{ at, id, name }` (เวลา ISO UTC, user id, ชื่อผู้ทำ)
- **Sort ทำงานจริง**: `sort=created_at:asc`, `created_at:desc`, `updated_at:desc` เรียงถูกต้องทุกทิศทาง
- ส่ง field ที่ไม่มีจริง (`zzz_nope`) → `success: false` — ยืนยันว่า backend validate ชื่อ field
  และชื่อ sort field ที่ถูกต้องคือ `created_at` / `updated_at`

**สรุป: ไม่ต้องแก้ backend เลย** เป็นการเพิ่ม UI column ล้วน

## Type ที่มีอยู่แล้ว (ไม่ต้องแก้)

`types/price-list.ts` มีครบ:

```ts
export interface PriceListAuditEntry { at: string; id: string; name: string; }
export interface PriceListAudit { created?: PriceListAuditEntry; updated?: PriceListAuditEntry; }
export interface PriceList { /* ... */ audit?: PriceListAudit; }
```

## การตัดสินใจด้าน UX (จาก user)

| หัวข้อ | เลือก |
|---|---|
| รูปแบบแสดงผล | **วันเวลาจริง** (ตาม `dateTimeFormat` ของ BU) + ชื่อผู้ทำบรรทัดล่าง — ไม่มี tooltip |
| การมองเห็นเริ่มต้น | **Default visible** (เปิดไว้เลย ปิดได้ผ่าน toggle columns) |
| Grid/Card view | **ใส่ Updated ในการ์ดด้วย** (วันเวลาจริง) |

## Design

### หลักการสำคัญ: `id` ต้องตรงกับ backend sort field

TanStack แปลง sorting state → query param โดยใช้ `column.id` (ดู `hooks/use-data-grid-state.ts:77`
`setSort(\`${next[0].id}:${next[0].desc ? "desc" : "asc"}\`)`). ถ้าไม่ตั้ง `id` มันจะ auto-gen
จาก accessorKey (`audit.created.at` → `audit_created_at`) ซึ่ง backend ไม่รู้จัก → sort พังเงียบๆ
จึงต้องตั้ง `id: "created_at"` / `"updated_at"` ให้ตรงกับ backend (pattern เดียวกับ commit `4f5c736`
ที่ตั้ง `id: "pricelist_no"`)

### ไฟล์ที่เปลี่ยน

**1. `routes/vendor-management/price-list/pl-audit-cell.tsx` (ไฟล์ใหม่, presentational เดี่ยว)**

Cell แสดงวันเวลาจริง + ชื่อ (2 บรรทัด, ไม่มี tooltip) ใช้ร่วมทั้งคอลัมน์ Created และ Updated
(แยกเป็น component เดียวเพื่อกัน copy โค้ด 2 รอบ):

```tsx
interface PlAuditCellProps {
  entry: PriceListAuditEntry | undefined;
  dateTimeFormat: string;
}
// entry?.at ว่าง → แสดง "—" (muted)
// มีค่า → บรรทัดบน = formatDate(entry.at, dateTimeFormat)
//         บรรทัดล่าง = entry.name (muted, truncate) ถ้ามี
```

ใช้ `formatDate` จาก `@/lib/date-utils` (รองรับ pattern เวลา เช่น `HH:mm:ss` ในตัว)

**2. `routes/vendor-management/price-list/use-pl-table.tsx`**

- เพิ่ม `dateTimeFormat` เข้า destructure จาก `useProfile()` (มีอยู่แล้ว, default `"DD/MM/YYYY HH:mm"`)
- เพิ่ม 2 column defs ต่อท้าย `dataColumns` (หลัง Status):

```tsx
{
  id: "created_at",
  accessorFn: (row) => row.audit?.created?.at ?? "",
  header: ({ column }) => <DataGridColumnHeader column={column} title={tfl("created")} />,
  cell: ({ row }) => <PlAuditCell entry={row.original.audit?.created} dateTimeFormat={dateTimeFormat} />,
  size: 160,
  meta: { headerTitle: tfl("created"), skeleton: columnSkeletons.text },
},
{
  id: "updated_at",
  accessorFn: (row) => row.audit?.updated?.at ?? "",
  header: ({ column }) => <DataGridColumnHeader column={column} title={tfl("updated")} />,
  cell: ({ row }) => <PlAuditCell entry={row.original.audit?.updated} dateTimeFormat={dateTimeFormat} />,
  size: 160,
  meta: { headerTitle: tfl("updated"), skeleton: columnSkeletons.text },
},
```

sortable โดยปริยาย (ไม่ตั้ง `enableSorting: false`), default sort คงเดิม `pricelist_no:asc`

**3. `routes/vendor-management/price-list/pl-card.tsx`**

เพิ่ม 1 บรรทัดสไตล์การ์ดเดิม (icon `Clock` + label `tfl("updated")` + วันเวลาจริง) ใต้ Effective Period:

```tsx
{item.audit?.updated?.at && (
  <div className="flex items-start gap-2">
    <Clock className="text-muted-foreground mt-0.5 size-3 shrink-0" aria-hidden="true" />
    <div className="min-w-0">
      <p className="text-muted-foreground text-xs">{tfl("updated")}</p>
      <p className="truncate font-semibold">{formatDate(item.audit.updated.at, dateTimeFormat)}</p>
    </div>
  </div>
)}
```

ต้อง import `Clock` จาก `lucide-react`; `formatDate` มี import อยู่แล้ว; เพิ่ม `dateTimeFormat` เข้า destructure จาก `useProfile()`

## i18n (ไม่ต้องแก้)

`field.created` / `field.updated` มีครบทั้ง 2 ภาษา:
- en: `Created` / `Updated`
- th: `สร้างเมื่อ` / `อัปเดตล่าสุด`

## Edge cases

- **audit หาย/ว่าง** → แสดง `—` (defensive optional chaining ทุกจุด)
- **Loading** → `columnSkeletons.text` (skeleton เดิมของตาราง)
- **Sort toggle** → asc↔desc คลิกสลับได้ (shared hook fix `4890c5f` จัดการแล้ว)

## นอกขอบเขต (ตกลงกับ user แล้วว่าไม่ทำ)

- เพิ่ม Created/Updated ใน xlsx export (`handleExport` ใน `pl-component.tsx`)
- Sort ใน card/grid view (card เป็น infinite-scroll ไม่มี header ให้คลิก sort)
- คอลัมน์ Created ในการ์ด (การ์ดใส่แค่ Updated พอ)

## แผนตรวจสอบ

- `bunx tsc --noEmit` — ผ่านสะอาด
- `bun test:run` — เทสเดิมทั้งหมดต้องเขียว (ไม่เขียน .test ใหม่ ตามกฎ global)
- **Browser จริง** (BU T02, admin@zebra.com):
  - คลิก header Created/Updated → เรียงถูก + toggle asc↔desc ได้ + network ส่ง `sort=created_at:...`
  - Cell แสดงวันเวลาจริง (เช่น `2026-03-03 17:38:45`) + ชื่อผู้ทำบรรทัดล่าง
  - Card view (มือถือ) แสดงบรรทัด Updated เป็นวันเวลาจริง
  - เช็ค console ไม่มี error
