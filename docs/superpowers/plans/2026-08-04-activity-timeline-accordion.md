# Activity timeline + accordion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เปลี่ยน activity sheet ของใบขอซื้อจากรายการแบน ๆ เป็นไทม์ไลน์ชุดเดียวกับ workflow history โดยแต่ละแถวกางดู diff ได้

**Architecture:** เพิ่ม prop optional 3 ตัว (`expandable` / `open` / `onOpenChange`) เข้า `HistoryTimelineItem` ซึ่งเป็น primitive ที่ workflow history ใช้อยู่ — เมื่อส่ง `expandable` มา แถวจะห่อหัวข้อด้วย `CollapsibleTrigger` และวางเนื้อหาที่กางออกไว้ในคอลัมน์เนื้อหาเดิม ทำให้เส้นราง (`border-l` ของคอลัมน์นั้น) ยืดคลุมเองโดยไม่ต้องคำนวณความสูง แล้ว `pr-activity-sheet.tsx` เปลี่ยนมาเรนเดอร์ผ่าน primitive นี้

**Tech Stack:** React 19 · TypeScript · Tailwind 4 · Radix Collapsible (`components/ui/collapsible.tsx`) · `use-intl` · Vitest

**Spec:** [`docs/superpowers/specs/2026-08-04-activity-timeline-accordion-design.md`](../specs/2026-08-04-activity-timeline-accordion-design.md)

## Global Constraints

- **ห้ามเขียนไฟล์ test ใหม่** — working preference ของโปรเจกต์ ให้ข้ามขั้น "เขียน test ที่ fail ก่อน" ทั้งหมด แต่ **suite เดิมต้องเขียว 100%**
- Static check ไม่ใช่ test — ต้องรันทุกครั้ง: `bunx tsc --noEmit` และ `bun run lint`
- Test เดิม 6 เคสใน `routes/procurement/purchase-request/pr-activity-sheet.test.tsx` **ห้ามแก้** — ถ้าแดงแปลว่าโครงสร้างที่ผู้ใช้สัมผัสได้เปลี่ยนไปจริง ให้หยุดแล้วรายงาน
- Commit message เขียนเป็น **ภาษาไทย**
- ห้าม import `next*` ใด ๆ (ESLint บล็อกอยู่) · ใช้ `use-intl` ไม่ใช่ `next-intl`
- คอมเมนต์ในโค้ดเขียนภาษาไทย ตามไฟล์รอบข้าง — และอธิบาย **ทำไม** ไม่ใช่ **ทำอะไร**
- ห้ามใส่คลาสสีดิบ ใช้ token เดิม (`bg-muted/50`, `text-muted-foreground`, `bg-destructive`) เท่านั้น

## File Structure

| ไฟล์ | ความรับผิดชอบ | สถานะ |
|---|---|---|
| `components/share/history-timeline.tsx` | primitive ของไทม์ไลน์ — grid ราง/เส้น/เนื้อหา · การ format วันเวลา · `formatElapsed` | แก้ (Task 1) |
| `components/share/workflow-history-timeline.tsx` | ไทม์ไลน์ระดับเอกสารของ PR/PO/SR | แก้ import เท่านั้น (Task 1) |
| `messages/en.json`, `messages/th.json` | ข้อความ | เพิ่ม 3 key (Task 2) |
| `routes/procurement/purchase-request/pr-activity-sheet.tsx` | Sheet ประวัติกิจกรรมของใบขอซื้อ | แก้ส่วนเรนเดอร์ (Task 2) |

`components/share/item-history-sheet.tsx` ได้ prop ใหม่ไปโดยไม่ต้องแก้และยังไม่มีคนเรียกใช้ — **ห้ามแตะ**

---

## Task 1: primitive รองรับแถวที่กางได้

**Files:**
- Modify: `components/share/history-timeline.tsx`
- Modify: `components/share/workflow-history-timeline.tsx:1-14` (import), ลบบรรทัด 50-82 (`formatElapsed`)

**Interfaces:**
- Consumes: `Collapsible` / `CollapsibleTrigger` / `CollapsibleContent` จาก `@/components/ui/collapsible` (Radix ล้วน ไม่มีคลาส animation)
- Produces:
  - `export function formatElapsed(fromIso: string, toIso: string, t: (key: string, values?: Record<string, number>) => string): string | null`
  - `HistoryTimelineItemProps` เพิ่ม `expandable?: ReactNode` · `open?: boolean` · `onOpenChange?: (open: boolean) => void`

- [ ] **Step 1: ย้าย `formatElapsed` เข้ามาไว้ที่ primitive**

