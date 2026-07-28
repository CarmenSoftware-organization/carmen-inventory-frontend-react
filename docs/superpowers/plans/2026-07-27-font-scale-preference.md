# Font Scale Preference Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ให้ผู้ใช้ปรับขนาดทั้ง UI ได้ 5 ระดับ (small / normal / big / bigger / biggest) จาก dropdown โปรไฟล์ ถัดจากตัวเลือก Theme และจำค่าไว้ข้าม reload

**Architecture:** ปรับที่ `font-size` ของ `<html>` ด้วย CSS class (`.font-scale-*`) หน่วยเป็น `%` — ทั้งแอปวัดด้วย `rem` ตัวอักษร ระยะห่าง และความสูงแถวจึงกวาดตามเป็นสัดส่วนเดียวกัน ค่าเก็บใน `localStorage` และมี inline script ใน `index.html` เติม class ก่อน paint แรกเพื่อกัน FOUC ไม่มี React context เพราะ state จริงอยู่บน DOM และไม่มี component อื่นต้องอ่านมัน

**Tech Stack:** React 19 · Vite · Tailwind CSS v4 · react-router 7 · use-intl · Radix DropdownMenu (shadcn) · lucide-react · Vitest + jsdom

**Spec:** `docs/superpowers/specs/2026-07-27-font-scale-preference-design.md`

## Global Constraints

- **ภาษา:** commit message เขียนภาษาไทย · comment ในโค้ดเขียนภาษาไทยได้ (ตาม pattern ที่มีอยู่ เช่น `components/navbar/theme-switch.tsx`) · identifier / ชื่อไฟล์ / i18n key เป็นภาษาอังกฤษ
- **ไม่เขียน TDD red-green** — implement ก่อน แล้ว Task 3 จึงเพิ่ม guard test ตามที่ spec ระบุ (CLAUDE.md ระดับ user สั่งข้ามขั้น "write the failing test")
- **Static check ไม่ใช่ test — ต้องรันทุก task:** `bunx tsc --noEmit` และ `bun run lint` ต้องสะอาดก่อน commit
- **ระดับทั้ง 5 และค่า %:** `small` 93.75% · `normal` 100% (ไม่มี class) · `big` 112.5% · `bigger` 125% · `biggest` 137.5%
- **storage key:** `carmen.font-scale` (ตรงกับ pattern `carmen.locale`)
- **ห้ามใช้หน่วย px กับ `html { font-size }`** — จะทับค่า default font size ที่ผู้ใช้ตั้งไว้ใน browser (WCAG 1.4.4)
- **ห้าม import `next*`** — ESLint บล็อกไว้ ใช้ `react-router` / `use-intl` ตรงๆ

---

## File Structure

| ไฟล์ | หน้าที่ |
|---|---|
| `lib/font-scale.ts` (ใหม่) | ชื่อระดับ · storage key · อ่าน/เขียน localStorage · เขียน class ลง `<html>` ไม่มี React |
| `styles/globals.css` (แก้) | ค่าจริงของแต่ละระดับ + print reset |
| `index.html` (แก้) | inline boot script กัน FOUC |
| `components/navbar/font-scale-switch.tsx` (ใหม่) | submenu — โครงเดียวกับ `ThemeSwitch` ไม่มี logic การเก็บค่า |
| `components/navbar/user-profile.tsx` (แก้) | วาง `<FontScaleSwitch />` ใต้ `<ThemeSwitch />` |
| `messages/{en,th}.json` (แก้) | label 6 ตัว |
| `lib/__tests__/font-scale.test.ts` (ใหม่) | guard — CSS/boot script/i18n ต้องไม่ drift จาก `FONT_SCALES` |
| `docs/DESIGN.md` (แก้) | บันทึกว่า type ladder อยู่ใต้ root scale ที่ผู้ใช้ปรับได้ |

