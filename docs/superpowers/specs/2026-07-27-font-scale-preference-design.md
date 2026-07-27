# Font scale 5 ระดับ ในเมนูผู้ใช้ (ถัดจาก Theme)

วันที่: 2026-07-27
จุดที่แสดง: dropdown ของ `UserProfile` → หัวข้อ **Preferences** (ต่อจาก Language / Theme)

## เป้าหมาย

ให้ผู้ใช้ปรับขนาดตัวอักษรของทั้งแอปได้ 5 ระดับ — `small` · `normal` · `big` ·
`bigger` · `biggest` — จากเมนูเดียวกับที่เลือก theme และภาษา ค่าที่เลือกจำไว้ข้ามการ
reload

## ขอบเขตที่ตัดสินแล้ว (จาก brainstorm)

1. **ขยายทั้ง UI ไม่ใช่เฉพาะตัวอักษร** — ตัวอักษร ระยะห่าง ปุ่ม ความสูงแถว โตพร้อมกัน
   ทั้งหมด เหตุผล: ทั้งแอปใช้หน่วย `rem` (px literal เหลือแค่ 8 จุด และทุกจุดเป็น
   border/ring ที่ควรคงที่อยู่แล้ว) การขยายเฉพาะ `--text-*` จะทำให้ตัวอักษรล้นเซลล์ที่
   ความสูงคงที่ เช่น badge ใน DataGrid ที่ fix ไว้ `height: 0.875rem`
2. **ช่วงสเกล 15 / 16 / 18 / 20 / 22px** (อิง browser default 16px) — `small` แน่นขึ้น
   เล็กน้อยโดยที่ `micro-floor` ยังอยู่ที่ 7.5px ซึ่งยังอ่านออก; ถ้าใช้ 14px พื้นจะเหลือ
   7px ซึ่งต่ำกว่าที่ `docs/DESIGN.md` เรียกว่า absolute floor
3. **เก็บใน localStorage** ไม่ sync ข้าม device — ตรงกับ theme (next-themes) และ locale
   (`carmen.locale`) ที่เป็น device-local ทั้งคู่ ไม่ต้องแตะ backend
4. **UI เป็นรายการ 5 บรรทัด** แต่ละบรรทัดมีตัวอย่าง "Aa" ที่ขนาดจริงของระดับนั้น
   โครงเดียวกับ `ThemeSwitch` / `LangSwitch`

## กลไก

### 1. CSS — class บน `<html>` หน่วยเป็น %

`styles/globals.css`:

```css
html                     { font-size: 100%; }     /* normal — ตาม browser default */
html.font-scale-small    { font-size: 93.75%; }   /* 15px เมื่อ default = 16 */
html.font-scale-big      { font-size: 112.5%; }   /* 18px */
html.font-scale-bigger   { font-size: 125%; }     /* 20px */
html.font-scale-biggest  { font-size: 137.5%; }   /* 22px */
```

**หน่วยเป็น % ไม่ใช่ px** — ผู้ใช้ที่ตั้ง default font size ไว้ 20px ใน browser (WCAG
1.4.4 Resize Text) จะยังได้ 20px ที่ระดับ `normal` การเขียนเป็น `font-size: 16px` เท่ากับ
ลบการตั้งค่าช่วยเหลือการมองเห็นของเขาทิ้ง

**คุมด้วย class ไม่ใช่ inline style** — `next-themes` ตั้ง `attribute="class"` อยู่แล้ว
ผลลัพธ์เป็น `<html class="dark font-scale-bigger">` ซึ่งอ่านออกใน DevTools และคุมได้จาก
CSS ล้วน ไม่มี style ที่ JS เขียนทับอยู่บน element

**`normal` ไม่มี class** — เป็น state ที่ไม่ต้องประกาศ ทำให้ผู้ใช้ที่ไม่เคยแตะ setting นี้
ได้ DOM เดิมทุกประการ

### 2. State — ไม่มี provider / context

`lib/font-scale.ts`:

- `FONT_SCALES` — `readonly ["small", "normal", "big", "bigger", "biggest"]`
- `type FontScale`
- `FONT_SCALE_STORAGE_KEY = "carmen.font-scale"`
- `readStoredScale(): FontScale` — อ่าน localStorage; ค่าที่ไม่รู้จักหรือ storage ใช้ไม่ได้
  (private mode / quota) → `"normal"`
- `applyScale(scale: FontScale): void` — ลบ class `font-scale-*` เดิมออกจาก
  `document.documentElement` แล้วเติมของใหม่ (ยกเว้น `normal` ที่ไม่เติมอะไร) +
  เขียน localStorage แบบ try/catch