เปิด `components/share/workflow-history-timeline.tsx` **ตัด** function `formatElapsed` ทั้งก้อน (พร้อม JSDoc ด้านบน — บรรทัด 50-82) ออกมา แล้ววางลงใน `components/share/history-timeline.tsx` ต่อจาก `MARKER_CLASS` โดยเติมคำว่า `export` ข้างหน้า ตรรกะข้างในห้ามแก้แม้แต่บรรทัดเดียว:

```tsx
/**
 * ช่วงเวลาระหว่างสองก้าว เป็นข้อความสั้นตาม locale
 *
 * คืน `null` เมื่อห่างกันไม่ถึง 5 วินาที เพราะนั่นคือก้าวที่ระบบทำต่อกันเองใน
 * ทรานแซกชันเดียว (เช่น approve ด่านสุดท้ายแล้ว complete ทันที) — บอกว่า
 * "ผ่านไป 0 วินาที" ไม่ได้ให้ข้อมูลอะไร มีแต่เพิ่มบรรทัด
 *
 * อยู่ที่นี่เพราะไทม์ไลน์ทุกตัวที่แสดงช่องว่างของรางต้องใช้ข้อความชุดเดียวกัน
 * (workflow history ระดับเอกสาร และ activity log ของใบขอซื้อ)
 *
 * @param fromIso - เวลาของก้าวก่อนหน้า (เก่ากว่า)
 * @param toIso - เวลาของก้าวนี้
 * @param t - ตัวแปลจาก namespace `history`
 * @returns ข้อความช่วงเวลา หรือ null เมื่อสั้นเกินกว่าจะมีความหมาย
 */
export function formatElapsed(
  fromIso: string,
  toIso: string,
  t: (key: string, values?: Record<string, number>) => string,
): string | null {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return null;

  const seconds = Math.round((to - from) / 1000);
  if (seconds < 5) return null;
  if (seconds < 60) return t("elapsedSeconds", { count: seconds });

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return t("elapsedMinutes", { count: minutes });

  const hours = Math.round(minutes / 60);
  if (hours < 24) return t("elapsedHours", { count: hours });

  return t("elapsedDays", { count: Math.round(hours / 24) });
}
```

- [ ] **Step 2: แก้ import ของ `workflow-history-timeline.tsx`**

เพิ่ม `formatElapsed` เข้าไปใน import block ที่มีอยู่แล้ว (บรรทัด 3-7) ให้เป็น:

```tsx
import {
  formatElapsed,
  HistoryTimeline,
  HistoryTimelineDay,
  HistoryTimelineItem,
} from "@/components/share/history-timeline";
```

ไม่ต้องแก้จุดที่เรียกใช้ (`formatElapsed(olderAt, at, t)`) — ชื่อและ signature เหมือนเดิมทุกอย่าง

- [ ] **Step 3: เพิ่ม import ของ Collapsible กับ ChevronRight ใน `history-timeline.tsx`**

แก้ import block บนสุดของไฟล์ให้เป็น:

```tsx
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatDate } from "@/lib/date-utils";
import { useProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";
```

- [ ] **Step 4: เพิ่ม 3 prop เข้า `HistoryTimelineItemProps`**

เติมท้าย interface `HistoryTimelineItemProps` (ต่อจาก `elapsed`):

```tsx
  /**
   * เนื้อหาที่กางออก — ส่งมาเมื่อไหร่ แถวจะกลายเป็น accordion
   *
   * เนื้อหาถูกวางในคอลัมน์เดียวกับหัวข้อ เส้นราง (`border-l` ของคอลัมน์นั้น)
   * จึงยืดคลุมเองโดยไม่ต้องวัดความสูง
   */
  readonly expandable?: ReactNode;
  /**
   * สถานะกาง — controlled ล้วน ผู้เรียกต้องถือ state เอง
   *
   * ตั้งใจไม่มีโหมด uncontrolled เพราะผู้ใช้จริงทุกรายต้องการ "เปิดได้ทีละแถว"
   * ซึ่งทำไม่ได้ถ้าแต่ละแถวถือ state ของตัวเอง
   */
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
```

- [ ] **Step 5: แก้ body ของ `HistoryTimelineItem`**

แทนที่ function `HistoryTimelineItem` ทั้งก้อน (ตั้งแต่ `export function HistoryTimelineItem({` จนถึงปีกกาปิดของ function) ด้วย:

```tsx
export function HistoryTimelineItem({
  at,
  marker = "default",
  tone = "default",
  badge,
  title,
  children,
  elapsed,
  expandable,
  open,
  onOpenChange,
}: HistoryTimelineItemProps) {
  const { dateFormat, hasTime, groupByDay } = useHistoryTimelineContext();

  // เมื่อจัดกลุ่มตามวัน วันที่ย้ายไปอยู่หัวข้อคั่นแล้ว รางเหลือแต่เวลา — ใช้
  // "HH:mm" ตรง ๆ ไม่ต้องแยกส่วนเวลาออกจาก dateFormat ซึ่งทำไม่ได้เสมอไป
  const dateLine = groupByDay ? formatDate(at, "HH:mm") : formatDate(at, dateFormat);
  const timeLine = groupByDay || hasTime ? "" : formatDate(at, "HH:mm");
  // dateLine ว่างแปลว่า `at` parse เป็นวันที่ไม่ได้ (ดู formatDate) — attribute
  // `dateTime` ต้องไม่ใส่ค่าที่ไม่ valid ไปด้วย ปล่อยเป็น undefined แทน
  const dateTimeAttr = dateLine ? at : undefined;

  // หัวข้อ + บรรทัดรอง ใช้ร่วมกันทั้งแถวที่กางได้และกางไม่ได้ — แถวที่กางได้เอา
  // ทั้งก้อนไปใส่ใน trigger เพื่อให้คลิกที่หัวข้อก็เปิด ไม่ใช่ต้องเล็งลูกศรเล็ก ๆ
  const headline = (
    <>
      {/* หัวข้อกับ badge อยู่แถวเดียวกันได้ เพราะ badge ถูกสงวนไว้ให้ก้าวที่
          ผิดปกติเท่านั้น — แถวส่วนใหญ่จึงมีแค่หัวข้อ ไม่แย่งที่กัน */}
      {(title || badge) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {title && <p className="text-sm font-medium">{title}</p>}
          {badge}
        </div>
      )}
      {/* div ไม่ใช่ p — แถวที่กางได้เอาก้อนนี้ไปไว้ในปุ่ม ซึ่งซ้อนใน <p> ไม่ได้ */}
      {children && (
        <div className="text-muted-foreground text-xs">{children}</div>
      )}
    </>
  );

  return (
    <li className="group/hist col-span-2 grid grid-cols-subgrid">
      <time
        dateTime={dateTimeAttr}
        className="text-micro text-muted-foreground pt-0.5 text-right leading-tight tabular-nums whitespace-nowrap"
      >
        <span className="block">{dateLine}</span>
        {timeLine && <span className="block">{timeLine}</span>}
      </time>
      <div className="relative min-w-0 border-l pb-5 pl-4 group-last/hist:border-transparent group-last/hist:pb-0">
        <span
          aria-hidden="true"
          className={cn(
            "ring-background absolute top-1.5 left-0 size-2 -translate-x-1/2 rounded-full ring-4",
            tone === "alert" ? "bg-destructive" : MARKER_CLASS[marker],
          )}
        />
        {expandable ? (
          <Collapsible open={open} onOpenChange={onOpenChange}>
            <CollapsibleTrigger className="hover:bg-muted/50 focus-visible:ring-ring flex w-full cursor-pointer items-start gap-2 rounded-md py-0.5 pr-1 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none">
              <div className="min-w-0 flex-1">{headline}</div>
              <ChevronRight
                aria-hidden="true"
                className={cn(
                  "text-muted-foreground mt-1 size-3.5 shrink-0 transition-transform",
                  open && "rotate-90",
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>{expandable}</CollapsibleContent>
          </Collapsible>
        ) : (
          headline
        )}
        {/* elapsed อยู่นอก Collapsible เสมอ — ความหมายของมันคือช่องว่างที่ติดกับ
            แถวที่เก่ากว่าซึ่งอยู่ข้างล่าง ต้องเห็นได้ทั้งตอนกางและตอนหุบ */}
        {elapsed && (
          <p className="text-muted-foreground/70 mt-2 text-micro-legal">
            {elapsed}
          </p>
        )}
      </div>
    </li>
  );
}
```

- [ ] **Step 6: อัปเดต JSDoc ของ `HistoryTimelineItem`**

เติมสองบรรทัดนี้ต่อท้ายรายการ `@param` ที่มีอยู่ (เหนือ `@returns`):

```
 * @param props.expandable - เนื้อหาที่กางออก (ส่งมาแล้วแถวจะกลายเป็น accordion)
 * @param props.open - สถานะกาง (controlled)
 * @param props.onOpenChange - callback เมื่อกด trigger
```

- [ ] **Step 7: ตรวจ type และ lint**

```bash
bunx tsc --noEmit && bun run lint
```

Expected: ผ่านทั้งคู่ ไม่มี output ของ error

- [ ] **Step 8: รัน suite เดิมทั้งหมด**

```bash
bun test:run
```

Expected: เขียวทั้งหมด — ขั้นนี้ยังไม่มีอะไรเปลี่ยนพฤติกรรม (prop ใหม่ยังไม่มีคนส่งมา และ `formatElapsed` แค่ย้ายบ้าน)

- [ ] **Step 9: Commit**