การแบ่ง task ตามนี้: Task 1 ทำให้ scale ใช้งานได้จริง (ทดสอบด้วยการเติม class เองใน DevTools) · Task 2 ต่อ UI เข้ากับมัน · Task 3 ล็อกไม่ให้ทั้งสองส่วน drift จากกัน reviewer ปฏิเสธ Task 2 ได้โดยที่ Task 1 ยังถูกต้อง

---

### Task 1: กลไก scale — module + CSS + boot script

**Files:**
- Create: `lib/font-scale.ts`
- Modify: `styles/globals.css` (ใน `@layer base` ที่เริ่มบรรทัด 354 และใน `@media print` ที่เริ่มบรรทัด ~510)
- Modify: `index.html` (ใน `<head>`)

**Interfaces:**
- Consumes: ไม่มี — task แรก
- Produces:
  - `FONT_SCALES: readonly ["small","normal","big","bigger","biggest"]`
  - `type FontScale = (typeof FONT_SCALES)[number]`
  - `DEFAULT_FONT_SCALE: FontScale` (= `"normal"`)
  - `FONT_SCALE_STORAGE_KEY: string` (= `"carmen.font-scale"`)
  - `readStoredScale(): FontScale`
  - `applyScale(scale: FontScale): void`

- [ ] **Step 1: สร้าง `lib/font-scale.ts`**

```ts
/**
 * Font scale — ผู้ใช้ปรับขนาดทั้ง UI ได้ 5 ระดับจากเมนูโปรไฟล์
 *
 * ทำงานที่ root font-size ไม่ใช่ที่ token `--text-*` เพราะทั้งแอปวัดด้วย `rem`
 * (px literal เหลือ 8 จุด และทุกจุดเป็น border/ring ที่ควรคงที่อยู่แล้ว) การขยับ
 * root จึงขยายตัวอักษร ระยะห่าง และความสูงแถวพร้อมกันเป็นสัดส่วนเดียว — ถ้าขยาย
 * เฉพาะตัวอักษร มันจะล้นเซลล์ที่ความสูงคงที่ เช่น badge ใน DataGrid ที่ fix ไว้
 * `height: 0.875rem`
 *
 * ค่า % จริงของแต่ละระดับอยู่ใน styles/globals.css — ที่นี่ถือแค่ชื่อ
 */

export const FONT_SCALES = [
  "small",
  "normal",
  "big",
  "bigger",
  "biggest",
] as const;

export type FontScale = (typeof FONT_SCALES)[number];

export const DEFAULT_FONT_SCALE: FontScale = "normal";

export const FONT_SCALE_STORAGE_KEY = "carmen.font-scale";

const isFontScale = (value: unknown): value is FontScale =>
  FONT_SCALES.includes(value as FontScale);

/** อ่านค่าที่เก็บไว้ — ค่าที่ไม่รู้จักหรือ storage ใช้ไม่ได้คืน default */
export function readStoredScale(): FontScale {
  try {
    const raw = localStorage.getItem(FONT_SCALE_STORAGE_KEY);
    if (isFontScale(raw)) return raw;
  } catch {
    // storage unavailable (private mode / quota)
  }
  return DEFAULT_FONT_SCALE;
}

/**
 * ตั้ง class บน <html> แล้วจำค่าไว้
 *
 * `normal` ไม่มี class เป็นของตัวเอง — เป็น state ที่ไม่ต้องประกาศ ผู้ใช้ที่ไม่เคย
 * แตะ setting นี้จึงได้ DOM เดิมทุกประการ
 */
export function applyScale(scale: FontScale): void {
  const root = document.documentElement;
  for (const known of FONT_SCALES) {
    root.classList.remove(`font-scale-${known}`);
  }
  if (scale !== DEFAULT_FONT_SCALE) {
    root.classList.add(`font-scale-${scale}`);
  }
  try {
    localStorage.setItem(FONT_SCALE_STORAGE_KEY, scale);
  } catch {
    // storage unavailable — มีผลเฉพาะ session นี้
  }
}
```

- [ ] **Step 2: เพิ่ม 5 rule ลง `styles/globals.css`**

