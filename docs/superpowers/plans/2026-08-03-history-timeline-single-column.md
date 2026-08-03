# History Timeline คอลัมน์เดียว — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เปลี่ยนไทม์ไลน์ประวัติทั้งสองตัว (ระดับเอกสาร + ระดับรายการสินค้า) จากซิกแซกสลับซ้าย/ขวา เป็นคอลัมน์เดียวที่มีรางวันที่/เวลาอยู่ซ้าย โดยแยก layout ออกเป็น component ตัวเดียวที่ใช้ร่วมกัน

**Architecture:** สร้าง presentational component `HistoryTimeline` / `HistoryTimelineItem` ที่ถือ grid 2 คอลัมน์ (`grid-cols-[auto_1fr]` + `grid-cols-subgrid` ที่ `<li>`) แล้วให้ `workflow-history-timeline.tsx` กับ `item-history-sheet.tsx` เรียกใช้ ทั้งสองไฟล์ส่ง Badge/ชื่อ/คำอธิบายของตัวเองเข้ามาเป็น props — API ที่ฝั่ง route เรียกไม่เปลี่ยน จึงไม่ต้องแก้ไฟล์ route เลย

**Tech Stack:** React 19 · TypeScript · Tailwind CSS 4 (type-ladder tokens ใน `styles/globals.css`) · `use-intl` · Vite

**สเปก:** `docs/superpowers/specs/2026-08-03-history-timeline-single-column-design.md`

**Branch:** `feature/history-timeline-single-column` (สร้างแล้ว, สเปก commit ที่ `2f0234e`)

## Global Constraints

- **ข้ามขั้นตอนเทสต์** — ห้ามสร้างไฟล์ `*.test.tsx` / `*.spec.tsx` ในแผนนี้ (กฎผู้ใช้) ประตูคุณภาพคือ `bunx tsc --noEmit` + `bun run lint` + ตรวจในเบราว์เซอร์
- `bun test:run` ที่มีอยู่ต้องยังเขียวเท่าเดิม (ไม่มีเทสต์ของสองไฟล์นี้อยู่ก่อน)
- **ห้ามเปลี่ยน API ของ `WorkflowHistoryTimeline` และ `ItemHistorySheet`** — route ของ PR/PO/SR เรียกด้วย props ชุดเดิม
- **ห้าม hardcode สี** — ใช้ token เท่านั้น (`bg-primary`, `bg-border`, `bg-background`, `border-border`, `ring-background`, `text-muted-foreground`) เพื่อให้ dark mode ทำงานเอง
- ขนาดตัวอักษรใช้ type ladder เดิม: รางเวลา `text-micro` (11px) · ชื่อผู้ใช้ `text-sm font-medium` · คำอธิบาย `text-xs`
- **ห้ามแตะ `components/ui/timeline.tsx`** ในแผนนี้
- commit message เขียนเป็นภาษาไทย
- ระวัง `TS6133` (unused import/variable) หลังตัดโค้ดเก่าออก — เป็น error ที่ `tsc --noEmit` จับ

## File Structure

| ไฟล์ | สถานะ | ความรับผิดชอบ |
|---|---|---|
| `components/share/history-timeline.tsx` | สร้างใหม่ | layout ของไทม์ไลน์ล้วน ๆ — grid, ราง `<time>`, เส้น, จุด marker และกติกาการ format วันที่/เวลา ไม่รู้จักโดเมนใด ๆ |
| `components/share/workflow-history-timeline.tsx` | แก้ | ประวัติระดับเอกสาร — map `WorkflowHistoryTimelineEntry` → props ของ `HistoryTimelineItem` + แถวผู้ร้องขอ |
| `components/share/item-history-sheet.tsx` | แก้ | ประวัติระดับรายการสินค้า — ปุ่ม + Sheet + map `ItemHistoryEntry` → props ของ `HistoryTimelineItem` |
| ไฟล์ฝั่ง route ทั้งหมด | ไม่แตะ | เรียกผ่าน API เดิม |

---

### Task 1: `HistoryTimeline` + ย้าย workflow history มาใช้

