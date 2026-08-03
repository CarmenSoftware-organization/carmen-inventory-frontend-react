# WorkflowTrack — chevron ribbon

วันที่: 2026-08-03
ไฟล์เป้าหมาย: `components/share/workflow-track.tsx`, `styles/globals.css`, `styles/badge-status.css`

## ปัญหา

`WorkflowTrack` แสดงลำดับขั้น workflow ของเอกสารเป็น breadcrumb ข้อความล้วน คั่นด้วย
`ChevronRight` ไอคอนเล็ก ๆ แยกว่าขั้นไหนผ่านแล้ว / กำลังอยู่ / ยังไม่ถึง ด้วยความเข้ม
ของสีเทาและน้ำหนักตัวอักษรเท่านั้น ในแถบหัวเอกสารที่มีทั้ง badge สถานะ เลข version
และช่องข้อมูลอีกหลายช่อง ความต่างระดับนั้นเบาเกินกว่าจะกวาดตาเจอ

ต้องการเปลี่ยนเป็นลูกศรต่อกัน (chevron ribbon) ที่แต่ละขั้นเป็นกล่องพื้นสีของตัวเอง
ผ่านแล้วเขียว กำลังอยู่เหลือง ยังไม่ถึงเทา

## ขอบเขต

**ทำ:** เปลี่ยนหน้าตาของ `WorkflowTrack` เป็น chevron ribbon พื้นสีอ่อน

**ไม่ทำ:**

- ไม่แตะ props — 3 call site (`pr-header.tsx`, `po-header.tsx`, `sr-header.tsx`) ไม่ต้องแก้
- ไม่แตะ `components/share/doc-form-header.tsx` และตำแหน่งวางใน layout
- ไม่แสดงขั้นเกิน 3 (prev / current / next) ตามข้อมูลที่ header ส่งมาอยู่แล้ว
- ไม่เพิ่ม i18n key ใหม่

## การตัดสินใจเชิงออกแบบ

### ทำไมถึงกลับมาใช้สีบอกสถานะ

comment ในไฟล์เดิมและ `docs/DESIGN.md` ระบุชัดว่า *ไม่* ใช้สีบอกสถานะในองค์ประกอบนี้
ใช้น้ำหนักตัวอักษรกับความเข้มแทน การเปลี่ยนครั้งนี้ย้อนการตัดสินใจนั้นโดยตั้งใจ
เพราะกฎที่แท้จริงใน `DESIGN.md` คือ "สถานะเป็นข้อมูล ไม่ใช่การประดับ และปรากฏ
ครั้งเดียวต่อองค์ประกอบ" — ไม่ใช่ "ห้ามใช้สี" สิ่งที่โค้ดเดิมแก้คือการยิงสี info
ใส่ขั้นปัจจุบันสี่ชั้นพร้อมกัน (ป้าย + จุด + halo ที่เต้น + ชื่อขั้น) ซึ่งงานนี้ไม่ทำซ้ำ

ข้อจำกัดที่ตั้งไว้เพื่อไม่ให้กลับไปเป็นแบบเดิม: **หนึ่งเฉดต่อหนึ่งช่อง** ปรากฏสองระดับ
ความเข้ม (พื้น 14–18% กับไอคอนเต็มความเข้ม) และ **ข้อความเป็นสีกลางเสมอ** ไม่รับสีสถานะ

### ทำไม clip-path ไม่ใช่ pseudo-element หรือ SVG

- **`clip-path: polygon()`** — หนึ่ง element ต่อขั้น ยืดหดตามความยาวชื่อขั้นเอง
  รับ CSS custom property ได้เต็มที่จึงได้ dark mode มาฟรี · ข้อเสียเดียวคือใส่
  `border` ไม่ได้เพราะ clip ตัดเส้นขอบไปด้วย ซึ่งไม่กระทบเพราะออกแบบเป็นพื้น tint
  ไม่ใช่ outline
- **สามเหลี่ยม `::before`/`::after`** — ใส่เส้นขอบจริงได้ แต่ต้องนิยาม 2 pseudo-element
  × 4 สถานะ × 2 ธีม และปลายสามเหลี่ยมกับพื้นมักเหลื่อมกันประมาณครึ่งพิกเซลบนจอ non-retina