เปิดไฟล์ หา `@layer base {` (บรรทัด 354) แล้วแทรก block นี้ทันทีหลังบรรทัดนั้น — **ก่อน** `* {` ที่ตามมา:

```css
  /* ── Font scale — ผู้ใช้ปรับได้จากเมนูโปรไฟล์ (lib/font-scale.ts) ──
     หน่วยเป็น % ไม่ใช่ px เพื่อไม่ทับค่า default font size ที่ผู้ใช้ตั้งไว้ใน
     browser (WCAG 1.4.4 Resize Text) — คนที่ตั้งไว้ 20px ยังได้ 20px ที่ระดับ
     normal ไม่ใช่ถูกเราบังคับกลับเป็น 16
     ทั้ง type ladder ข้างบนและ spacing/breakpoint ของ Tailwind วัดเป็น rem จึง
     กวาดตามทั้งหมด: micro-floor 8px → 7.5–11px, body 17px → 15.9–23.4px
     `normal` ไม่มี rule ของตัวเอง — มันคือ 100% ของ html เอง */
  html {
    font-size: 100%;
  }
  html.font-scale-small {
    font-size: 93.75%; /* 15px เมื่อ browser default = 16 */
  }
  html.font-scale-big {
    font-size: 112.5%; /* 18px */
  }
  html.font-scale-bigger {
    font-size: 125%; /* 20px */
  }
  html.font-scale-biggest {
    font-size: 137.5%; /* 22px */
  }
```

- [ ] **Step 3: เพิ่ม print reset ใน `styles/globals.css`**

ใน block `@media print` หา rule ที่มีอยู่แล้ว:

```css
  html,
  body {
    height: auto !important;
    overflow: visible !important;
    background: white !important;
  }
```

เพิ่มบรรทัด `font-size` เข้าไปพร้อม comment:

```css
  html,
  body {
    height: auto !important;
    overflow: visible !important;
    background: white !important;
    /* งานพิมพ์ต้องได้ขนาดคงที่ ไม่ขึ้นกับ font scale บนจอ — ไม่งั้นเอกสารเดียวกัน
       พิมพ์จากสองเครื่องได้จำนวนหน้าไม่เท่ากัน */
    font-size: 100% !important;
  }
```

- [ ] **Step 4: เพิ่ม inline boot script ใน `index.html`**

แทรกหลังบรรทัด `<meta name="description" ... />` และก่อน `</head>`:

```html
    <script>
      // เติม font-scale class ก่อน paint แรก — main.tsx boot แบบ async
      // (loadRuntimeConfig → refreshTokens → render) ทั้งสองขั้นแรกเป็น network
      // call ถ้ารอ React ผู้ใช้จะเห็นหน้าจอที่ขนาด normal ไปแล้วหลายร้อย ms
      // แล้วค่อยกระโดดเป็นขนาดที่เลือก ทุกครั้งที่โหลดหน้า
      //
      // รายชื่อระดับซ้ำกับ FONT_SCALES ใน lib/font-scale.ts เพราะ inline script
      // import module ไม่ได้ — lib/__tests__/font-scale.test.ts กันไม่ให้ drift
      try {
        var s = localStorage.getItem("carmen.font-scale");
        if (["small", "big", "bigger", "biggest"].indexOf(s) >= 0) {
          document.documentElement.classList.add("font-scale-" + s);
        }
      } catch (e) {
        /* storage unavailable — ใช้ขนาด normal */
      }
    </script>
```

- [ ] **Step 5: ตรวจ static checks**

Run: `bunx tsc --noEmit && bun run lint`
Expected: ทั้งคู่ผ่าน ไม่มี output error

- [ ] **Step 6: ตรวจในเบราว์เซอร์ว่า scale ทำงานจริง**

Run: `bun dev` แล้วเปิดแอป login เข้าไปหน้าใดก็ได้

ใน DevTools console พิมพ์ทีละบรรทัดแล้วดูหน้าจอ:

