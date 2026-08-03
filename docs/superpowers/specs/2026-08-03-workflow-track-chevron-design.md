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
ความเข้ม (พื้น tint 7–18% กับไอคอนที่เป็นเฉดเดียวกันแต่เข้มกว่า — `--status-*-ink`)
และ **ข้อความเป็นสีกลางเสมอ** ไม่รับสีสถานะ

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
     ต้องใส่คู่กับ .wf-chevron เสมอ เพราะ --wf-notch ถูกประกาศไว้ที่ class นั้น
     selector เขียนเป็น .wf-chevron.wf-chevron-head (specificity 0,2,0) จึงชนะ
     .wf-chevron (0,1,0) ด้วยตัวมันเอง ไม่ต้องพึ่งลำดับใน source */
  .wf-chevron.wf-chevron-head {
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
          "wf-chevron text-micro flex h-6 min-w-0 items-center gap-1 pr-4",
          // ช่องแรกไม่มีรอยบากซ้าย จึงต้องการ padding น้อยกว่าช่องอื่น
          i === 0 ? "wf-chevron-head pl-2" : "pl-4",
          STATE_STYLE[state],
        )}
      >
        <StateIcon state={state} />
        <span
          className={cn(
            "max-w-20 truncate sm:max-w-32",
            // ขีดทับอยู่ที่ชื่อขั้นเท่านั้น ไม่ใช่ที่กล่องนอก — text-decoration
            // propagate ลง descendant เส้นจะถูกลากทับไอคอน ✕ ไปด้วย
            state === "voided" && "line-through",
          )}
          title={stage}
        >
          {stage}
        </span>
      </div>
    );
  })}
</div>
```

## สี

### Token ที่เพิ่ม

เติมใน `styles/badge-status.css` — คำนวณจากสีที่มีอยู่ ไม่นิยามเฉดใหม่ (ink เปลี่ยนแค่ L
ของสีเดิม) · ประกาศเป็น custom property ล้วน ๆ ไม่ลงทะเบียนเป็น Tailwind color เพราะ
ไฟล์นี้ไม่มี `@import "tailwindcss"` บล็อก `@theme inline` ในนั้นจึงไม่สร้าง utility ให้

```css
/* :root — พื้น tint ผสมกับ --card ซึ่งพลิกเองตามธีม
   (next-themes ใช้ attribute="class" → :root กับ .dark อยู่บน <html> ตัวเดียวกัน
   var() ใน custom property resolve ที่ computed-value time บน element นั้น
   จึงได้ค่าที่ชนะ cascade เสมอ ไม่ขึ้นกับลำดับการประกาศ) */
--status-approved-soft:    color-mix(in oklab, var(--status-approved)    14%, var(--card));
--status-in-progress-soft: color-mix(in oklab, var(--status-in-progress) 18%, var(--card));
--status-voided-soft:      color-mix(in oklab, var(--status-voided)      14%, var(--card));
--status-pending-soft:     color-mix(in oklab, var(--foreground)          2%, var(--muted));

/* ink — หมึกที่วางบนพื้น -soft · คง hue/chroma ของ fill เปลี่ยนแค่ L */
--status-approved-ink:    oklch(0.46 0.19 155);
--status-in-progress-ink: oklch(0.52 0.17 90);
--status-voided-ink:      oklch(0.50 0.18 348.79);

/* .dark — ink เป็นค่าคงที่ ไม่มีตัวแปรให้พลิกตามธีมเหมือน -soft จึงต้องมีคู่
   approved-soft ต้องลด % ลงด้วย เพราะ done เป็นช่องเดียวที่ใช้ --muted-foreground
   เป็นสีข้อความ และในโหมดมืดมันเริ่มต้นที่ 4.89:1 เท่านั้น tint 14% กินจนเหลือ 4.25 */