- **SVG background** — สีต้อง inline เข้า data-URI ผูก CSS var ไม่ได้ ต้องทำ 8 ไฟล์
  และความกว้างไม่ยืดตามข้อความ

## โครงสร้าง

### สถานะของแต่ละช่อง

props เดิมไม่เปลี่ยน:

```ts
interface WorkflowTrackProps {
  readonly previousStage?: string;
  readonly currentStage: string;
  readonly nextStage?: string;
  readonly terminalState?: "voided";
}
```

การประกอบ `stages` ยังเป็นตรรกะเดิม (กรอง `undefined` และ `"-"` ทิ้ง เมื่อ voided
ให้ `nextStage` เป็น `undefined`) จากนั้นแปลงตำแหน่งเป็นสถานะ:

| เงื่อนไข | state |
|---|---|
| `i < currentIndex` | `done` |
| `i === currentIndex && !isVoided` | `current` |
| `i === currentIndex && isVoided` | `voided` |
| `i > currentIndex` | `pending` |

จำนวนช่องเป็นได้ 1–3 ไม่ใช่ 3 เสมอ

### รูปทรง

clip-path อยู่ใน `@layer components` ของ `styles/globals.css` (ไฟล์ที่ `@import "tailwindcss"`)
ไม่ใช่ arbitrary value ในไฟล์ tsx เพราะ polygon 6 จุดเขียนเป็น class string แล้วอ่านไม่ออก
และใช้ซ้ำทุก segment:

```css
@layer components {
  /* ลูกศร workflow — บากซ้ายรับปลายของช่องก่อนหน้า, แหลมขวา */
  .wf-chevron {
    --wf-notch: 0.5rem;
    clip-path: polygon(
      0 0,
      calc(100% - var(--wf-notch)) 0,
      100% 50%,
      calc(100% - var(--wf-notch)) 100%,
      0 100%,
      var(--wf-notch) 50%
    );
  }

  /* ช่องแรก — ซ้ายตัดตรง ไม่มีอะไรมาเสียบ
     ต้องใส่คู่กับ .wf-chevron เสมอ (เอา --wf-notch มาจากตัวนั้น) และต้องประกาศ
     หลัง .wf-chevron ในไฟล์ — specificity เท่ากัน (0,1,0) ลำดับใน source
     เป็นตัวตัดสินว่า clip-path ไหนชนะ */
  .wf-chevron-head {
    clip-path: polygon(
      0 0,
      calc(100% - var(--wf-notch)) 0,
      100% 50%,
      calc(100% - var(--wf-notch)) 100%,
      0 100%
    );
  }
}
```

### ขนาด

ทุกค่าอยู่บน 4px grid ตาม `DESIGN.md`

| สิ่งของ | ค่า | เหตุผล |
|---|---|---|
| ความสูงช่อง | `h-6` (24px) | พอดีกับข้อความ 11px + ไอคอน 12px |
| ขนาดตัวอักษร | `text-micro` (11px) | tier เดิมของ component นี้ ไม่แตะ type ladder |
| ไอคอน | `size-3` (12px) | |
| ความลึกรอยบาก / ปลายแหลม | `--wf-notch: 0.5rem` (8px) | |
| padding ซ้าย ช่องแรก | `pl-2` (8px) | ไม่มีรอยบาก |
| padding ซ้าย ช่องถัดไป | `pl-4` (16px) | 8px รอยบาก + 8px หายใจ |
| padding ขวา ทุกช่อง | `pr-4` (16px) | กว้างกว่าปลายแหลม 8px ข้อความจึงไม่ล้ำเข้ามุมแหลม |
| ช่องไฟระหว่าง segment | `gap-0.5` (2px) | tint สองสีไม่ชนกัน อ่านเป็นลูกศรแยกชิ้น |
| ความกว้างสูงสุดต่อช่อง | `max-w-20 sm:max-w-32` | ดู "Responsive" |

### JSX

