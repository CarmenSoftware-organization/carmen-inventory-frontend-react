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
| `styles/badge-status.css` | นิยามสีสถานะทั้งหมดของแอป — เพิ่ม soft tint + ink token (custom property ล้วน ๆ **ไม่** ลงทะเบียนเป็น Tailwind color เพราะไฟล์นี้สร้าง utility ไม่ได้ ดู "สิ่งที่แผนนี้คิดผิด") | 1 |
| `styles/globals.css` | design token + base layer — เพิ่ม `@layer components` สอง class สำหรับรูปลูกศร | 1 |
| `components/share/workflow-track.tsx` | แสดงลำดับขั้น workflow ของเอกสาร — เขียน render ใหม่ทั้งไฟล์ | 2 |

ไม่มีไฟล์ใหม่ · ไม่มีไฟล์ที่ถูกลบ

---

### Task 1: ฐาน CSS — soft tint token กับ class รูปลูกศร

**Files:**
- Modify: `styles/badge-status.css` (ท้ายบล็อก `:root` ก่อนวงเล็บปิด และท้ายบล็อก `.dark` สำหรับ token ที่ต้องมีคู่โหมดมืด)
- Modify: `styles/globals.css:355` (แทรก `@layer components` ก่อน `@layer base {`)

**Interfaces:**
- Consumes: `--status-approved`, `--status-in-progress`, `--status-voided` (มีอยู่แล้วใน `badge-status.css` ทั้งบล็อก `:root` และ `.dark`) · `--card`, `--muted`, `--foreground` (มีอยู่แล้วใน `globals.css` ทั้งสองธีม)
- Produces:
  - CSS custom property `--status-approved-soft`, `--status-in-progress-soft`, `--status-voided-soft`, `--status-pending-soft` (Task 2 ใช้ผ่าน `bg-[var(--status-…-soft)]`)
  - CSS custom property `--status-approved-ink`, `--status-in-progress-ink`, `--status-voided-ink` (Task 2 ใช้ผ่าน `text-[var(--status-…-ink)]`)
  - CSS class `.wf-chevron` และ `.wf-chevron.wf-chevron-head` (Task 2 ใช้)

> **ไม่มี Tailwind utility ใหม่** — ดูหัวข้อ "สิ่งที่แผนนี้คิดผิด" ท้ายไฟล์ ทุกที่ที่ใช้ต้องเขียนเป็น
> arbitrary value `bg-[var(--token)]` / `text-[var(--token)]` ไม่ใช่ `bg-status-*` / `text-status-*`

- [ ] **Step 1: เพิ่ม soft tint + ink token ใน `styles/badge-status.css`**

ท้ายบล็อก `:root` (ต่อจาก `--status-cuisine-oceania-fg`) ก่อนวงเล็บปิด `}` — ตัดคอมเมนต์เหลือใจความ
(ของจริงในไฟล์ยาวกว่านี้ อธิบายที่มาของทุกตัวเลข):

```css
  /* พื้น tint — ผสมสีสถานะกับ --card ซึ่งพลิกเองตามธีม (var() resolve ที่
     computed-value time บน <html> ตัวเดียวกัน) จึงไม่ต้องมีคู่ใน .dark เพื่อสลับสี
     ผสมใน oklab ไม่ใช่ oklch — oklch interpolate "มุม hue" และ --card คือ
     oklch(1 0 0) ที่ระบุ hue = 0 ไม่ใช่ none ผลคือ 14% ของเขียว (h=155)
     กลายเป็น h≈21 (ชมพู) */
  --status-approved-soft: color-mix(in oklab, var(--status-approved) 14%, var(--card));
  --status-in-progress-soft: color-mix(in oklab, var(--status-in-progress) 18%, var(--card));
  --status-voided-soft: color-mix(in oklab, var(--status-voided) 14%, var(--card));

  /* pending ไม่ใช่สถานะสี จึงไม่มี hue — ผสม --foreground เข้า --muted แค่ 2%
     ให้ช่องมีรูปทรงแยกจากพื้นหน้า เพดานอยู่ที่ 2–2.5% เพราะโหมดมืด
     --muted-foreground บน --muted เริ่มต้นที่ 4.76:1 เหลือถึง AA แค่ 0.26 */
  --status-pending-soft: color-mix(in oklab, var(--foreground) 2%, var(--muted));

  /* ink = หมึกที่วางบนพื้น -soft · fill ตัวเปล่าเป็นสี "พื้น" ที่จูนไว้ให้มี -fg ทับ
     เอามาเป็นไอคอนบน tint ของตัวเองแล้ววัดได้ done 3.19 · in-progress 1.47 ·
     voided 3.94 (สว่าง) / voided 2.75 (มืด) — ต่ำกว่า 3:1 ของ WCAG 1.4.11
     ink คง hue/chroma เดิม เปลี่ยนแค่ L เหมือน --warning-ink ใน globals.css */
  --status-approved-ink: oklch(0.46 0.19 155);
  --status-in-progress-ink: oklch(0.52 0.17 90);
  --status-voided-ink: oklch(0.50 0.18 348.79);
```