--status-approved-soft:   color-mix(in oklab, var(--status-approved) 7%, var(--card));
--status-approved-ink:    oklch(0.67 0.17 155);
--status-in-progress-ink: oklch(0.76 0.15 90);
--status-voided-ink:      oklch(0.70 0.16 348.79);
```

ผสมใน oklab ไม่ใช่ oklch — oklch interpolate มุม hue และ --card ระบุ hue=0 ไม่ใช่ none ทำให้สีเขียวถูกลาก จึงใช้ oklab แบบแกน a/b แทน

**ทำไมต้องมี `-ink` แยกจาก fill** — token ตัวเปล่าเป็นสี "พื้น" ที่จูนไว้ให้มี `-fg` วางทับ
เอามาเป็นไอคอนบน tint ของตัวเองแล้ววัดได้ done 3.19 · in-progress **1.47** (เหลือง L 0.85
บนพื้นเหลืองอ่อน) · voided 3.94 ในโหมดสว่าง และ voided **2.75** ในโหมดมืด — ต่ำกว่า 3:1
ที่ WCAG 1.4.11 กำหนดสำหรับ non-text UI component `-ink` เป็นเฉดเดียวกันคนละ L
วัดใหม่ได้ 5.0–5.7 ทุกช่อง ทั้งสองธีม (pattern เดียวกับ `--warning-ink` ใน `globals.css`)

### ตารางต่อ state

| state | พื้น | ไอคอน (lucide, `size-3`, `aria-hidden`) | ข้อความ |
|---|---|---|---|
| `done` | `--status-approved-soft` | `Check` สี `--status-approved-ink` | `text-muted-foreground` |
| `current` | `--status-in-progress-soft` | `Circle` + `fill-current` สี `--status-in-progress-ink` | `text-foreground font-medium` |
| `pending` | `--status-pending-soft` | `Circle` (กลวง) สี `text-muted-foreground` | `text-muted-foreground` |
| `voided` | `--status-voided-soft` | `X` สี `--status-voided-ink` | `text-foreground font-medium` + `line-through` ที่ `<span>` ชื่อขั้น |

`line-through` อยู่ที่ `<span>` ของชื่อขั้น ไม่ใช่ที่กล่องนอก — `text-decoration` propagate
ลง in-flow descendant ทุกตัว ถ้าใส่ที่กล่องเส้นจะถูกลากทับไอคอน ✕ ไปด้วย

`font-medium` (500) บนขั้นปัจจุบันตรงกับ tier "ค่า" ของ `DESIGN.md` — เด่นกว่าของข้าง ๆ
โดยไม่ตะโกน

### สามข้อที่ต่างจากการอ่านกฎแบบเคร่งที่สุด

1. **`pending` ใช้ `--status-pending-soft` (เทาไร้ hue) ไม่ใช่ tint ของ `--status-draft`** —
   ในเชิงความหมาย "ยังไม่ถึง" คือยังไม่มีสถานะ ไม่ใช่สถานะสีเทา จึงผสมจาก `--foreground`
   ไม่ใช่จากสีสถานะตัวใด · ฐานเป็น `--muted` ซึ่งเป็นพื้นเดิมของช่องนี้ ผสมเพิ่มแค่ 2%
   ให้มีรูปทรงแยกจากพื้นหน้า (`bg-muted` เปล่า ๆ ได้ 1.09 / 1.13 เทียบพื้นจริง — ต่ำเกินไป
   โดยเฉพาะช่อง pending ที่มักเป็นช่องสุดท้าย ไม่มีเพื่อนบ้านช่วยตัดขอบ)

2. **`voided` ใช้ `--status-voided` (ชมพูเข้ม) แทน `text-destructive` ของโค้ดเดิม** —
   `DESIGN.md` ห้ามปน semantic token กับ document status แอปมี token voided อยู่แล้ว
   ของเดิมหยิบ `destructive` มาใช้เป็นการข้ามชั้นที่แก้ไปพร้อมกัน

3. **ไอคอนใช้ `-ink` (เฉดเดียวกับพื้น แต่เข้มกว่า) ข้อความเป็นสีกลาง** — tint ที่ 11px
   ในแถบแน่น ๆ แยกเขียวจางกับเทาจางแทบไม่ออก ไอคอนเข้มทำให้อ่านได้จริง และเป็นเฉด
   เดียวกันสองระดับความเข้ม ไม่ใช่สองสัญญาณแข่งกัน · ใช้ fill ตรง ๆ ไม่ได้เพราะ
   contrast ตกถึง 1.47:1 จึงต้องมี ink token (ดูหัวข้อสีข้างบน)

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

call site ทั้งสาม (`pr-header.tsx:167`, `po-header.tsx:248`, `sr-header.tsx:290`) ส่ง track
เข้าทาง prop **`subtitle`** ของ `DocFormHeader` ซึ่ง render ที่ `doc-form-header.tsx:91`
เป็นบล็อกเต็มความกว้างใต้ชื่อเอกสาร — ไม่ใช่คอลัมน์ขวาของ flex row ที่ไม่ wrap
(prop `workflowStep` + path `absolute top-4 right-0` ที่ `doc-form-header.tsx:112`
มีอยู่จริงแต่ไม่มี call site ไหนใช้ ยืนยันด้วย `grep -rn "workflowStep=" routes components`)

**แถบล้นไม่ได้** — ทุกช่องมี `min-w-0` และ span มี `truncate` ความกว้างพื้นล่างจึงคงที่ที่
`pl-4 + pr-4 + ไอคอน 12 + gap 4 = 48px` ต่อช่อง (ช่องแรกใช้ `pl-2` จึงเป็น 40px)
→ 3 ช่อง ≈ 140px รวมช่องไฟ ใส่จอ 375px ได้สบาย ส่วนที่ยืดได้คือชื่อขั้น ซึ่งหดเองเมื่อที่ไม่พอ

`max-w-20 sm:max-w-32` ต่อช่องจึงไม่ได้มีไว้กันล้น แต่มีไว้ให้ชื่อขั้นอ่านออกในสัดส่วนที่
สมดุลกับหัวเอกสาร — ไม่ให้ขั้นชื่อยาวช่องเดียวกินความกว้างจนอีกสองช่องเหลือแต่ `…`

## Accessibility

- ไอคอนต่างรูปต่อ state (`✓` / `●` / `○` / `✕`) ทำให้ผ่านกฎ "ห้ามใช้สีเป็นตัวบอก
  อย่างเดียว" — คนตาบอดสีเขียว-เหลืองยังแยกรูปได้
- ไอคอนใส่ `aria-hidden` · screen reader อ่านชื่อขั้นเรียงซ้ายไปขวาเหมือนพฤติกรรมเดิม
  ไม่เพิ่ม aria string ใหม่จึงไม่ต้องแตะ `messages/{en,th}.json`
- **ข้อความ** เป็นสีกลางบนพื้น tint จาง วัดแล้วผ่าน 4.5:1 (WCAG AA — 11px นับเป็น
  normal text ไม่เข้าข้อยกเว้น large text 3:1) ทั้ง 4 สถานะ × 2 ธีม
  สว่าง 5.87–17.97 · มืด 4.51–11.85
  ค่าฝั่งมืดที่ฉิวเฉียดเป็นเพดานของ palette เอง ไม่ใช่ของ component: `--muted-foreground`
  บน `--card` ในธีมมืดเริ่มต้นที่ 4.89:1 อยู่แล้ว tint ทุก % ที่ผสมเพิ่มจึงกินระยะนั้นไป
  — เป็นตัวกำหนดว่า `--status-approved-soft` ในธีมมืดผสมได้ไม่เกิน 8% และ
  `--status-pending-soft` ไม่เกิน 2.5%
- **ไอคอน** เป็น non-text UI component ตาม WCAG 1.4.11 (เกณฑ์ 3:1) ใช้ `-ink`
  วัดได้ 4.51–5.87 ทุกช่อง ทั้งสองธีม
- **รูปลูกศร** ไม่ใช่ตัวบอกสถานะเพียงลำพัง (ไอคอนกับชื่อขั้นบอกอยู่แล้ว) จึงไม่ผูกกับ
  เกณฑ์ WCAG ข้อไหน แต่ตั้งเป้าไว้ที่ ≥1.15 เทียบพื้นจริง (`--background` — ดู
  `routes/root-layout.tsx` → `.space-main-gradient`) ผ่านทุกช่องยกเว้น `current`
  ในธีมสว่าง (1.02) ซึ่งพื้นเป็นเหลืองอ่อนที่ luminance ใกล้พื้นหน้าแต่ต่างกันที่ hue —
  WCAG วัดเฉพาะ luminance จึงประเมินความเห็นชัดของ tint สีต่ำกว่าความจริง
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
| `styles/badge-status.css` | เพิ่ม 7 custom property ท้ายบล็อก `:root` (soft 4 + ink 3) และ 4 ตัวท้ายบล็อก `.dark` (ink 3 + approved-soft ที่ต้องลด %) |