```bash
git add components/share/history-timeline.tsx components/share/workflow-history-timeline.tsx
git commit -m "$(cat <<'EOF'
feat(history-timeline): รองรับแถวที่กางดูรายละเอียดได้

เพิ่ม prop optional expandable/open/onOpenChange — เนื้อหาที่กางออกอยู่ใน
คอลัมน์เดียวกับหัวข้อ เส้นรางจึงยืดคลุมเองโดยไม่ต้องวัดความสูง
ย้าย formatElapsed มาไว้ที่นี่เพราะ activity log กำลังจะใช้ตัวเดียวกัน

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: activity sheet ของ PR เรนเดอร์เป็นไทม์ไลน์

**Files:**
- Modify: `messages/en.json`, `messages/th.json` (namespace `history`)
- Modify: `routes/procurement/purchase-request/pr-activity-sheet.tsx`
- Test (ห้ามแก้ ต้องเขียว): `routes/procurement/purchase-request/pr-activity-sheet.test.tsx`

**Interfaces:**
- Consumes จาก Task 1: `formatElapsed(fromIso, toIso, t)` · `HistoryTimelineItem` prop `expandable` / `open` / `onOpenChange`
- Consumes ของเดิมในไฟล์ (ห้ามแก้): `humanize(value: string): string` · `actorNameOf(log: ActivityLog): string` · `ActivityChanges({ logId }: { logId: string })` · `getLogCreatedAt(log): string`
- Produces: ไม่มี export ใหม่ — `PrActivitySheet` คง signature เดิมทุก prop

- [ ] **Step 1: เพิ่ม 3 key ใน `messages/en.json`**

ใน object `history` เติมต่อจาก `"documentCreated"`:

```json
    "actionCreated": "Created",
    "actionUpdated": "Updated",
    "actionDeleted": "Deleted"
```

- [ ] **Step 2: เพิ่ม 3 key ใน `messages/th.json`**

ใน object `history` เติมต่อจาก `"documentCreated"`:

```json
    "actionCreated": "สร้าง",
    "actionUpdated": "แก้ไข",
    "actionDeleted": "ลบ"
```

- [ ] **Step 3: แก้ import block ของ `pr-activity-sheet.tsx`**

แทนที่ import block ทั้งก้อน (บรรทัด 1-31) ด้วย:

```tsx
import { Fragment, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "use-intl";
import {
  formatElapsed,
  HistoryTimeline,
  HistoryTimelineDay,
  HistoryTimelineItem,
  type HistoryTimelineMarker,
} from "@/components/share/history-timeline";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useActivityLogByRecord,
  useActivityLogDetail,
} from "@/hooks/use-activity-log";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import {
  getLogCreatedAt,
  type ActivityChildChange,
  type ActivityFieldChange,
  type ActivityLog,
} from "@/types/activity-log";
```

หายไป: `ChevronRight` · `Badge` · `Collapsible*` · `cn` — ทั้งหมดถูกใช้เฉพาะในโค้ดที่กำลังจะถูกลบ

- [ ] **Step 4: แทน `ACTION_CLASS` ด้วยตารางหัวข้อและชุด action ที่ต้องเตือน**

ลบ block `ACTION_CLASS` (บรรทัด 33-40 พร้อมคอมเมนต์ด้านบน) แล้วใส่แทนที่:

```tsx
/** action → key หัวข้อใน namespace `history` (action นอกรายการนี้ตกไปที่ humanize) */
const ACTION_TITLE_KEY: Record<string, string> = {
  create: "actionCreated",
  update: "actionUpdated",
  delete: "actionDeleted",
};

/**
 * action ที่ทำลายข้อมูล — ย้อมจุด marker เป็นสีเตือนแบบเดียวกับก้าวที่ผิดปกติของ
 * workflow history เพื่อให้กวาดตาแล้วเจอทันทีว่าใครลบอะไรไป
 */