ไม่มี provider เพราะไม่มี component อื่นในแอปต้องอ่านค่านี้ — มีแค่ `FontScaleSwitch`
ที่ต้องรู้ว่าติ๊กถูกไว้ที่บรรทัดไหน และมันถือ state ของตัวเองได้ (init จาก class
`font-scale-*` บน `document.documentElement` ตอน mount — ค่าที่ apply จริงใน tab
นี้ ไม่ใช่ `readStoredScale()` ตรงๆ เพราะสอง tab เปิดพร้อมกันแล้ว localStorage อาจ
ไม่ตรงกับ DOM ของ tab นี้อีกต่อไป — fallback ไป `readStoredScale()` เฉพาะตอนไม่มี
class `font-scale-*` เลย ซึ่งคือกรณี `normal`) การใส่ context จะเพิ่มไฟล์และชั้นห่อ
โดยไม่มีผู้บริโภค

### 3. กัน FOUC — inline script ใน `index.html`

วางใน `<head>` ท้ายสุด:

```html
<script>
  try {
    var s = localStorage.getItem("carmen.font-scale");
    if (s && s !== "normal" && ["small","big","bigger","biggest"].indexOf(s) >= 0)
      document.documentElement.classList.add("font-scale-" + s);
  } catch (e) {}
</script>
```

จำเป็นเพราะ `main.tsx` boot แบบ async — `loadRuntimeConfig()` → `refreshTokens()` →
render ทั้งสองขั้นแรกเป็น network call กว่า React จะได้ทำงานผู้ใช้เห็นหน้าจอที่ขนาด
`normal` ไปแล้วหลายร้อย ms แล้วค่อยกระโดดเป็นขนาดที่เลือก ทุกครั้งที่โหลดหน้า

รายชื่อระดับถูกเขียนซ้ำใน script นี้ (duplicate ของ `FONT_SCALES`) เพราะ inline script
import module ไม่ได้ — test จะ assert ว่าสองที่ตรงกัน

### 4. UI — `components/navbar/font-scale-switch.tsx`

`DropdownMenuSub` วางต่อจาก `<ThemeSwitch />` ใน `components/navbar/user-profile.tsx`
โครงสร้างเดียวกับ `ThemeSwitch` / `LangSwitch`:

- **SubTrigger** — icon `ALargeSmall` (lucide, `size-4`) + `t("fontSize")`
  className เดิม: `cursor-pointer gap-2 rounded-md px-2 py-2 text-sm`
- **Items** — 5 บรรทัด แต่ละบรรทัด: ตัวอย่าง "Aa" · label · check mark ที่ active
  - `aria-checked={isActive}` ตาม pattern เดิม
  - `<Check className="text-primary size-4" aria-hidden="true" />` ที่ active

**ตัวอย่าง "Aa" ใช้ px คงที่ ไม่ใช่ rem** — `11 / 12 / 13.5 / 15 / 16.5px`
(สัดส่วนเดียวกับ root × 0.75) ถ้าใช้ `rem` ตัวอย่างทั้ง 5 ตัวจะโตตามเมนูพร้อมกันและมี
ขนาดเท่ากันหมด เทียบไม่ได้เลย ซึ่งทำลายเหตุผลเดียวที่มันอยู่ตรงนั้น

ตัวอย่างวางใน column กว้างคงที่ (`w-7` + จัดกึ่งกลาง) เพื่อให้ชื่อระดับทั้ง 5 เรียงตรงกัน
ไม่ใช่เต้นตามความกว้างของตัวอย่าง

### 5. i18n

`messages/en.json` และ `messages/th.json` ใต้ `common`:

| key | en | th |
|---|---|---|
| `fontSize` | Font size | ขนาดตัวอักษร |
| `fontSizeSmall` | Small | เล็ก |
| `fontSizeNormal` | Normal | ปกติ |
| `fontSizeBig` | Big | ใหญ่ |
| `fontSizeBigger` | Bigger | ใหญ่ขึ้น |
| `fontSizeBiggest` | Biggest | ใหญ่สุด |

### 6. Print

`@media print` ใน `styles/globals.css` มี rule `html, body { … !important }` อยู่แล้ว —
เพิ่ม `font-size: 100% !important;` เข้าไปใน rule นั้น ไม่ต้องสร้าง selector ใหม่

งานพิมพ์ต้องได้ขนาดคงที่ ไม่ขึ้นกับ preference บนจอ — ไม่งั้นเอกสารเดียวกันพิมพ์จาก
เครื่องสองเครื่องได้จำนวนหน้าไม่เท่ากัน

## ผลข้างเคียงที่ตั้งใจรับไว้

