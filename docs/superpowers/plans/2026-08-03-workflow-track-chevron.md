# WorkflowTrack Chevron Ribbon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เปลี่ยน `WorkflowTrack` จาก breadcrumb ข้อความล้วน เป็นลูกศรต่อกัน (chevron ribbon) ที่แต่ละขั้นเป็นกล่องพื้นสีอ่อน — ผ่านแล้วเขียว กำลังอยู่เหลือง ยังไม่ถึงเทา ยกเลิกชมพูเข้ม

**Architecture:** รูปลูกศรทำด้วย `clip-path: polygon()` สอง class ใน `@layer components` ของ `styles/globals.css` · สีพื้นเป็น token `*-soft` ใหม่ใน `styles/badge-status.css` ที่คำนวณด้วย `color-mix()` จากสีสถานะเดิมผสมกับ `--card` จึงพลิกตามธีมเองโดยไม่ต้องเขียนบล็อก `.dark` ซ้ำ · component เขียน render ใหม่ทั้งหมดโดย **props ไม่เปลี่ยน** จึงไม่ต้องแตะ call site ใด ๆ

**Tech Stack:** React 19 · TypeScript · Tailwind CSS 4 (`@theme inline` + `@layer components`) · lucide-react · Vite

**Spec:** `docs/superpowers/specs/2026-08-03-workflow-track-chevron-design.md`

## Global Constraints

- **ห้ามเขียนไฟล์ test ใหม่** — preference ของเจ้าของ repo คือไม่สร้าง `*.test.ts` / `*.test.tsx` นอกจากจะสั่งในเทิร์นนั้น ๆ · ข้ามทุกขั้นตอนแบบ TDD ("เขียน test ที่ fail ก่อน") · **แต่ static check ไม่ใช่ test — ต้องรันทุกครั้ง** (`bunx tsc --noEmit`, `bun run lint`) และ **test suite เดิมต้องยังเขียว 100%** (`bun test:run`)
- **props ของ `WorkflowTrack` ห้ามเปลี่ยน** — `previousStage?` / `currentStage` / `nextStage?` / `terminalState?: "voided"` · ห้ามแตะ `routes/procurement/purchase-request/pr-header.tsx`, `routes/procurement/purchase-order/po-header.tsx`, `routes/store-operation/store-requisition/sr-header.tsx`, `components/share/doc-form-header.tsx`
- **ห้ามเพิ่ม i18n key** — ไม่แตะ `messages/en.json` / `messages/th.json`
- **ห้ามเพิ่ม font-size literal ใหม่** — ใช้ `text-micro` (11px) ที่มีอยู่แล้วเท่านั้น · `components/ui/type-ladder.test.ts` จะ fail ถ้าโผล่ `text-[…]` ขนาดที่มี token อยู่แล้ว
- **สีสถานะต้องมาจาก `styles/badge-status.css` เท่านั้น** — ห้ามหยิบ semantic token (`destructive`, `warning`, `success`) มาใช้แทน ตามกฎ "สามชั้นสีห้ามปนกัน" ใน `docs/DESIGN.md`
- **ทุกระยะอยู่บน 4px grid** — ใช้ Tailwind scale (`h-6`, `pl-2`, `pl-4`, `pr-4`, `gap-0.5`, `gap-1`, `size-3`) ห้ามใช้ค่า arbitrary
- **commit message เป็นภาษาไทย** ตาม `CLAUDE.md` ของ repo

## File Structure

| ไฟล์ | ความรับผิดชอบ | Task |
|---|---|---|
| `styles/badge-status.css` | นิยามสีสถานะทั้งหมดของแอป — เพิ่ม 3 soft tint + ลงทะเบียนเป็น Tailwind color 3 บรรทัด | 1 |
| `styles/globals.css` | design token + base layer — เพิ่ม `@layer components` สอง class สำหรับรูปลูกศร | 1 |
| `components/share/workflow-track.tsx` | แสดงลำดับขั้น workflow ของเอกสาร — เขียน render ใหม่ทั้งไฟล์ | 2 |

ไม่มีไฟล์ใหม่ · ไม่มีไฟล์ที่ถูกลบ

---

### Task 1: ฐาน CSS — soft tint token กับ class รูปลูกศร

