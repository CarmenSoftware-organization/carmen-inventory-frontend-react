# RFP Created/Updated Columns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เพิ่มคอลัมน์ Created / Updated (วันเวลา + ชื่อผู้ทำ) พร้อม sort server-side ในหน้า `/vendor-management/request-price-list`

**Architecture:** งาน frontend-only — backend gateway `@EnrichAuditUsers()` คืน `audit` object และ strip flat `created_at`/`updated_at` ทิ้งอยู่แล้ว, sort ทำงานผ่าน generic `order_by` helper. ลอก pattern จาก vendor/price-list/PLT ที่ merge แล้ว โดยใช้ shared `AuditCell` component

**Tech Stack:** React 19, TanStack Table (`useConfigTable`), use-intl, TypeScript, Vite, `bun`

## Global Constraints

- **ข้าม automated test** (ตาม CLAUDE.md "Skip Automated Tests During Plan Execution") — ไม่สร้าง `*.spec.ts`; ใช้ static check `bunx tsc --noEmit` + verify ด้วย browser แทน
- **สื่อสาร/commit เป็นภาษาไทย**; code/identifier เป็นอังกฤษ
- **ไม่แตะ backend** — carmen-turborepo-backend-v2 รองรับครบแล้ว
- **ไม่เพิ่ม i18n key** — `field.created` / `field.updated` มีอยู่แล้วใน `messages/{en,th}.json`
- **`id` ของคอลัมน์ audit ต้องตรงชื่อคอลัมน์ backend** (`created_at` / `updated_at`) เพื่อให้ sort ส่ง field ถูก
- ทำงานบน branch `feature/rfp-created-updated-columns` (สร้างแล้ว, มี commit spec อยู่)

---

### Task 1: Type + คอลัมน์ Created/Updated ในตาราง (list view + sort)

**Files:**
- Modify: `types/request-price-list.ts` (interface `RequestPriceList`, บรรทัด 41-42 + เพิ่ม import)
- Modify: `routes/vendor-management/request-price-list/use-rfp-table.tsx`

**Interfaces:**
- Consumes: `Audit` จาก `@/types/audit` (`{ created?: AuditEntry; updated?: AuditEntry }`, `AuditEntry = { at, id, name }`); `AuditCell` จาก `@/components/share/audit-cell` (props `{ entry: AuditEntry | undefined; dateTimeFormat: string }`); `useProfile()` คืน `{ dateFormat, dateTimeFormat }`
- Produces: `RequestPriceList.audit?: Audit` (Task 2 และ Task 3 ใช้ต่อ)

- [ ] **Step 1: แก้ type — ลบ flat fields, เพิ่ม `audit`**

`types/request-price-list.ts` — เพิ่ม import บรรทัดบนสุดของไฟล์ (ก่อน `export interface RequestPriceListVendor`):

```ts
import type { Audit } from "@/types/audit";
```

ในinterface `RequestPriceList` **ลบ** 2 บรรทัดนี้:

```ts
  created_at: string;
  updated_at: string;
```

แล้วแทนด้วย:

```ts
  audit?: Audit;
```

- [ ] **Step 2: เพิ่ม import + ดึง `dateTimeFormat` ใน use-rfp-table.tsx**

เพิ่ม import (ใต้ import `formatDate`):

```ts
import { AuditCell } from "@/components/share/audit-cell";
```

เปลี่ยนบรรทัด:

```ts
  const { dateFormat } = useProfile();
```

เป็น:

```ts
  const { dateFormat, dateTimeFormat } = useProfile();
```

- [ ] **Step 3: เพิ่ม 2 คอลัมน์ต่อท้าย array `columns`**

ใน `use-rfp-table.tsx` แทรก 2 คอลัมน์นี้หลัง block คอลัมน์ `vendor_count` (ก่อน `];` ที่ปิด array `columns`):

