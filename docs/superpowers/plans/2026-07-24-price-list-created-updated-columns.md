# Price List — คอลัมน์ Created / Updated พร้อม Sort — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **อัปเดต (หลัง implement):** plan เดิมสร้าง cell แบบ **relative time + tooltip** (เหมือน workflow table)
> ระหว่างทาง user ขอเปลี่ยนเป็น **วันเวลาจริง** — จึง refactor เป็น `formatDate(at, dateTimeFormat)`
> และตัด tooltip ออก (ข้อมูลซ้ำ). เอกสารนี้สะท้อน **implementation สุดท้าย** แล้ว
> (ประวัติจริงมี 4 commits: 3 ตัวแรกเป็น relative แล้ว commit ที่ 4 refactor เป็น datetime — ดู PR #63)

**Goal:** เพิ่มคอลัมน์ Created และ Updated (sort ได้แบบ server-side) ในตาราง price list list ที่ `/vendor-management/price-list` แสดงวันเวลาจริง (ตาม `dateTimeFormat` ของ BU) + ชื่อผู้ทำ และเพิ่มบรรทัด Updated ใน card view

**Architecture:** งาน frontend ล้วน — ไม่แตะ backend, ไม่แตะ i18n messages. สร้าง presentational cell component เดี่ยว (`PlAuditCell`) ใช้ร่วมทั้ง 2 คอลัมน์ในตาราง, เพิ่ม column defs ใน `use-pl-table.tsx` โดยตั้ง `column.id` ให้ตรงกับ backend sort field (`created_at`/`updated_at`), และเพิ่ม 1 บรรทัดในการ์ด

**Tech Stack:** React 19, TanStack Table, use-intl (`useTranslations`), Tailwind, `formatDate` (`@/lib/date-utils`)

## Global Constraints

- **ไม่แตะ backend** — list endpoint ส่ง `audit.{created,updated}.{at,id,name}` ทุก row อยู่แล้ว (ยืนยันสด BU T02); backend sort fields จริงคือ `created_at` / `updated_at`
- **column `id` ต้องตรงกับ backend field** — TanStack สร้าง sort param จาก `column.id` (`hooks/use-data-grid-state.ts:77`); ถ้าปล่อย auto-gen จะได้ `audit_created_at` ซึ่ง backend ไม่รู้จัก → sort พังเงียบ
- **สื่อสาร/commit เป็นภาษาไทย** — code/identifier คงภาษาอังกฤษ
- **ไม่เขียน .test ใหม่** (กฎ global: skip test steps ตอน execute plan) — verify ด้วย `bunx tsc --noEmit` + `bun test:run` (เทสเดิมต้องเขียว) + browser จริง
- **timestamp เป็น UTC ISO** — แปลง/ฟอร์แมตเป็น local เฉพาะตอน display ผ่าน `formatDate(at, dateTimeFormat)`
- **defensive optional chaining ทุกจุด** — `audit?.created?.at`, fallback `—`

---

## File Structure

- **Create** `routes/vendor-management/price-list/pl-audit-cell.tsx` — presentational cell: วันเวลาจริง + ชื่อ (2 บรรทัด). รับผิดชอบการ render audit entry อย่างเดียว ใช้ร่วม 2 คอลัมน์
- **Modify** `routes/vendor-management/price-list/use-pl-table.tsx` — เพิ่ม `dateTimeFormat` (จาก `useProfile`), เพิ่ม 2 column defs (`created_at`, `updated_at`)
- **Modify** `routes/vendor-management/price-list/pl-card.tsx` — เพิ่มบรรทัด Updated (icon + label + วันเวลาจริง)

ทั้งหมดใช้ `formatDate` (`@/lib/date-utils`) และ `PriceListAuditEntry` (`@/types/price-list`) ที่มีอยู่แล้ว

---

## Task 1: สร้าง PlAuditCell component

**Files:**
- Create: `routes/vendor-management/price-list/pl-audit-cell.tsx`

**Interfaces:**
- Consumes: `PriceListAuditEntry` from `@/types/price-list` (`{ at: string; id: string; name: string }`); `formatDate(iso, dateFormat)` from `@/lib/date-utils`
- Produces: `export function PlAuditCell({ entry, dateTimeFormat }: PlAuditCellProps)` — Task 2 นำเข้าใช้ในทั้ง 2 คอลัมน์. Props: `entry: PriceListAuditEntry | undefined`, `dateTimeFormat: string`. Render `—` (muted) เมื่อ `entry?.at` ว่าง; ไม่งั้น วันเวลาจริง + ชื่อ (2 บรรทัด)

- [ ] **Step 1: สร้างไฟล์ `pl-audit-cell.tsx`**

สร้าง `routes/vendor-management/price-list/pl-audit-cell.tsx`:

```tsx
import { formatDate } from "@/lib/date-utils";
import type { PriceListAuditEntry } from "@/types/price-list";

interface PlAuditCellProps {
  readonly entry: PriceListAuditEntry | undefined;
  readonly dateTimeFormat: string;
}

/**
 * Cell แสดง audit entry (created/updated) ในตาราง price list —
 * วันเวลาจริง (ตาม dateTimeFormat ของ BU) + ชื่อผู้ทำ
 * @param props - entry (audit.created หรือ audit.updated) และ dateTimeFormat ปัจจุบัน
 * @returns React element ของ cell; แสดง "—" เมื่อไม่มีข้อมูล audit
 * @example
 * <PlAuditCell entry={row.original.audit?.created} dateTimeFormat={dateTimeFormat} />
 */
export function PlAuditCell({ entry, dateTimeFormat }: PlAuditCellProps) {
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

- [ ] **Step 2: ตรวจ type ผ่าน**

Run: `bunx tsc --noEmit`
Expected: ไม่มี error ใหม่จากไฟล์นี้ (component ยังไม่ถูกใช้ที่ไหน — ยังคอมไพล์ผ่านเพราะเป็น named export)

- [ ] **Step 3: Commit**

```bash
git add routes/vendor-management/price-list/pl-audit-cell.tsx
git commit -m "feat(price-list): เพิ่ม PlAuditCell (วันเวลาจริง + ชื่อ)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: เพิ่มคอลัมน์ Created / Updated ในตาราง

**Files:**
- Modify: `routes/vendor-management/price-list/use-pl-table.tsx`

**Interfaces:**
- Consumes: `PlAuditCell` from `./pl-audit-cell` (Task 1); `dateTimeFormat` from `useProfile()` (มีอยู่แล้ว, default `"DD/MM/YYYY HH:mm"`); `tfl("created")`/`tfl("updated")` (i18n มีอยู่แล้ว: en `Created`/`Updated`, th `สร้างเมื่อ`/`อัปเดตล่าสุด`)
- Produces: ตาราง price list มี 2 คอลัมน์ใหม่ต่อท้าย Status, sortable (server-side ผ่าน `column.id = created_at|updated_at`), default visible

- [ ] **Step 1: เพิ่ม import `PlAuditCell`**

ในไฟล์ `routes/vendor-management/price-list/use-pl-table.tsx` เพิ่ม import ท้ายกลุ่ม import (หลัง `import type { useDataGridState } from "@/hooks/use-data-grid-state";`):

```tsx
import { PlAuditCell } from "./pl-audit-cell";
```

- [ ] **Step 2: เพิ่ม `dateTimeFormat` เข้า destructure จาก `useProfile()`**

ในตัว hook `usePriceListTable`, แก้บรรทัด `const { dateFormat } = useProfile();` เป็น:

```tsx
  const { dateFormat, dateTimeFormat } = useProfile();
```

- [ ] **Step 3: เพิ่ม 2 column defs ต่อท้าย `dataColumns`**

ใน array `dataColumns` แทรก 2 object นี้ **หลัง** column `status` (ก่อนปิด `]` ของ `dataColumns`) — คือหลัง object ที่มี `accessorKey: "status"` และก่อน `];`:

```tsx
    {
      id: "created_at",
      accessorFn: (row) => row.audit?.created?.at ?? "",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("created")} />
      ),
      cell: ({ row }) => (
        <PlAuditCell
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
        <PlAuditCell
          entry={row.original.audit?.updated}
          dateTimeFormat={dateTimeFormat}
        />
      ),
      size: 160,
      meta: { headerTitle: tfl("updated"), skeleton: columnSkeletons.text },
    },
```

หมายเหตุ: ไม่ตั้ง `enableSorting: false` → sortable โดยปริยาย. default sort คงเดิม (`pricelist_no:asc` ใน `pl-component.tsx`)

- [ ] **Step 4: ตรวจ type + เทสเดิม**

Run: `bunx tsc --noEmit && bun test:run`
Expected: type ผ่านสะอาด; เทสเดิมทั้งหมดเขียว (การเพิ่มคอลัมน์ไม่กระทบ test อื่น)

- [ ] **Step 5: Commit**

```bash
git add routes/vendor-management/price-list/use-pl-table.tsx
git commit -m "feat(price-list): เพิ่มคอลัมน์ Created/Updated (sort server-side)

- id = created_at/updated_at ให้ sort param ตรง backend field
- แสดงผ่าน PlAuditCell (วันเวลาจริง + ชื่อ), default visible

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: เพิ่มบรรทัด Updated ใน card view

**Files:**
- Modify: `routes/vendor-management/price-list/pl-card.tsx`

**Interfaces:**
- Consumes: `Clock` from `lucide-react`; `formatDate` from `@/lib/date-utils` (มี import อยู่แล้วในไฟล์); `dateTimeFormat` from `useProfile()`; `item.audit?.updated?.at`; `tfl("updated")` (มีอยู่แล้ว)
- Produces: การ์ด price list แสดงบรรทัด Updated (วันเวลาจริง) ใต้ Effective Period

- [ ] **Step 1: เพิ่ม import `Clock`**

ในไฟล์ `routes/vendor-management/price-list/pl-card.tsx` แก้บรรทัด `import { CalendarDays, Store } from "lucide-react";` เป็น:

```tsx
import { CalendarDays, Clock, Store } from "lucide-react";
```

(`formatDate` มี import อยู่แล้ว — ไม่ต้องเพิ่ม)

- [ ] **Step 2: เพิ่ม `dateTimeFormat` เข้า destructure จาก `useProfile()`**

ในตัว component `PriceListCard`, แก้บรรทัด `const { dateFormat } = useProfile();` เป็น:

```tsx
  const { dateFormat, dateTimeFormat } = useProfile();
```

- [ ] **Step 3: เพิ่มบรรทัด Updated ใน `CardContent`**

ใน `<CardContent>` — **หลัง** block `{item.effectivePeriod && (...)}` (ก่อนปิด `</CardContent>`) แทรก:

```tsx
        {item.audit?.updated?.at && (
          <div className="flex items-start gap-2">
            <Clock
              className="text-muted-foreground mt-0.5 size-3 shrink-0"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">{tfl("updated")}</p>
              <p className="truncate font-semibold">
                {formatDate(item.audit.updated.at, dateTimeFormat)}
              </p>
            </div>
          </div>
        )}
```

- [ ] **Step 4: ตรวจ type + เทสเดิม**

Run: `bunx tsc --noEmit && bun test:run`
Expected: type ผ่านสะอาด; เทสเดิมทั้งหมดเขียว

- [ ] **Step 5: Commit**

```bash
git add routes/vendor-management/price-list/pl-card.tsx
git commit -m "feat(price-list): การ์ดแสดงบรรทัด Updated (วันเวลาจริง)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Browser verification (live backend)

**Files:** ไม่แก้ไฟล์ — ตรวจสอบด้วยตาผ่าน browser จริง

**Interfaces:**
- Consumes: dev server (`VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev`), account `admin@zebra.com` / `12345678`, BU T02

- [ ] **Step 1: รัน dev server ชี้ local backend**

Run: `VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev`
Expected: dev server ขึ้นที่ `http://localhost:3000` (ถ้า 3000 ถูกใช้จะขยับไป 3001)

- [ ] **Step 2: เปิดหน้า price list แล้วเช็ค list view**

ไปที่ `http://localhost:3000/vendor-management/price-list` (login ถ้าจำเป็น, เลือก BU ZEBRA/T02)
Expected: เห็นคอลัมน์ Created และ Updated ต่อท้าย Status แต่ละแถวโชว์วันเวลาจริง (เช่น `2026-03-03 17:38:45`) + ชื่อผู้ทำบรรทัดล่าง; แถวไม่มี audit โชว์ `—`

- [ ] **Step 3: เช็ค sort + network param**

คลิก header "Created" (สังเกต network tab): request มี `sort=created_at:asc` แล้วคลิกซ้ำ → `sort=created_at:desc`; ทำซ้ำกับ "Updated" → `sort=updated_at:asc/desc`
Expected: ลำดับแถวเปลี่ยนตามจริง, toggle asc↔desc ได้ทุกครั้ง, ไม่ค้าง, response 200

- [ ] **Step 4: เช็ค card view + console**

ย่อ browser ให้เป็น mobile width (หรือสลับเป็น grid view) → ดูการ์ด
Expected: การ์ดแสดงบรรทัด "Updated" (icon นาฬิกา + วันเวลาจริง) ใต้ Effective Period; console ไม่มี error

- [ ] **Step 5: บันทึกผล**

ถ้าทุกข้อผ่าน — feature เสร็จ. ถ้าเจอปัญหา ให้ย้อนไปแก้ Task ที่เกี่ยว แล้วรัน verify ซ้ำ

---

## Self-Review

**1. Spec coverage:**
- คอลัมน์ Created + Updated sortable → Task 2 ✓
- รูปแบบ วันเวลาจริง + ชื่อ → Task 1 (`PlAuditCell`) ✓
- default visible → Task 2 (ไม่ตั้ง hidden meta) ✓
- Updated ในการ์ด → Task 3 ✓
- id ตรง backend field เพื่อ sort ถูก → Task 2 Step 3 + Global Constraints ✓
- backend ไม่แตะ / i18n ไม่แตะ → ยืนยันใน Global Constraints ✓
- edge cases (audit หาย → `—`, loading skeleton, sort toggle) → Task 1 (`—`), Task 2 (`columnSkeletons.text`), Task 4 Step 3 ✓
- นอกขอบเขต (xlsx export, sort ใน card) → ไม่มี task, ตรงตาม spec ✓

**2. Placeholder scan:** ไม่มี TBD/TODO; ทุก code step มีโค้ดจริงครบ ✓

**3. Type consistency:** `PlAuditCell({ entry, dateTimeFormat })` นิยามใน Task 1, เรียกใน Task 2 ด้วย signature เดียวกัน (`entry`, `dateTimeFormat`) ✓; `PriceListAuditEntry` field (`at`/`id`/`name`) ตรงกับ `types/price-list.ts` ✓; column `id` = `created_at`/`updated_at` สอดคล้องกับ backend sort field ที่ verify แล้ว ✓
