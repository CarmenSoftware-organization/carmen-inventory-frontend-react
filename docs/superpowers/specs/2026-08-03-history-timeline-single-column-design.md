# History timeline — เปลี่ยนจากซิกแซกเป็นคอลัมน์เดียวพร้อมรางเวลา

วันที่: 2026-08-03

## ปัญหา

ไทม์ไลน์ประวัติทั้งสองตัวของระบบเป็น **ซิกแซกสลับซ้าย/ขวา** ซึ่งมีปัญหาสองข้อ:

1. **พื้นที่** — แต่ละรายการกว้างแค่ `w-[calc(50%-1.5rem)]` ของ Sheet ทำให้ชื่อ stage
   หรือชื่อสินค้ายาว ๆ ตัดบรรทัดถี่ ทั้งที่ Sheet มีที่ว่างครึ่งจออีกฝั่ง
2. **โค้ดซ้ำ** — คลาส override ของซิกแซก 11 บรรทัด (`odd:group-data-[orientation=
   vertical]/timeline:**:data-[slot=timeline-indicator]:…`) ถูกก๊อปไว้ **สองที่**
   เหมือนกันทุกตัวอักษร และอ่านแทบไม่ออกว่าทำอะไร

ต้องการเปลี่ยนเป็นสไตล์คอลัมน์เดียว: เวลาอยู่ในรางซ้าย · เส้นแนวตั้ง + จุด · เนื้อหาทางขวา

## ขอบเขต

เปลี่ยนทั้ง **สองไฟล์** ที่ใช้ซิกแซก — ผู้ใช้เห็นทั้งคู่ในหน้า PR เดียวกัน
ปล่อยไว้ตัวเดียวจะได้ 2 สไตล์ในหน้าเดียว

| ไฟล์ | ระดับ | ใช้โดย |
|---|---|---|
| `components/share/workflow-history-timeline.tsx` | เอกสาร | PR (`pr-form-dialogs.tsx`), PO (`po-form.tsx`), SR (`sr-header.tsx`) |
| `components/share/item-history-sheet.tsx` | รายบรรทัดสินค้า | PR / PO / SR |

**นอกขอบเขต:** `components/ui/timeline.tsx` (primitive) ไม่แตะและไม่ลบในรอบนี้ ·
`pr-activity-sheet.tsx` (activity log) เป็นคนละรูปแบบอยู่แล้ว ไม่เกี่ยว

## การตัดสินใจด้านการออกแบบ

| ประเด็น | ที่เลือก | เหตุผล |
|---|---|---|
| การจัดข้อมูล | Badge สี + ชื่อผู้ใช้แถวบน · รายละเอียดแถวล่าง | เก็บสีสถานะเดิมไว้ (เขียว=approved / แดง=rejected) ซึ่งช่วยกวาดตา และได้ 2 แถวต่อเหตุการณ์ สั้นกว่าแยก 3 ชั้นแบบ reference |
| รางเวลา | วันที่ + เวลา **2 บรรทัด** ทุกแถว | workflow กินเวลาหลายวัน อ่านแถวไหนก็รู้วันทันที ไม่ต้องไล่หาหัวข้อคั่นกลุ่ม และคัดลอก/ส่งออกได้ตรง ๆ |
| ลำดับ | ล่าสุดบนสุด (คงพฤติกรรมเดิม) | เปิด Sheet มาเห็นสิ่งที่เพิ่งเกิดทันที |
| บล็อกผู้ร้องขอ | ยุบเป็น **แถวสุดท้ายของไทม์ไลน์** | การสร้างเอกสารคือเหตุการณ์แรกของ workflow จริง ๆ — อยู่ในรางเวลาเดียวกันทำให้อ่านต่อเนื่อง แทนบล็อก avatar ที่ลอยอยู่นอกไทม์ไลน์ |
| วิธีทำ | เขียน grid ใหม่ ไม่ใช้ `ui/timeline` primitive | primitive ออกแบบมาเพื่อ "จุด+เส้นซ้าย เนื้อหาขวา" และวาง `TimelineDate` ไว้ในคอลัมน์เนื้อหา — คนละโครงกับ "เวลา \| จุด+เส้น \| เนื้อหา" การ override ให้ได้โครงใหม่แพงกว่าเขียนใหม่ และจะได้กำแพงคลาสอ่านไม่ออกอีกชุด |

**ที่ไม่เลือก:** เพิ่มโหมดรางเวลาเข้าไปใน `ui/timeline.tsx` — ขยายผิวสัมผัสของ primitive
ที่ยังมีคนใช้อยู่โดยไม่มีผู้ใช้ซ้ำจริง (YAGNI) และเสี่ยง regression กับ consumer เดิม

## สถาปัตยกรรม

สร้าง presentational component ตัวเดียวที่ทั้งสองไฟล์เรียกใช้ — กำแพงคลาสซิกแซกที่ซ้ำกัน
2 ที่หายไปทั้งคู่ และการ format วันที่ (`useProfile()` + `formatDate`) ที่ทั้งสองไฟล์ทำ
เหมือนกันบรรทัดต่อบรรทัดย้ายมาอยู่ที่เดียว