**Files:**
- Create: `components/share/history-timeline.tsx`
- Modify: `components/share/workflow-history-timeline.tsx` (เขียนทับทั้งไฟล์)

**Interfaces:**
- Consumes: `formatDate(iso: string, dateFormat: string): string` จาก `@/lib/date-utils` · `useProfile()` จาก `@/hooks/use-profile` (ใช้ฟิลด์ `dateFormat: string`) · `cn` จาก `@/lib/utils` · `unknownStatusEntry(status: string): StatusConfigEntry` และ type `StatusConfigEntry` จาก `@/constant/status-config` · `Badge` จาก `@/components/ui/badge` (รองรับ `size="xs"`)
- Produces:
  - `HistoryTimeline({ children }: { readonly children: ReactNode })`
  - `HistoryTimelineItem(props: HistoryTimelineItemProps)` โดย `HistoryTimelineItemProps = { readonly at: string; readonly marker?: HistoryTimelineMarker; readonly badge?: ReactNode; readonly title?: ReactNode; readonly children?: ReactNode }`
  - `type HistoryTimelineMarker = "current" | "default" | "origin"`
  - Task 2 ใช้ทั้งสาม export นี้

- [ ] **Step 1: สร้าง `components/share/history-timeline.tsx`**

```tsx
import type { ReactNode } from "react";
import { formatDate } from "@/lib/date-utils";
import { useProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";

/**
 * จุด marker ของแต่ละก้าว — สีมาจาก token ล้วน จึงสลับ dark mode ได้เอง
 * ไม่ต้องเขียน variant แยก
 */
const MARKER_CLASS = {
  /** เหตุการณ์ล่าสุด (แถวบนสุด) */
  current: "bg-primary",
  /** ก้าวที่ผ่านมาแล้ว */
  default: "bg-border",
  /** จุดกำเนิดเอกสาร เช่น แถวผู้ร้องขอ — วงกลมกลวง */
  origin: "bg-background border-2 border-border",
} as const;

export type HistoryTimelineMarker = keyof typeof MARKER_CLASS;

interface HistoryTimelineProps {
  readonly children: ReactNode;
}

/**
 * รายการไทม์ไลน์ประวัติแบบคอลัมน์เดียว — ราง "วันที่/เวลา" ซ้าย · เส้นกับจุด · เนื้อหาขวา
 *
 * `<ol>` ถือ grid 2 คอลัมน์ไว้เอง แล้ว `<li>` แต่ละตัวใช้ `grid-cols-subgrid`
 * เพื่อให้คอลัมน์วันที่กว้างเท่ากันทุกแถวโดยไม่ต้อง fix ความกว้าง — จำเป็นเพราะ
 * `date_format` มาจาก config ของ BU จะยาวแค่ไหนก็ได้ (`DD/MM/YYYY` หรือ
 * `DD MMMM YYYY`) และ subgrid ยังทำให้ `<li>` เป็น list item จริงในสายตา
 * screen reader ต่างจาก `display: contents`
 *
 * @param props.children - `HistoryTimelineItem` เรียงตามลำดับที่จะแสดง
 * @returns React element ของรายการไทม์ไลน์
 * @example
 * <HistoryTimeline>
 *   <HistoryTimelineItem at={entry.at} marker="current" title={entry.user.name} />
 * </HistoryTimeline>
 */
export function HistoryTimeline({ children }: HistoryTimelineProps) {
  return <ol className="grid grid-cols-[auto_1fr] gap-x-3">{children}</ol>;
}

interface HistoryTimelineItemProps {
  /** ISO datetime — ใช้ทั้งข้อความในรางซ้ายและ attribute `dateTime` */
  readonly at: string;
  /** ชนิดของจุด marker (ค่าเริ่มต้น `default`) */
  readonly marker?: HistoryTimelineMarker;
  /** Badge สถานะที่โมดูลสร้างเอง แสดงหน้าชื่อ */
  readonly badge?: ReactNode;
  /** ชื่อผู้ใช้ — ว่างได้ (บาง entry ของ PO ส่งมาแค่ id ไม่มีชื่อ) */
  readonly title?: ReactNode;
  /** บรรทัดคำอธิบายใต้ชื่อ */
  readonly children?: ReactNode;
}

/**
 * หนึ่งก้าวของไทม์ไลน์ — วันที่/เวลาในรางซ้าย จุด marker บนเส้น แล้วเนื้อหาทางขวา
 *
 * เส้นรางวาดด้วย `border-l` ของคอลัมน์เนื้อหา (ไม่ใช่ element absolute แยก) จึง
 * ต่อกันสนิทเสมอไม่ว่าเนื้อหาจะสูงเท่าไร และ `group-last/hist` ทำให้ก้าวสุดท้าย
 * ไม่มีเส้นห้อยลงมา
 *
 * @param props.at - ISO datetime ของก้าวนี้ (ว่างได้ รางจะว่างแทนที่จะพัง)
 * @param props.marker - ชนิดจุด marker
 * @param props.badge - Badge สถานะ
 * @param props.title - ชื่อผู้ใช้
 * @param props.children - คำอธิบายใต้ชื่อ
 * @returns React element ของหนึ่งก้าว
 */
export function HistoryTimelineItem({
  at,
  marker = "default",
  badge,
  title,
  children,
}: HistoryTimelineItemProps) {
  const { dateFormat } = useProfile();

  // `date_format` ของ BU ใส่ token เวลามาเองได้ (เช่น "DD/MM/YYYY HH:mm") —
  // ต่อ "HH:mm" ทับลงไปอีกจะได้เวลาซ้ำสองที่ในรางเดียว
  const hasTime = dateFormat.includes("HH") || dateFormat.includes("hh");
  const dateLine = formatDate(at, dateFormat);
  const timeLine = hasTime ? "" : formatDate(at, "HH:mm");

  return (
    <li className="group/hist col-span-2 grid grid-cols-subgrid">
      <time
        dateTime={at || undefined}
        className="text-micro text-muted-foreground pt-0.5 text-right leading-tight tabular-nums whitespace-nowrap"
      >
        <span className="block">{dateLine}</span>
        {timeLine && <span className="block">{timeLine}</span>}
      </time>
      <div className="relative border-l pb-5 pl-4 group-last/hist:border-transparent group-last/hist:pb-0">
        <span
          aria-hidden="true"
          className={cn(
            "ring-background absolute top-1.5 left-0 size-2 -translate-x-1/2 rounded-full ring-4",
            MARKER_CLASS[marker],
          )}
        />
        {(badge || title) && (
          <div className="flex flex-wrap items-center gap-2">
            {badge}
            {title && <span className="text-sm font-medium">{title}</span>}
          </div>
        )}
        {children && <p className="text-muted-foreground text-xs">{children}</p>}
      </div>
    </li>
  );
}
```