```js
document.documentElement.classList.add("font-scale-biggest")   // ทุกอย่างต้องโตขึ้น
document.documentElement.classList.remove("font-scale-biggest")
document.documentElement.classList.add("font-scale-small")     // ทุกอย่างต้องแน่นลง
document.documentElement.classList.remove("font-scale-small")
```

Expected: ตัวอักษร **และ** ระยะห่าง/ความสูงแถว/ปุ่ม ขยับพร้อมกัน ไม่มีข้อความล้นกล่องหรือถูกตัด

จากนั้นทดสอบ persistence + FOUC:

```js
localStorage.setItem("carmen.font-scale", "bigger")
location.reload()
```

Expected: หน้าโหลดมาที่ขนาด bigger **ตั้งแต่เฟรมแรก** — ไม่กระพริบจาก normal ไป bigger

- [ ] **Step 7: Commit**

```bash
git add lib/font-scale.ts styles/globals.css index.html
git commit -m "feat(ui): กลไก font scale — root font-size 5 ระดับ + boot script กัน FOUC"
```

---

### Task 2: UI — submenu ในเมนูโปรไฟล์

**Files:**
- Create: `components/navbar/font-scale-switch.tsx`
- Modify: `components/navbar/user-profile.tsx` (import + วาง component ต่อจาก `<ThemeSwitch />` บรรทัด 197)
- Modify: `messages/en.json`, `messages/th.json` (ใต้ `common`)

**Interfaces:**
- Consumes: `FONT_SCALES`, `FontScale`, `readStoredScale()`, `applyScale()` จาก `@/lib/font-scale` (Task 1)
- Produces: `FontScaleSwitch()` — React component ไม่รับ prop ใช้ได้เฉพาะภายใน `DropdownMenu` (มันคืน `DropdownMenuSub`)

- [ ] **Step 1: เพิ่ม i18n key ลง `messages/en.json`**

ใน object `common` หา `"selectTheme": "Select theme",` แล้วเพิ่มต่อท้ายมัน:

```json
    "fontSize": "Font size",
    "fontSizeSmall": "Small",
    "fontSizeNormal": "Normal",
    "fontSizeBig": "Big",
    "fontSizeBigger": "Bigger",
    "fontSizeBiggest": "Biggest",
```

- [ ] **Step 2: เพิ่ม i18n key ลง `messages/th.json`**

ใน object `common` หา `"selectTheme": "เลือกธีม",` แล้วเพิ่มต่อท้ายมัน:

```json
    "fontSize": "ขนาดตัวอักษร",
    "fontSizeSmall": "เล็ก",
    "fontSizeNormal": "ปกติ",
    "fontSizeBig": "ใหญ่",
    "fontSizeBigger": "ใหญ่ขึ้น",
    "fontSizeBiggest": "ใหญ่สุด",
```

- [ ] **Step 3: สร้าง `components/navbar/font-scale-switch.tsx`**

