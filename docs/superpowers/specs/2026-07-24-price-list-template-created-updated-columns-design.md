# Price List Template — คอลัมน์ Created / Updated พร้อม Sort

**วันที่:** 2026-07-24
**หน้า:** `/vendor-management/price-list-template` (list view)
**ขอบเขต:** งาน frontend ล้วน — ไม่แตะ backend, ไม่แตะ i18n messages
**ต้นแบบ:** PR #63 (`docs/superpowers/specs/2026-07-24-price-list-created-updated-columns-design.md`) —
งานนี้เป็น "ฝาแฝด" ของ price-list โดยเพิ่มการยก audit cell เป็น shared component และแก้ type ที่ผิด

## เป้าหมาย

เพิ่มคอลัมน์ **Created** และ **Updated** ในตาราง price list template list โดยทั้งสองคอลัมน์
**sort ได้** (server-side) แสดงวันเวลาจริง (ตาม `date_time_format` ของ BU) + ชื่อผู้สร้าง/แก้ไข
พร้อมเพิ่มบรรทัด Updated ในการ์ด (grid/mobile view)

## ผลตรวจ backend (ยืนยันแล้ว, BU = T02, local gateway :4000, admin@zebra.com)

- List endpoint `GET /api/{buCode}/pricelist-templates` **ส่ง `audit` มาทุก row** —
  `audit.created` และ `audit.updated` แต่ละอันมี `{ at, id, name }` (เวลา ISO UTC, user id, ชื่อผู้ทำ)
  → shape **เหมือน price-list เป๊ะ**
- **Sort ทำงานจริง**: `sort=created_at:asc`, `created_at:desc`, `updated_at:desc` เรียงถูกต้องทุกทิศทาง
- ส่ง field ที่ไม่มีจริง (`zzz_nope`) → `success: false` — ยืนยันว่า backend validate ชื่อ field
  และชื่อ sort field ที่ถูกต้องคือ `created_at` / `updated_at`

**สรุป: ไม่ต้องแก้ backend เลย** เป็นการเพิ่ม UI column ล้วน

## ⚠️ Type ปัจจุบันผิด — ต้องแก้

`types/price-list-template.ts` ประกาศ:

```ts
export interface PriceListTemplate {
  // ...
  created_at: string;   // ← backend response จริง "ไม่มี" field นี้
  updated_at: string;   // ← backend response จริง "ไม่มี" field นี้
  // ← ขาด audit
}
```

response จริงมี `audit: { created: {at,id,name}, updated: {...} }` และ **ไม่มี** `created_at`/`updated_at` ที่ top level
ตรวจซ้ำแล้ว: `created_at`/`updated_at` ของ template **ไม่ถูกใช้ที่ใดในทั้ง repo** → ลบทิ้งปลอดภัย

## การตัดสินใจด้าน UX (จาก user — สอดคล้อง PR #63)

| หัวข้อ | เลือก |
|---|---|
| รูปแบบแสดงผล | **วันเวลาจริง** (ตาม `dateTimeFormat` ของ BU) + ชื่อผู้ทำบรรทัดล่าง — ไม่มี tooltip |
| การมองเห็นเริ่มต้น | **Default visible** (เปิดไว้เลย ปิดได้ผ่าน toggle columns) |
| Grid/Card view | **ใส่บรรทัด Updated ในการ์ดด้วย** (วันเวลาจริง) — การ์ด PLT เดิมไม่มีวันที่เลย |
| audit cell component | **ยกเป็น shared** `components/share/audit-cell.tsx` แล้ว refactor price-list มาใช้ร่วม |

## สถาปัตยกรรม

ยก audit cell (presentational เดี่ยว, 2 บรรทัด) ออกจาก module price-list ไปเป็น shared component
เพื่อ decouple และ reuse ได้ในหน้าอื่นอนาคต (RFP list ฯลฯ):

```
components/share/audit-cell.tsx   ← ใหม่: <AuditCell> generic (entry + dateTimeFormat)
        ▲                    ▲
        │                    │
use-pl-table.tsx        use-plt-table.tsx
(price-list, refactor)  (price-list-template, ของใหม่)
```

