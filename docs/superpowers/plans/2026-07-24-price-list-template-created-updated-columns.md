# Price List Template — Created/Updated Columns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เพิ่มคอลัมน์ Created/Updated (sort ได้ server-side) ในตาราง price list template list + บรรทัด Updated ในการ์ด โดยยก audit cell เป็น shared component และแก้ type ที่ผิด

**Architecture:** งาน frontend ล้วน — backend ยืนยันแล้วว่าส่ง `audit` object ({created,updated} แต่ละอันมี {at,id,name}) และรองรับ server-side sort ผ่าน field `created_at`/`updated_at`. ยก presentational audit cell จาก module price-list ไปเป็น shared component (`components/share/audit-cell.tsx`) ให้ price-list และ price-list-template ใช้ร่วมกัน พร้อมยก audit type เป็น source of truth เดียว (`types/audit.ts`)

**Tech Stack:** React 19, TypeScript, TanStack Table, use-intl, Tailwind, Vite, Bun, Vitest

## Global Constraints

- **ภาษา:** สื่อสาร/commit message เป็นภาษาไทย; code/identifier เป็นอังกฤษ
- **Skip automated tests:** ไม่เขียนไฟล์ `*.test.ts(x)` ใหม่ในงานนี้ (กฎ global) — ใช้ `bunx tsc --noEmit` + `bun test:run` (เทสเดิมต้องเขียว) + browser verification แทน
- **Static check บังคับก่อน commit ทุก task:** `bunx tsc --noEmit` ต้องสะอาด
- **`column.id` ต้องตรง backend sort field:** ตั้ง `id: "created_at"` / `"updated_at"` เป๊ะ (ถ้าปล่อย auto-gen → sort พังเงียบ)
- **Timezone:** cell/การ์ดแสดงเวลาผ่าน `formatDate(at, dateTimeFormat)` เท่านั้น (backend ส่ง ISO UTC, frontend format เป็น local ตาม `dateTimeFormat` ของ BU)
- **i18n:** `field.created` / `field.updated` มีครบทั้ง en/th แล้ว — **ห้ามแตะ** `messages/*.json`
- **Branch:** ทำงานบน `feature/plt-created-updated-columns` (spec commit อยู่แล้ว)
- **ไม่แตะ backend, ไม่แตะ xlsx export, ไม่เปลี่ยน default sort**

---

### Task 1: Shared audit types + AuditCell component

สร้าง source of truth ของ audit shape และ presentational cell ที่ generic (ยังไม่มี consumer — ปลอดภัยเต็มที่)

**Files:**
- Create: `types/audit.ts`
- Create: `components/share/audit-cell.tsx`

**Interfaces:**
- Produces: `AuditEntry { at: string; id: string; name: string }`, `Audit { created?: AuditEntry; updated?: AuditEntry }` จาก `@/types/audit`
- Produces: `AuditCell({ entry, dateTimeFormat })` component (named export) จาก `@/components/share/audit-cell` — `entry: AuditEntry | undefined`, `dateTimeFormat: string`

- [ ] **Step 1: สร้าง `types/audit.ts`**

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

- [ ] **Step 2: สร้าง `components/share/audit-cell.tsx`**