```tsx
import { useState } from "react";
import { useTranslations } from "use-intl";
import { ALargeSmall, Check } from "lucide-react";
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FONT_SCALES,
  applyScale,
  readStoredScale,
  type FontScale,
} from "@/lib/font-scale";

/**
 * ขนาดตัวอย่าง "Aa" — px คงที่ ไม่ใช่ rem โดยตั้งใจ
 *
 * ถ้าใช้ rem ตัวอย่างทั้ง 5 ตัวจะโตตามเมนูพร้อมกันและมีขนาดเท่ากันหมด เทียบกัน
 * ไม่ได้เลย ซึ่งทำลายเหตุผลเดียวที่มันอยู่ตรงนั้น ค่าคือ root ของแต่ละระดับ × 0.75
 */
const PREVIEW_PX: Record<FontScale, number> = {
  small: 11,
  normal: 12,
  big: 13.5,
  bigger: 15,
  biggest: 16.5,
};

/** `as const` เพื่อให้ `t()` ได้ literal key ไม่ใช่ string กว้างๆ */
const LABEL_KEY = {
  small: "fontSizeSmall",
  normal: "fontSizeNormal",
  big: "fontSizeBig",
  bigger: "fontSizeBigger",
  biggest: "fontSizeBiggest",
} as const satisfies Record<FontScale, string>;

/**
 * Font scale submenu — ฝังใน DropdownMenu อื่น
 *
 * ถือ state เอง ไม่มี provider: ค่าจริงอยู่บน <html> ไม่ได้อยู่ใน React และไม่มี
 * component อื่นในแอปต้องอ่านมัน เมนูปิดแล้ว component unmount — mount ครั้งหน้า
 * อ่านค่าจาก localStorage ใหม่ จึงตรงเสมอ
 *
 * mirror pattern เดียวกับ ThemeSwitch / LangSwitch
 */
export function FontScaleSwitch() {
  const t = useTranslations("common");
  const [scale, setScale] = useState<FontScale>(readStoredScale);

  const select = (next: FontScale) => {
    applyScale(next);
    setScale(next);
  };

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="cursor-pointer gap-2 rounded-md px-2 py-2 text-sm">
        <ALargeSmall className="size-4" />
        {t("fontSize")}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="min-w-48 p-1.5">
        {FONT_SCALES.map((option) => {
          const isActive = scale === option;
          return (
            <DropdownMenuItem
              key={option}
              onClick={() => select(option)}
              className="cursor-pointer gap-2 rounded-md px-2 py-2 text-sm"
              aria-checked={isActive}
            >
              {/* กว้างคงที่เพื่อให้ชื่อระดับทั้ง 5 เรียงตรงกัน ไม่เต้นตามความกว้าง
                  ของตัวอย่าง */}
              <span
                className="w-7 shrink-0 text-center leading-none font-semibold"
                style={{ fontSize: `${PREVIEW_PX[option]}px` }}
                aria-hidden="true"
              >
                Aa
              </span>
              <span className="flex-1">{t(LABEL_KEY[option])}</span>
              {isActive && (
                <Check className="text-primary size-4" aria-hidden="true" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
```

- [ ] **Step 4: วาง component ใน `components/navbar/user-profile.tsx`**

เพิ่ม import ต่อจากบรรทัด `import { ThemeSwitch } from "./theme-switch";` (บรรทัด 33):

```tsx
import { FontScaleSwitch } from "./font-scale-switch";
```

แล้วหาบรรทัด 196-198:

```tsx
        <LangSwitch />
        <ThemeSwitch />
        <DropdownMenuSeparator />
```

แทรก `<FontScaleSwitch />` ระหว่าง `<ThemeSwitch />` กับ `<DropdownMenuSeparator />`:

```tsx
        <LangSwitch />
        <ThemeSwitch />
        <FontScaleSwitch />
        <DropdownMenuSeparator />
```

- [ ] **Step 5: ตรวจ static checks**

Run: `bunx tsc --noEmit && bun run lint`
Expected: ทั้งคู่ผ่าน

ถ้า `t(LABEL_KEY[option])` ขึ้น type error ให้ตรวจว่า `LABEL_KEY` มี `as const satisfies Record<FontScale, string>` ครบ — ถ้าขาด `as const` มันจะกลายเป็น `string` กว้างๆ ซึ่ง `t()` ไม่รับ

- [ ] **Step 6: ตรวจในเบราว์เซอร์**

Run: `bun dev` แล้ว login