1. **breakpoint ไม่เลื่อน (ตรงข้ามกับที่เคยเข้าใจ)** — Tailwind v4 นับ breakpoint
   เป็น `rem` (`sm` = 40rem, …) แต่ media query คำนวณ `rem` จาก *initial*
   font-size ของ browser เสมอ ไม่ใช่จากค่าที่ `html { font-size: 137.5% }` ตั้งไว้
   (CSS Values 4 / Media Queries 4 — ยืนยันจาก build CSS จริงแล้ว) ดังนั้นที่ระดับ
   `biggest` จอ 1440px ยังคงเป็น `2xl` และ laptop 1280×800 ยังได้ desktop layout
   เต็มรูปแบบ ขณะที่ทุกมิติที่วัดเป็น rem *ภายใน* layout นั้นโตขึ้น 37.5% พร้อมกัน —
   **แน่นกว่า** ที่เคยคาดไว้ ไม่ใช่หลวมกว่า
   ค่า rem ใน property (ไม่ใช่ media query) ยัง scale ตามปกติ — เช่น sidebar
   `16rem` (`components/ui/sidebar.tsx:28`) กลายเป็น 352px จริงที่ `biggest`
   ส่วน `@container` (`components/ui/field.tsx:134`) คำนวณจาก computed
   font-size ของ root จึง scale เหมือน property — เงื่อนไข `min-width: 28rem`
   สลับ orientation ที่ container กว้าง 616px แทนที่จะเป็น 448px ที่ `biggest`
   ผลคือครึ่งหนึ่งของระบบ responsive scale อีกครึ่งไม่ — `hooks/use-mobile.ts:4`
   ที่ hardcode `MOBILE_BREAKPOINT = 768` เป็น px ใน JS จึงยังตรงกับ Tailwind
   `md:` (48rem) เสมอ เพราะ media query ไม่ขยับ ถ้าโมเดลเดิมถูกต้องจริง JS กับ
   CSS จะเพี้ยนกัน 288px ที่ระดับ `biggest`
2. **px literal 8 จุดไม่ scale** — สำรวจแล้วทั้งหมดคือ `border-l-[3px]`, `ring-[3px]`,
   `h-[3px]` (top-loader), `rounded-[1px]`, `w-[9px]`/`h-[7px]` (ภาพประกอบ landing),
   `min-w-[150px]` (dropdown), `max-h-[300px]` (command list) — ทั้งหมดควรคงที่อยู่แล้ว
   ไม่ต้องแก้
3. **ไม่ sync ข้าม tab** — เปลี่ยนใน tab หนึ่ง tab อื่นยังขนาดเดิมจนกว่าจะ reload ตรงกับ
   พฤติกรรมของ `LangSwitch` ที่มีอยู่

## Tests — `lib/__tests__/font-scale.test.ts`

อ่าน `styles/globals.css` และ `index.html` จริงจาก disk (แบบเดียวกับ
`status-ink-contrast.test.ts` / `type-ladder.test.ts`):

1. **CSS ครบและเรียงถูก** — มี rule ครบทั้ง 4 class + `html` base; ค่า % เรียงจากน้อยไป
   มากตามลำดับ `FONT_SCALES`; `normal` = 100% และไม่มี class `.font-scale-normal`
2. **inline script ตรงกับ FONT_SCALES** — รายชื่อระดับใน `index.html` ตรงกับ
   `lib/font-scale.ts` เป๊ะ (กัน drift เมื่อเพิ่ม/ลบระดับ)
3. **localStorage round-trip** — `applyScale(x)` แล้ว `readStoredScale()` คืน `x`
4. **ค่าเสียหาย → normal** — `"huge"`, `""`, `null` ทั้งหมดคืน `"normal"`
5. **class บน documentElement ถูกต้อง** — `applyScale("bigger")` ได้
   `font-scale-bigger` เดี่ยวๆ; เรียก `applyScale("normal")` ต่อแล้ว class หายหมด
6. **i18n ครบ** — ทุกระดับใน `FONT_SCALES` มี key ใน `messages/en.json` และ
   `messages/th.json` (กันคนเพิ่มระดับที่ 6 แล้วลืมแปล)
7. **print reset** — block `@media print` มี `font-size: 100%` อยู่ใน rule `html, body`
   (assert เฉพาะภายใน block นั้น ไม่ใช่ทั้งไฟล์ — `html` base ก็เป็น 100% เหมือนกัน)

## ไฟล์

**ใหม่ (3)**

- `lib/font-scale.ts`
- `components/navbar/font-scale-switch.tsx`
- `lib/__tests__/font-scale.test.ts`

**แก้ (6)**

- `styles/globals.css` — 5 rule + print reset
- `index.html` — inline boot script
- `components/navbar/user-profile.tsx` — วาง `<FontScaleSwitch />` ต่อจาก `<ThemeSwitch />`
- `messages/en.json` · `messages/th.json` — 6 key
- `docs/DESIGN.md` — บันทึกว่า type ladder อยู่ใต้ root scale ที่ผู้ใช้ปรับได้ และช่วง
  ที่ token แต่ละตัวจะกวาดไป (เช่น `micro-floor` 7.5 → 11px)

## เกณฑ์ว่าเสร็จ

- `bunx tsc --noEmit` และ `bun run lint` สะอาด
- `bun test:run` ผ่านทั้งหมด (รวม test ใหม่)
- ตรวจในเบราว์เซอร์จริง: เลือกครบทั้ง 5 ระดับ · reload แล้วค่าคงอยู่และ **ไม่กระพริบ** ·
  ตารางที่หนาแน่นที่สุด (Purchase Request list) ยังอ่านได้ทั้งที่ `small` และ `biggest` ·
  ทดสอบทั้ง light และ dark