```tsx
import { formatDate } from "@/lib/date-utils";
import type { AuditEntry } from "@/types/audit";

interface AuditCellProps {
  readonly entry: AuditEntry | undefined;
  readonly dateTimeFormat: string;
}

/**
 * Cell แสดง audit entry (created/updated) ในตาราง list —
 * วันเวลาจริง (ตาม dateTimeFormat ของ BU) + ชื่อผู้ทำ
 * @param props - entry (audit.created หรือ audit.updated) และ dateTimeFormat ปัจจุบัน
 * @returns React element ของ cell; แสดง "—" เมื่อไม่มีข้อมูล audit
 * @example
 * <AuditCell entry={row.original.audit?.created} dateTimeFormat={dateTimeFormat} />
 */
export function AuditCell({ entry, dateTimeFormat }: AuditCellProps) {
  if (!entry?.at) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  return (
    <div className="flex flex-col gap-0">
      <span className="text-foreground text-xs">
        {formatDate(entry.at, dateTimeFormat)}
      </span>
      {entry.name && (
        <span className="text-muted-foreground truncate text-[0.6875rem]">
          {entry.name}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `bunx tsc --noEmit`
Expected: ไม่มี error (ไฟล์ใหม่ 2 ไฟล์ standalone)

- [ ] **Step 4: Commit**

```bash
git add types/audit.ts components/share/audit-cell.tsx
git commit -m "feat(shared): เพิ่ม AuditCell component + audit types ใช้ร่วม"
```

---

### Task 2: Refactor price-list ให้ใช้ shared AuditCell (regression-neutral)

เปลี่ยน price-list มาใช้ shared component/type แล้วลบ `pl-audit-cell.tsx` — พฤติกรรมหน้า price-list ต้องเหมือนเดิมทุกอย่าง

**Files:**
- Modify: `types/price-list.ts` (audit block → alias จาก shared)
- Modify: `routes/vendor-management/price-list/use-pl-table.tsx` (swap import + JSX)
- Delete: `routes/vendor-management/price-list/pl-audit-cell.tsx`

**Interfaces:**
- Consumes: `AuditEntry`, `Audit` จาก `@/types/audit`; `AuditCell` จาก `@/components/share/audit-cell` (Task 1)
- Produces: `PriceListAuditEntry` (= `AuditEntry`), `PriceListAudit` (= `Audit`) ยัง export จาก `@/types/price-list` (backward-compat)

- [ ] **Step 1: แก้ `types/price-list.ts` — เปลี่ยน audit block เป็น alias**

เพิ่ม import ที่ **บนสุดของไฟล์** (ก่อน `export type PriceListStatus`):

```ts
import type { AuditEntry, Audit } from "@/types/audit";
```

แล้วแทนที่ block เดิม (interface `PriceListAuditEntry` + `PriceListAudit`):

```ts
export interface PriceListAuditEntry {
  at: string;
  id: string;
  name: string;
}

export interface PriceListAudit {
  created?: PriceListAuditEntry;
  updated?: PriceListAuditEntry;
}
```

ด้วย:

```ts
export type PriceListAuditEntry = AuditEntry;
export type PriceListAudit = Audit;
```

(`PriceList.audit?: PriceListAudit` ที่ใช้ด้านล่างยังคงเดิม — ไม่ต้องแก้)

- [ ] **Step 2: แก้ `routes/vendor-management/price-list/use-pl-table.tsx` — สลับ import**

เปลี่ยนบรรทัด import (บรรทัด ~19):

```tsx
import { PlAuditCell } from "./pl-audit-cell";
```

เป็น:

```tsx
import { AuditCell } from "@/components/share/audit-cell";
```

- [ ] **Step 3: แก้ JSX ทั้ง 2 จุดใน `use-pl-table.tsx`**

ในคอลัมน์ `created_at` เปลี่ยน:

```tsx
      cell: ({ row }) => (
        <PlAuditCell
          entry={row.original.audit?.created}
          dateTimeFormat={dateTimeFormat}
        />
      ),
```

เป็น:

```tsx
      cell: ({ row }) => (
        <AuditCell
          entry={row.original.audit?.created}
          dateTimeFormat={dateTimeFormat}
        />
      ),
```

และในคอลัมน์ `updated_at` เปลี่ยน `<PlAuditCell entry={row.original.audit?.updated} ... />` เป็น `<AuditCell entry={row.original.audit?.updated} ... />` แบบเดียวกัน

- [ ] **Step 4: ลบไฟล์เก่า**

```bash
git rm routes/vendor-management/price-list/pl-audit-cell.tsx
```

- [ ] **Step 5: ยืนยันไม่มี importer ค้าง**

Run: `grep -rn "pl-audit-cell\|PlAuditCell" --include="*.ts" --include="*.tsx" .`
Expected: ไม่มีผลลัพธ์ (นอกจาก node_modules) — ทุกอ้างอิงถูกแทนแล้ว

- [ ] **Step 6: Type-check + tests**

Run: `bunx tsc --noEmit && bun test:run`
Expected: tsc สะอาด; เทสเดิมทั้งหมดเขียว

- [ ] **Step 7: Commit**

```bash
git add types/price-list.ts routes/vendor-management/price-list/use-pl-table.tsx
git commit -m "refactor(price-list): ใช้ shared AuditCell แทน pl-audit-cell"
```

---

### Task 3: แก้ type PriceListTemplate + เพิ่มคอลัมน์ Created/Updated

แก้ type ที่ประกาศ `created_at`/`updated_at` ผิด (backend ไม่ได้ส่งมา) → `audit?`, แล้วเพิ่ม 2 คอลัมน์ sort ได้ในตาราง

**Files:**
- Modify: `types/price-list-template.ts` (ลบ phantom fields + เพิ่ม `audit?`)
- Modify: `routes/vendor-management/price-list-template/use-plt-table.tsx` (imports + `dateTimeFormat` + 2 columns)

**Interfaces:**
- Consumes: `Audit` จาก `@/types/audit`; `AuditCell` จาก `@/components/share/audit-cell`; `useProfile` จาก `@/hooks/use-profile` (คืน `{ dateTimeFormat: string }`)
- Produces: `PriceListTemplate.audit?: Audit` ให้ Task 4 (การ์ด) ใช้

- [ ] **Step 1: แก้ `types/price-list-template.ts`**

เพิ่ม import ที่บนสุดของไฟล์:

```ts
import type { Audit } from "@/types/audit";
```

แล้วในinterface `PriceListTemplate` **ลบ** 2 บรรทัดนี้:

```ts
  created_at: string;
  updated_at: string;