**Files:**
- Modify: `styles/badge-status.css:153` (ท้ายบล็อก `:root` ก่อนวงเล็บปิดที่บรรทัด 154) และ `styles/badge-status.css:315` (ท้ายกลุ่ม background color ในบล็อก `@theme inline`)
- Modify: `styles/globals.css:355` (แทรก `@layer components` ก่อน `@layer base {`)

**Interfaces:**
- Consumes: `--status-approved`, `--status-in-progress`, `--status-voided` (มีอยู่แล้วใน `badge-status.css` ทั้งบล็อก `:root` และ `.dark`) · `--card` (มีอยู่แล้วใน `globals.css` ทั้งสองธีม)
- Produces:
  - Tailwind utility `bg-status-approved-soft`, `bg-status-in-progress-soft`, `bg-status-voided-soft` (Task 2 ใช้)
  - Tailwind utility `text-status-approved`, `text-status-in-progress`, `text-status-voided` (มีอยู่แล้ว ไม่ต้องเพิ่ม — Task 2 ใช้)
  - CSS class `.wf-chevron` และ `.wf-chevron-head` (Task 2 ใช้)

- [ ] **Step 1: เพิ่ม soft tint token ท้ายบล็อก `:root` ของ `styles/badge-status.css`**

แทรกต่อจากบรรทัด `--status-cuisine-oceania-fg: oklch(0.98 0 0);` (บรรทัด 153) ก่อนวงเล็บปิด `}` ของ `:root`:

```css

  /* ── Soft tints: พื้นลูกศรของ workflow-track ──
     ผสมสีสถานะกับ --card ซึ่งพลิกเองตามธีม จึงประกาศครั้งเดียวพอ ไม่ต้องมีคู่ใน .dark:
     next-themes ตั้งค่า attribute="class" → :root กับ .dark อยู่บน <html> ตัวเดียวกัน
     และ var() ใน custom property ถูกแทนค่าตอน computed-value time บน element นั้น
     จึงได้ค่าที่ชนะ cascade เสมอ ไม่ขึ้นกับลำดับการประกาศในไฟล์
     เปอร์เซ็นต์ต่างกันเพราะ in-progress (L 0.85) จางกว่าอีกสองสีมาก ต้องผสมเข้มขึ้น
     จึงจะเห็นเป็นพื้นเหลืองเท่ากัน
     ผสมใน oklab ไม่ใช่ oklch — oklch interpolate "มุม hue" และ --card คือ oklch(1 0 0)
     ที่ระบุ hue = 0 ไม่ใช่ none ผลคือ 14% ของเขียว (h=155) กลายเป็น h≈21 (ชมพู)
     oklab เป็น perceptual space เดียวกันแต่เป็นแกน a/b จึงไม่มีมุม hue ให้ลาก */
  --status-approved-soft: color-mix(in oklab, var(--status-approved) 14%, var(--card));
  --status-in-progress-soft: color-mix(in oklab, var(--status-in-progress) 18%, var(--card));
  --status-voided-soft: color-mix(in oklab, var(--status-voided) 14%, var(--card));
```

- [ ] **Step 2: ลงทะเบียน token ทั้งสามเป็น Tailwind color**

ในบล็อก `@theme inline` ของไฟล์เดียวกัน แทรกต่อจากบรรทัด `--color-status-cuisine-oceania: var(--status-cuisine-oceania);` (บรรทัด 315) ก่อนบรรทัดว่างที่คั่นกลุ่ม `/* Foreground (text) colors */`:

```css

  /* Soft tints — พื้น workflow-track */
  --color-status-approved-soft: var(--status-approved-soft);
  --color-status-in-progress-soft: var(--status-in-progress-soft);
  --color-status-voided-soft: var(--status-voided-soft);
```

- [ ] **Step 3: เพิ่ม `@layer components` ใน `styles/globals.css`**

แทรกก่อนบรรทัด `@layer base {` (บรรทัด 355) — เว้นบรรทัดว่างคั่นทั้งบนและล่าง:

```css
@layer components {
  /* ── workflow-track: ลูกศรลำดับขั้นเอกสาร ──
     บากซ้ายรับปลายของช่องก่อนหน้า แหลมขวาชี้ทิศทางที่เอกสารกำลังเดินไป
     ใช้ clip-path ไม่ใช่สามเหลี่ยม pseudo-element เพราะกล่องต้องยืดตามความยาว
     ชื่อขั้นเอง และรับสีจาก CSS custom property ได้ตรง ๆ (dark mode จึงมาฟรี)
     ข้อแลก: clip ตัดเส้นขอบไปด้วย ใส่ border ไม่ได้ — ออกแบบเป็นพื้น tint จึงไม่กระทบ */
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

  /* ช่องแรก — ซ้ายตัดตรง ไม่มีปลายของใครมาเสียบ
     ต้องใส่คู่กับ .wf-chevron เสมอ (--wf-notch มาจาก class นั้น) และต้องประกาศ
     หลัง .wf-chevron ในไฟล์ — specificity เท่ากัน (0,1,0) ลำดับใน source
     จึงเป็นตัวตัดสินว่า clip-path ไหนชนะ */
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

- [ ] **Step 4: build เพื่อยืนยันว่า CSS ผ่านและ token ออกไปถึงบันเดิลจริง**

```bash
bun run build
```

Expected: build สำเร็จ ไม่มี error

จากนั้นตรวจว่า custom property กับ class ทั้งสองอยู่ใน CSS ที่ build ออกมา:

```bash
grep -c "status-approved-soft" dist/assets/*.css
grep -c "wf-chevron" dist/assets/*.css
```

Expected: ทั้งสองคำสั่งคืนค่ามากกว่า 0

> หมายเหตุ: ตอนนี้จะยัง **ไม่** เจอ utility `bg-status-approved-soft` ใน CSS เพราะ Tailwind สร้าง utility ตามที่พบใน source เท่านั้น และยังไม่มีไฟล์ไหนใช้ — จะไปเจอหลัง Task 2 ตรงนี้เช็คแค่ว่า custom property กับ hand-written class ถูก emit ออกมาแล้ว

- [ ] **Step 5: lint**

```bash
bun run lint
```

Expected: ผ่าน ไม่มี error

- [ ] **Step 6: Commit**

```bash
git add styles/badge-status.css styles/globals.css
git commit -m "$(cat <<'EOF'
style(workflow-track): เพิ่ม soft tint token กับ class รูปลูกศร

- soft tint 3 ตัวใน badge-status.css คำนวณจาก color-mix กับ --card
  ประกาศครั้งเดียวพอ ธีมมืดพลิกตามเอง
- .wf-chevron / .wf-chevron-head ใน @layer components ของ globals.css

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: เขียน WorkflowTrack ใหม่เป็น chevron ribbon

**Files:**
- Modify: `components/share/workflow-track.tsx` (ทั้งไฟล์ — 82 บรรทัดเดิมถูกแทนที่)

**Interfaces:**
- Consumes (จาก Task 1): class `.wf-chevron`, `.wf-chevron-head` · utility `bg-status-approved-soft`, `bg-status-in-progress-soft`, `bg-status-voided-soft`
- Produces: `export function WorkflowTrack(props: WorkflowTrackProps)` — signature เดิมทุกประการ ไม่มี export ใหม่

- [ ] **Step 1: แทนที่เนื้อหาทั้งไฟล์ `components/share/workflow-track.tsx`**

```tsx
import { Check, Circle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkflowTrackProps {
  readonly previousStage?: string;
  readonly currentStage: string;
  readonly nextStage?: string;
  readonly terminalState?: "voided";
}

type StageState = "done" | "current" | "pending" | "voided";

/**
 * ตำแหน่งในลำดับ → สถานะของช่อง
 *
 * `currentIndex` เป็น -1 ได้เมื่อ `currentStage` เป็นสตริงว่าง (ถูก filter ทิ้งไป
 * ก่อนหน้า) — กรณีนั้นทุกช่องกลายเป็น pending ซึ่งตรงกับพฤติกรรมเดิมของไฟล์นี้
 */
function resolveState(
  i: number,
  currentIndex: number,
  isVoided: boolean,
): StageState {
  if (i < currentIndex) return "done";
  if (i > currentIndex) return "pending";
  return isVoided ? "voided" : "current";
}

