# Price List — คอลัมน์ Created / Updated พร้อม Sort — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เพิ่มคอลัมน์ Created และ Updated (sort ได้แบบ server-side) ในตาราง price list list ที่ `/vendor-management/price-list` แสดง relative time + ชื่อผู้ทำ + tooltip วันเวลาเต็ม และเพิ่มบรรทัด Updated ใน card view

**Architecture:** งาน frontend ล้วน — ไม่แตะ backend, ไม่แตะ i18n messages. สร้าง presentational cell component เดี่ยว (`PlAuditCell`) ใช้ร่วมทั้ง 2 คอลัมน์ในตาราง, เพิ่ม column defs ใน `use-pl-table.tsx` โดยตั้ง `column.id` ให้ตรงกับ backend sort field (`created_at`/`updated_at`), และเพิ่ม 1 บรรทัดในการ์ด

**Tech Stack:** React 19, TanStack Table, use-intl (`useLocale`/`useTranslations`), Tailwind, shadcn Tooltip

## Global Constraints

- **ไม่แตะ backend** — list endpoint ส่ง `audit.{created,updated}.{at,id,name}` ทุก row อยู่แล้ว (ยืนยันสด BU T02); backend sort fields จริงคือ `created_at` / `updated_at`
- **column `id` ต้องตรงกับ backend field** — TanStack สร้าง sort param จาก `column.id` (`hooks/use-data-grid-state.ts:77`); ถ้าปล่อย auto-gen จะได้ `audit_created_at` ซึ่ง backend ไม่รู้จัก → sort พังเงียบ
- **สื่อสาร/commit เป็นภาษาไทย** — code/identifier คงภาษาอังกฤษ
- **ไม่เขียน .test ใหม่** (กฎ global: skip test steps ตอน execute plan) — verify ด้วย `bunx tsc --noEmit` + `bun test:run` (เทสเดิมต้องเขียว) + browser จริง
- **timestamp เป็น UTC ISO** — แปลงเป็น local เฉพาะตอน display (`formatRelativeTime` / `toLocaleString`)
- **defensive optional chaining ทุกจุด** — `audit?.created?.at`, fallback `—`

---

## File Structure

- **Create** `routes/vendor-management/price-list/pl-audit-cell.tsx` — presentational cell: relative time + ชื่อ + tooltip. รับผิดชอบการ render audit entry อย่างเดียว ใช้ร่วม 2 คอลัมน์
- **Modify** `routes/vendor-management/price-list/use-pl-table.tsx` — เพิ่ม `useLocale`, เพิ่ม 2 column defs (`created_at`, `updated_at`)
- **Modify** `routes/vendor-management/price-list/pl-card.tsx` — เพิ่มบรรทัด Updated (icon + label + relative time)

ทั้งหมดใช้ `formatRelativeTime` (`@/lib/relative-time`), `PriceListAuditEntry` (`@/types/price-list`), Tooltip (`@/components/ui/tooltip`) ที่มีอยู่แล้ว

---

## Task 1: สร้าง PlAuditCell component

**Files:**
- Create: `routes/vendor-management/price-list/pl-audit-cell.tsx`

**Interfaces:**
- Consumes: `PriceListAuditEntry` from `@/types/price-list` (`{ at: string; id: string; name: string }`); `formatRelativeTime(iso, locale)` from `@/lib/relative-time`; `Tooltip`/`TooltipContent`/`TooltipTrigger` from `@/components/ui/tooltip`
- Produces: `export function PlAuditCell({ entry, locale }: PlAuditCellProps)` — Task 2 นำเข้าใช้ในทั้ง 2 คอลัมน์. Props: `entry: PriceListAuditEntry | undefined`, `locale: string`. Render `—` (muted) เมื่อ `entry?.at` ว่าง; ไม่งั้น relative time + ชื่อ + tooltip

- [ ] **Step 1: สร้างไฟล์ `pl-audit-cell.tsx`**

สร้าง `routes/vendor-management/price-list/pl-audit-cell.tsx`:

```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatRelativeTime } from "@/lib/relative-time";
import type { PriceListAuditEntry } from "@/types/price-list";

interface PlAuditCellProps {
  readonly entry: PriceListAuditEntry | undefined;
  readonly locale: string;
}

/**
 * Cell แสดง audit entry (created/updated) ในตาราง price list —
 * relative time + ชื่อผู้ทำ พร้อม tooltip วันเวลาเต็ม
 * @param props - entry (audit.created หรือ audit.updated) และ locale ปัจจุบัน
 * @returns React element ของ cell; แสดง "—" เมื่อไม่มีข้อมูล audit
 * @example
 * <PlAuditCell entry={row.original.audit?.created} locale={locale} />
 */
export function PlAuditCell({ entry, locale }: PlAuditCellProps) {
  if (!entry?.at) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  const relative = formatRelativeTime(entry.at, locale);
  const absolute = new Date(entry.at).toLocaleString(locale);
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <div className="flex flex-col gap-0">
          <span className="text-foreground text-xs">{relative}</span>
          {entry.name && (
            <span className="text-muted-foreground truncate text-[0.6875rem]">
              {entry.name}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {absolute}
        {entry.name && ` · ${entry.name}`}
      </TooltipContent>
    </Tooltip>
  );
}
```

- [ ] **Step 2: ตรวจ type ผ่าน**

Run: `bunx tsc --noEmit`
Expected: ไม่มี error ใหม่จากไฟล์นี้ (component ยังไม่ถูกใช้ที่ไหน — ยังคอมไพล์ผ่านเพราะเป็น named export)

- [ ] **Step 3: Commit**

```bash
git add routes/vendor-management/price-list/pl-audit-cell.tsx
git commit -m "feat(price-list): เพิ่ม PlAuditCell (relative time + ชื่อ + tooltip)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: เพิ่มคอลัมน์ Created / Updated ในตาราง

**Files:**
- Modify: `routes/vendor-management/price-list/use-pl-table.tsx`

**Interfaces:**
- Consumes: `PlAuditCell` from `./pl-audit-cell` (Task 1); `useLocale` from `use-intl`; `tfl("created")`/`tfl("updated")` (i18n มีอยู่แล้ว: en `Created`/`Updated`, th `สร้างเมื่อ`/`อัปเดตล่าสุด`)
- Produces: ตาราง price list มี 2 คอลัมน์ใหม่ต่อท้าย Status, sortable (server-side ผ่าน `column.id = created_at|updated_at`), default visible

- [ ] **Step 1: เพิ่ม import `useLocale` และ `PlAuditCell`**

ในไฟล์ `routes/vendor-management/price-list/use-pl-table.tsx`:

แก้บรรทัด import จาก use-intl (ปัจจุบัน `import { useTranslations } from "use-intl";`) เป็น:

```tsx
import { useTranslations, useLocale } from "use-intl";
```

เพิ่ม import ท้ายกลุ่ม import (หลัง `import type { useDataGridState } from "@/hooks/use-data-grid-state";`):

```tsx
import { PlAuditCell } from "./pl-audit-cell";
```

- [ ] **Step 2: เพิ่ม `const locale = useLocale()`**

ในตัว hook `usePriceListTable`, หลังบรรทัด `const { dateFormat } = useProfile();` เพิ่ม:

```tsx
  const locale = useLocale();
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
        <PlAuditCell entry={row.original.audit?.created} locale={locale} />
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
        <PlAuditCell entry={row.original.audit?.updated} locale={locale} />
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
- แสดงผ่าน PlAuditCell (relative+ชื่อ+tooltip), default visible

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: เพิ่มบรรทัด Updated ใน card view

**Files:**
- Modify: `routes/vendor-management/price-list/pl-card.tsx`

**Interfaces:**
- Consumes: `Clock` from `lucide-react`; `formatRelativeTime` from `@/lib/relative-time`; `useLocale` from `use-intl`; `item.audit?.updated?.at`; `tfl("updated")` (มีอยู่แล้ว)
- Produces: การ์ด price list แสดงบรรทัด Updated (relative time) ใต้ Effective Period; ไม่มี tooltip (เหมาะกับ touch)

- [ ] **Step 1: เพิ่ม imports**

ในไฟล์ `routes/vendor-management/price-list/pl-card.tsx`:

แก้บรรทัด `import { CalendarDays, Store } from "lucide-react";` เป็น:

```tsx
import { CalendarDays, Clock, Store } from "lucide-react";
```

แก้บรรทัด `import { useTranslations } from "use-intl";` เป็น:

```tsx
import { useTranslations, useLocale } from "use-intl";
```

เพิ่ม import (ต่อจากกลุ่ม import เดิม เช่นหลัง `import { formatDate } from "@/lib/date-utils";`):

```tsx
import { formatRelativeTime } from "@/lib/relative-time";
```

- [ ] **Step 2: เพิ่ม `const locale = useLocale()`**

ในตัว component `PriceListCard`, หลังบรรทัด `const { dateFormat } = useProfile();` เพิ่ม:

```tsx
  const locale = useLocale();
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
                {formatRelativeTime(item.audit.updated.at, locale)}
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
git commit -m "feat(price-list): การ์ดแสดงบรรทัด Updated (relative time)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Browser verification (live backend)

**Files:** ไม่แก้ไฟล์ — ตรวจสอบด้วยตาผ่าน browser จริง

**Interfaces:**
- Consumes: dev server (`VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev`), account `admin@zebra.com` / `12345678`, BU T02

- [ ] **Step 1: รัน dev server ชี้ local backend**

Run: `VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev`
Expected: dev server ขึ้นที่ `http://localhost:3000`

- [ ] **Step 2: เปิดหน้า price list แล้วเช็ค list view**

ไปที่ `http://localhost:3000/vendor-management/price-list` (login ถ้าจำเป็น, เลือก BU ZEBRA/T02)
Expected: เห็นคอลัมน์ Created และ Updated ต่อท้าย Status แต่ละแถวโชว์ relative time + ชื่อผู้ทำ (เช่น "3 months ago" / "Admin Fernando Torres"); แถวไม่มี audit โชว์ `—`

- [ ] **Step 3: เช็ค sort + network param**

คลิก header "Created" (สังเกต network tab): request มี `sort=created_at:asc` แล้วคลิกซ้ำ → `sort=created_at:desc`; ทำซ้ำกับ "Updated" → `sort=updated_at:asc/desc`
Expected: ลำดับแถวเปลี่ยนตามจริง, toggle asc↔desc ได้ทุกครั้ง, ไม่ค้าง

- [ ] **Step 4: เช็ค tooltip**

hover ที่ cell Created/Updated
Expected: tooltip แสดงวันเวลาเต็ม (`toLocaleString`) + ` · ชื่อ`

- [ ] **Step 5: เช็ค card view + console**

ย่อ browser ให้เป็น mobile width (หรือสลับเป็น grid view) → ดูการ์ด
Expected: การ์ดแสดงบรรทัด "Updated" (icon นาฬิกา + relative time) ใต้ Effective Period; console ไม่มี error

- [ ] **Step 6: บันทึกผล**

ถ้าทุกข้อผ่าน — feature เสร็จ. ถ้าเจอปัญหา ให้ย้อนไปแก้ Task ที่เกี่ยว แล้วรัน verify ซ้ำ

---

## Self-Review

**1. Spec coverage:**
- คอลัมน์ Created + Updated sortable → Task 2 ✓
- รูปแบบ relative + ชื่อ + tooltip → Task 1 (`PlAuditCell`) ✓
- default visible → Task 2 (ไม่ตั้ง hidden meta) ✓
- Updated ในการ์ด → Task 3 ✓
- id ตรง backend field เพื่อ sort ถูก → Task 2 Step 3 + Global Constraints ✓
- backend ไม่แตะ / i18n ไม่แตะ → ยืนยันใน Global Constraints ✓
- edge cases (audit หาย → `—`, loading skeleton, sort toggle) → Task 1 (`—`), Task 2 (`columnSkeletons.text`), Task 4 Step 3 ✓
- นอกขอบเขต (xlsx export, sort ใน card) → ไม่มี task, ตรงตาม spec ✓

**2. Placeholder scan:** ไม่มี TBD/TODO; ทุก code step มีโค้ดจริงครบ ✓

**3. Type consistency:** `PlAuditCell({ entry, locale })` นิยามใน Task 1, เรียกใน Task 2 ด้วย signature เดียวกัน (`entry`, `locale`) ✓; `PriceListAuditEntry` field (`at`/`id`/`name`) ตรงกับ `types/price-list.ts` ✓; column `id` = `created_at`/`updated_at` สอดคล้องกับ backend sort field ที่ verify แล้ว ✓