```tsx
    {
      // id = ชื่อคอลัมน์จริงของ backend เพื่อให้ sort ส่ง field ถูกต้อง
      id: "created_at",
      accessorFn: (row) => row.audit?.created?.at ?? "",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("created")} />
      ),
      cell: ({ row }) => (
        <AuditCell
          entry={row.original.audit?.created}
          dateTimeFormat={dateTimeFormat}
        />
      ),
      size: 160,
      meta: { headerTitle: tfl("created"), skeleton: columnSkeletons.text },
    },
    {
      id: "updated_at",
      accessorFn: (row) => row.audit?.updated?.at ?? "",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("updated")} />
      ),
      cell: ({ row }) => (
        <AuditCell
          entry={row.original.audit?.updated}
          dateTimeFormat={dateTimeFormat}
        />
      ),
      size: 160,
      meta: { headerTitle: tfl("updated"), skeleton: columnSkeletons.text },
    },
```

- [ ] **Step 4: Type-check**

Run: `bunx tsc --noEmit`
Expected: ไม่มี error (exit 0)

- [ ] **Step 5: Commit**

```bash
git add types/request-price-list.ts routes/vendor-management/request-price-list/use-rfp-table.tsx
git commit -m "feat(rfp): เพิ่มคอลัมน์ Created/Updated (sort server-side) ในตาราง RFP"
```

---

### Task 2: บรรทัด Updated ในการ์ด (grid/mobile view)

**Files:**
- Modify: `routes/vendor-management/request-price-list/rfp-card.tsx`

**Interfaces:**
- Consumes: `RequestPriceList.audit?.updated?.at` (จาก Task 1); `formatDate` (import อยู่แล้วในไฟล์); `useProfile()` คืน `dateTimeFormat`

- [ ] **Step 1: เพิ่ม import icon + ดึง `dateTimeFormat`**

`rfp-card.tsx` — เปลี่ยนบรรทัด import icon:

```ts
import { CalendarDays, FileText, Users } from "lucide-react";
```

เป็น:

```ts
import { CalendarDays, Clock, FileText, Users } from "lucide-react";
```

เปลี่ยนบรรทัด:

```ts
  const { dateFormat } = useProfile();
```

เป็น:

```ts
  const { dateFormat, dateTimeFormat } = useProfile();
```

- [ ] **Step 2: เพิ่มบรรทัด Updated ล่างสุดของการ์ด**

ใน `rfp-card.tsx` แทรก block นี้ **หลัง** block `{period && ( ... )}` และ **ก่อน** `</Card>`:

```tsx
      {item.audit?.updated?.at && (
        <>
          <Separator />
          <CardContent className="flex items-center gap-1.5 px-4 py-2 text-xs">
            <Clock
              className="text-muted-foreground size-3 shrink-0"
              aria-hidden="true"
            />
            <span className="text-muted-foreground">{tfl("updated")}:</span>
            <span className="truncate font-semibold">
              {formatDate(item.audit.updated.at, dateTimeFormat)}
            </span>
          </CardContent>
        </>
      )}
```

- [ ] **Step 3: Type-check**

Run: `bunx tsc --noEmit`
Expected: ไม่มี error (exit 0)

- [ ] **Step 4: Commit**

```bash
git add routes/vendor-management/request-price-list/rfp-card.tsx
git commit -m "feat(rfp): เพิ่มบรรทัด Updated ในการ์ด RFP (grid view)"
```

---

### Task 3: คอลัมน์ Created/Updated ในไฟล์ Excel export

**Files:**
- Modify: `routes/vendor-management/request-price-list/rfp-component.tsx`

**Interfaces:**
- Consumes: `RequestPriceList.audit?.created?.at` / `.updated?.at` (จาก Task 1); `useProfile()` คืน `dateTimeFormat`; `formatDate` จาก `@/lib/date-utils`; `tfl` = `useTranslations("field")` (มีอยู่แล้วในcomponent)

- [ ] **Step 1: เพิ่ม import + ดึง `dateTimeFormat`**