### `components/share/history-timeline.tsx` (ใหม่)

```tsx
/** รายการไทม์ไลน์ — <ol> ที่ถือ grid 2 คอลัมน์ให้ item ทุกตัวใช้ร่วมกัน */
export function HistoryTimeline({ children }: { children: ReactNode })

export interface HistoryTimelineItemProps {
  /** ISO datetime — ใช้ทั้งข้อความในรางซ้ายและ <time dateTime> */
  readonly at: string;
  /** จุด marker: "current" ทึบสี primary · "default" ทึบสีเส้น · "origin" กลวง */
  readonly marker?: "current" | "default" | "origin";
  /** Badge สถานะ (โมดูลส่งมาเอง) แสดงหน้าชื่อ */
  readonly badge?: ReactNode;
  /** ชื่อผู้ใช้ — ว่างได้ (บาง entry ของ PO ส่งมาแค่ id) */
  readonly title?: ReactNode;
  /** บรรทัดคำอธิบายใต้ชื่อ */
  readonly children?: ReactNode;
}

export function HistoryTimelineItem(props: HistoryTimelineItemProps)
```

การใช้งาน (workflow history):

```tsx
<HistoryTimeline>
  {reversedHistory.map((entry, i) => (
    <HistoryTimelineItem
      key={…}
      at={entry.at ?? entry.datetime ?? ""}
      marker={i === 0 ? "current" : "default"}
      badge={<Badge className={config.className} size="xs">{config.label}</Badge>}
      title={entry.user.name}
    >
      {stageLine}
    </HistoryTimelineItem>
  ))}
  {requestorName && (
    <HistoryTimelineItem at={createdAt ?? ""} marker="origin" title={requestorName}>
      {tfl("requester")}
    </HistoryTimelineItem>
  )}
</HistoryTimeline>
```

API ของทั้งสองไฟล์ที่ route เรียก (`WorkflowHistoryTimeline`, `ItemHistorySheet`)
**ไม่เปลี่ยน** — ไม่ต้องแก้ไฟล์ฝั่ง route เลย

### เหตุผลที่ใช้ `grid-cols-subgrid`

รางวันที่ต้องกว้างเท่ากันทุกแถว แต่ fix ความกว้างไม่ได้เพราะ `dateFormat` มาจาก config
ของ BU (`hooks/use-profile.ts` — default `DD/MM/YYYY` แต่ตั้งเป็น `DD MMMM YYYY` ได้)

`<ol>` ถือ `grid grid-cols-[auto_1fr]` แล้ว `<li>` ใช้ `grid-cols-subgrid col-span-2`
→ ทุกแถวใช้ track เดียวกัน คอลัมน์วันที่กว้างเท่ากันอัตโนมัติ และ `<li>` ยังเป็น list item
จริงในสายตา screen reader (ต่างจาก `display: contents` ที่เคยมีปัญหา a11y)

## สเปกภาพ

```html
<ol  class="grid grid-cols-[auto_1fr] gap-x-3">
  <li class="group/hist grid grid-cols-subgrid col-span-2">
    <time datetime="2026-06-09T05:05:00Z"
          class="text-micro text-muted-foreground text-right leading-tight
                 whitespace-nowrap tabular-nums pt-0.5">
      <span class="block">09 Jun</span>   <!-- formatDate(at, dateFormat) -->
      <span class="block">12:05</span>    <!-- formatDate(at, "HH:mm")    -->
    </time>
    <div class="relative border-l pl-4 pb-5
                group-last/hist:border-transparent group-last/hist:pb-0">
      <span aria-hidden="true"
            class="absolute left-0 top-1.5 -translate-x-1/2 size-2 rounded-full
                   ring-4 ring-background …marker"></span>
      <div class="flex flex-wrap items-center gap-2">
        [Badge] <span class="text-sm font-medium">Somchai Jaidee</span>
      </div>
      <p class="text-xs text-muted-foreground">Department Head → Finance Mgr</p>
    </div>
  </li>
</ol>
```

ผลลัพธ์:

```
09 Jun   ●  [APPROVED]   Somchai Jaidee        ← จุดทึบ primary = ล่าสุด
12:05    │  Department Head → Finance Mgr
         │
08 Jun   ●  [SENT BACK]  Malee Suksan
09:41    │  Finance Mgr → Requestor
         │
08 Jun   ●  [SUBMITTED]  Ploy Nakorn
08:10    │  → Department Head
         │
08 Jun   ○  Ploy Nakorn                        ← จุดกลวง = จุดเริ่มต้น
08:00       ผู้ร้องขอ
```

### `dateFormat` ที่มี token เวลาอยู่แล้ว

