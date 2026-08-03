# Activity sheet — เปลี่ยนเป็นไทม์ไลน์แบบเดียวกับ workflow history พร้อม accordion

วันที่: 2026-08-04

## ปัญหา

หน้ารายละเอียดใบขอซื้อมีประวัติสองชุดที่ผู้ใช้เปิดดูจากแถบเดียวกัน แต่หน้าตาคนละแบบ:

| Sheet | รูปแบบปัจจุบัน |
|---|---|
| Workflow history (`pr-form-dialogs.tsx`) | ไทม์ไลน์คอลัมน์เดียว — รางเวลาซ้าย · เส้น+จุด · เนื้อหาขวา · หัวข้อคั่นวัน |
| Activity (`pr-activity-sheet.tsx`) | รายการแบนคั่นด้วย `divide-y` — badge action + ชื่อคน + วันเวลาในบรรทัดเดียว |

ผลคือหน้าเดียวกันมีภาษาภาพสองชุด และ activity ซึ่งเป็นประวัติที่ยาวกว่ากลับอ่านลำดับเวลา
ยากกว่า เพราะไม่มีรางเวลา ไม่มีการจัดกลุ่มตามวัน และไม่บอกว่าห่างจากครั้งก่อนนานเท่าไร

ต้องการให้ activity ใช้ไทม์ไลน์ชุดเดียวกับ workflow history โดยยังกางดู diff รายฟิลด์ได้เหมือนเดิม

## ขอบเขต

| ไฟล์ | สิ่งที่ทำ |
|---|---|
| `components/share/history-timeline.tsx` | เพิ่มความสามารถ "แถวกางได้" เป็น prop optional |
| `components/share/workflow-history-timeline.tsx` | ย้าย `formatElapsed` ออกไปไว้ที่ primitive แล้ว import กลับมา |
| `routes/procurement/purchase-request/pr-activity-sheet.tsx` | เปลี่ยนการเรนเดอร์รายการเป็นไทม์ไลน์ |
| `messages/{en,th}.json` | เพิ่ม 3 key ใน namespace `history` |

**นอกขอบเขต**

- ไม่เพิ่ม activity sheet ให้โมดูลอื่น (ตอนนี้มีแค่ PR — PO/SR/GRN ยังไม่มี)
- ไม่แตะ `routes/system-admin/activity-log/` และ `user-activity/` (คนละหน้า คนละรูปแบบ ตารางไม่ใช่ไทม์ไลน์)
- ไม่แตะ `components/share/item-history-sheet.tsx` — มันจะได้ prop ใหม่ไปฟรีแต่ยังไม่มีคนเรียกใช้
- ไม่เปลี่ยนสัญญากับ backend หรือ hook (`useActivityLogByRecord` / `useActivityLogDetail` เดิมทั้งหมด)

## การตัดสินใจด้านการออกแบบ

| ประเด็น | ที่เลือก | เหตุผล |
|---|---|---|
| หัวข้อของแถว | **action** (`Created` / `Updated` / `Deleted`) · ชื่อคนเป็นบรรทัดรอง | ตรงกับ workflow history ที่ title = สิ่งที่เกิดขึ้น และ subtitle = ผู้กระทำ — คนเปิดไทม์ไลน์ถามว่า "เกิดอะไรขึ้น" ก่อน "ใครทำ" |
| Badge สี | **ตัดทิ้ง** (`ACTION_CLASS` ถูกลบ) | เมื่อ action กลายเป็นหัวข้อแล้ว badge จะพูดข้อความซ้ำกับบรรทัดที่อยู่ติดกัน · workflow history สงวน badge ให้ก้าวผิดปกติเท่านั้น ให้ activity มี badge ทุกแถวจะขัดกันเอง |
| ความต่างของ action | ผ่าน **จุด marker** — `create` = วงกลมกลวง (`origin`) · `delete` = จุดแดง (`tone="alert"`) | ใช้ช่องทางที่ไทม์ไลน์มีอยู่แล้ว ไม่ต้องเพิ่ม element ใหม่ในแถว |
| วิธีทำ accordion | เพิ่ม prop optional ใน `HistoryTimelineItem` | เส้นรางคือ `border-l` ของคอลัมน์เนื้อหา เนื้อหาที่กางออกอยู่ในคอลัมน์เดียวกันจึงยืดตามเอง ไม่ต้องคำนวณความสูง |
| ตำแหน่ง `elapsed` | ล่างสุด **ใต้เนื้อหาที่กางออก** | ความหมายของมันคือช่องว่างที่ติดกับแถวที่เก่ากว่า ซึ่งอยู่ข้างล่าง — ย้ายขึ้นไปบนจะอ่านผิดว่าห่างจากแถวบน |
| การโหลด diff | คงเดิม — โหลดตอนกางเท่านั้น เปิดได้ทีละรายการ | snapshot ของเอกสารก้อนใหญ่ · การเปลี่ยนเป็นโหลดล่วงหน้าเพื่อสรุปว่า "แก้ 3 ฟิลด์" จะกลายเป็น N+1 request ทันทีที่เปิด sheet |
| ที่อยู่ของ i18n key | namespace `history` | เป็นคำของไทม์ไลน์ ไม่ใช่ศัพท์ของใบขอซื้อ — วางไว้ข้าง `documentCreated` ที่ workflow ใช้อยู่ |