```

**เพิ่ม** แทน (ต่อจาก `doc_version?: number;`):

```ts
  audit?: Audit;
```

ผลลัพธ์ท้าย interface:

```ts
export interface PriceListTemplate {
  id: string;
  name: string;
  description: string;
  note: string | null;
  status: PriceListTemplateStatus;
  validity_period: number | null;
  vendor_instructions: string | null;
  currency: { id: string; code: string };
  products: PriceListTemplateProduct[];
  doc_version?: number;
  audit?: Audit;
}
```

- [ ] **Step 2: เพิ่ม imports ใน `use-plt-table.tsx`**

เพิ่มต่อจาก import กลุ่ม hooks/components เดิม:

```tsx
import { useProfile } from "@/hooks/use-profile";
import { AuditCell } from "@/components/share/audit-cell";
```

- [ ] **Step 3: ดึง `dateTimeFormat` ในตัว hook**

ใต้ `"use no memo";` (บรรทัดแรกในตัว hook) เพิ่ม:

```tsx
  const { dateTimeFormat } = useProfile();
```

(วางก่อน/หลัง `const t = useTranslations(...)` ก็ได้ — ขอให้อยู่ในตัว hook)

- [ ] **Step 4: เพิ่ม 2 column defs ต่อท้าย `dataColumns`**

ในอาเรย์ `dataColumns` หลัง column `status` (ก่อนปิด `];`) เพิ่ม:

```tsx
    {
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

(`tfl` = `useTranslations("field")` มีอยู่แล้วในไฟล์; sortable โดยปริยาย เพราะไม่ตั้ง `enableSorting: false`)

- [ ] **Step 5: Type-check + tests**

Run: `bunx tsc --noEmit && bun test:run`
Expected: tsc สะอาด; เทสเดิมทั้งหมดเขียว

- [ ] **Step 6: Commit**

```bash
git add types/price-list-template.ts routes/vendor-management/price-list-template/use-plt-table.tsx
git commit -m "feat(price-list-template): เพิ่มคอลัมน์ Created/Updated (sort server-side) + แก้ type audit"
```

---

### Task 4: เพิ่มบรรทัด Updated ในการ์ด (grid/mobile view)

การ์ด PLT เดิมไม่มีวันที่เลย — เพิ่มบรรทัด Updated (วันเวลาจริง) ให้สอดคล้อง price-list

**Files:**
- Modify: `routes/vendor-management/price-list-template/plt-card.tsx`

**Interfaces:**
- Consumes: `PriceListTemplate.audit?.updated?.at` (Task 3); `formatDate` จาก `@/lib/date-utils`; `useProfile` จาก `@/hooks/use-profile`; `Clock` จาก `lucide-react`

- [ ] **Step 1: เพิ่ม `Clock` เข้า lucide import**

เปลี่ยนบรรทัดแรก:

```tsx
import { Coins, CalendarClock } from "lucide-react";
```

เป็น:

```tsx
import { Coins, CalendarClock, Clock } from "lucide-react";
```

- [ ] **Step 2: เพิ่ม imports `formatDate` + `useProfile`**

เพิ่มต่อจาก import เดิม (เช่น ใต้ import `Separator`):

```tsx
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
```

- [ ] **Step 3: ดึง `dateTimeFormat` ในตัว component**

ใต้บรรทัด `const ts = useTranslations("status");` เพิ่ม:

```tsx
  const { dateTimeFormat } = useProfile();
```

- [ ] **Step 4: ให้ `CardContent` wrap ได้ + เพิ่มบรรทัด Updated**

เปลี่ยน className ของ `CardContent` จาก:

```tsx
      <CardContent className="flex items-center gap-4 px-4 py-3 text-xs">
```

เป็น (ให้ wrap เมื่อ 3 รายการแน่นเกิน):

```tsx
      <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 text-xs">
```

แล้วเพิ่ม block นี้ **ก่อนปิด** `</CardContent>` (ต่อจาก block `validity_period`):

```tsx
        {item.audit?.updated?.at && (
          <div className="flex min-w-0 items-center gap-1.5">
            <Clock
              className="text-muted-foreground size-3 shrink-0"
              aria-hidden="true"
            />
            <span className="text-muted-foreground">{tfl("updated")}:</span>
            <span className="truncate font-semibold">
              {formatDate(item.audit.updated.at, dateTimeFormat)}
            </span>
          </div>
        )}
```

(`tfl` = `useTranslations("field")` มีอยู่แล้วในไฟล์)

- [ ] **Step 5: Type-check + tests**

Run: `bunx tsc --noEmit && bun test:run`
Expected: tsc สะอาด; เทสเดิมทั้งหมดเขียว

- [ ] **Step 6: Commit**

```bash
git add routes/vendor-management/price-list-template/plt-card.tsx
git commit -m "feat(price-list-template): แสดงบรรทัด Updated ในการ์ด (grid/mobile)"
```

---

### Task 5: Browser verification (list sort + cells + card + price-list regression)

ยืนยันจริงในเบราว์เซอร์ — ไม่มี commit (เป็น gate ตรวจสอบ)

**Prereq:** dev server ชี้ backend local — `VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev` (backend gateway :4000 รันอยู่); login `admin@zebra.com` / `12345678`, เลือก BU **T02**

- [ ] **Step 1: List view — คอลัมน์ + sort**

ไปที่ `/vendor-management/price-list-template` (desktop, list mode)
- เห็นคอลัมน์ **Created** และ **Updated** ต่อจาก Status
- แต่ละ cell แสดงวันเวลาจริง (เช่น `24/07/2026 09:21`) + ชื่อผู้ทำบรรทัดล่าง (muted)
- คลิก header **Created** → เรียงถูก; คลิกซ้ำ → toggle asc↔desc
- คลิก header **Updated** → เรียงถูก + toggle ได้
- เปิด DevTools → Network: request ตอน sort ส่ง query `sort=created_at:asc` / `created_at:desc` / `updated_at:desc` ตามที่คลิก
- Console ไม่มี error

- [ ] **Step 2: Card view — บรรทัด Updated**

สลับเป็น grid mode (ปุ่ม grid) หรือย่อจอเป็นมือถือ
- การ์ดแต่ละใบแสดงบรรทัด Updated (icon นาฬิกา + `Updated:` + วันเวลาจริง)
- การ์ดที่ไม่มี audit → ไม่แสดงบรรทัด (ไม่พัง)

- [ ] **Step 3: Regression — price-list เดิม**

ไปที่ `/vendor-management/price-list` (list mode)
- คอลัมน์ Created/Updated ยังแสดงถูก + sort ยังทำงาน (asc↔desc)
- Card view ยังแสดงบรรทัด Updated
- Console ไม่มี error

- [ ] **Step 4: สรุปผลตรวจ**

รายงานผลทั้ง 3 หน้า; ถ้าทุกข้อผ่าน → พร้อมเปิด PR (ผ่าน `/spartan:pr-ready` หรือขั้นตอน finishing-a-development-branch)

---

## หมายเหตุการ verify (นอก plan)

- `hooks/use-profile.ts` คืน `dateTimeFormat` (default `"DD/MM/YYYY HH:mm"`) — ใช้เหมือนที่ price-list ใช้อยู่
- `formatDate` จาก `@/lib/date-utils` รองรับ pattern เวลา (เช่น `HH:mm`) ในตัว
- backend list endpoint: `GET /api/{buCode}/pricelist-templates` — ยืนยันแล้วส่ง `audit` + validate sort field (`created_at`/`updated_at`)