`date_format` ของ BU ตั้งเป็น `DD/MM/YYYY HH:mm` ได้ ถ้าต่อ `HH:mm` เข้าไปดื้อ ๆ จะได้
เวลาซ้ำสองที่ (`pr-activity-sheet.tsx` มี guard `dateFormat.includes("HH")` ด้วยเหตุผล
เดียวกัน — ส่วน `workflow-history-timeline.tsx` เดิมต่อดื้อ ๆ จริง) กติกาของ
`HistoryTimelineItem`:

| `dateFormat` | รางซ้าย |
|---|---|
| มี token เวลา (`HH` หรือ `hh`) | บรรทัดเดียว ใช้ `dateFormat` ตรง ๆ |
| ไม่มี | 2 บรรทัด — `dateFormat` แล้วบรรทัดถัดไป `HH:mm` |

`formatDate` คืน `""` เมื่อ parse ไม่ได้อยู่แล้ว จึงไม่ต้อง guard ค่า `at` เพิ่ม

### จุด marker

| แบบ | คลาส | ใช้เมื่อ |
|---|---|---|
| `current` | `bg-primary` | แถวบนสุด (เหตุการณ์ล่าสุด) |
| `default` | `bg-border` | แถวกลาง |
| `origin` | `bg-background border-2 border-border` | แถวผู้ร้องขอ |

ใช้ token ล้วน → dark mode ได้ฟรี · `ring-4 ring-background` ทำให้จุดเจาะทะลุเส้น
แทนที่จะทับกันเป็นก้อน · เส้นรางวาดด้วย `border-l` ของคอลัมน์เนื้อหา ไม่ใช่ element
absolute แยก จึงต่อกันสนิทเสมอไม่ว่าเนื้อหาจะสูงเท่าไร

## สถานะและกรณีขอบ

| สถานะ | พฤติกรรมที่ต้องได้ |
|---|---|
| ไม่มีประวัติ | `emptyLabel` เดิม (workflow) / sheet ว่าง (item) — ไม่เปลี่ยน |
| มีรายการเดียว | `group-last/hist` ทำให้เส้นหาย เหลือจุดเดียว ไม่มีเส้นห้อยลงมา |
| `user.name` ว่าง | Badge อยู่ลำพังในแถว ไม่มีช่องว่างหรือ gap ค้าง (เกิดจริงใน item history ของ PO) |
| action/status ไม่รู้จัก | `unknownStatusEntry()` เดิม — ไม่ยืมป้ายของ action อื่น |
| stage / ชื่อสินค้ายาว | ตัดบรรทัดได้เต็มความกว้างของ Sheet |
| item history มี `message` | แสดงเป็นบรรทัดที่ 2 ของคำอธิบาย (พฤติกรรมเดิม) |
| `at` ว่าง/พัง | รางเวลาว่าง ไม่ throw — `formatDate` คืนค่าว่างอยู่แล้ว |
| มือถือ (Sheet `w-full`) | รางวันที่ยุบตามเนื้อหา ที่เหลือเป็นคอลัมน์เนื้อหา |

## Accessibility

- `<ol>` / `<li>` เป็น list semantic จริง (ของเดิมเป็น `<div>` ล้วน)
- `<time dateTime={iso}>` — ค่าที่ machine อ่านได้เป็น ISO ไม่ใช่ข้อความที่ format แล้ว
- จุด marker เป็น `aria-hidden` (ตกแต่งล้วน)
- สีไม่ได้เป็นตัวบอกสถานะตัวเดียว — Badge มีข้อความกำกับเสมอ

## ไฟล์ที่แตะ

- **ใหม่** `components/share/history-timeline.tsx`
- **แก้** `components/share/workflow-history-timeline.tsx` — ตัดคลาสซิกแซก + ยุบบล็อก
  ผู้ร้องขอเป็นแถวสุดท้าย + ลบ import `UserRound` / `Timeline*` / `cn` ที่ไม่ใช้แล้ว
- **แก้** `components/share/item-history-sheet.tsx` — ตัดคลาสซิกแซกชุดเดียวกัน
- **ไม่แตะ** ไฟล์ฝั่ง route ทั้งหมด (API ของ component ไม่เปลี่ยน) และ `components/ui/timeline.tsx`

ไม่ต้องเพิ่มคีย์ i18n ใหม่ — `field.requester` มีอยู่แล้ว

## การตรวจสอบ

1. `bunx tsc --noEmit` สะอาด (ระวัง `TS6133` จาก import ที่เหลือค้างหลังตัดโค้ด)
2. `bun run lint` สะอาด
3. `bun test:run` เขียวเท่าเดิม (ไม่มีเทสต์ของสองไฟล์นี้อยู่ก่อน)
4. ตรวจในเบราว์เซอร์:
   - PR `/procurement/purchase-request/<id>` → Sheet workflow history
   - PO และ SR → Sheet เดียวกัน
   - item history (ปุ่ม git-branch ในตารางรายการ) ทั้ง 3 โมดูล
   - สลับ light / dark
   - ใบที่มีประวัติรายการเดียว และใบที่ยังไม่มีประวัติ