**ที่ไม่เลือก**

- **เขียนโครง `<li>` เองใน activity sheet** — ไม่ต้องแตะโค้ดที่ PO/SR ใช้ (ความเสี่ยง regression = 0)
  แต่ต้องก๊อป `<time>` + marker + `border-l` ราว 30 บรรทัด ซึ่งจะสร้างโค้ดรางซ้ำ 2 ที่กลับมาใหม่
  ทั้งที่ [spec รอบก่อน](2026-08-03-history-timeline-single-column-design.md) เพิ่งยุบให้เหลือที่เดียว
- **ยัด `<Collapsible>` ทั้งก้อนเข้า `children` ของ item เดิม** — ไม่ต้องแก้ primitive เลย
  แต่ `children` ถูกห่อด้วย `<p>` ทำให้ปุ่มซ้อนใน `<p>` (HTML ไม่ถูกต้อง) และ trigger จะครอบไม่ถึงหัวข้อ
  คลิกคำว่า "Updated" แล้วไม่มีอะไรเกิดขึ้น
- **สรุปสิ่งที่เปลี่ยนเป็นหัวข้อ** (เช่น "แก้ 3 ฟิลด์") — ต้องมี `changes` ซึ่งมาจาก endpoint รายตัว
  = N+1 request ตอนเปิด sheet

## สถาปัตยกรรม

### `components/share/history-timeline.tsx`

เพิ่ม prop optional 3 ตัวเข้า `HistoryTimelineItemProps`:

```tsx
/** เนื้อหาที่กางออก — ส่งมาเมื่อไหร่ แถวจะกลายเป็น accordion */
readonly expandable?: ReactNode;
/** สถานะกาง (controlled) — ผู้เรียกคุมเอง เพื่อบังคับ "เปิดได้ทีละรายการ" */
readonly open?: boolean;
readonly onOpenChange?: (open: boolean) => void;
```

โครงของคอลัมน์เนื้อหาเมื่อ **ไม่มี** `expandable` — เหมือนเดิมทุกพิกเซล:

```
<div class="relative min-w-0 border-l pb-5 pl-4 …">
  <span marker />
  {title + badge}
  {children}
  {elapsed}
</div>
```

เมื่อ **มี** `expandable`:

```
<div class="relative min-w-0 border-l pb-5 pl-4 …">
  <span marker />
  <Collapsible open onOpenChange>
    <CollapsibleTrigger>       ← ปุ่มเต็มความกว้าง: {title + badge} + {children} + chevron ปลายขวา
    <CollapsibleContent>       ← {expandable}
  </Collapsible>
  {elapsed}
</div>
```

รายละเอียดการเรนเดอร์:

- `CollapsibleTrigger` เป็นปุ่มเต็มความกว้าง `text-left` · `hover:bg-muted/50` · `rounded-md` ·
  focus ring · `cursor-pointer` — ไม่ใช้ negative margin ทางซ้ายเพื่อไม่ให้พื้นหลัง hover ทับจุด marker
- `ChevronRight` ขนาด `size-3.5` สี `text-muted-foreground` อยู่ปลายขวาของ trigger
  หมุน `rotate-90` เมื่อกาง (`transition-transform`) · `aria-hidden`