- [ ] **Step 2: เขียนทับ `components/share/workflow-history-timeline.tsx` ทั้งไฟล์**

```tsx
import { useTranslations } from "use-intl";
import {
  HistoryTimeline,
  HistoryTimelineItem,
} from "@/components/share/history-timeline";
import { Badge } from "@/components/ui/badge";
import {
  unknownStatusEntry,
  type StatusConfigEntry,
} from "@/constant/status-config";

/** ประวัติ workflow ระดับเอกสาร 1 ก้าว — โครงเดียวกันทั้ง PR / PO / SR */
export interface WorkflowHistoryTimelineEntry {
  user: { id: string; name: string };
  action: string;
  /** ชื่อฟิลด์เวลาไม่ตรงกันระหว่างโมดูล — PR/PO ส่ง `datetime`, SR ส่ง `at` */
  at?: string;
  datetime?: string;
  current_stage?: string;
  next_stage?: string;
}

interface WorkflowHistoryTimelineProps {
  readonly history: WorkflowHistoryTimelineEntry[];
  /** map action → สี/ป้ายของโมดูลนั้น (เช่น `PR_WORKFLOW_ACTION_CONFIG`) */
  readonly statusConfig: Record<string, StatusConfigEntry>;
  /** ข้อความเมื่อยังไม่มีประวัติ (เช่น `t("noWorkflowHistory")`) */
  readonly emptyLabel: string;
  readonly requestorName?: string;
  readonly createdAt?: string;
}

/**
 * Timeline ประวัติ workflow ระดับเอกสาร — คอลัมน์เดียว รางวันที่/เวลาอยู่ซ้าย
 * เรียงล่าสุดขึ้นบนสุด พร้อม badge action และการเปลี่ยน stage
 *
 * แถวสุดท้ายคือผู้ร้องขอ + วันที่สร้างเอกสาร ซึ่งอยู่ในรางเวลาเดียวกับก้าวอื่น
 * เพราะการสร้างเอกสารก็คือเหตุการณ์แรกของ workflow จริง ๆ
 *
 * ใช้ร่วมกันทุกโมดูลที่มี workflow ระดับเอกสาร (PR/PO/SR) — สิ่งที่ต่างกันคือชุด
 * action กับข้อความ empty เท่านั้น จึงรับมาเป็น prop ไม่ผูกกับโมดูลใดโมดูลหนึ่ง
 * (คู่กับ `ItemHistorySheet` ที่เป็นประวัติระดับรายบรรทัด)
 *
 * @param props.history - ประวัติ (เรียงเก่า→ใหม่ ตามที่ backend ส่งมา)
 * @param props.statusConfig - map action → สี/ป้ายของโมดูล
 * @param props.emptyLabel - ข้อความเมื่อไม่มีประวัติ
 * @param props.requestorName - ชื่อผู้ร้องขอ/ผู้ซื้อ แสดงเป็นแถวสุดท้าย
 * @param props.createdAt - วันที่สร้างเอกสาร แสดงในรางของแถวผู้ร้องขอ
 * @returns React element ของไทม์ไลน์ หรือข้อความว่างเมื่อไม่มีประวัติ
 * @example
 * <WorkflowHistoryTimeline
 *   history={purchaseRequest.workflow_history}
 *   statusConfig={PR_WORKFLOW_ACTION_CONFIG}
 *   emptyLabel={t("noWorkflowHistory")}
 *   requestorName={purchaseRequest.requestor_name}
 *   createdAt={purchaseRequest.created_at}
 * />
 */
export function WorkflowHistoryTimeline({
  history,
  statusConfig,
  emptyLabel,
  requestorName,
  createdAt,
}: WorkflowHistoryTimelineProps) {
  const tfl = useTranslations("field");

  if (!history || history.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyLabel}</p>;
  }

  // Reverse เพื่อให้ล่าสุดขึ้นบนสุด
  const reversedHistory = [...history].reverse();

  return (
    <HistoryTimeline>
      {reversedHistory.map((entry, i) => {
        // action ที่ไม่มีในแผนที่ต้องไม่ไปยืมป้ายของ action อื่น — เดิม fallback
        // เป็น `.submitted` ทำให้ action แปลก ๆ โชว์ว่า "SUBMITTED" ทั้งที่ไม่ใช่
        // (ผิดข้อมูล ไม่ใช่แค่หน้าตาเพี้ยน)
        const config =
          statusConfig[entry.action] ?? unknownStatusEntry(entry.action);

        return (
          <HistoryTimelineItem
            key={`${entry.user.id}-${entry.action}-${i}`}
            at={entry.at ?? entry.datetime ?? ""}
            marker={i === 0 ? "current" : "default"}
            badge={
              <Badge className={config.className} size="xs">
                {config.label}
              </Badge>
            }
            title={entry.user.name}
          >
            {(entry.current_stage || entry.next_stage) && (
              <>
                {entry.current_stage}
                {entry.current_stage && entry.next_stage && " → "}
                {entry.next_stage}
              </>
            )}
          </HistoryTimelineItem>
        );
      })}

      {requestorName && (
        <HistoryTimelineItem
          at={createdAt ?? ""}
          marker="origin"
          title={requestorName}
        >
          {tfl("requester")}
        </HistoryTimelineItem>
      )}
    </HistoryTimeline>
  );
}
```

