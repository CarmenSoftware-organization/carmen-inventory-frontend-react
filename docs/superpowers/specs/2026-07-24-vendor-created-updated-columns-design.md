# เพิ่มคอลัมน์ Created / Updated (+ sort) หน้า Vendor

วันที่: 2026-07-24
หน้า: `/vendor-management/vendor`

## ปัญหา / เป้าหมาย

ตาราง vendor list ยังไม่มีคอลัมน์แสดงวันที่สร้าง/แก้ไขล่าสุด ผู้ใช้ต้องการเห็น
Created / Updated (วันเวลา + ชื่อผู้ทำ) และ **sort ได้** เหมือนที่เพิ่งทำกับ
price-list (PR #63) และ price-list-template

## ผลการสำรวจ (สำคัญ — กำหนดขอบเขต)

- **Backend พร้อมแล้ว 100% — เป็นงาน frontend-only**
  - vendor gateway `findAll` (`config_vendors.controller.ts:130`) มี
    `@Serialize(VendorListItemResponseSchema)` + `@EnrichAuditUsers()` อยู่แล้ว
  - `VendorListItemResponseSchema` (gateway) มี `audit: AuditSchema.optional()` แล้ว →
    response คืน `audit: { created: {at,id,name}, updated: {at,id,name} }` ให้ vendor list
  - `EnrichAuditUsersContextInterceptor` แปลง `created_by_id`/`updated_by_id` → ชื่อผู้ใช้
    และยุบเป็น `audit` object ให้เอง
- **Sort ทำงานได้ทันที** — micro-business `vendors.service.findAll` ใช้ `orderBy: q.orderBy()`
  (`QueryParams.orderBy()` ส่ง field ตรงเข้า Prisma) และ `created_at`/`updated_at` เป็นคอลัมน์จริง
  ใน `tb_vendor` (อยู่ใน `selectClause` แล้ว) — กลไกเดียวกับ price-list/PLT ที่ใช้สำเร็จ
- **i18n พร้อม** — key `field.created` / `field.updated` มีอยู่แล้วใน `messages/{en,th}.json`
- มี shared `AuditCell` (`components/share/audit-cell.tsx`) ใช้ร่วมกับ price-list/PLT อยู่แล้ว

## การตัดสินใจ (ยืนยันกับผู้ใช้แล้ว)

1. **เนื้อหา cell:** วันเวลา + ชื่อผู้ทำ (ใช้ shared `AuditCell` — เหมือน price-list)
2. **ขอบเขต:** ตาราง (list view) **และ** การ์ด (grid/mobile view)

## แนวทาง

ลอก pattern จาก price-list/PLT ที่เพิ่ง merge — ความเสี่ยงต่ำ เส้นทางที่พิสูจน์แล้ว

## ไฟล์ที่แก้ (4 ไฟล์)

### 1. `types/vendor.ts`
เพิ่ม `audit?: Audit` เข้า interface `Vendor` (import `Audit` จาก `@/types/audit`)
คงฟิลด์ `created_at` / `updated_at` เดิมไว้ (export / ที่อื่นยังใช้)

### 2. `routes/vendor-management/vendor/use-vendor-table.tsx`
- import `AuditCell`, `useProfile`; ดึง `dateTimeFormat` จาก `useProfile()`
- เพิ่ม 2 คอลัมน์ท้าย array `columns`:
  - `id: "created_at"`, `accessorFn: (row) => row.audit?.created?.at ?? ""`,
    header `DataGridColumnHeader title={tfl("created")}`,
    cell `<AuditCell entry={row.original.audit?.created} dateTimeFormat={dateTimeFormat} />`,
    `size: 160`, meta `{ headerTitle: tfl("created"), skeleton: columnSkeletons.text }`
  - `id: "updated_at"` แบบเดียวกัน (`audit?.updated`)
- `id` = ชื่อคอลัมน์ backend → กด header ส่ง `sort=created_at:asc` / `updated_at:desc` อัตโนมัติ

> หมายเหตุลำดับคอลัมน์: hook นี้ใช้ `useConfigTable` ซึ่ง inject `statusColumn` **ต่อท้าย**
> custom columns → ลำดับผลลัพธ์: `... business_type → created → updated → status → actions`
> (created/updated มาก่อน status ต่างจาก price-list เล็กน้อย แต่ทั้ง sort และการแสดงผลถูกต้องครบ)

### 3. `routes/vendor-management/vendor/vendor-card.tsx`
เพิ่มบรรทัด Updated ใน `CardContent` (mirror `plt-card.tsx`):
```tsx
{item.audit?.updated?.at && (
  <div className="flex min-w-0 items-center gap-1.5">
    <Clock className="text-muted-foreground size-3 shrink-0" aria-hidden="true" />
    <span className="text-muted-foreground">{tfl("updated")}:</span>
    <span className="truncate font-semibold">
      {formatDate(item.audit.updated.at, dateTimeFormat)}
    </span>
  </div>
)}
```
import `useProfile` (ดึง `dateTimeFormat`), `formatDate`, icon `Clock`

### 4. i18n
`field.created` / `field.updated` มีอยู่แล้ว → **ไม่ต้องแก้**

## การตรวจสอบ

- `bunx tsc --noEmit` clean
- `bun test:run` clean (ไม่มี test ตาราง vendor ที่ assert จำนวนคอลัมน์)
- Browser (local backend :4000):
  - sort asc/desc ทั้ง Created และ Updated — เช็ค network query `sort=created_at:...` / `sort=updated_at:...`
  - ยืนยันชื่อผู้ทำแสดงใต้วันเวลา
  - grid/mobile view เห็นบรรทัด "Updated: ..." ในการ์ด

## นอกขอบเขต

- ไม่แตะ backend
- ไม่แก้คอลัมน์ export xlsx (ยังคงเดิม)
- ไม่เขียน automated test (ตาม rule โปรเจกต์ — งานเล็ก, verify ด้วย browser)