ท้ายบล็อก `.dark` — ink เป็นค่าคงที่ ไม่มีตัวแปรให้พลิกตามธีมเหมือน `-soft` จึงต้องมีคู่
ส่วน `--status-approved-soft` ต้องลด % ลงเพราะช่อง `done` เป็นช่องเดียวที่ใช้
`--muted-foreground` เป็นสีข้อความ และในโหมดมืดมันเริ่มต้นที่ 4.89:1 เท่านั้น
tint 14% กินจนเหลือ 4.25 ตกเส้น AA:

```css
  --status-approved-soft: color-mix(in oklab, var(--status-approved) 7%, var(--card));

  --status-approved-ink: oklch(0.67 0.17 155);
  --status-in-progress-ink: oklch(0.76 0.15 90);
  --status-voided-ink: oklch(0.70 0.16 348.79);
```

- [ ] **Step 2: เพิ่ม `@layer components` ใน `styles/globals.css`**

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

- [ ] **Step 3: build เพื่อยืนยันว่า CSS ผ่านและ token ออกไปถึงบันเดิลจริง**

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

> หมายเหตุ: ตอนนี้จะยังไม่เจอ **utility** ที่อ้าง token พวกนี้ (`bg-\[var\(--status-approved-soft\)\]`)
> เพราะ Tailwind สร้าง utility ตามที่พบใน source เท่านั้น และยังไม่มีไฟล์ไหนใช้ — จะไปเจอหลัง
> Task 2 ตรงนี้เช็คแค่ว่า custom property กับ hand-written class ถูก emit ออกมาแล้ว

- [ ] **Step 4: lint**

```bash
bun run lint
```

Expected: ผ่าน ไม่มี error

- [ ] **Step 5: Commit**