หมายเหตุสำหรับผู้ทำ: import ที่หายไปจากไฟล์เดิมโดยตั้งใจคือ `UserRound` (lucide), ทุกตัวจาก `@/components/ui/timeline`, `formatDate`, `useProfile` และ `cn` — ย้ายไปอยู่ใน `history-timeline.tsx` หมดแล้ว ถ้าเผลอทิ้งไว้จะติด `TS6133`

- [ ] **Step 3: type-check**

Run: `bunx tsc --noEmit`
Expected: ไม่มี error (ถ้าเจอ `TS6133` แปลว่ามี import ค้างใน `workflow-history-timeline.tsx`)

- [ ] **Step 4: lint**

Run: `bun run lint`
Expected: ไม่มี error

- [ ] **Step 5: ตรวจในเบราว์เซอร์ — workflow history ของ PR**

Run: `bun dev` (หรือ `VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev` ถ้าต่อ backend ในเครื่อง)

เปิด `/procurement/purchase-request/99ba6776-1e01-4d3e-a9e6-780ce29617b5` แล้วเปิด Sheet workflow history — ต้องเห็น:
- รางวันที่/เวลาชิดขวาอยู่ซ้ายสุด กว้างเท่ากันทุกแถว
- เส้นแนวตั้งต่อเนื่องไม่ขาดตอน จุดบนสุดเป็นสีทึบ (`bg-primary`)
- แถวสุดท้ายเป็นผู้ร้องขอ จุดกลวง ไม่มี badge และไม่มีเส้นห้อยลงมาต่อ
- ชื่อ stage ยาว ๆ ตัดบรรทัดเต็มความกว้างของ Sheet
- สลับ light / dark แล้วอ่านออกทั้งคู่ · console ไม่มี error