/**
 * พื้น tint + สีข้อความของแต่ละสถานะ
 *
 * `pending` ใช้ bg-muted ไม่ใช่ tint ของ --status-draft เพราะเทา 10% ผสมกับ --card
 * ในโหมดมืดจางจนมองไม่เห็นรูปลูกศร และในเชิงความหมาย "ยังไม่ถึง" คือยังไม่มี
 * สถานะ ไม่ใช่สถานะสีเทา — bg-muted เป็น token ที่ badge variant `-light` ใช้เป็น
 * กล่องกลางอยู่แล้ว
 *
 * `voided` ใช้ --status-voided (ชมพูเข้ม) ไม่ใช่ text-destructive แบบโค้ดเดิม —
 * DESIGN.md ห้ามปน semantic token กับ document status และแอปมี token voided อยู่แล้ว
 */
const STATE_STYLE: Record<StageState, string> = {
  done: "bg-status-approved-soft text-muted-foreground",
  current: "bg-status-in-progress-soft text-foreground font-medium",
  pending: "bg-muted text-muted-foreground/70",
  voided: "bg-status-voided-soft text-foreground font-medium line-through",
};

/** ไอคอนนำหน้าชื่อขั้น — รูปต่างกันต่อสถานะ ไม่ได้ต่างแค่สี */
function StateIcon({ state }: { readonly state: StageState }) {
  switch (state) {
    case "done":
      return (
        <Check
          className="text-status-approved size-3 shrink-0"
          aria-hidden="true"
        />
      );
    case "current":
      return (
        <Circle
          className="text-status-in-progress size-3 shrink-0 fill-current"
          aria-hidden="true"
        />
      );
    case "voided":
      return (
        <X className="text-status-voided size-3 shrink-0" aria-hidden="true" />
      );
    case "pending":
      return (
        <Circle
          className="text-muted-foreground size-3 shrink-0"
          aria-hidden="true"
        />
      );
  }
}

/**
 * ลำดับขั้น workflow ของเอกสาร — ลูกศรต่อกันใต้เลขที่ใบ
 *
 * เดิมเป็น breadcrumb ข้อความล้วนที่แยกสถานะด้วยความเข้มของสีเทากับน้ำหนัก
 * ตัวอักษรเท่านั้น ในแถบหัวเอกสารที่มีทั้ง badge สถานะ เลข version และช่องข้อมูล
 * อีกหลายช่อง ความต่างระดับนั้นเบาเกินกว่าจะกวาดตาเจอ
 *
 * การกลับมาใช้สีบอกสถานะเป็นการย้อน comment เดิมของไฟล์นี้อย่างตั้งใจ — กฎจริง
 * ใน docs/DESIGN.md คือ "สถานะเป็นข้อมูล ไม่ใช่การประดับ และปรากฏครั้งเดียว
 * ต่อองค์ประกอบ" ไม่ใช่ "ห้ามใช้สี" · สิ่งที่โค้ดเดิมแก้คือการยิงสี info ใส่ขั้น
 * ปัจจุบันสี่ชั้นพร้อมกัน (ป้าย CURRENT + จุด + halo ที่เต้น + ชื่อขั้น) ซึ่งที่นี่
 * ไม่ทำซ้ำ ข้อจำกัดที่ตั้งไว้กันไม่ให้ไหลกลับไปทางนั้น:
 *
 * - **หนึ่งเฉดต่อหนึ่งช่อง** ปรากฏสองระดับความเข้ม — พื้น tint 14–18% กับไอคอน
 *   เต็มความเข้ม เป็นสีเดียวกันคนละน้ำหนัก ไม่ใช่สองสัญญาณแข่งกัน
 * - **ข้อความเป็นสีกลางเสมอ** ไม่รับสีสถานะ — contrast จึงผ่าน 4.5:1 ทั้งสองธีม
 *   โดยไม่ต้องทำ ink token เพิ่ม
 * - **ไอคอนต่างรูปต่อสถานะ** คนตาบอดสีเขียว-เหลืองยังแยก ✓ / ● / ○ / ✕ ออก
 *   (WCAG 1.4.1 — ห้ามใช้สีเป็นตัวบอกอย่างเดียว)
 * - **ไม่มี animation** ความเคลื่อนไหวควรบอกว่ามีอะไรเปลี่ยน ไม่ใช่ประดับสถานะที่นิ่ง
 *
 * ยังไม่ใช้ `components/ui/breadcrumb` เพราะตัวนั้นเป็น `<nav aria-label="breadcrumb">`
 * ซึ่งแอปมีอยู่แล้วบน navbar — ใส่ซ้ำในหน้าเดียวกันจะกลายเป็น breadcrumb สองชุด
 * สำหรับ screen reader ทั้งที่ขั้น workflow เป็นสถานะ ไม่ใช่เส้นทางการนำทาง
 */