```bash
git add styles/badge-status.css styles/globals.css
git commit -m "$(cat <<'EOF'
style(workflow-track): เพิ่ม soft tint / ink token กับ class รูปลูกศร

- soft tint คำนวณจาก color-mix กับ --card/--muted ธีมมืดพลิกตามเอง
- ink 3 ตัวเป็นค่าคงที่ จึงมีคู่ .dark พร้อม approved-soft ที่ต้องลด % ในธีมมืด
- .wf-chevron / .wf-chevron.wf-chevron-head ใน @layer components ของ globals.css

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: เขียน WorkflowTrack ใหม่เป็น chevron ribbon

**Files:**
- Modify: `components/share/workflow-track.tsx` (ทั้งไฟล์ — 82 บรรทัดเดิมถูกแทนที่)

**Interfaces:**
- Consumes (จาก Task 1): class `.wf-chevron`, `.wf-chevron-head` · custom property `--status-{approved,in-progress,voided,pending}-soft` และ `--status-{approved,in-progress,voided}-ink` เขียนเป็น arbitrary value `bg-[var(…)]` / `text-[var(…)]`
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
 * `pending` ใช้ --status-pending-soft ซึ่งเป็นเทาไร้ hue ไม่ใช่ tint ของ --status-draft
 * — ในเชิงความหมาย "ยังไม่ถึง" คือยังไม่มีสถานะ ไม่ใช่สถานะสีเทา · bg-muted เปล่า ๆ
 * ต่างจากพื้นหน้าแค่ 1.13:1 ในโหมดมืด รูปลูกศรจึงแทบไม่ปรากฏ
 *
 * `voided` ใช้ --status-voided (ชมพูเข้ม) ไม่ใช่ text-destructive แบบโค้ดเดิม —
 * DESIGN.md ห้ามปน semantic token กับ document status และแอปมี token voided อยู่แล้ว
 *
 * `line-through` ของ voided ไม่ได้อยู่ที่นี่ แต่ไปอยู่ที่ <span> ของชื่อขั้น —
 * text-decoration propagate ลง in-flow descendant ถ้าใส่ที่กล่องนอกเส้นจะถูกลากทับไอคอน ✕
 */
const STATE_STYLE: Record<StageState, string> = {
  done: "bg-[var(--status-approved-soft)] text-muted-foreground",
  current: "bg-[var(--status-in-progress-soft)] text-foreground font-medium",
  pending: "bg-[var(--status-pending-soft)] text-muted-foreground",
  voided: "bg-[var(--status-voided-soft)] text-foreground font-medium",
};

/**
 * ไอคอนนำหน้าชื่อขั้น — รูปต่างกันต่อสถานะ ไม่ได้ต่างแค่สี
 *
 * ใช้ `-ink` ไม่ใช่ token สีสถานะตรง ๆ (ตัวเปล่าเป็นสี "พื้น" เอามาเป็นไอคอนบน tint
 * ของตัวเองแล้ว contrast ตกถึง 1.47:1) ดูที่มาใน styles/badge-status.css
 */
function StateIcon({ state }: { readonly state: StageState }) {
  switch (state) {
    case "done":
      return (
        <Check
          className="text-[var(--status-approved-ink)] size-3 shrink-0"
          aria-hidden="true"
        />
      );
    case "current":
      return (
        <Circle
          className="text-[var(--status-in-progress-ink)] size-3 shrink-0 fill-current"
          aria-hidden="true"
        />
      );
    case "voided":
      return (
        <X
          className="text-[var(--status-voided-ink)] size-3 shrink-0"
          aria-hidden="true"
        />
      );
    case "pending":
      return (
        <Circle
          className="text-muted-foreground size-3 shrink-0"
          aria-hidden="true"
        />
      );
    // เพิ่ม StageState ตัวใหม่แล้วลืมเติม case ที่นี่ → TS error ตรงบรรทัดนี้
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
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
 * - **หนึ่งเฉดต่อหนึ่งช่อง** ปรากฏสองระดับความเข้ม — พื้น tint 7–18% กับไอคอนที่เป็น
 *   เฉดเดียวกันแต่เข้มกว่า (`--status-*-ink`) ไม่ใช่สองสัญญาณแข่งกัน
 * - **ข้อความเป็นสีกลางเสมอ** ไม่รับสีสถานะ — วัดแล้วผ่าน 4.5:1 ทั้งสองธีมทุกสถานะ
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
            <span
              className={cn(
                "max-w-20 truncate sm:max-w-32",
                // ขีดทับอยู่ที่ชื่อขั้นเท่านั้น ไม่ใช่ที่กล่องนอก
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
# Tailwind escape ทั้ง [ ] ( ) ในชื่อ class ที่ emit ออกมา
grep -c 'bg-\\\[var(--status-approved-soft)\\\]' dist/assets/*.css
grep -c 'text-\\\[var(--status-in-progress-ink)\\\]' dist/assets/*.css
```

Expected: มากกว่า 0 ทั้งคู่ · ถ้าเป็น 0 แปลว่า Tailwind ไม่ได้สแกนเจอ class — ให้ตรวจว่าเขียน class เต็มคำเป็น literal ในไฟล์ (ไม่ประกอบสตริงแบบ `` `bg-[var(--status-${x}-soft)]` `` ซึ่ง Tailwind มองไม่เห็น)

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