- [ ] **Step 6: Commit**

```bash
git add components/share/history-timeline.tsx components/share/workflow-history-timeline.tsx
git commit -m "feat(history): ไทม์ไลน์ประวัติเอกสารเป็นคอลัมน์เดียวพร้อมรางเวลา"
```

---

### Task 2: ย้าย item history มาใช้ `HistoryTimeline`

**Files:**
- Modify: `components/share/item-history-sheet.tsx` (เขียนทับทั้งไฟล์)

**Interfaces:**
- Consumes: `HistoryTimeline`, `HistoryTimelineItem` จาก Task 1 (`@/components/share/history-timeline`)
- Produces: ไม่มี export ใหม่ — `ItemHistorySheet` ยังรับ props ชุดเดิม (`history`, `productName`, `statusConfig`, `label`) และ type `ItemHistoryEntry` ยัง export เหมือนเดิม

- [ ] **Step 1: เขียนทับ `components/share/item-history-sheet.tsx` ทั้งไฟล์**

```tsx
import { useState } from "react";
import { GitBranch } from "lucide-react";
import {
  HistoryTimeline,
  HistoryTimelineItem,
} from "@/components/share/history-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  unknownStatusEntry,
  type StatusConfigEntry,
} from "@/constant/status-config";

/** ประวัติ workflow ระดับรายการ 1 ก้าว — โครงเดียวกันทั้ง PR / PO / SR */
export interface ItemHistoryEntry {
  at: string;
  seq: number;
  name: string;
  /** name ไม่บังคับ — บาง entry หลังบ้านส่งมาแค่ id (เช่นประวัติของ PO) */
  user: { id: string; name?: string };
  status: string;
  message?: string | null;
}

interface ItemHistorySheetProps {
  readonly history: ItemHistoryEntry[];
  readonly productName?: string;
  /** map สถานะ → สี/ป้ายของโมดูลนั้น (เช่น `ITEM_HISTORY_STATUS_CONFIG`) */
  readonly statusConfig: Record<string, StatusConfigEntry>;
  /** ป้ายปุ่ม + หัว sheet (เช่น `t("tabWorkflowHistory")`) */
  readonly label: string;
}

/**
 * ปุ่มไอคอน git-branch ในคอลัมน์ action ของตารางรายการ กดแล้วเปิด sheet แสดง
 * timeline ประวัติ workflow ระดับรายการ (per-item) แบบคอลัมน์เดียวพร้อมรางเวลา
 * เรียงล่าสุดขึ้นบนสุด — โครงเดียวกับ workflow history ระดับเอกสาร
 *
 * ใช้ร่วมกันทุกโมดูลที่มีประวัติรายบรรทัด (PR/PO/SR) — สิ่งที่ต่างกันคือชุดสถานะ
 * กับป้ายเท่านั้น จึงรับมาเป็น prop ไม่ผูกกับโมดูลใดโมดูลหนึ่ง
 *
 * @param props.history - ประวัติของรายการนั้น (เรียงเก่า→ใหม่ ตามที่ backend ส่งมา)
 * @param props.productName - ชื่อสินค้า โชว์เป็นคำอธิบายใต้หัว sheet
 * @param props.statusConfig - map สถานะ → สี/ป้ายของโมดูล
 * @param props.label - ป้ายปุ่มและหัว sheet
 * @returns React element ของปุ่ม + sheet timeline
 * @example
 * <ItemHistorySheet
 *   history={item.history}
 *   productName={item.product_name}
 *   statusConfig={ITEM_HISTORY_STATUS_CONFIG}
 *   label={t("tabWorkflowHistory")}
 * />
 */
export function ItemHistorySheet({
  history,
  productName,
  statusConfig,
  label,
}: ItemHistorySheetProps) {
  const [open, setOpen] = useState(false);

  // Reverse เพื่อให้ล่าสุดขึ้นบนสุด
  const reversedHistory = [...history].reverse();

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={label}
        title={label}
        onClick={() => setOpen(true)}
      >
        <GitBranch className="size-3.5" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-xl lg:max-w-2xl"
        >
          <SheetHeader>
            <SheetTitle>{label}</SheetTitle>
            <SheetDescription>{productName ?? ""}</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            <HistoryTimeline>
              {reversedHistory.map((entry, i) => {
                // ไม่มีในแผนที่ก็ยังต้องเป็นชิป dot-chip เหมือนตัวอื่น — ปล่อย
                // className ว่างจะกลายเป็นพื้นทึบสี primary นั่งเรืองข้างชิปปกติ
                const config =
                  statusConfig[entry.status] ??
                  unknownStatusEntry(entry.status);

                return (
                  <HistoryTimelineItem
                    key={`${entry.user.id}-${entry.seq}-${i}`}
                    at={entry.at}
                    marker={i === 0 ? "current" : "default"}
                    badge={
                      <Badge className={config.className} size="xs">
                        {config.label}
                      </Badge>
                    }
                    title={entry.user.name}
                  >
                    {(entry.name || entry.message) && (
                      <>
                        {entry.name}
                        {entry.message && (
                          <span className="text-muted-foreground block">
                            {entry.message}
                          </span>
                        )}
                      </>
                    )}
                  </HistoryTimelineItem>
                );
              })}
            </HistoryTimeline>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
```