- `CollapsibleContent` ไม่มีการเยื้องเพิ่ม — คอลัมน์เนื้อหาเยื้องด้วย `pl-4` จากรางอยู่แล้ว
- `elapsed` อยู่นอก `Collapsible` เสมอ จึงเห็นได้ทั้งตอนกางและตอนหุบ
- สถานะกางเป็น controlled ล้วน (ไม่มี uncontrolled fallback) — ผู้เรียกที่ต้องการ accordion
  ต้องถือ state เอง ซึ่งเป็นสิ่งที่ activity sheet ต้องทำอยู่แล้วเพื่อบังคับเปิดทีละรายการ

การแก้ที่กระทบของเดิม 1 จุด: `children` ที่เคยห่อด้วย `<p className="text-muted-foreground text-xs">`
เปลี่ยนเป็น `<div>` คลาสเดิม — เพราะ `<p>` ใส่ปุ่มข้างในไม่ได้ หน้าตาไม่เปลี่ยน

### `formatElapsed` ย้ายบ้าน

ตอนนี้เป็น function ส่วนตัวใน `workflow-history-timeline.tsx` ย้ายมาไว้ที่
`history-timeline.tsx` แล้ว `export` — activity ต้องใช้ตัวเดียวกันเพื่อให้ข้อความช่วงเวลา
ตรงกันทั้งสองไทม์ไลน์ ตรรกะไม่เปลี่ยน (คืน `null` เมื่อห่างไม่ถึง 5 วินาที) และ
`workflow-history-timeline.tsx` เปลี่ยนแค่บรรทัด import

### `routes/procurement/purchase-request/pr-activity-sheet.tsx`

ส่วนที่ **ไม่แตะ**: `humanize` · `relationLabel` · `formatValue` · `rowLabelOf` · `indexRows` ·
`actorNameOf` · `HIDDEN_FIELDS` · `ROW_NAME_FIELDS` · `FieldChangeRow` · `RowMarkLine` ·
`ChildChangeBlock` · `ActivityChanges` · การ fetch (`open ? prId : undefined`, `perpage: 50`)
· การ reverse ให้ล่าสุดอยู่บน · หัวและความกว้างของ sheet (`sm:max-w-xl lg:max-w-2xl`)

ส่วนที่ **เปลี่ยน**: บล็อก `<div className="divide-border divide-y">…</div>` ที่ map เป็น
`Collapsible` กลายเป็น `<HistoryTimeline groupByDay>` ที่ map เป็น `HistoryTimelineItem`

ส่วนที่ **ลบ**: `ACTION_CLASS` · import `Badge` · import `Collapsible*` · import `ChevronRight`
· import `cn` (ถ้าไม่เหลือที่ใช้) · การคำนวณ `datetimeFormat` (ไทม์ไลน์ format เองผ่าน context)

ส่วนที่ **เพิ่ม**: ตัวแปล namespace `history` ตัวที่สอง — `t` ของไฟล์นี้ผูกกับ
`procurement.purchaseRequest` อยู่แล้ว แต่ key ใหม่กับ `formatElapsed` ต้องใช้ `history`
จึงเพิ่ม `const tHistory = useTranslations("history")` แล้วส่ง `tHistory` เข้า `formatElapsed`
· map `action → title` · การคำนวณ marker / tone / elapsed ต่อแถว

| ค่า | กติกา |
|---|---|
| `title` | `create` → `tHistory("actionCreated")` · `update` → `tHistory("actionUpdated")` · `delete` → `tHistory("actionDeleted")` · อื่น ๆ → `humanize(action)` |
| `children` | `actorNameOf(log)` |
| `marker` | `create` → `origin` · แถวแรกของรายการ (ล่าสุด) → `current` · ที่เหลือ → `default` |
| `tone` | `delete` → `alert` · ที่เหลือ → `default` |
| `elapsed` | `formatElapsed(เวลาของ log ที่เก่ากว่าถัดไป, เวลาของ log นี้, tHistory)` · แถวล่างสุดได้ `null` |
| `expandable` | `<ActivityChanges logId={log.id} />` เรนเดอร์เฉพาะตอนกาง (เงื่อนไข `isOpen &&` เดิม) |
| `open` / `onOpenChange` | ผูกกับ `expandedId` state เดิม — เปิดได้ทีละรายการ |