1. เปิด dropdown โปรไฟล์ (มุมขวาบน) → ใต้หัวข้อ **Preferences** ต้องเห็น Font size ต่อจาก Theme
2. hover เข้า submenu → ต้องเห็น 5 บรรทัด ตัวอย่าง "Aa" เรียงจากเล็กไปใหญ่ และชื่อระดับเรียงตรงกันเป็นคอลัมน์
3. เลือกทีละระดับครบทั้ง 5 → หน้าจอต้องเปลี่ยนขนาดทันที และ check mark ย้ายตาม
4. reload → ขนาดคงเดิม ไม่กระพริบ เปิดเมนูอีกครั้ง check mark ยังอยู่ที่ระดับเดิม
5. สลับภาษาเป็นไทย → label ต้องเป็น "ขนาดตัวอักษร / เล็ก / ปกติ / ใหญ่ / ใหญ่ขึ้น / ใหญ่สุด"
6. สลับเป็น dark mode → submenu ต้องอ่านออกปกติ
7. ไปหน้า `/procurement/purchase-request` (ตารางหนาแน่นที่สุด) แล้วลองทั้ง `small` และ `biggest` → ข้อความต้องไม่ถูกตัดกลางคำหรือล้นออกนอกเซลล์
8. กด Tab เข้าเมนูด้วยคีย์บอร์ดอย่างเดียว → ต้องเข้า submenu และเลือกได้ด้วย Enter
9. เปิด DevTools console → ต้องไม่มี error

- [ ] **Step 7: Commit**

```bash
git add components/navbar/font-scale-switch.tsx components/navbar/user-profile.tsx messages/en.json messages/th.json
git commit -m "feat(ui): เพิ่ม Font size submenu ในเมนูโปรไฟล์ ถัดจาก Theme"
```

---

### Task 3: Guard test + เอกสาร

**Files:**
- Create: `lib/__tests__/font-scale.test.ts`
- Modify: `docs/DESIGN.md` (ใต้ block `typography:`)

**Interfaces:**
- Consumes: ทุก export จาก `@/lib/font-scale` (Task 1) และไฟล์ `styles/globals.css`, `index.html`, `messages/{en,th}.json` ที่ Task 1-2 แก้
- Produces: ไม่มี — task สุดท้าย

**ทำไมต้องมี test นี้:** ค่าของ feature นี้กระจายอยู่ 4 ที่ที่ไม่มีอะไรผูกกัน — `FONT_SCALES` ใน TS, rule ใน CSS, array ใน inline script, key ใน i18n สองไฟล์ คนที่เพิ่มระดับที่ 6 จะแก้ที่แรกแล้วลืมอีกสามที่ และไม่มีอะไรฟ้อง test นี้คือสิ่งที่ฟ้อง (pattern เดียวกับ `components/ui/type-ladder.test.ts` และ `lib/__tests__/status-ink-contrast.test.ts` ที่อ่าน CSS จริงจาก disk)

- [ ] **Step 1: สร้าง `lib/__tests__/font-scale.test.ts`**

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_FONT_SCALE,
  FONT_SCALES,
  FONT_SCALE_STORAGE_KEY,
  applyScale,
  readStoredScale,
  type FontScale,
} from "@/lib/font-scale";

/**
 * Guard สำหรับ font scale — ค่าของ feature นี้อยู่ 4 ที่ที่ไม่มีอะไรผูกกัน:
 * FONT_SCALES (TS) · rule ใน globals.css · array ใน inline script ของ index.html ·
 * key ใน messages/{en,th}.json คนที่เพิ่มระดับที่ 6 จะแก้ที่แรกแล้วลืมที่เหลือ
 * โดยไม่มีอะไรฟ้อง — test นี้อ่านไฟล์จริงจาก disk เพื่อฟ้องแทน
 */
const ROOT = join(import.meta.dirname, "../..");
const css = readFileSync(join(ROOT, "styles/globals.css"), "utf-8");
const indexHtml = readFileSync(join(ROOT, "index.html"), "utf-8");
const en = JSON.parse(
  readFileSync(join(ROOT, "messages/en.json"), "utf-8"),
) as { common: Record<string, string> };
const th = JSON.parse(
  readFileSync(join(ROOT, "messages/th.json"), "utf-8"),
) as { common: Record<string, string> };