หมายเหตุสำหรับผู้ทำ: import ที่หายไปโดยตั้งใจคือ ทุกตัวจาก `@/components/ui/timeline`, `formatDate`, `useProfile` และ `cn` — ตัวแปร `isEven` และ `dateFormat` หายไปด้วย ถ้าเผลอทิ้งไว้จะติด `TS6133`

- [ ] **Step 2: type-check**

Run: `bunx tsc --noEmit`
Expected: ไม่มี error

- [ ] **Step 3: lint**

Run: `bun run lint`
Expected: ไม่มี error

- [ ] **Step 4: ตรวจในเบราว์เซอร์ — item history**

เปิด `/procurement/purchase-request/99ba6776-1e01-4d3e-a9e6-780ce29617b5` → ในตารางรายการสินค้า กดปุ่มไอคอน git-branch ของรายการที่มีประวัติ — ต้องเห็นโครงเดียวกับ Task 1 และ:
- รายการที่มี `message` แสดง `message` เป็นบรรทัดที่ 2 ใต้ชื่อ
- รายการที่ประวัติมีก้าวเดียว: มีจุดเดียว ไม่มีเส้นห้อยลงมา
- console ไม่มี error

- [ ] **Step 5: Commit**

```bash
git add components/share/item-history-sheet.tsx
git commit -m "feat(history): ไทม์ไลน์ประวัติรายการสินค้าใช้โครงคอลัมน์เดียวร่วมกัน"
```