const ALERT_ACTIONS = new Set(["delete"]);
```

- [ ] **Step 5: แทนที่ body ของ `PrActivitySheet`**

แทนที่ตั้งแต่บรรทัด `export function PrActivitySheet({` จนจบไฟล์ ด้วย (JSDoc เหนือ function เดิมคงไว้ แต่แก้ประโยคแรกตามด้านล่าง):

```tsx
export function PrActivitySheet({
  prId,
  prNo,
  open,
  onOpenChange,
}: PrActivitySheetProps) {
  const t = useTranslations("procurement.purchaseRequest");
  // key หัวข้อกับข้อความช่วงเวลาเป็นคำของไทม์ไลน์ ไม่ใช่ศัพท์ของใบขอซื้อ
  // จึงอยู่คนละ namespace กับ `t`
  const tHistory = useTranslations("history");
  const { dateFormat } = useProfile();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // fetch ต่อเมื่อ sheet เปิด — ผู้ใช้ส่วนใหญ่ไม่เคยกดปุ่มนี้
  const { data, isLoading, isError } = useActivityLogByRecord(
    open ? prId : undefined,
    { perpage: 50 },
  );

  // backend เรียงเก่า→ใหม่ แต่คนอ่านอยากเห็นสิ่งที่เพิ่งทำก่อน
  const logs = [...(data?.data ?? [])].reverse();

  const steps = logs.map((log, i) => {
    const action = log.action?.toLowerCase() ?? "";
    const at = getLogCreatedAt(log);
    // แถวที่อยู่ "ใต้" แถวนี้คือกิจกรรมที่เก่ากว่า — ช่องว่างระหว่างสองแถวคือ
    // เวลาที่เอกสารถูกปล่อยไว้ก่อนจะถูกแตะอีกครั้ง
    const older = logs[i + 1];
    const titleKey = ACTION_TITLE_KEY[action];
    // create คือจุดกำเนิดเอกสารเสมอ จึงชนะ current แม้จะเป็นแถวล่าสุด
    const marker: HistoryTimelineMarker =
      action === "create" ? "origin" : i === 0 ? "current" : "default";

    return {
      id: log.id,
      at,
      day: formatDate(at, dateFormat),
      // action ที่ไม่รู้จักต้องไม่ไปยืมหัวข้อของ action อื่น
      title: titleKey ? tHistory(titleKey) : humanize(log.action ?? ""),
      actor: actorNameOf(log),
      marker,
      tone: ALERT_ACTIONS.has(action) ? ("alert" as const) : ("default" as const),
      elapsed: older ? formatElapsed(getLogCreatedAt(older), at, tHistory) : null,
    };
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-hidden sm:max-w-xl lg:max-w-2xl"
      >
        <SheetHeader className="space-y-1">
          <SheetTitle className="text-sm">{t("activity")}</SheetTitle>
          <SheetDescription className="text-xs">
            {prNo ? `${prNo} · ${t("activityDesc")}` : t("activityDesc")}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1 px-4 pb-4">
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          )}

          {isError && (
            <p className="text-destructive text-xs">{t("activityLoadError")}</p>
          )}

          {!isLoading && !isError && steps.length === 0 && (
            <p className="text-muted-foreground text-xs">{t("activityEmpty")}</p>
          )}

          {steps.length > 0 && (
            <HistoryTimeline groupByDay>
              {steps.map((step, i) => (
                <Fragment key={step.id}>
                  {step.day && step.day !== steps[i - 1]?.day && (
                    <HistoryTimelineDay>{step.day}</HistoryTimelineDay>
                  )}
                  {/* ไม่แสดง log.description — backend สร้างเป็น
                      "update on tb_purchase_request (uuid)" ซึ่งเผยชื่อตาราง
                      ภายในและไม่ได้บอกอะไรเกินจากหัวข้อ */}
                  <HistoryTimelineItem
                    at={step.at}
                    marker={step.marker}
                    tone={step.tone}
                    title={step.title}
                    elapsed={step.elapsed}
                    open={expandedId === step.id}
                    onOpenChange={(next) =>
                      setExpandedId(next ? step.id : null)
                    }
                    // Radix ไม่ mount เนื้อหาของ CollapsibleContent ตอนหุบ
                    // ActivityChanges จึงยังไม่ยิง request จนกว่าจะกาง — snapshot
                    // ของเอกสารก้อนใหญ่ ยิงทุกแถวตอนเปิด sheet ไม่ไหว
                    // (pr-activity-sheet.test.tsx ล็อกพฤติกรรมนี้ไว้)
                    expandable={<ActivityChanges logId={step.id} />}
                  >
                    {step.actor}
                  </HistoryTimelineItem>
                </Fragment>
              ))}
            </HistoryTimeline>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 6: แก้ประโยคแรกของ JSDoc เหนือ `PrActivitySheet`**

เปลี่ยนย่อหน้าแรกของ JSDoc (ที่ขึ้นต้นว่า `Sheet แสดงประวัติกิจกรรม...`) เป็น:

```
 * Sheet แสดงประวัติกิจกรรมของใบขอซื้อใบเดียวเป็นไทม์ไลน์ เรียงล่าสุดขึ้นก่อน
 * แตะที่แถวเพื่อกางดูว่าฟิลด์ไหนและรายการสินค้าใดเปลี่ยนไป (โหลด diff ตอนกาง
 * เท่านั้นเพราะ snapshot ของเอกสารมีขนาดใหญ่) เปิดได้ทีละแถว
 *
 * ใช้ไทม์ไลน์ชุดเดียวกับ workflow history เพราะผู้ใช้เปิดทั้งสอง sheet จากแถบ
 * เดียวกันในหน้าเดียวกัน — คนละภาษาภาพในหน้าเดียวอ่านสะดุด
```

ส่วน `@param` และ `@example` ที่เหลือคงไว้ตามเดิม

- [ ] **Step 7: ตรวจ type และ lint**

```bash
bunx tsc --noEmit && bun run lint
```

Expected: ผ่านทั้งคู่ · ถ้า tsc บอกว่า `Badge` / `cn` / `Collapsible` import ไม่ถูกใช้ แปลว่า Step 3 ลบ import ไม่ครบ

- [ ] **Step 8: รัน test ของ activity sheet**

```bash
bun test:run routes/procurement/purchase-request/pr-activity-sheet.test.tsx
```

Expected: PASS ทั้ง 6 เคส · **ห้ามแก้ไฟล์ test เพื่อให้ผ่าน** — ถ้าแดง ให้อ่านว่าเคสไหนแล้วรายงานกลับ

- [ ] **Step 9: รัน suite ทั้งหมด**

```bash
bun test:run
```

Expected: เขียวทั้งหมด

- [ ] **Step 10: Commit**

```bash
git add messages/en.json messages/th.json routes/procurement/purchase-request/pr-activity-sheet.tsx
git commit -m "$(cat <<'EOF'
feat(pr): activity sheet เป็นไทม์ไลน์แบบเดียวกับ workflow history

action กลายเป็นหัวข้อ ชื่อผู้กระทำเป็นบรรทัดรอง จุด marker บอกชนิด
(create = วงกลมกลวง / delete = จุดแดง) แทน badge สีที่พูดซ้ำกับหัวข้อ
เพิ่มหัวข้อคั่นวันและช่องว่างเวลาระหว่างกิจกรรม การโหลด diff ตอนกางคงเดิม

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: ตรวจด้วยตาในเบราว์เซอร์

**Files:** ไม่มีการแก้ไฟล์ — เป็นด่านตรวจก่อนเปิด PR

**Interfaces:**
- Consumes: ผลลัพธ์ของ Task 1 และ Task 2

- [ ] **Step 1: เปิด dev server ชี้ backend local**

```bash
VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev
```

- [ ] **Step 2: ตรวจ activity sheet**

เปิด `http://localhost:3000/procurement/purchase-request/795e41ca-b81b-41d8-b57c-e22d127696b7`
แล้วกดปุ่ม Activity · ตรวจ 5 ข้อ:

1. เป็นไทม์ไลน์ — เวลาอยู่รางซ้าย มีจุดกับเส้นแนวตั้ง มีหัวข้อคั่นวัน
2. กางแถวหนึ่ง → diff โผล่ และ**เส้นรางต่อเนื่องคลุมเนื้อหาที่กางออก** ไม่ขาดกลางคัน
3. กางแถวที่สอง → แถวแรกหุบเอง
4. แถวที่ action เป็น `create` เป็นวงกลมกลวง · ถ้ามีแถว `delete` จุดต้องเป็นสีแดง
5. คลิกที่ตัวหัวข้อ (ไม่ใช่ลูกศร) แล้วกางได้ · กด Tab ไปถึงแถวแล้วมี focus ring · กด Enter กางได้

- [ ] **Step 3: ตรวจว่าไทม์ไลน์เดิมไม่เปลี่ยน**

ในหน้าเดียวกันกดปุ่ม workflow history — ต้องหน้าตาเหมือนก่อนแก้ทุกอย่าง (ไม่มีลูกศร ไม่มี hover พื้นหลัง)
แล้วเปิด PO (`/procurement/purchase-order/<id>`) และ SR (`/store-operation/store-requisition/<id>`)
ตรวจ workflow history กับ item history ของแต่ละใบด้วยเหตุผลเดียวกัน

- [ ] **Step 4: ตรวจ dark mode และภาษา**

สลับเป็น dark mode → จุด/เส้น/พื้นหลัง hover ยังอ่านได้ ไม่มีสีหลุด
สลับภาษาเป็นไทย → หัวข้อเป็น `สร้าง` / `แก้ไข` / `ลบ` และข้อความช่วงเวลาเป็นภาษาไทย

- [ ] **Step 5: ตรวจ console**

เปิด DevTools console — ต้องไม่มี error หรือ warning ใหม่ โดยเฉพาะ
`validateDOMNesting` (สัญญาณว่ามี element ผิดที่ เช่น ปุ่มซ้อนใน `<p>`)

- [ ] **Step 6: เปิด PR**

```bash
git push -u origin feature/activity-timeline-accordion
gh pr create --base main --title "Activity sheet as a timeline with detail accordion" --body "$(cat <<'EOF'
## Summary
- `HistoryTimelineItem` gains optional `expandable` / `open` / `onOpenChange` props — an expandable row nests its detail inside the content column so the rail's `border-l` stretches over it with no height measurement
- PR activity sheet now renders through that timeline: action as the headline, actor as the subline, day separators, elapsed-time gaps, `create` as a hollow marker and `delete` in the alert tone
- `formatElapsed` moved into the timeline primitive so both timelines share one wording

Diff loading is unchanged — still fetched only on expand, one row at a time.

## Test plan
- `bunx tsc --noEmit && bun run lint && bun test:run` all green
- Existing `pr-activity-sheet.test.tsx` (6 cases) passes untouched
- Verified in the browser: rail continuity while expanded, single-row accordion, keyboard focus/Enter, dark mode, TH/EN, no console warnings
- Workflow history and item history on PR / PO / SR verified visually unchanged

Spec: `docs/superpowers/specs/2026-08-04-activity-timeline-accordion-design.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Task 4: ครอบ action ของ workflow ให้ครบ

**ที่มา:** Task 3 ตรวจใบจริงแล้วพบว่า backend เขียน action ของ **workflow** (`save` / `approve` / …)
ลง activity log เดียวกับ action ของ CRUD — spec สมมติไว้แค่ `create` / `update` / `delete`
ผลคือ 4 จาก 6 แถวตกไปที่ `humanize()` จึงค้างเป็นภาษาอังกฤษแม้ผู้ใช้สลับเป็นไทย และ
`reject` / `send_back` ไม่ได้จุดสีแดง ทั้งที่ workflow history ให้ tone เตือนกับสองตัวนี้
ชุด action เต็มอยู่ที่ `ActionPr` ใน `types/stage-role.ts`

**Files:**
- Modify: `messages/en.json`, `messages/th.json` (namespace `history`)
- Modify: `routes/procurement/purchase-request/pr-activity-sheet.tsx:33-44`
- Test (ห้ามแก้ ต้องเขียว): `routes/procurement/purchase-request/pr-activity-sheet.test.tsx`

**Interfaces:**
- Consumes: `ACTION_TITLE_KEY` และ `ALERT_ACTIONS` ที่ Task 2 สร้างไว้ · key เดิม 3 ตัว
  (`actionCreated` / `actionUpdated` / `actionDeleted`) ที่ Task 2 ใส่ใน namespace `history`
- Produces: ไม่มี export ใหม่ — เปลี่ยนเฉพาะค่าคงที่ในไฟล์และ i18n

- [ ] **Step 1: เพิ่ม 7 key ใน `messages/en.json`**

ใน object `history` เติมต่อจาก `"actionDeleted"`:

```json
    "actionSaved": "Saved",
    "actionSubmitted": "Submitted",
    "actionApproved": "Approved",
    "actionPurchased": "Purchased",
    "actionReviewed": "Reviewed",
    "actionRejected": "Rejected",
    "actionSentBack": "Sent back"
```

- [ ] **Step 2: เพิ่ม 7 key ใน `messages/th.json`**

ใน object `history` เติมต่อจาก `"actionDeleted"`:

```json
    "actionSaved": "บันทึก",
    "actionSubmitted": "ส่งอนุมัติ",
    "actionApproved": "อนุมัติ",
    "actionPurchased": "จัดซื้อ",
    "actionReviewed": "ตรวจสอบ",
    "actionRejected": "ไม่อนุมัติ",
    "actionSentBack": "ตีกลับ"
```

คำไทยเลือกให้เป็น**คำกริยาสั้นทั้งชุด**เพื่อให้อ่านไล่ลงมาในไทม์ไลน์เดียวกันแล้วสอดคล้องกัน
และยืมคำที่ระบบใช้อยู่แล้วตรงที่ความหมายตรงกัน (`status.approved` = "อนุมัติ",
`status.rejected` = "ไม่อนุมัติ") เพื่อไม่ให้แอปเรียกเหตุการณ์เดียวกันด้วยคนละคำ

- [ ] **Step 3: ขยาย `ACTION_TITLE_KEY`**

แทนที่ block `ACTION_TITLE_KEY` ทั้งก้อน (`pr-activity-sheet.tsx:33-38` พร้อมคอมเมนต์บรรทัดเดียวด้านบน) ด้วย:

```tsx
/**
 * action → key หัวข้อใน namespace `history` (action นอกรายการนี้ตกไปที่ humanize)
 *
 * ครอบทั้ง action ของ CRUD และของ workflow (`ActionPr` ใน `types/stage-role.ts`)
 * เพราะ backend เขียนทั้งสองชุดลง activity log เดียวกัน — เอกสารจริงส่วนใหญ่มี
 * แถว workflow มากกว่าแถว CRUD ถ้าไม่ครอบไว้ หัวข้อจะค้างเป็นภาษาอังกฤษจาก
 * humanize แม้ผู้ใช้สลับเป็นไทย
 */
const ACTION_TITLE_KEY: Record<string, string> = {
  create: "actionCreated",
  update: "actionUpdated",
  delete: "actionDeleted",
  save: "actionSaved",
  submit: "actionSubmitted",
  approve: "actionApproved",
  purchase: "actionPurchased",
  review: "actionReviewed",
  reject: "actionRejected",
  send_back: "actionSentBack",
};
```

- [ ] **Step 4: ขยาย `ALERT_ACTIONS`**

แทนที่ block `ALERT_ACTIONS` ทั้งก้อน (`pr-activity-sheet.tsx:40-44` พร้อม JSDoc ด้านบน) ด้วย:

```tsx
/**
 * action ที่ทำลายข้อมูลหรือออกนอกทางปกติของ workflow — ย้อมจุด marker เป็นสีเตือน
 * ให้ตรงกับ `ALERT_ACTIONS` ของ workflow history เพื่อให้กวาดตาไทม์ไลน์แล้วเจอทันที
 * ว่าใบนี้เคยถูกตีกลับ ถูกปฏิเสธ หรือถูกลบอะไรไป
 */
const ALERT_ACTIONS = new Set(["delete", "reject", "send_back"]);
```

ไม่ต้องแก้จุดที่เรียกใช้ — `ACTION_TITLE_KEY[action]` และ `ALERT_ACTIONS.has(action)`
ทำงานกับ key ที่เพิ่มเข้ามาได้เลย และ `action` ถูก `toLowerCase()` ไว้แล้ว

- [ ] **Step 5: ตรวจว่า key ครบคู่กันทั้งสองภาษา**

```bash
python3 -c "
import json
en=json.load(open('messages/en.json'))['history']
th=json.load(open('messages/th.json'))['history']
missing=set(en)^set(th)
print('key ไม่ตรงกัน:', missing or 'ไม่มี')
print('action keys:', sorted(k for k in en if k.startswith('action')))
"
```

Expected: `key ไม่ตรงกัน: ไม่มี` และรายการ action key ครบ 10 ตัว

- [ ] **Step 6: ตรวจ type และ lint**

```bash
bunx tsc --noEmit && bun run lint
```

Expected: ผ่านทั้งคู่

- [ ] **Step 7: รัน suite ทั้งหมด**

```bash
bun test:run
```

Expected: เขียวทั้งหมด (801 tests) — test เดิมของ activity sheet mock `useTranslations` ให้คืน key
จึงไม่ผูกกับข้อความจริง

- [ ] **Step 8: Commit**

```bash
git add messages/en.json messages/th.json routes/procurement/purchase-request/pr-activity-sheet.tsx
git commit -m "$(cat <<'EOF'
fix(pr): แปลหัวข้อ activity ของ action ฝั่ง workflow ให้ครบ

backend เขียน action ของ workflow (save/approve/...) ลง activity log เดียวกับ
CRUD ซึ่งเดิมไม่มีในแผนที่ หัวข้อจึงค้างเป็นอังกฤษแม้สลับเป็นไทย
และ reject/send_back ได้จุดสีเตือนเหมือนที่ workflow history ทำ

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-review

| ข้อกำหนดใน spec | Task ที่รองรับ |
|---|---|
| เพิ่ม `expandable` / `open` / `onOpenChange` | 1 · Step 4-5 |
| trigger เต็มความกว้าง + chevron ปลายขวาหมุน 90° | 1 · Step 5 |
| `CollapsibleContent` ไม่เยื้องเพิ่ม | 1 · Step 5 |
| `elapsed` อยู่นอก `Collapsible` | 1 · Step 5 |
| `children` เปลี่ยน `<p>` → `<div>` | 1 · Step 5 |
| ย้าย + export `formatElapsed` | 1 · Step 1-2 |
| หัวข้อ = action · บรรทัดรอง = ผู้กระทำ | 2 · Step 4-5 |
| marker: create → origin · ล่าสุด → current | 2 · Step 5 |
| tone: delete → alert | 2 · Step 4-5 |
| `groupByDay` + หัวข้อคั่นวัน | 2 · Step 5 |
| elapsed เทียบ log ที่เก่ากว่า | 2 · Step 5 |
| ลบ `ACTION_CLASS` และ Badge | 2 · Step 3-4 |
| `tHistory` แยก namespace | 2 · Step 5 |
| i18n 3 key | 2 · Step 1-2 |
| โหลด diff ตอนกางเท่านั้น เปิดทีละแถว | 2 · Step 5 |
| ความกว้าง sheet คงเดิม | 2 · Step 5 |
| สถานะ loading/error/empty คงเดิม | 2 · Step 5 |
| test เดิมเขียวโดยไม่แก้ | 2 · Step 8 |
| Gate: tsc + lint + test | 1 · Step 7-8 · 2 · Step 7-9 |
| ตรวจด้วยตา 4 ข้อ | 3 |
