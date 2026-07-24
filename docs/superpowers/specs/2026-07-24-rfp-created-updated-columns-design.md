# เพิ่มคอลัมน์ Created / Updated (+ sort) หน้า Request Price List (RFP)

วันที่: 2026-07-24
หน้า: `/vendor-management/request-price-list`

## ปัญหา / เป้าหมาย

ตาราง request-price-list (RFP) list ยังไม่มีคอลัมน์แสดงวันที่สร้าง/แก้ไขล่าสุด
ผู้ใช้ต้องการเห็น Created / Updated (วันเวลา + ชื่อผู้ทำ) และ **sort ได้** เหมือนที่เพิ่ง
ทำกับ price-list (PR #63), price-list-template และ vendor

## ผลการสำรวจ (สำคัญ — กำหนดขอบเขต)

- **Backend พร้อมแล้ว 100% — เป็นงาน frontend-only**
  - gateway RFP `findAll` (`request-for-pricings.controller.ts:127-129`) มี
    `@EnrichAuditUsers()` อยู่แล้ว → interceptor แปลง `created_by_id`/`updated_by_id`
    เป็นชื่อผู้ใช้และยุบ `created_at`+`created_by_id` เป็น `audit` object
  - gateway serializer `RequestForPricingListItemResponseSchema`
    (`common/dto/request-for-pricing/request-for-pricing.serializer.ts:119-144`)
    ทำ `.omit(AUDIT_RAW_FIELDS).extend({ audit: AuditSchema.optional() })` →
    response list **strip raw `created_at`/`updated_at`/`*_by_id` ทิ้ง** และคืน
    `audit: { created: {at,id,name}, updated: {at,id,name} }` แทน
  - micro-business `findAll` (`request-for-pricing.service.ts:407-423`) select
    `created_at`/`created_by_id`/`updated_at`/`updated_by_id` ครบแล้ว
- **Sort ทำงานได้ทันที** — micro-business ใช้ `orderBy: q.orderBy()` และ `order_by`
  helper (`order_by.ts:8-20`) map `"created_at:asc"` → Prisma `{ created_at: 'asc' }`
  ตรงเข้า column; `created_at`/`updated_at` เป็นคอลัมน์จริงใน `tb_request_for_pricing`
  — กลไกเดียวกับ vendor/price-list/PLT ที่ใช้สำเร็จ
- **i18n พร้อม** — key `field.created` / `field.updated` มีอยู่แล้วใน `messages/{en,th}.json`
- มี shared `AuditCell` (`components/share/audit-cell.tsx`) ใช้ร่วมกับ
  vendor/price-list/PLT อยู่แล้ว

### ⚠️ Type mismatch ที่ต้องแก้ (เหมือนที่เจอตอน PLT)

`types/request-price-list.ts` ประกาศ `created_at: string; updated_at: string;` (flat, บรรทัด
41-42) — **แต่ gateway strip ฟิลด์เหล่านี้ทิ้งและส่ง `audit` object แทน** ตรวจแล้ว
flat fields เหล่านี้ **ไม่ถูกอ้างอิงที่ไหนเลย** ในโค้ด RFP frontend → ลบทิ้งได้ปลอดภัย
(ต่างจาก vendor ที่คงไว้เพราะที่อื่นยังใช้)

## การตัดสินใจ (ยืนยันกับผู้ใช้แล้ว)

1. **เนื้อหา cell:** วันเวลา + ชื่อผู้ทำ (ใช้ shared `AuditCell` — เหมือน vendor/price-list)
2. **List view:** มีทั้ง 2 คอลัมน์ (Created + Updated) เสมอ
3. **Grid/mobile card:** แสดง **บรรทัด Updated อย่างเดียว** (ตรงกับ pattern vendor/price-list)
4. **Excel export:** เพิ่ม 2 คอลัมน์ Created + Updated — แสดง **วันที่อย่างเดียว ไม่มีชื่อผู้ทำ**

## แนวทาง

ลอก pattern จาก vendor/price-list/PLT ที่ merge แล้ว — ความเสี่ยงต่ำ เส้นทางที่พิสูจน์แล้ว

## ไฟล์ที่แก้ (4 ไฟล์, frontend เท่านั้น)

### 1. `types/request-price-list.ts`
- import `Audit` จาก `@/types/audit`
- ใน interface `RequestPriceList`: **ลบ** `created_at: string;` และ `updated_at: string;`
  (บรรทัด 41-42) แล้วเพิ่ม `audit?: Audit;` แทน

### 2. `routes/vendor-management/request-price-list/use-rfp-table.tsx`
- import `AuditCell` (`@/components/share/audit-cell`) และ `useProfile`;
  ดึง `dateTimeFormat` จาก `useProfile()` (ปัจจุบัน hook นี้ดึงแค่ `dateFormat`)
- เพิ่ม 2 คอลัมน์ **ต่อท้าย** array `columns` (หลัง `vendor_count`):
  - `id: "created_at"`, `accessorFn: (row) => row.audit?.created?.at ?? ""`,
    header `<DataGridColumnHeader column={column} title={tfl("created")} />`,
    cell `<AuditCell entry={row.original.audit?.created} dateTimeFormat={dateTimeFormat} />`,
    `size: 160`, meta `{ headerTitle: tfl("created"), skeleton: columnSkeletons.text }`
  - `id: "updated_at"` แบบเดียวกัน (`audit?.updated`)
- `id` = ชื่อคอลัมน์ backend → กด header ส่ง `sort=created_at:asc` / `updated_at:desc` อัตโนมัติ

> หมายเหตุลำดับ: hook นี้ใช้ `useConfigTable` + `hideStatus: true` (ไม่มีคอลัมน์ status)
> → custom columns ต่อท้ายได้เลย, `useConfigTable` inject action column ท้ายสุด
> ลำดับผลลัพธ์: `name → template → period → vendor_count → created → updated → actions`

### 3. `routes/vendor-management/request-price-list/rfp-card.tsx`
เพิ่มบรรทัด Updated ล่างสุดของการ์ด (mirror `pl-card` / `plt-card`):
```tsx
{item.audit?.updated?.at && (
  <>
    <Separator />
    <CardContent className="flex items-center gap-1.5 px-4 py-2 text-xs">
      <Clock className="text-muted-foreground size-3 shrink-0" aria-hidden="true" />
      <span className="text-muted-foreground">{tfl("updated")}:</span>
      <span className="truncate font-semibold">
        {formatDate(item.audit.updated.at, dateTimeFormat)}
      </span>
    </CardContent>
  </>
)}
```
- ปัจจุบัน card ดึง `dateFormat` จาก `useProfile()` แล้ว → เพิ่ม `dateTimeFormat` ในการ destructure
- import icon `Clock` จาก `lucide-react` (ไฟล์ import `CalendarDays, FileText, Users` อยู่แล้ว)
- `Separator` import อยู่แล้ว

### 4. `routes/vendor-management/request-price-list/rfp-component.tsx`
เพิ่มคอลัมน์ Created / Updated ในไฟล์ export (`handleExport`):
- ดึง `dateTimeFormat` จาก `useProfile()` เข้ามาใน component (import `useProfile`, `formatDate`)
- เพิ่ม 2 entry ท้าย array `columns` ของ `exportRequestPriceList`:
  - `{ header: tfl("created"), value: (r) => r.audit?.created?.at ? formatDate(r.audit.created.at, dateTimeFormat) : "", width: 18 }`
  - `{ header: tfl("updated"), value: (r) => r.audit?.updated?.at ? formatDate(r.audit.updated.at, dateTimeFormat) : "", width: 18 }`
- วันที่อย่างเดียว (ไม่มีชื่อผู้ทำ) ตามที่ตัดสินใจไว้

### i18n
`field.created` / `field.updated` มีอยู่แล้ว → **ไม่ต้องแก้**

## การตรวจสอบ

- `bunx tsc --noEmit` clean
- `bun test:run` clean (ไม่มี test ตาราง RFP ที่ assert จำนวนคอลัมน์)
- Browser (local backend :4000):
  - เปิดหน้า RFP → เห็นคอลัมน์ Created / Updated (วันเวลา + ชื่อผู้ทำ)
  - คลิก sort ทั้ง 2 คอลัมน์ (asc/desc) — เช็ค network query `sort=created_at:...` / `sort=updated_at:...`
  - ยืนยันชื่อผู้ทำแสดงใต้วันเวลา
  - สลับ grid/mobile view — เห็นบรรทัด "Updated: ..." ในการ์ด
  - Export → เปิดไฟล์ตรวจว่ามีคอลัมน์ Created / Updated (วันที่)

## นอกขอบเขต

- ไม่แตะ backend (รองรับครบแล้ว)
- ไม่แสดงชื่อผู้ทำในไฟล์ export (วันที่อย่างเดียว)
- ไม่เขียน automated test (ตาม rule โปรเจกต์ — งานเล็ก, verify ด้วย browser)