---

### Task 3: ตรวจข้ามโมดูลและปิดงาน

**Files:**
- ไม่มีการแก้ไฟล์ที่คาดไว้ — ถ้าเจอปัญหาให้แก้ที่ `components/share/history-timeline.tsx` แล้ว commit เพิ่ม

**Interfaces:**
- Consumes: ผลลัพธ์ของ Task 1 และ Task 2
- Produces: ไม่มี

- [ ] **Step 1: ยืนยันว่า suite เดิมยังเขียว**

Run: `bun test:run`
Expected: ผ่านเท่าเดิมกับตอนก่อนเริ่มแผน (แผนนี้ไม่ได้เพิ่มหรือแก้เทสต์)

- [ ] **Step 2: ตรวจ PO**

เปิดใบ PO ที่มีประวัติ (`/procurement/purchase-order/<id>`) → เปิด Sheet workflow history และ item history
ต้องเห็นโครงเดียวกับ PR · ประวัติ item ของ PO บาง entry ไม่มีชื่อผู้ใช้ → ต้องเห็น Badge อยู่ลำพังในแถว ไม่มีช่องว่างค้างข้างหลัง

- [ ] **Step 3: ตรวจ SR**

เปิดใบ store requisition ที่มีประวัติ (`/store-operation/store-requisition/<id>`) → เปิด workflow history
SR ส่งเวลาในฟิลด์ `at` (ไม่ใช่ `datetime`) → รางเวลาต้องมีค่า ไม่ว่างเปล่า

- [ ] **Step 4: ตรวจเอกสารที่ยังไม่มีประวัติ**

เปิดใบ draft ที่ยังไม่เคย submit → ต้องเห็นข้อความ `emptyLabel` เดิม ไม่ใช่ไทม์ไลน์เปล่าหรือหน้าพัง

- [ ] **Step 5: ตรวจความกว้างระดับมือถือ**

ย่อหน้าต่างเหลือ 375px (Sheet จะเป็น `w-full`) แล้วเปิด workflow history ของ PR —
รางวันที่ต้องยุบตามเนื้อหาและไม่ตัดบรรทัดกลางวันที่ (`whitespace-nowrap`) ส่วนคอลัมน์
เนื้อหาต้องยังอ่านได้ ไม่มี horizontal scroll ของทั้ง Sheet

- [ ] **Step 6: ตรวจ dark mode ซ้ำทุกจุดด้านบน**

สลับธีมเป็น dark แล้วดูซ้ำ — จุด marker ทั้ง 3 แบบต้องแยกออกจากพื้นหลังและจากเส้นได้ชัด โดยเฉพาะ `origin` (วงกลมกลวง) ที่พึ่ง `border-border` กับ `bg-background`

- [ ] **Step 7: commit แก้ไข (ถ้ามี) แล้วสรุปสิ่งที่เหลือ**

ถ้า Step 2–6 ทำให้ต้องแก้อะไร ให้ commit ด้วยข้อความภาษาไทยที่บอกอาการที่แก้

รายงานให้ผู้ใช้ทราบว่า `components/ui/timeline.tsx` (355 บรรทัด) **ไม่มี consumer เหลือแล้ว** หลังแผนนี้ — สเปกกำหนดให้ไม่แตะในรอบนี้ จึงต้องให้ผู้ใช้ตัดสินว่าจะลบใน PR นี้ ทำแยก PR หรือเก็บไว้

---

## หลังจบแผน

- ใช้ `superpowers:requesting-code-review` ก่อนเปิด PR
- ใช้ `superpowers:finishing-a-development-branch` เพื่อรวมงาน