`rfp-component.tsx` — เพิ่ม import (รวมกับ import อื่นๆ ด้านบน):

```ts
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
```

ในตัว component (ใต้บรรทัด `const tt = useTranslations("toast");` หรือกลุ่ม hook ด้านบน) เพิ่ม:

```ts
  const { dateTimeFormat } = useProfile();
```

- [ ] **Step 2: เพิ่ม 2 คอลัมน์ท้าย array `columns` ของ export**

ใน `handleExport` แทรก 2 entry นี้หลัง entry `currency` (entry สุดท้ายของ array `columns`):

```tsx
          {
            header: tfl("created"),
            value: (r) =>
              r.audit?.created?.at
                ? formatDate(r.audit.created.at, dateTimeFormat)
                : "",
            width: 18,
          },
          {
            header: tfl("updated"),
            value: (r) =>
              r.audit?.updated?.at
                ? formatDate(r.audit.updated.at, dateTimeFormat)
                : "",
            width: 18,
          },
```

- [ ] **Step 3: Type-check**

Run: `bunx tsc --noEmit`
Expected: ไม่มี error (exit 0)

- [ ] **Step 4: Commit**

```bash
git add routes/vendor-management/request-price-list/rfp-component.tsx
git commit -m "feat(rfp): เพิ่มคอลัมน์ Created/Updated ในไฟล์ Excel export"
```

---

### Task 4: Full verification (static + browser)

**Files:** ไม่มีไฟล์แก้ (ตรวจสอบอย่างเดียว)

- [ ] **Step 1: Static checks ทั้งชุด**

Run: `bunx tsc --noEmit && bun test:run`
Expected: tsc exit 0; test ทั้งหมดผ่าน (640+/640+ green, ไม่มี test ตาราง RFP ที่ assert จำนวนคอลัมน์)

- [ ] **Step 2: Browser verify (local backend :4000)**

รัน `VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev` แล้วเปิด `http://localhost:3000/vendor-management/request-price-list` — เช็ค checklist:

- เห็นคอลัมน์ **Created** และ **Updated** (วันเวลา + ชื่อผู้ทำใต้วันเวลา)
- คลิก sort header **Created** (asc → desc) — Network: query มี `sort=created_at:asc` แล้ว `sort=created_at:desc`
- คลิก sort header **Updated** — Network: query มี `sort=updated_at:asc` / `sort=updated_at:desc`
- สลับเป็น grid view — การ์ดแสดงบรรทัด "อัปเดตล่าสุด: <วันเวลา>"
- กด Export — เปิดไฟล์ `.xlsx` ตรวจว่ามีคอลัมน์ Created / Updated (วันที่)
- ไม่มี console error

- [ ] **Step 3: ไม่มี commit** (task ตรวจสอบ; ถ้าเจอ bug ย้อนแก้ task ที่เกี่ยวข้อง)

---

## Self-Review

**Spec coverage:**
- Type mismatch fix (ลบ flat, เพิ่ม `audit`) → Task 1 Step 1 ✓
- คอลัมน์ Created/Updated + sort (list) → Task 1 Step 2-3 ✓
- Grid card Updated line → Task 2 ✓
- Excel export Created/Updated (วันที่อย่างเดียว) → Task 3 ✓
- i18n ไม่ต้องแก้ → ระบุใน Global Constraints ✓
- Verification (tsc/test/browser) → Task 4 ✓

**Placeholder scan:** ไม่มี TBD/TODO; ทุก step มี code จริง ✓

**Type consistency:** `audit?: Audit` (Task 1) ใช้ตรงกันทั้ง `row.audit?.created` / `row.original.audit?.created` (Task 1), `item.audit?.updated?.at` (Task 2), `r.audit?.created?.at` (Task 3); `dateTimeFormat` จาก `useProfile()` เหมือนกันทุก task; `AuditCell` props ตรง signature ✓