Type ก็ยกเป็น source of truth เดียว (`types/audit.ts`) ให้ทั้งสอง entity อ้างอิง

## หลักการสำคัญ: `id` ต้องตรงกับ backend sort field

TanStack แปลง sorting state → query param โดยใช้ `column.id` (ดู `hooks/use-data-grid-state.ts`
`setSort(\`${next[0].id}:${next[0].desc ? "desc" : "asc"}\`)`). ถ้าไม่ตั้ง `id` มันจะ auto-gen
จาก accessor (`audit.created.at` → `audit_created_at`) ซึ่ง backend ไม่รู้จัก → sort พังเงียบๆ
จึงต้องตั้ง `id: "created_at"` / `"updated_at"` ให้ตรงกับ backend (pattern เดียวกับ PR #63)

## ไฟล์ที่เปลี่ยน (8 จุด)

### A. Types — แก้ให้ตรง backend จริง

**1. `types/audit.ts` (ไฟล์ใหม่) — source of truth ของ audit shape**

```ts
export interface AuditEntry {
  at: string;
  id: string;
  name: string;
}

export interface Audit {
  created?: AuditEntry;
  updated?: AuditEntry;
}
```

**2. `types/price-list.ts` — alias ไปยัง shared (คง backward-compat)**

เปลี่ยน definition เดิมของ `PriceListAuditEntry` / `PriceListAudit` เป็น re-export/alias จาก `@/types/audit`:

```ts
import type { AuditEntry, Audit } from "@/types/audit";
export type PriceListAuditEntry = AuditEntry;
export type PriceListAudit = Audit;
```

import ที่มีอยู่ทั้งหมด (`pl-audit-cell` เดิม ฯลฯ) ยังใช้ได้ ไม่พังของเดิม

**3. `types/price-list-template.ts` — ลบ phantom fields + เพิ่ม audit**

```ts
import type { Audit } from "@/types/audit";

export interface PriceListTemplate {
  // ...
  doc_version?: number;
  audit?: Audit;      // ← เพิ่ม
  // ← ลบ created_at, updated_at
}
```

### B. Shared component

**4. `components/share/audit-cell.tsx` (ไฟล์ใหม่) — ย้ายโค้ดจาก PlAuditCell**

generic (ไม่ผูกกับ price-list): แสดงวันเวลาจริง + ชื่อ (2 บรรทัด, ไม่มี tooltip)

```tsx
import { formatDate } from "@/lib/date-utils";
import type { AuditEntry } from "@/types/audit";

interface AuditCellProps {
  readonly entry: AuditEntry | undefined;
  readonly dateTimeFormat: string;
}

// entry?.at ว่าง → แสดง "—" (muted)
// มีค่า → บรรทัดบน = formatDate(entry.at, dateTimeFormat)
//         บรรทัดล่าง = entry.name (muted, truncate) ถ้ามี
export function AuditCell({ entry, dateTimeFormat }: AuditCellProps) { /* ... */ }
```

ใช้ `formatDate` จาก `@/lib/date-utils` (รองรับ pattern เวลา เช่น `HH:mm:ss` ในตัว)

**5. `routes/vendor-management/price-list/use-pl-table.tsx` — สลับมาใช้ shared**

- เปลี่ยน `import { PlAuditCell } from "./pl-audit-cell"` → `import { AuditCell } from "@/components/share/audit-cell"`
- เปลี่ยน `<PlAuditCell ... />` ทั้ง 2 จุด (Created, Updated) → `<AuditCell ... />` (props เหมือนเดิม)

**6. ลบ `routes/vendor-management/price-list/pl-audit-cell.tsx`**

ตรวจแล้ว importer เดียวคือ `use-pl-table.tsx` (แก้ในข้อ 5) → ลบได้ปลอดภัย

### C. Price List Template — ของใหม่

**7. `routes/vendor-management/price-list-template/use-plt-table.tsx`**

- เพิ่ม `import { useProfile } from "@/hooks/use-profile"` + `import { AuditCell } from "@/components/share/audit-cell"`
- เพิ่ม `const { dateTimeFormat } = useProfile();` ในตัว hook
- เพิ่ม 2 column defs ต่อท้าย `dataColumns` (หลัง Status):

```tsx
{
  id: "created_at",
  accessorFn: (row) => row.audit?.created?.at ?? "",
  header: ({ column }) => <DataGridColumnHeader column={column} title={tfl("created")} />,
  cell: ({ row }) => <AuditCell entry={row.original.audit?.created} dateTimeFormat={dateTimeFormat} />,
  size: 160,
  meta: { headerTitle: tfl("created"), skeleton: columnSkeletons.text },
},
{
  id: "updated_at",
  accessorFn: (row) => row.audit?.updated?.at ?? "",
  header: ({ column }) => <DataGridColumnHeader column={column} title={tfl("updated")} />,
  cell: ({ row }) => <AuditCell entry={row.original.audit?.updated} dateTimeFormat={dateTimeFormat} />,
  size: 160,
  meta: { headerTitle: tfl("updated"), skeleton: columnSkeletons.text },
},
```

sortable โดยปริยาย (ไม่ตั้ง `enableSorting: false`); ไม่เปลี่ยน default sort เดิม

**8. `routes/vendor-management/price-list-template/plt-card.tsx`**

เพิ่มบรรทัด Updated ใน `CardContent` (icon `Clock` + label `tfl("updated")` + วันเวลาจริง):

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

- เพิ่ม `import { Clock }` จาก `lucide-react` (มี `Coins`, `CalendarClock` อยู่แล้ว)
- เพิ่ม `import { formatDate } from "@/lib/date-utils"` + `import { useProfile } from "@/hooks/use-profile"`
- เพิ่ม `const { dateTimeFormat } = useProfile();`
- จัดสไตล์ให้เข้ากับ layout การ์ดเดิม (`CardContent` เป็น flex row ของ currency/validity — วางบรรทัด Updated ให้กลมกลืน)

## i18n (ไม่ต้องแก้)

`field.created` / `field.updated` มีครบทั้ง 2 ภาษา:
- en: `Created` / `Updated`
- th: `สร้างเมื่อ` / `อัปเดตล่าสุด`

## Edge cases

- **audit หาย/ว่าง** → แสดง `—` (defensive optional chaining ทุกจุด) / การ์ดซ่อนบรรทัด Updated
- **Loading** → `columnSkeletons.text` (skeleton เดิมของตาราง)
- **Sort toggle** → asc↔desc คลิกสลับได้ (shared hook fix จัดการแล้ว)

## นอกขอบเขต (ตกลงกับ user แล้วว่าไม่ทำ — ตาม PR #63)

- เพิ่ม Created/Updated ใน xlsx export (`handleExport` ใน `plt-component.tsx`)
- Sort ใน card/grid view (card เป็น infinite-scroll ไม่มี header ให้คลิก sort)
- คอลัมน์ Created ในการ์ด (การ์ดใส่แค่ Updated พอ)
- เปลี่ยน default sort ของหน้า (คลิก header เพื่อ sort เท่านั้น)

## แผนตรวจสอบ

- `bunx tsc --noEmit` — ผ่านสะอาด
- `bun test:run` — เทสเดิมทั้งหมดต้องเขียว (ไม่เขียน .test ใหม่ ตามกฎ global)
- **Browser จริง** (BU T02, admin@zebra.com):
  - คลิก header Created/Updated → เรียงถูก + toggle asc↔desc ได้ + network ส่ง `sort=created_at:...`
  - Cell แสดงวันเวลาจริง + ชื่อผู้ทำบรรทัดล่าง
  - Card view (มือถือ/grid) แสดงบรรทัด Updated เป็นวันเวลาจริง
  - **Regression: หน้า price-list เดิมยังทำงานปกติ** (คอลัมน์ Created/Updated + sort) หลัง refactor เป็น shared
  - เช็ค console ไม่มี error