- **layout ของ `doc-form-header.tsx`** — call site ทั้งสาม (`pr-header.tsx:167`, `po-header.tsx:248`,
  `sr-header.tsx:290`) ส่ง track เข้าทาง prop **`subtitle`** ซึ่ง render ที่ `doc-form-header.tsx:91`
  เป็นบล็อกใต้ชื่อเอกสาร ไม่ใช่คอลัมน์ขวาของ flex row · prop `workflowStep` + path
  `absolute top-4 right-0` ที่ `doc-form-header.tsx:112` ไม่มี call site ไหนใช้เลย
  (ยืนยันด้วย `grep -rn "workflowStep=" routes components` → ไม่พบ)
  แถบไม่ล้นบนจอ 375px: ทุกช่องมี `min-w-0` และ span มี `truncate` ความกว้างพื้นล่างจึงเป็น
  `pl-4 + pr-4 + ไอคอน 12 + gap 4 = 48px` ต่อช่อง (ช่องแรก `pl-2` = 40px) → 3 ช่อง ≈ 140px
  · `max-w-20 sm:max-w-32` มีไว้ให้ชื่อขั้นอ่านออกในสัดส่วนที่สมดุลกับหัวเอกสาร ไม่ใช่เพื่อกันล้น
- **`/api/time` ยัง stub เป็นเวลาเครื่อง client** — ไม่เกี่ยวกับงานนี้

---

## สิ่งที่แผนนี้คิดผิด

บันทึกไว้เพื่อไม่ให้แผนถัดไปพลาดซ้ำ — ทั้งสองข้อทำให้เวอร์ชันแรกของงานนี้ออกมาไม่มีสี
และต้องตามแก้ทีหลัง

**1. `@theme inline` ในไฟล์ CSS ที่ไม่มี `@import "tailwindcss"` ไม่สร้าง utility**

แผนเดิมมี Step ที่สั่งเติม `--color-status-*-soft` ลงบล็อก `@theme inline` ของ
`styles/badge-status.css` แล้วให้ Task 2 ใช้ `bg-status-approved-soft` — Tailwind ไม่เคย
สร้าง utility นั้นให้ ผลคือ chevron ทุกช่องไม่มีพื้นสีเลย
บล็อก `TAILWIND THEME REGISTRATION` ที่ `badge-status.css:294+` (~70 บรรทัด) เป็นโค้ดตาย
มาแต่ไหนแต่ไรด้วยเหตุผลเดียวกัน — codebase ใช้ `bg-[var(--status-…)]` อยู่ 81 ที่
ส่วน `bg-status-*` / `text-status-*` ใช้ 0 ที่ ซึ่งเป็นหลักฐานที่ควรเชื่อมากกว่าการมีบล็อกนั้นอยู่
**บทเรียน:** จะเพิ่มสีใหม่ ให้ประกาศเป็น custom property แล้วเรียกด้วย arbitrary value
`bg-[var(--token)]` เท่านั้น · ถ้าจะยืนยันว่า utility ถูกสร้าง ให้ grep `dist/assets/*.css`
หลัง build ไม่ใช่ดูจากการมีบรรทัดใน `@theme inline`

**2. `color-mix(in oklch)` ลากมุม hue เมื่ออีกสีระบุ hue = 0**

`color-mix(in oklch, var(--status-approved) 14%, var(--card))` ให้พื้นสีชมพู ไม่ใช่เขียวจาง
เพราะ oklch interpolate "มุม hue" และ `--card` คือ `oklch(1 0 0)` ที่ระบุ hue = 0 (ไม่ใช่
`none`) — 14% ของ h=155 ผสมกับ 86% ของ h=0 จึงได้ h≈21 ซึ่งเป็นชมพู
**บทเรียน:** ผสม tint ให้ใช้ `in oklab` — perceptual space เดียวกันแต่เป็นแกน a/b
ไม่มีมุม hue ให้ลาก · หรือประกาศสีกลางเป็น `oklch(1 0 none)` ถ้าจำเป็นต้องใช้ oklch