export function WorkflowTrack({
  previousStage,
  currentStage,
  nextStage,
  terminalState,
}: WorkflowTrackProps) {
  const isVoided = terminalState === "voided";
  const resolvedNext = isVoided || nextStage === "-" ? undefined : nextStage;
  const stages = [previousStage, currentStage, resolvedNext].filter(
    (s): s is string => !!s,
  );

  if (stages.length === 0) return null;

  const currentIndex = stages.indexOf(currentStage);

  return (
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
            <span className="max-w-20 truncate sm:max-w-32" title={stage}>
              {stage}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

> ลำดับในไฟล์สำคัญ: `resolveState` / `STATE_STYLE` / `StateIcon` ต้องอยู่ **เหนือ**
> `WorkflowTrack` — `STATE_STYLE` เป็น `const` ถ้าวางไว้ล่างจะติด `no-use-before-define`
> ของ ESLint (แม้ runtime จะไม่พังเพราะถูกอ่านตอน render ไม่ใช่ตอน evaluate module)

- [ ] **Step 2: type-check**

```bash
bunx tsc --noEmit
```

Expected: ผ่าน ไม่มี error · ถ้าเจอ `TS6133` แปลว่ามี import ที่ไม่ได้ใช้เหลือค้าง (`ChevronRight` เดิม) — ต้องไม่มี เพราะ Step 1 แทนที่ทั้งไฟล์

- [ ] **Step 3: lint**

```bash
bun run lint
```

Expected: ผ่าน ไม่มี error

- [ ] **Step 4: รัน test suite เดิม**

```bash
bun test:run
```

Expected: ผ่านทั้งหมด · `components/ui/type-ladder.test.ts` เป็นตัวที่ต้องจับตา — ไฟล์นี้ใช้ `text-micro` ซึ่งเป็น token ที่ลงทะเบียนแล้ว จึงไม่ควรมีอะไรเปลี่ยน ถ้ามันแดงแปลว่าเผลอใส่ `text-[…]` เข้าไป

- [ ] **Step 5: ยืนยันว่า utility ถูกสร้างจริงหลังมี call site แล้ว**

```bash
bun run build
grep -c "bg-status-approved-soft\|status-approved-soft" dist/assets/*.css
```

Expected: มากกว่า 0 · ถ้าเป็น 0 แปลว่า Tailwind ไม่ได้สแกนเจอ class — ให้ตรวจว่าเขียน class เต็มคำเป็น literal ในไฟล์ (ไม่ประกอบสตริงแบบ `` `bg-status-${x}-soft` `` ซึ่ง Tailwind มองไม่เห็น)

- [ ] **Step 6: Commit**

```bash
git add components/share/workflow-track.tsx
git commit -m "$(cat <<'EOF'
feat(workflow-track): เปลี่ยนลำดับขั้นเอกสารเป็นลูกศรพื้นสี

จาก breadcrumb ข้อความล้วนเป็น chevron ribbon — ผ่านแล้วเขียว กำลังอยู่เหลือง
ยังไม่ถึงเทา ยกเลิกชมพูเข้ม ไอคอนต่างรูปต่อสถานะเพื่อไม่ให้สีเป็นตัวบอกอย่างเดียว

props ไม่เปลี่ยน call site ทั้งสามที่ (PR/PO/SR) จึงไม่ต้องแก้

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: ตรวจในเบราว์เซอร์จริง

**Files:**
- อาจ Modify: `styles/badge-status.css` (ปรับเปอร์เซ็นต์ tint) หรือ `components/share/workflow-track.tsx` (ปรับระยะ) ถ้าพบปัญหา — ถ้าไม่พบ ไม่ต้องแก้อะไร

**Interfaces:**
- Consumes: ผลลัพธ์ของ Task 1 กับ Task 2
- Produces: ไม่มี artifact ใหม่ — เป็นด่านยืนยันก่อนถือว่างานเสร็จ

> ขั้นตอนนี้แทนที่ automated test ตาม preference ของเจ้าของ repo — การตรวจด้วยตา
> ไม่ถูกข้าม แม้จะข้ามการเขียน test ก็ตาม

- [ ] **Step 1: เปิด dev server ชี้ไปที่ backend ในเครื่อง**

```bash
VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev
```

ล็อกอินด้วยบัญชีทดสอบของ dev backend

- [ ] **Step 2: ตรวจ 4 สถานะ × 2 ธีม**

เปิดหน้า Purchase Request แล้วเข้าใบที่มีสถานะต่างกัน สลับธีมด้วยปุ่มบน navbar:

| ใบที่ต้องเปิด | สิ่งที่ต้องเห็น |
|---|---|
| PR ที่ submitted (มีทั้ง prev/current/next) | 3 ลูกศร เขียว → เหลือง → เทา · ช่องแรกซ้ายตัดตรง · ช่องท้ายปลายแหลม |
| PR ที่เพิ่ง submit (ไม่มี prev) | 2 ลูกศร เหลือง → เทา · ช่องแรก (เหลือง) ซ้ายตัดตรง |
| PR ที่ completed (ไม่มี next) | 2 ลูกศร เขียว → เหลือง |
| PR ที่ voided | ช่องปัจจุบันพื้นชมพูเข้มจาง ข้อความขีดทับ ไอคอน ✕ · ไม่มีช่อง next |

**เกณฑ์ที่ต้องผ่านทุกใบ ทั้งสองธีม:**
- อ่านชื่อขั้นออกชัด ไม่จมพื้น
- แยกช่องเขียว / เหลือง / เทา ออกจากกันได้จากพื้น ไม่ต้องพึ่งไอคอนอย่างเดียว
- ช่องไฟ 2px ระหว่างลูกศรยังเห็น สีสองช่องไม่กลืนกัน
- **โหมดมืดสำคัญเป็นพิเศษ** — ถ้าพื้นยังเป็นสีของโหมดสว่าง แปลว่า `color-mix()` ที่ประกาศครั้งเดียวไม่ resolve ตาม cascade ต้องแก้โดยประกาศ soft token ซ้ำในบล็อก `.dark` ของ `badge-status.css` ด้วยข้อความเดียวกัน

- [ ] **Step 3: ตรวจชื่อขั้นยาวและจอแคบ**

- หาใบที่ชื่อขั้นยาว (หรือย่อหน้าต่างเบราว์เซอร์ให้แคบลง) — ข้อความต้อง `…` ตัดท้าย **ไม่ล้ำเข้าไปในมุมแหลม** ของลูกศร
- hover ที่ชื่อขั้นที่ถูกตัด — ต้องขึ้น tooltip เป็นชื่อเต็ม
- ย่อหน้าต่างต่ำกว่า 640px — ความกว้างสูงสุดต่อช่องต้องหดจาก 128px เหลือ 80px

- [ ] **Step 4: ตรวจ console**

เปิด DevTools console — ต้องไม่มี error หรือ warning ใหม่

- [ ] **Step 5: ตรวจหน้าอื่นที่ใช้ component เดียวกัน**

เปิด Purchase Order และ Store Requisition อย่างละหนึ่งใบที่อยู่ระหว่าง workflow — ต้องเห็นลูกศรหน้าตาเดียวกัน ไม่มีอะไรล้นหรือทับช่องข้อมูลอื่นในแถบหัวเอกสาร

- [ ] **Step 6: ถ้าต้องแก้ ให้ commit แยก**

ถ้า Step 2–5 พบปัญหาแล้วแก้:

```bash
git add -A
git commit -m "$(cat <<'EOF'
fix(workflow-track): <สิ่งที่แก้จากการตรวจในเบราว์เซอร์>

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

ถ้าไม่พบปัญหา ไม่ต้อง commit อะไร — แค่รายงานผลการตรวจตามตารางใน Step 2

---

## สิ่งที่ plan นี้จงใจไม่แก้

- **แถบ workflow ล้นบนจอ 375px** — track กว้างได้ถึงราว 400px นั่งอยู่ขวาของ flex row ที่ไม่ wrap ใน `doc-form-header.tsx` เป็นปัญหาที่มีมาก่อนงานนี้ Task 2 บรรเทาด้วย `max-w-20 sm:max-w-32` แต่การแก้ให้ขาดต้องรื้อ layout ของ header ซึ่งอยู่นอกขอบเขต
- **`/api/time` ยัง stub เป็นเวลาเครื่อง client** — ไม่เกี่ยวกับงานนี้