```tsx
<div className="flex min-w-0 items-center gap-0.5">
  {stages.map((stage, i) => {
    const state = resolveState(i, currentIndex, isVoided);
    return (
      <div
        key={`${i}-${stage}`}
        className={cn(
          "wf-chevron flex h-6 min-w-0 items-center gap-1 pr-4 text-micro",
          i === 0 ? "wf-chevron-head pl-2" : "pl-4",
          STATE_STYLE[state],
        )}
      >
        {STATE_ICON[state]}
        <span className="max-w-20 truncate sm:max-w-32" title={stage}>
          {stage}
        </span>
      </div>
    );
  })}
</div>
```

## สี

### Token ที่เพิ่ม

เติมท้ายบล็อก `:root` ของ `styles/badge-status.css` — คำนวณจากสีที่มีอยู่ ไม่นิยามเฉดใหม่

```css
/* ── Soft tints: พื้นลูกศร workflow-track ──
   ผสมกับ --card ซึ่งพลิกเองตามธีม จึงประกาศครั้งเดียวพอ ไม่ต้องมีคู่ใน .dark
   (next-themes ใช้ attribute="class" → :root กับ .dark อยู่บน <html> ตัวเดียวกัน
   var() ใน custom property resolve ที่ computed-value time บน element นั้น
   จึงได้ค่าที่ชนะ cascade เสมอ ไม่ขึ้นกับลำดับการประกาศ) */
--status-approved-soft:    color-mix(in oklch, var(--status-approved)    14%, var(--card));
--status-in-progress-soft: color-mix(in oklch, var(--status-in-progress) 18%, var(--card));
--status-voided-soft:      color-mix(in oklch, var(--status-voided)      14%, var(--card));
```

### ตารางต่อ state

| state | พื้น | ไอคอน (lucide, `size-3`, `aria-hidden`) | ข้อความ |
|---|---|---|---|
| `done` | `--status-approved-soft` | `Check` สี `--status-approved` | `text-muted-foreground` |
| `current` | `--status-in-progress-soft` | `Circle` + `fill-current` สี `--status-in-progress` | `text-foreground font-medium` |
| `pending` | `bg-muted` | `Circle` (กลวง) สี `text-muted-foreground` | `text-muted-foreground/70` |
| `voided` | `--status-voided-soft` | `X` สี `--status-voided` | `text-foreground font-medium line-through` |

`font-medium` (500) บนขั้นปัจจุบันตรงกับ tier "ค่า" ของ `DESIGN.md` — เด่นกว่าของข้าง ๆ
โดยไม่ตะโกน

### สามข้อที่ต่างจากการอ่านกฎแบบเคร่งที่สุด

1. **`pending` ใช้ `bg-muted` ไม่ใช่ tint ของ `--status-draft`** — เทา 10% ผสมกับ `--card`
   ในโหมดมืดจางจนมองไม่เห็นรูปลูกศร และในเชิงความหมาย "ยังไม่ถึง" คือยังไม่มีสถานะ
   ไม่ใช่สถานะสีเทา · `bg-muted` เป็น token ที่ badge variant `-light` ใช้เป็นกล่องกลางอยู่แล้ว

2. **`voided` ใช้ `--status-voided` (ชมพูเข้ม) แทน `text-destructive` ของโค้ดเดิม** —
   `DESIGN.md` ห้ามปน semantic token กับ document status แอปมี token voided อยู่แล้ว
   ของเดิมหยิบ `destructive` มาใช้เป็นการข้ามชั้นที่แก้ไปพร้อมกัน

3. **ไอคอนใช้สีสถานะเต็มความเข้ม ข้อความเป็นสีกลาง** — tint 14% ที่ 11px ในแถบแน่น ๆ
   แยกเขียวจางกับเทาจางแทบไม่ออก ไอคอนเข้มทำให้อ่านได้จริง และเป็นเฉดเดียวกัน
   สองระดับความเข้ม ไม่ใช่สองสัญญาณแข่งกัน · ข้อความกลางทำให้ contrast ผ่าน 4.5:1
   ทั้งสองธีมโดยไม่ต้องทำ ink token เพิ่ม