/** `normal` ไม่มี class ของตัวเอง — ค่าของมันคือ rule `html` เปล่าใน @layer base */
function declaredPercent(scale: FontScale): number | null {
  const selector =
    scale === DEFAULT_FONT_SCALE
      ? String.raw`html`
      : String.raw`html\.font-scale-${scale}`;
  // `[^}]*?` กันไม่ให้ข้าม block — `html {` เปล่าจะไม่ match `html.font-scale-*`
  // เพราะ `\s*\{` ต้องตามหลัง selector ทันที
  const match = new RegExp(
    String.raw`^\s*${selector}\s*\{[^}]*?font-size:\s*([\d.]+)%`,
    "m",
  ).exec(css);
  return match ? Number(match[1]) : null;
}

describe("ladder ใน globals.css", () => {
  it("ประกาศ font-size ไว้ครบทุกระดับ", () => {
    for (const scale of FONT_SCALES) {
      expect(declaredPercent(scale), `ระดับ "${scale}"`).not.toBeNull();
    }
  });

  it("normal คือ 100% และไม่มี class .font-scale-normal", () => {
    expect(declaredPercent(DEFAULT_FONT_SCALE)).toBe(100);
    expect(css).not.toContain("font-scale-normal");
  });

  it("ค่าเรียงจากน้อยไปมากตามลำดับ FONT_SCALES", () => {
    const values = FONT_SCALES.map(declaredPercent);
    expect(values).toEqual([...values].sort((a, b) => Number(a) - Number(b)));
  });

  it("print reset ขนาดกลับเป็น 100%", () => {
    // งานพิมพ์ต้องไม่ขึ้นกับ preference บนจอ — assert เฉพาะใน block @media print
    // เพราะ `html` base ก็เป็น 100% เหมือนกัน
    const printBlock = css.slice(css.indexOf("@media print"));
    expect(printBlock).toContain("@media print");
    expect(printBlock).toMatch(/font-size:\s*100%\s*!important/);
  });
});