`create` ชนะ `current` เมื่อชนกัน (เอกสารที่เพิ่งสร้างยังไม่เคยถูกแก้ จะมีแถวเดียวและควรเป็นวงกลมกลวง
เพราะมันคือจุดกำเนิด ไม่ใช่ "ก้าวล่าสุดของกระบวนการ")

หัวข้อคั่นวันแทรกเมื่อวันของแถวต่างจากแถวก่อนหน้า ด้วยรูปแบบเดียวกับ workflow history:
`formatDate(at, dateFormat)` จาก `useProfile()`

### `messages/{en,th}.json`

เพิ่มใน namespace `history` ต่อจาก `documentCreated`:

| key | en | th |
|---|---|---|
| `actionCreated` | `Created` | `สร้าง` |
| `actionUpdated` | `Updated` | `แก้ไข` |
| `actionDeleted` | `Deleted` | `ลบ` |

## หน้าตาผลลัพธ์

```
29 ก.ค. 2026 ────────────────────────────────

 10:03  ●  Updated                          ›
        │  Anong Somchai
        │  ใช้เวลา 51 นาที
 09:12  ●  Updated                          ⌄
        │  Boonmee T
        │  ┌ Pr Status   draft → in_progress
        │  └ Detail  เพิ่ม 1 · แก้ไข 2
        │  ใช้เวลา 3 ชั่วโมง

28 ก.ค. 2026 ────────────────────────────────

 16:40  ○  Created
           Anong Somchai
```

## สถานะและ edge case

| กรณี | พฤติกรรม |
|---|---|
| กำลังโหลดรายการ | Skeleton 4 แท่ง `h-12` (คงเดิม) |
| โหลดรายการไม่สำเร็จ | `t("activityLoadError")` (คงเดิม) |
| ไม่มีกิจกรรม | `t("activityEmpty")` (คงเดิม) |
| กำลังโหลด diff | spinner ในเนื้อหาที่กางออก (คงเดิม) |
| diff ว่าง | `t("activityNoChanges")` (คงเดิม) |
| action ที่ไม่รู้จัก | `humanize(action)` — ไม่ยืมชื่อ action อื่นมาแสดง |
| log ทั้งหมดวันเดียวกัน | หัวข้อคั่นวันอันเดียวบนสุด |
| ห่างกันไม่ถึง 5 วินาที | ไม่แสดงบรรทัด elapsed (ตรรกะเดิมของ `formatElapsed`) |
| เวลา parse ไม่ได้ | รางซ้ายว่าง ไม่ใส่ `dateTime` attribute (ตรรกะเดิมของ `HistoryTimelineItem`) |
| dark mode | ไม่มีคลาสสีดิบใหม่ — จุดและเส้นใช้ token เดิมทั้งหมด |

## การทดสอบ

`pr-activity-sheet.test.tsx` เดิม 6 เคสต้องเขียวโดย**ไม่แก้ไฟล์ test** — trigger ยังเป็น
`button` ที่มีชื่อผู้กระทำอยู่ข้างใน `getByRole("button", { name: /Anong/ })` และลำดับ
ล่าสุด-อยู่บนยังเหมือนเดิม ถ้าเคสใดแดงแปลว่าโครงสร้างที่ผู้ใช้สัมผัสได้เปลี่ยนไปจริง ต้องกลับมาทบทวน

`components/share/history-timeline.tsx` ยังไม่มี test — ไม่เพิ่มในรอบนี้ (ตาม working preference
ของโปรเจกต์) การถดถอยของ consumer เดิมตรวจด้วยตาแทน

**Gate ก่อน merge**

```bash
bunx tsc --noEmit && bun run lint && bun test:run
```

**ตรวจด้วยตา** — เปิด `/procurement/purchase-request/<id>` แล้วดู 4 อย่าง:

1. Activity sheet เป็นไทม์ไลน์ · กางแถวแล้ว diff โผล่ · เส้นรางต่อเนื่องคลุมเนื้อหาที่กางออก
2. เปิดแถวที่สองแล้วแถวแรกหุบเอง
3. Workflow history sheet, PO (`po-form.tsx`), SR (`sr-header.tsx`) และ item history
   หน้าตาไม่เปลี่ยนจากเดิม
4. สลับ dark mode และสลับภาษา TH/EN แล้วยังอ่านได้ครบ