## Edge case

| กรณี | ผลลัพธ์ |
|---|---|
| 3 ช่อง (ปกติ) | เขียว → เหลือง → เทา |
| 2 ช่อง (ใบเพิ่ง submit ไม่มี prev) | เหลือง → เทา ช่องแรกเป็น `wf-chevron-head` |
| 2 ช่อง (completed ไม่มี next) | เขียว → เหลือง |
| 1 ช่อง | หัวตัดตรง ปลายแหลม — ยังเป็นลูกศร ไม่ใช่สี่เหลี่ยม |
| 0 ช่อง | `return null` เหมือนเดิม |
| ชื่อขั้นยาว | `truncate` + `title` เหมือนเดิม `pr-4` กว้างกว่าปลายแหลมข้อความจึงไม่ล้ำ |
| draft / ยังไม่เข้า workflow | call site ซ่อน component นี้อยู่แล้ว ไม่ต้องจัดการ |

## Responsive

track กว้างได้ถึงราว 400px (3 × `max-w-32`) นั่งอยู่ขวาของ flex row ที่ไม่ wrap ใน
`doc-form-header.tsx` **บนจอ 375px มันล้นอยู่แล้วก่อนงานนี้** — เป็นปัญหาที่มีมาก่อน
ไม่ใช่ที่งานนี้สร้าง

บรรเทาในไฟล์เดียวโดยไม่แตะ header: `max-w-20 sm:max-w-32` ต่อช่อง ตัดความกว้างสูงสุด
เหลือราว 250px บนมือถือ และแถบยัง `min-w-0` ให้ยุบได้ การแก้ให้ขาดจริงต้องรื้อ layout
ของ `doc-form-header.tsx` ซึ่งอยู่นอกขอบเขตงานนี้

## Accessibility

- ไอคอนต่างรูปต่อ state (`✓` / `●` / `○` / `✕`) ทำให้ผ่านกฎ "ห้ามใช้สีเป็นตัวบอก
  อย่างเดียว" — คนตาบอดสีเขียว-เหลืองยังแยกรูปได้
- ไอคอนใส่ `aria-hidden` · screen reader อ่านชื่อขั้นเรียงซ้ายไปขวาเหมือนพฤติกรรมเดิม
  ไม่เพิ่ม aria string ใหม่จึงไม่ต้องแตะ `messages/{en,th}.json`
- ข้อความเป็นสีกลางบนพื้น tint จาง contrast ผ่าน 4.5:1 ทั้งสองธีม
- ไม่มี animation ตามหลักเดิมของไฟล์ — ความเคลื่อนไหวควรบอกว่ามีอะไรเปลี่ยน
  ไม่ใช่ประดับสถานะที่นิ่ง

## การตรวจสอบ

ไม่เขียน test ใหม่ (component นี้ไม่มีไฟล์ test เดิม และ preference ของ user คือ
ไม่สร้าง test นอกจากจะขอ) แต่ static check ครบ

1. `bunx tsc --noEmit`
2. `bun run lint`
3. `bun test:run` — ชุดเดิมต้องเขียวหมด โดยเฉพาะ `components/ui/type-ladder.test.ts`
   (ใช้ `text-micro` ที่มีอยู่แล้ว ไม่เพิ่ม size literal ใหม่ จึงไม่ควรกระทบ)
4. ตรวจในเบราว์เซอร์ — PR ที่ submitted / completed / voided × light + dark
   **dark mode สำคัญเป็นพิเศษ** เพราะ `color-mix` ที่ประกาศครั้งเดียวพึ่งพาการที่
   `:root` กับ `.dark` อยู่บน `<html>` ตัวเดียวกัน ถ้าเพี้ยนจะเห็นทันทีว่าพื้นยังเป็น
   สีของโหมดสว่าง

## ไฟล์ที่แตะ

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `components/share/workflow-track.tsx` | เขียน render ใหม่ทั้งหมด props เดิม |
| `styles/globals.css` | เพิ่ม `@layer components` สอง class |
| `styles/badge-status.css` | เพิ่ม 3 custom property ท้ายบล็อก `:root` |