describe("boot script ใน index.html", () => {
  it("ใช้ storage key เดียวกับ lib/font-scale.ts", () => {
    expect(indexHtml).toContain(FONT_SCALE_STORAGE_KEY);
  });

  it("รายชื่อระดับตรงกับ FONT_SCALES (ยกเว้น normal ที่ไม่มี class)", () => {
    const match = /\[([^\]]*)\]\s*\.indexOf\(s\)/.exec(indexHtml);
    expect(match, "ไม่พบ array ของระดับใน inline script").not.toBeNull();
    const inScript = match![1]
      .split(",")
      .map((raw) => raw.trim().replace(/["']/g, ""))
      .filter(Boolean);
    expect(inScript).toEqual(
      FONT_SCALES.filter((scale) => scale !== DEFAULT_FONT_SCALE),
    );
  });
});

describe("readStoredScale", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  it("คืน default เมื่อยังไม่เคยตั้งค่า", () => {
    expect(readStoredScale()).toBe(DEFAULT_FONT_SCALE);
  });

  it("คืนค่าที่เก็บไว้ (round-trip กับ applyScale)", () => {
    applyScale("bigger");
    expect(readStoredScale()).toBe("bigger");
  });

  it("คืน default เมื่อค่าที่เก็บไว้เสียหาย", () => {
    for (const broken of ["huge", "", "NORMAL", "1"]) {
      localStorage.setItem(FONT_SCALE_STORAGE_KEY, broken);
      expect(readStoredScale(), `ค่า "${broken}"`).toBe(DEFAULT_FONT_SCALE);
    }
  });
});

describe("applyScale", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  it("เติม class ของระดับที่เลือกตัวเดียว", () => {
    applyScale("biggest");
    expect(document.documentElement.className).toBe("font-scale-biggest");
  });

  it("สลับระดับแล้วไม่เหลือ class เก่าค้าง", () => {
    applyScale("small");
    applyScale("big");
    expect(document.documentElement.className).toBe("font-scale-big");
  });

  it("normal ลบ class ทิ้งหมด", () => {
    applyScale("bigger");
    applyScale(DEFAULT_FONT_SCALE);
    expect(document.documentElement.className).toBe("");
  });

  it("ไม่แตะ class อื่นบน <html> เช่น dark ของ next-themes", () => {
    document.documentElement.classList.add("dark");
    applyScale("big");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    applyScale(DEFAULT_FONT_SCALE);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});

describe("i18n", () => {
  const labelKey = (scale: FontScale) =>
    `fontSize${scale.charAt(0).toUpperCase()}${scale.slice(1)}`;

  it("มี label ครบทุกระดับทั้ง en และ th", () => {
    for (const scale of FONT_SCALES) {
      const key = labelKey(scale);
      expect(en.common[key], `en.common.${key}`).toBeTruthy();
      expect(th.common[key], `th.common.${key}`).toBeTruthy();
    }
  });

  it("มี label ของหัวข้อเมนูทั้งสองภาษา", () => {
    expect(en.common.fontSize).toBeTruthy();
    expect(th.common.fontSize).toBeTruthy();
  });
});
```

- [ ] **Step 2: รัน test**

Run: `bun test:run lib/__tests__/font-scale.test.ts`
Expected: ผ่านทั้งหมด (15 test)

ถ้า `รายชื่อระดับตรงกับ FONT_SCALES` fail ให้ตรวจว่า array ใน `index.html` เขียนเป็น `["small", "big", "bigger", "biggest"]` เรียงตามลำดับเดียวกับ `FONT_SCALES` (ตัด `normal` ออก)

- [ ] **Step 3: รัน test ทั้งชุด**

Run: `bun test:run`
Expected: ผ่านทั้งหมด ไม่มี test เดิมพัง

- [ ] **Step 4: บันทึกลง `docs/DESIGN.md`**

หา block `typography:` แล้วเพิ่ม comment นี้ต่อท้ายย่อหน้าอธิบายของ block (ก่อน key `micro-floor:`):

```yaml
  # ROOT SCALE — ตั้งแต่ 2026-07-27 ladder นี้อยู่ใต้ font scale ที่ผู้ใช้ปรับได้เอง
  # จากเมนูโปรไฟล์ (lib/font-scale.ts + `html.font-scale-*` ใน globals.css)
  # ขนาด px ทุกค่าข้างล่างคือค่าที่ระดับ `normal` (root 100% = 16px ตาม browser
  # default) ห้าระดับคือ 93.75 / 100 / 112.5 / 125 / 137.5% ทำให้ทั้ง ladder กวาด
  # ตามเป็นสัดส่วนเดียว — micro-floor 8px จริงๆ คือช่วง 7.5–11px และ body 17px คือ
  # 15.9–23.4px ตัวเลขในเอกสารนี้ยังเป็นสัญญาที่ถูกต้อง เพราะสิ่งที่การันตีคือ
  # *สัดส่วนบน ladder* ไม่ใช่ px สัมบูรณ์บนจอผู้ใช้คนใดคนหนึ่ง
```

- [ ] **Step 5: ตรวจ static checks**

Run: `bunx tsc --noEmit && bun run lint`
Expected: ทั้งคู่ผ่าน

- [ ] **Step 6: Commit**

```bash
git add lib/__tests__/font-scale.test.ts docs/DESIGN.md
git commit -m "test(ui): guard ไม่ให้ font scale drift ระหว่าง TS / CSS / boot script / i18n"
```

---

## เกณฑ์ว่าเสร็จทั้งแผน

- `bunx tsc --noEmit` · `bun run lint` · `bun test:run` สะอาดทั้งสาม
- เลือกครบทั้ง 5 ระดับในเบราว์เซอร์จริง ทั้ง light และ dark ทั้ง en และ th
- reload แล้วค่าคงอยู่และ **ไม่กระพริบ**
- ตาราง Purchase Request อ่านได้ทั้งที่ `small` และ `biggest` ไม่มีข้อความถูกตัด
- เข้าเมนูและเลือกได้ด้วยคีย์บอร์ดอย่างเดียว
