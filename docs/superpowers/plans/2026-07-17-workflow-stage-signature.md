# Show Signature In Report (per workflow stage) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ให้ admin ติ๊กเลือกได้ว่า workflow stage ไหนควรมีช่องเซ็นในรายงาน แล้วรายงานแสดงชื่อผู้ที่ทำ action จริงในช่องนั้น

**Architecture:** เพิ่ม flag `is_show_signature` ต่อ stage เก็บใน `tb_workflow.data.stages[]` (JSONB — ไม่ต้อง migrate schema) ฝั่ง backend เพิ่ม pure function `resolveSignatureNames(stages, history)` ที่จับคู่ stage กับ `workflow_history` เพื่อหาชื่อผู้ทำ action แล้วส่งเข้า `renderViaMicroReport` เป็น `signatureNames` แทนการอ่าน `tb_report_template.signature_config` (`renderViaMicroReport` เข้าไม่ถึง tenant DB จึงไม่โหลด workflow เอง — `loadSignatureNames` รับ tenant client เป็น param แล้ว PR/PO/SR เรียกใช้ร่วมกัน)

**Tech Stack:** FE — React 19, react-hook-form, zod, use-intl, Vitest + Testing Library, bun · BE — NestJS, Prisma (tenant + platform clients), Jest

## Global Constraints

- ชื่อ field ใช้ `is_show_signature` (prefix `is_` ตาม convention: `is_active`, `is_hod`, `is_notification`)
- ค่า default ทุกที่คือ `false` — `undefined` ต้องถือเป็น `false` เสมอ
- ช่องเซ็นในรายงานมีสูงสุด **5 ช่อง** (`Sig1Name`…`Sig5Name`)
- FE บล็อกไม่ให้ติ๊กเกิน 5 — checkbox ของ stage ที่ยังไม่ติ๊กต้อง `disabled` พร้อมข้อความอธิบาย
- `tb_report_template.signature_config` ต้องไม่ถูกอ่านจาก code path ใดอีก — **แต่ไม่ drop คอลัมน์**
- FE repo: `/Users/samutpra/GitHub/carmensoftware-organize/carmen-inventory-frontend-react`
- BE repo: `/Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2`
- FE branch ที่ใช้อยู่: `feat/workflow-stage-signature` (spec commit `6502afe` อยู่บน branch นี้แล้ว)

---

## File Structure

**FE (`carmen-inventory-frontend-react`)**

| ไฟล์ | ความรับผิดชอบ |
|---|---|
| `types/workflows.ts` | เพิ่ม `is_show_signature?: boolean` ใน `interface Stage` |
| `routes/system-admin/workflow/wf-form-schema.ts` | zod field + default ใน `buildDefaultStages()` |
| `routes/system-admin/workflow/wf-signature-limit.ts` | **สร้างใหม่** — pure helper นับ stage ที่ติ๊ก + ตัดสินว่า checkbox ตัวไหน disabled |
| `routes/system-admin/workflow/wf-stage-general.tsx` | render checkbox + ใช้ helper ข้างบน |
| `routes/system-admin/workflow/wf-signature-limit.test.ts` | **สร้างใหม่** — unit test ของ helper |
| `routes/system-admin/workflow/wf-stage-general.test.tsx` | **สร้างใหม่** — component test |
| `messages/en.json`, `messages/th.json` | i18n 2 key |
| `routes/system-admin/signature-config.tsx` | **ลบ** — dead code |

แยก `wf-signature-limit.ts` ออกจาก component เพราะกฎ 5 ช่องเป็นตรรกะที่ test ได้โดยไม่ต้อง render และ `wf-stage-general.tsx` ยาว 301 บรรทัดอยู่แล้ว

**BE (`carmen-turborepo-backend-v2`)**

| ไฟล์ | ความรับผิดชอบ |
|---|---|
| `apps/micro-business/src/common/print-report.helper.ts` | เพิ่ม `resolveSignatureNames` + `loadSignatureNames` + รับ `signatureNames`; ลบการอ่าน `template.signature_config` |
| `apps/micro-business/src/common/print-report.helper.spec.ts` | test `resolveSignatureNames` + `loadSignatureNames` + แก้ test เดิมที่ผูกกับ `signature_config` |
| `apps/micro-business/src/procurement/purchase-order/purchase-order.service.ts` | เรียก `loadSignatureNames` → ส่ง `signatureNames` |
| `apps/micro-business/src/inventory/store-requisition/store-requisition.service.ts` | เหมือน PO |
| `apps/micro-business/src/procurement/purchase-request/purchase-request.service.ts` | flow ที่ inline อยู่ — เปลี่ยนมาใช้ `loadSignatureNames` |
| `packages/prisma-shared-schema-tenant/prisma/schema.prisma` | แก้ comment `workflow_history` ที่ล้าสมัย |

---

## Task 1: FE — type + schema + default

**Files:**
- Modify: `types/workflows.ts` (interface `Stage`, ~บรรทัด 103-115)
- Modify: `routes/system-admin/workflow/wf-form-schema.ts:115-118` (stage schema), `:228-262` (`buildDefaultStages`)

**Interfaces:**
- Consumes: —
- Produces: `Stage.is_show_signature?: boolean` — Task 2, 3, 4 ใช้; `wfFormSchema` stage object มี key `is_show_signature`

- [ ] **Step 1: เพิ่ม field ใน `interface Stage`**

`types/workflows.ts` — ใน `interface Stage` เพิ่มบรรทัดถัดจาก `hide_fields: HideFields;`:

```ts
export interface Stage {
  name: string;
  description?: string;
  sla: string;
  sla_unit: SlaUnit;
  role: Role;
  creator_access?: CreatorAccess;
  available_actions: AvailableActions;
  hide_fields: HideFields;
  is_show_signature?: boolean;
  assigned_users?: User[];
  is_hod?: boolean;
  sla_warning_notification?: SLAWarningNotification;
}
```

- [ ] **Step 2: เพิ่ม field ใน zod stage schema**

`routes/system-admin/workflow/wf-form-schema.ts` — ใน `wfFormSchema` ต่อจากบล็อก `hide_fields`:

```ts
        hide_fields: z.object({
          price_per_unit: z.boolean(),
          total_price: z.boolean(),
        }),
        is_show_signature: z.boolean().optional(),
```

- [ ] **Step 3: ตั้ง default `false` ใน `buildDefaultStages()`**

ในไฟล์เดียวกัน เพิ่ม `is_show_signature: false,` ต่อจาก `hide_fields` ของ **ทั้งสอง** stage:

```ts
      hide_fields: { price_per_unit: false, total_price: false },
      is_show_signature: false,
      assigned_users: [],
```

- [ ] **Step 4: ตรวจว่า type ผ่าน**

Run: `bunx tsc --noEmit`
Expected: ไม่มี error

- [ ] **Step 5: Commit**

```bash
git add types/workflows.ts routes/system-admin/workflow/wf-form-schema.ts
git commit -m "feat(workflow): add is_show_signature flag to stage type and schema"
```

---

## Task 2: FE — กฎ 5 ช่อง (pure helper)

**Files:**
- Create: `routes/system-admin/workflow/wf-signature-limit.ts`
- Test: `routes/system-admin/workflow/wf-signature-limit.test.ts`

**Interfaces:**
- Consumes: `Stage.is_show_signature?: boolean` (Task 1)
- Produces:
  - `MAX_SIGNATURES = 5`
  - `countSignatureStages(stages: SignatureStageLike[]): number`
  - `isSignatureCheckboxDisabled(stages: SignatureStageLike[], index: number): boolean`
  - `type SignatureStageLike = { is_show_signature?: boolean }`

- [ ] **Step 1: เขียน test ที่ยังไม่ผ่าน**

สร้าง `routes/system-admin/workflow/wf-signature-limit.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  MAX_SIGNATURES,
  countSignatureStages,
  isSignatureCheckboxDisabled,
} from "./wf-signature-limit";

const stages = (...flags: (boolean | undefined)[]) =>
  flags.map((is_show_signature) => ({ is_show_signature }));

describe("countSignatureStages", () => {
  it("นับเฉพาะ stage ที่ติ๊ก", () => {
    expect(countSignatureStages(stages(true, false, true))).toBe(2);
  });

  it("ถือ undefined เป็นไม่ติ๊ก", () => {
    expect(countSignatureStages(stages(undefined, undefined))).toBe(0);
  });

  it("คืน 0 เมื่อไม่มี stage", () => {
    expect(countSignatureStages([])).toBe(0);
  });
});

describe("isSignatureCheckboxDisabled", () => {
  it("ยังไม่ครบ 5 — ติ๊กเพิ่มได้", () => {
    expect(isSignatureCheckboxDisabled(stages(true, false), 1)).toBe(false);
  });

  it("ครบ 5 แล้ว — stage ที่ยังไม่ติ๊กถูก disable", () => {
    const s = stages(true, true, true, true, true, false);
    expect(isSignatureCheckboxDisabled(s, 5)).toBe(true);
  });

  it("ครบ 5 แล้ว — stage ที่ติ๊กแล้วยังปลดได้", () => {
    const s = stages(true, true, true, true, true, false);
    expect(isSignatureCheckboxDisabled(s, 0)).toBe(false);
  });

  it("index เกินขอบเขต — ไม่ throw และไม่ disable", () => {
    expect(isSignatureCheckboxDisabled(stages(true), 9)).toBe(false);
  });

  it("MAX_SIGNATURES เท่ากับ 5", () => {
    expect(MAX_SIGNATURES).toBe(5);
  });
});
```

- [ ] **Step 2: รัน test ให้เห็นว่า fail**

Run: `bun test:run routes/system-admin/workflow/wf-signature-limit.test.ts`
Expected: FAIL — `Failed to resolve import "./wf-signature-limit"`

- [ ] **Step 3: เขียน implementation ขั้นต่ำ**

สร้าง `routes/system-admin/workflow/wf-signature-limit.ts`:

```ts
/** จำนวนช่องเซ็นสูงสุดในรายงาน — FastReport template มี Sig1Name…Sig5Name เท่านั้น */
export const MAX_SIGNATURES = 5;

export type SignatureStageLike = { is_show_signature?: boolean };

export function countSignatureStages(stages: SignatureStageLike[]): number {
  return stages.filter((s) => s.is_show_signature === true).length;
}

/** stage ที่ติ๊กแล้วปลดได้เสมอ; ที่ยังไม่ติ๊กจะ disable เมื่อครบโควตาแล้ว */
export function isSignatureCheckboxDisabled(
  stages: SignatureStageLike[],
  index: number,
): boolean {
  if (stages[index]?.is_show_signature === true) return false;
  return countSignatureStages(stages) >= MAX_SIGNATURES;
}
```

- [ ] **Step 4: รัน test ให้ผ่าน**

Run: `bun test:run routes/system-admin/workflow/wf-signature-limit.test.ts`
Expected: PASS ทั้ง 6 tests

- [ ] **Step 5: Commit**

```bash
git add routes/system-admin/workflow/wf-signature-limit.ts routes/system-admin/workflow/wf-signature-limit.test.ts
git commit -m "feat(workflow): add signature limit helper with 5-slot rule"
```

---

## Task 3: FE — i18n keys

**Files:**
- Modify: `messages/en.json` (ใต้ `systemAdmin.workflow`)
- Modify: `messages/th.json` (ใต้ `systemAdmin.workflow`)

**Interfaces:**
- Consumes: —
- Produces: key `systemAdmin.workflow.showSignatureInReport`, `systemAdmin.workflow.signatureLimitReached` — Task 4 ใช้

- [ ] **Step 1: เพิ่ม key ใน en.json**

`messages/en.json` — ใน object `systemAdmin.workflow` วางถัดจาก `"hideFields"`:

```json
    "showSignatureInReport": "Show signature in report",
    "signatureLimitReached": "Maximum 5 signatures per report",
```

- [ ] **Step 2: เพิ่ม key ใน th.json**

`messages/th.json` — ใน object `systemAdmin.workflow` ตำแหน่งเดียวกัน:

```json
    "showSignatureInReport": "แสดงช่องเซ็นในรายงาน",
    "signatureLimitReached": "ช่องเซ็นในรายงานได้สูงสุด 5 ช่อง",
```

- [ ] **Step 3: ตรวจว่า JSON ถูกต้องและ key ครบทั้งสองภาษา**

Run:
```bash
python3 -c "
import json
for f in ['messages/en.json','messages/th.json']:
    w = json.load(open(f))['systemAdmin']['workflow']
    print(f, w['showSignatureInReport'], '|', w['signatureLimitReached'])
"
```
Expected: พิมพ์ค่าครบทั้งสองไฟล์ ไม่มี KeyError / JSONDecodeError

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/th.json
git commit -m "feat(workflow): add i18n for show-signature-in-report checkbox"
```

---

## Task 4: FE — checkbox ใน stage general

**Files:**
- Modify: `routes/system-admin/workflow/wf-stage-general.tsx:176-298` (บล็อก grid ของ Available Actions / Hide Fields)
- Test: `routes/system-admin/workflow/wf-stage-general.test.tsx` (สร้างใหม่)

**Interfaces:**
- Consumes: `isSignatureCheckboxDisabled`, `SignatureStageLike` (Task 2); i18n keys (Task 3); `Stage.is_show_signature` (Task 1)
- Produces: checkbox ที่ผูกกับ `data.stages.${index}.is_show_signature`

- [ ] **Step 1: เขียน test ที่ยังไม่ผ่าน**

สร้าง `routes/system-admin/workflow/wf-stage-general.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { IntlProvider } from "use-intl";
import en from "@/messages/en.json";
import { WfStageGeneral } from "./wf-stage-general";
import type { WorkflowCreateModel } from "./wf-form-schema";
import { DEFAULT_WORKFLOW_DATA, buildDefaultStages } from "./wf-form-schema";

function makeStage(is_show_signature: boolean, name: string) {
  return { ...buildDefaultStages()[1], name, is_show_signature };
}

/** render WfStageGeneral ของ stage หนึ่งตัว โดยมี stages ทั้งชุดอยู่ใน form state */
function Harness({
  stages,
  index,
}: {
  stages: ReturnType<typeof makeStage>[];
  index: number;
}) {
  const form = useForm<WorkflowCreateModel>({
    defaultValues: {
      name: "wf",
      workflow_type: "purchase_request_workflow",
      is_active: true,
      description: "",
      data: { ...DEFAULT_WORKFLOW_DATA, stages },
    } as WorkflowCreateModel,
  });
  return (
    <WfStageGeneral form={form} index={index} isFirst={false} isDisabled={false} />
  );
}

function renderStage(stages: ReturnType<typeof makeStage>[], index: number) {
  render(
    <IntlProvider locale="en" messages={en}>
      <Harness stages={stages} index={index} />
    </IntlProvider>,
  );
}

const label = en.systemAdmin.workflow.showSignatureInReport;

describe("WfStageGeneral — show signature in report", () => {
  it("ติ๊ก checkbox แล้วสถานะเปลี่ยนเป็น checked", async () => {
    const user = userEvent.setup();
    renderStage([makeStage(false, "A")], 0);

    const cb = screen.getByRole("checkbox", { name: label });
    expect(cb).not.toBeChecked();

    await user.click(cb);
    expect(cb).toBeChecked();
  });

  it("ครบ 5 แล้ว stage ที่ยังไม่ติ๊กถูก disable และขึ้นข้อความอธิบาย", () => {
    const stages = [
      makeStage(true, "A"),
      makeStage(true, "B"),
      makeStage(true, "C"),
      makeStage(true, "D"),
      makeStage(true, "E"),
      makeStage(false, "F"),
    ];
    renderStage(stages, 5);

    expect(screen.getByRole("checkbox", { name: label })).toBeDisabled();
    expect(
      screen.getByText(en.systemAdmin.workflow.signatureLimitReached),
    ).toBeInTheDocument();
  });

  it("ครบ 5 แล้ว stage ที่ติ๊กไว้แล้วยังปลดได้", async () => {
    const user = userEvent.setup();
    const stages = [
      makeStage(true, "A"),
      makeStage(true, "B"),
      makeStage(true, "C"),
      makeStage(true, "D"),
      makeStage(true, "E"),
    ];
    renderStage(stages, 0);

    const cb = screen.getByRole("checkbox", { name: label });
    expect(cb).toBeEnabled();

    await user.click(cb);
    expect(cb).not.toBeChecked();
  });
});
```

- [ ] **Step 2: รัน test ให้เห็นว่า fail**

Run: `bun test:run routes/system-admin/workflow/wf-stage-general.test.tsx`
Expected: FAIL — หา checkbox ชื่อ "Show signature in report" ไม่เจอ

- [ ] **Step 3: เพิ่ม import ใน `wf-stage-general.tsx`**

ต่อจาก `import type { WorkflowCreateModel } from "./wf-form-schema";`:

```tsx
import {
  isSignatureCheckboxDisabled,
  type SignatureStageLike,
} from "./wf-signature-limit";
```

- [ ] **Step 4: อ่าน stages จาก form state เพื่อคำนวณ disabled**

ในตัว component ต่อจาก `const prefix = ...`:

```tsx
  const watchedStages = form.watch("data.stages") as
    | SignatureStageLike[]
    | undefined;
  const signatureDisabled = isSignatureCheckboxDisabled(
    watchedStages ?? [],
    index,
  );
```

- [ ] **Step 5: เปลี่ยน grid เป็น 3 คอลัมน์แล้วเพิ่มบล็อก checkbox**

เปลี่ยน `className` ของ grid ที่ครอบ Available Actions / Hide Fields:

```tsx
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_1fr] sm:gap-4">
```

จากนั้นเพิ่มบล็อกที่สาม **ต่อท้าย** `<div>` ของ Hide Fields (ก่อน `</div>` ปิด grid):

```tsx
        <div>
          <FieldLabel className="mb-1.5">
            {t("showSignatureInReport")}
          </FieldLabel>
          <Field orientation="horizontal">
            <Controller
              control={form.control}
              name={`data.stages.${index}.is_show_signature`}
              render={({ field }) => (
                <Checkbox
                  aria-label={t("showSignatureInReport")}
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                  disabled={isDisabled || signatureDisabled}
                />
              )}
            />
          </Field>
          {signatureDisabled && (
            <p className="text-muted-foreground mt-1 text-[0.625rem]">
              {t("signatureLimitReached")}
            </p>
          )}
        </div>
```

`checked={field.value ?? false}` สำคัญ — workflow เดิมมีค่า `undefined` ซึ่งจะทำให้ Checkbox กลายเป็น uncontrolled

- [ ] **Step 6: รัน test ให้ผ่าน**

Run: `bun test:run routes/system-admin/workflow/wf-stage-general.test.tsx`
Expected: PASS ทั้ง 3 tests

- [ ] **Step 7: ตรวจ type + lint**

Run: `bunx tsc --noEmit && bun run lint`
Expected: ไม่มี error

- [ ] **Step 8: Commit**

```bash
git add routes/system-admin/workflow/wf-stage-general.tsx routes/system-admin/workflow/wf-stage-general.test.tsx
git commit -m "feat(workflow): add show-signature-in-report checkbox to stage form"
```

---

## Task 5: FE — ลบ dead code `signature-config.tsx`

**Files:**
- Delete: `routes/system-admin/signature-config.tsx`

**Interfaces:**
- Consumes: —
- Produces: —

- [ ] **Step 1: ยืนยันอีกครั้งว่าไม่มีใคร import**

Run:
```bash
grep -rn "signature-config\|SignatureConfig" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | grep -v "docs/"
```
Expected: เจอเฉพาะบรรทัดที่อยู่ในตัว `routes/system-admin/signature-config.tsx` เอง (นิยาม + console.error) — ถ้าเจอไฟล์อื่น **หยุดและรายงาน** อย่าลบ

- [ ] **Step 2: ลบไฟล์**

```bash
git rm routes/system-admin/signature-config.tsx
```

- [ ] **Step 3: ตรวจว่า `useSignatureCandidates` ยังมีผู้ใช้อื่นหรือไม่**

Run:
```bash
grep -rn "useSignatureCandidates\|SignatureCandidate" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules
```
ถ้าไม่เหลือผู้ใช้เลย → ลบ `useSignatureCandidates` + type `SignatureCandidate` + endpoint `APP_CONFIG_SIGNATURE_CANDIDATES` (`constant/api-endpoints.ts:38-39`) ออกจาก `hooks/use-app-config.ts`
ถ้ายังมีผู้ใช้ → เก็บไว้ ไม่ต้องแตะ

`hooks/use-profile.ts` + `PROFILE_SIGNATURE` เป็นลายเซ็นของ user profile คนละเรื่อง — **ห้ามลบ**

- [ ] **Step 4: ตรวจ build + test ทั้งชุด**

Run: `bunx tsc --noEmit && bun test:run && bun run lint`
Expected: ผ่านทั้งหมด ไม่มี test ไหนพังจากการลบ

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(workflow): remove unused signature-config page

Never imported or routed; wrote to app-config keys no backend reads.
Workflow stages are now the source of truth for report signatures."
```

---

## Task 6: BE — `resolveSignatureNames` (pure function)

**Files:**
- Modify: `apps/micro-business/src/common/print-report.helper.ts`
- Test: `apps/micro-business/src/common/print-report.helper.spec.ts`

**Interfaces:**
- Consumes: `SignatureNameMap` (มีอยู่แล้วในไฟล์)
- Produces:
  - `type SignatureStage = { name: string; is_show_signature?: boolean }`
  - `type WorkflowHistoryEntry = { action?, at?, user?: { id?, name? }, current_stage?, next_stage? }`
  - `resolveSignatureNames(stages: SignatureStage[], history: unknown): SignatureNameMap` — Task 6a, 7 ใช้

> ทำงานใน BE repo: `cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2`

- [ ] **Step 1: สร้าง branch**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
git checkout -b feat/workflow-stage-signature
```

- [ ] **Step 2: เขียน test ที่ยังไม่ผ่าน**

เพิ่มท้าย `apps/micro-business/src/common/print-report.helper.spec.ts` (และเพิ่ม `resolveSignatureNames` ใน import บรรทัดที่ 2):

```ts
import {
  formatReportDate,
  renderViaMicroReport,
  resolveSignatureNames,
} from './print-report.helper';
```

```ts
describe('resolveSignatureNames', () => {
  const stage = (name: string, is_show_signature?: boolean) => ({
    name,
    is_show_signature,
  });
  const entry = (
    current_stage: string,
    action: string,
    name: string,
    at: string,
  ) => ({ current_stage, action, at, user: { id: 'u1', name } });

  const EMPTY = {
    Sig1Name: '',
    Sig2Name: '',
    Sig3Name: '',
    Sig4Name: '',
    Sig5Name: '',
  };

  it('returns an empty map when no stage is flagged', () => {
    expect(
      resolveSignatureNames([stage('Create'), stage('HOD', false)], []),
    ).toEqual(EMPTY);
  });

  it('fills approver names for flagged stages in stage order', () => {
    const stages = [
      stage('Create', true),
      stage('HOD', true),
      stage('Finance', true),
    ];
    const history = [
      entry('Create', 'submitted', 'Ann', '2026-07-01T00:00:00Z'),
      entry('HOD', 'approved', 'Bob', '2026-07-02T00:00:00Z'),
      entry('Finance', 'approved', 'Cat', '2026-07-03T00:00:00Z'),
    ];
    expect(resolveSignatureNames(stages, history)).toEqual({
      ...EMPTY,
      Sig1Name: 'Ann',
      Sig2Name: 'Bob',
      Sig3Name: 'Cat',
    });
  });

  it('treats submitted as a signing action for the first stage', () => {
    const history = [entry('Create', 'submitted', 'Ann', '2026-07-01T00:00:00Z')];
    expect(resolveSignatureNames([stage('Create', true)], history).Sig1Name).toBe(
      'Ann',
    );
  });

  it('falls back to the stage name when the stage has no action yet', () => {
    expect(resolveSignatureNames([stage('HOD', true)], []).Sig1Name).toBe('HOD');
  });

  it('ignores the synthetic completed entry', () => {
    const history = [entry('Finance', 'completed', 'Cat', '2026-07-03T00:00:00Z')];
    expect(
      resolveSignatureNames([stage('Finance', true)], history).Sig1Name,
    ).toBe('Finance');
  });

  it('does not treat rejected or reviewed as signing actions', () => {
    const history = [
      entry('HOD', 'rejected', 'Bob', '2026-07-02T00:00:00Z'),
      entry('Finance', 'reviewed', 'Cat', '2026-07-03T00:00:00Z'),
    ];
    const result = resolveSignatureNames(
      [stage('HOD', true), stage('Finance', true)],
      history,
    );
    expect(result.Sig1Name).toBe('HOD');
    expect(result.Sig2Name).toBe('Finance');
  });

  it('caps at the first 5 flagged stages in stage order', () => {
    const stages = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((n) => stage(n, true));
    const result = resolveSignatureNames(stages, []);
    expect(result).toEqual({
      Sig1Name: 'A',
      Sig2Name: 'B',
      Sig3Name: 'C',
      Sig4Name: 'D',
      Sig5Name: 'E',
    });
  });

  it('falls back to the stage name when user.name is missing', () => {
    const history = [
      { current_stage: 'HOD', action: 'approved', at: '2026-07-02T00:00:00Z', user: { id: 'u1' } },
    ];
    expect(resolveSignatureNames([stage('HOD', true)], history).Sig1Name).toBe(
      'HOD',
    );
  });

  it('picks the latest signing entry after a send-back and re-approval', () => {
    const history = [
      entry('HOD', 'approved', 'Bob', '2026-07-02T00:00:00Z'),
      entry('HOD', 'reviewed', 'Cat', '2026-07-03T00:00:00Z'),
      entry('HOD', 'approved', 'Dan', '2026-07-04T00:00:00Z'),
    ];
    expect(resolveSignatureNames([stage('HOD', true)], history).Sig1Name).toBe(
      'Dan',
    );
  });

  it('handles a null or non-array history without throwing', () => {
    expect(resolveSignatureNames([stage('HOD', true)], null).Sig1Name).toBe('HOD');
    expect(
      resolveSignatureNames([stage('HOD', true)], 'garbage').Sig1Name,
    ).toBe('HOD');
  });

  it('handles a null or non-array stages input without throwing', () => {
    expect(resolveSignatureNames(null as never, [])).toEqual(EMPTY);
  });
});
```

- [ ] **Step 3: รัน test ให้เห็นว่า fail**

Run: `cd apps/micro-business && bunx jest src/common/print-report.helper.spec.ts -t resolveSignatureNames`
Expected: FAIL — `resolveSignatureNames is not a function`

- [ ] **Step 4: เขียน implementation**

ใน `apps/micro-business/src/common/print-report.helper.ts` เพิ่มต่อจาก `export type SignatureNameMap = ...`:

```ts
/** stage เท่าที่ signature resolution ต้องรู้จัก — ตรงกับ tb_workflow.data.stages[] */
export type SignatureStage = {
  name: string;
  is_show_signature?: boolean;
};

/**
 * รายการใน tb_<doc>.workflow_history (ระดับ header) — เขียนโดย
 * WorkflowOrchestratorService ไม่ใช่ WorkflowPersistenceHelper.appendHistory
 * (อันนั้นเขียน detail.history ที่มี shape ต่างออกไป)
 */
export type WorkflowHistoryEntry = {
  action?: string;
  at?: string;
  user?: { id?: string; name?: string };
  current_stage?: string;
  next_stage?: string;
};

/** action ที่ถือว่าเป็นการเซ็น — `submitted` คือ action ของ stage แรกที่คนสร้างเอกสารทำ */
const SIGNING_ACTIONS = new Set(['submitted', 'approved']);

const SIG_KEYS = [
  'Sig1Name',
  'Sig2Name',
  'Sig3Name',
  'Sig4Name',
  'Sig5Name',
] as const;

const MAX_SIGNATURES = SIG_KEYS.length;

/**
 * Maps the workflow stages flagged with is_show_signature onto the report's five signature slots, resolving each to the name of whoever actually signed it
 * จับคู่ stage ที่ติ๊ก is_show_signature เข้ากับช่องเซ็นทั้ง 5 ของรายงาน โดยหาชื่อผู้ที่ทำ action จริงในแต่ละช่อง
 * @param stages - Workflow stages from tb_workflow.data.stages / stage ของ workflow จาก tb_workflow.data.stages
 * @param history - The document's workflow_history value; tolerates null / non-array / ค่า workflow_history ของเอกสาร; รับ null หรือค่าที่ไม่ใช่ array ได้
 * @returns Sig1Name–Sig5Name map; unfilled slots are empty strings / map Sig1Name–Sig5Name; ช่องที่ไม่ได้ใช้เป็นสตริงว่าง
 */
export function resolveSignatureNames(
  stages: SignatureStage[],
  history: unknown,
): SignatureNameMap {
  const result: SignatureNameMap = {
    Sig1Name: '',
    Sig2Name: '',
    Sig3Name: '',
    Sig4Name: '',
    Sig5Name: '',
  };

  const flagged = (Array.isArray(stages) ? stages : [])
    .filter((s) => s?.is_show_signature === true)
    .slice(0, MAX_SIGNATURES);
  const entries: WorkflowHistoryEntry[] = Array.isArray(history) ? history : [];

  flagged.forEach((stage, i) => {
    const signed = entries
      .filter(
        (e) =>
          e?.current_stage === stage.name &&
          SIGNING_ACTIONS.has(e?.action ?? ''),
      )
      .sort((a, b) => (a.at ?? '').localeCompare(b.at ?? ''))
      .pop();

    result[SIG_KEYS[i]] = signed?.user?.name || stage.name;
  });

  return result;
}
```

- [ ] **Step 5: รัน test ให้ผ่าน**

Run: `cd apps/micro-business && bunx jest src/common/print-report.helper.spec.ts -t resolveSignatureNames`
Expected: PASS ทั้ง 11 tests

- [ ] **Step 6: Commit**

```bash
git add apps/micro-business/src/common/print-report.helper.ts apps/micro-business/src/common/print-report.helper.spec.ts
git commit -m "feat(print): add resolveSignatureNames from workflow stages"
```

---

## Task 6a: BE — `loadSignatureNames` (โหลด workflow + resolve)

**Files:**
- Modify: `apps/micro-business/src/common/print-report.helper.ts`
- Test: `apps/micro-business/src/common/print-report.helper.spec.ts`

**Interfaces:**
- Consumes: `resolveSignatureNames`, `SignatureStage` (Task 6)
- Produces: `loadSignatureNames(prismaTenant, doc): Promise<SignatureNameMap>` — Task 8, 9 ใช้

**เหตุผล (pre-flight ruling, human):** PO/SR/PR ต้องโหลด workflow แล้ว resolve เหมือนกันเป๊ะ
ทั้ง 3 ที่ — บล็อกซ้ำ verbatim 3 รอบเป็น defect ที่ reviewer จะ flag จึงรวมเป็น helper ตัวเดียว
helper นี้**รับ tenant client เป็น param** ไม่ได้ผูกเข้ากับ `renderViaMicroReport` — ข้อจำกัดของ
Task 7 ที่ว่า `renderViaMicroReport` ต้องไม่รู้จัก tenant DB จึงยังคงอยู่

- [ ] **Step 1: เขียน test ที่ยังไม่ผ่าน**

เพิ่ม `loadSignatureNames` ใน import ของ spec แล้วเพิ่ม describe block:

```ts
describe('loadSignatureNames', () => {
  const buildTenant = (workflow: unknown) => ({
    tb_workflow: { findFirst: jest.fn().mockResolvedValue(workflow) },
  });

  const EMPTY = {
    Sig1Name: '',
    Sig2Name: '',
    Sig3Name: '',
    Sig4Name: '',
    Sig5Name: '',
  };

  it('returns an empty map without querying when workflow_id is null', async () => {
    const tenant = buildTenant(null);
    const result = await loadSignatureNames(tenant as never, {
      workflow_id: null,
      workflow_history: [],
    });
    expect(result).toEqual(EMPTY);
    expect(tenant.tb_workflow.findFirst).not.toHaveBeenCalled();
  });

  it('loads the workflow and resolves names from its stages', async () => {
    const tenant = buildTenant({
      data: { stages: [{ name: 'HOD', is_show_signature: true }] },
    });
    const result = await loadSignatureNames(tenant as never, {
      workflow_id: 'wf-1',
      workflow_history: [
        {
          current_stage: 'HOD',
          action: 'approved',
          at: '2026-07-02T00:00:00Z',
          user: { id: 'u1', name: 'Bob' },
        },
      ],
    });
    expect(result.Sig1Name).toBe('Bob');
    expect(tenant.tb_workflow.findFirst).toHaveBeenCalledWith({
      where: { id: 'wf-1', deleted_at: null },
      select: { data: true },
    });
  });

  it('returns an empty map when the workflow row is missing', async () => {
    const tenant = buildTenant(null);
    const result = await loadSignatureNames(tenant as never, {
      workflow_id: 'gone',
      workflow_history: [],
    });
    expect(result).toEqual(EMPTY);
  });

  it('tolerates a workflow whose data has no stages array', async () => {
    const tenant = buildTenant({ data: {} });
    const result = await loadSignatureNames(tenant as never, {
      workflow_id: 'wf-1',
      workflow_history: [],
    });
    expect(result).toEqual(EMPTY);
  });

  it('tolerates a non-array workflow_history (SR defaults to {})', async () => {
    const tenant = buildTenant({
      data: { stages: [{ name: 'Issue', is_show_signature: true }] },
    });
    const result = await loadSignatureNames(tenant as never, {
      workflow_id: 'wf-1',
      workflow_history: {},
    });
    expect(result.Sig1Name).toBe('Issue');
  });
});
```

test สุดท้ายสำคัญ: `tb_store_requisition.workflow_history` มี `@default("{}")` (object)
ต่างจาก PR/PO ที่เป็น `@default("[]")` — SR ที่ยังไม่มี action ส่ง object เข้ามาจริง

- [ ] **Step 2: รัน test ให้เห็นว่า fail**

Run: `cd apps/micro-business && bunx jest src/common/print-report.helper.spec.ts -t loadSignatureNames`
Expected: FAIL — `loadSignatureNames is not a function`

- [ ] **Step 3: เขียน implementation**

ใน `print-report.helper.ts` เพิ่มต่อจาก `resolveSignatureNames`:

```ts
/** tenant client ตัดเหลือเฉพาะส่วนที่ loadSignatureNames ใช้ — เลี่ยงการผูกกับ PrismaClient_TENANT ทั้งก้อน */
export type WorkflowReader = {
  tb_workflow: {
    findFirst: (args: {
      where: { id: string; deleted_at: null };
      select: { data: true };
    }) => Promise<{ data: unknown } | null>;
  };
};

/** เอกสารเท่าที่ signature resolution ต้องรู้จัก — PR/PO/SR มีสองคอลัมน์นี้เหมือนกัน */
export type SignatureDocument = {
  workflow_id: string | null;
  workflow_history: unknown;
};

/**
 * Loads the document's workflow from the tenant DB and resolves its report signature slots
 * โหลด workflow ของเอกสารจาก tenant DB แล้ว resolve ช่องเซ็นของรายงาน
 * @param prismaTenant - Tenant prisma client (passed in — this helper is not wired into renderViaMicroReport) / tenant prisma client (รับเข้ามา — helper นี้ไม่ได้ผูกกับ renderViaMicroReport)
 * @param doc - The document's workflow_id and workflow_history / workflow_id และ workflow_history ของเอกสาร
 * @returns Sig1Name–Sig5Name map; empty when the document has no workflow / map Sig1Name–Sig5Name; ว่างเมื่อเอกสารไม่มี workflow
 */
export async function loadSignatureNames(
  prismaTenant: WorkflowReader,
  doc: SignatureDocument,
): Promise<SignatureNameMap> {
  if (!doc.workflow_id) {
    return resolveSignatureNames([], doc.workflow_history);
  }

  const workflow = await prismaTenant.tb_workflow.findFirst({
    where: { id: doc.workflow_id, deleted_at: null },
    select: { data: true },
  });
  const stages =
    (workflow?.data as { stages?: SignatureStage[] } | null)?.stages ?? [];

  return resolveSignatureNames(stages, doc.workflow_history);
}
```

- [ ] **Step 4: รัน test ให้ผ่าน**

Run: `cd apps/micro-business && bunx jest src/common/print-report.helper.spec.ts`
Expected: PASS ทุก test (resolveSignatureNames 11 + loadSignatureNames 5 + ของเดิม)

- [ ] **Step 5: Commit**

```bash
git add apps/micro-business/src/common/print-report.helper.ts apps/micro-business/src/common/print-report.helper.spec.ts
git commit -m "feat(print): add loadSignatureNames to share workflow lookup across PR/PO/SR"
```

---

## Task 7: BE — helper รับ `signatureNames` แทนอ่าน `signature_config`

**Files:**
- Modify: `apps/micro-business/src/common/print-report.helper.ts:26-40` (`RenderViaMicroReportInput`), `:84-108` (template select + sig resolution)
- Test: `apps/micro-business/src/common/print-report.helper.spec.ts:61-115` (แก้ test เดิม)

**Interfaces:**
- Consumes: `SignatureNameMap` (Task 6)
- Produces: `RenderViaMicroReportInput.signatureNames?: SignatureNameMap` — Task 8, 9 ใช้

- [ ] **Step 1: แก้ test เดิมที่ผูกกับ `signature_config`**

ใน `print-report.helper.spec.ts` **แทนที่** test `'resolves signature labels, posts the payload, and returns the viewer url'` (บรรทัด ~61-100) ด้วย:

```ts
  it('passes the caller-supplied signature names through to the payload', async () => {
    const prisma = buildPrisma(
      { report_template_id: 'tpl-1' },
      { id: 'tpl-1', name: 'PO Report' },
    );
    const input = {
      ...baseInput(prisma),
      signatureNames: {
        Sig1Name: 'Ann',
        Sig2Name: '',
        Sig3Name: '',
        Sig4Name: '',
        Sig5Name: '',
      },
    };
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'http://viewer/123' }),
    });
    global.fetch = fetchMock as never;

    const result = await renderViaMicroReport(input);

    expect(result.isOk()).toBe(true);
    expect(result.value).toEqual({ viewer_url: 'http://viewer/123' });

    const sigArg = input.buildHeader.mock.calls[0][0];
    expect(sigArg.Sig1Name).toBe('Ann');
    expect(sigArg.Sig2Name).toBe('');

    const [, fetchOpts] = fetchMock.mock.calls[0];
    const payload = JSON.parse(fetchOpts.body);
    expect(payload.template_name).toBe('PO Report');
    expect(payload.data.POHeader).toHaveLength(1);
    expect(payload.data.POHeader[0]).toMatchObject({
      doc_no: 'PO-1',
      Sig1Name: 'Ann',
    });
    expect(payload.data.PODetail).toEqual([{ line: 1 }]);
  });

  it('leaves every signature slot empty when signatureNames is omitted', async () => {
    const prisma = buildPrisma(
      { report_template_id: 'tpl-1' },
      { id: 'tpl-1', name: 'PO Report' },
    );
    const input = baseInput(prisma);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'http://viewer/x' }),
    }) as never;

    const result = await renderViaMicroReport(input);

    expect(result.isOk()).toBe(true);
    const sigArg = input.buildHeader.mock.calls[0][0];
    expect(sigArg).toEqual({
      Sig1Name: '',
      Sig2Name: '',
      Sig3Name: '',
      Sig4Name: '',
      Sig5Name: '',
    });
  });
```

จากนั้น **ลบ** test `'handles a null signature_config without throwing'` (ไม่มีความหมายอีกแล้ว) และลบ key `signature_config` ออกจาก template object ของ test ที่เหลือทุกตัว (บรรทัด ~119, ~135, ~150) — เปลี่ยน `{ id: 'tpl-1', name: 'PO Report', signature_config: { blocks: [] } }` เป็น `{ id: 'tpl-1', name: 'PO Report' }`

- [ ] **Step 2: รัน test ให้เห็นว่า fail**

Run: `cd apps/micro-business && bunx jest src/common/print-report.helper.spec.ts -t renderViaMicroReport`
Expected: FAIL — `signatureNames` ไม่ถูกส่งต่อ, `sigArg.Sig1Name` เป็น `''` แทน `'Ann'`

- [ ] **Step 3: เพิ่ม `signatureNames` ใน input interface**

ใน `print-report.helper.ts` เพิ่มใน `RenderViaMicroReportInput` ต่อจาก `buildDetail`:

```ts
  /** Build the detail rows. Caller is responsible for ordering. */
  buildDetail: () => Record<string, unknown>[];
  /**
   * Signature slot values resolved by the caller via resolveSignatureNames().
   * Callers whose document type has no workflow omit this — every slot stays empty.
   */
  signatureNames?: SignatureNameMap;
}
```

- [ ] **Step 4: ลบการอ่าน `signature_config` แล้วใช้ input แทน**

ใน `renderViaMicroReport`:

destructure `signatureNames` เพิ่ม:

```ts
  const {
    prismaSystem,
    bu_code,
    documentType,
    datasetPrefix,
    buildHeader,
    buildDetail,
    signatureNames,
  } = input;
```

เอา `signature_config` ออกจาก select ของ template:

```ts
  const template = await prismaSystem.tb_report_template.findFirst({
    where: { id: mapping.report_template_id, deleted_at: null },
    select: { id: true, name: true },
  });
```

แทนที่บล็อก `// 2. Resolve signature labels from template metadata` ทั้งบล็อก (ตั้งแต่ `const sigCfg = ...` ถึงจบ `for` loop) ด้วย:

```ts
  // 2. Signature slots come from the caller (resolved from workflow stages)
  const sigNames: SignatureNameMap = signatureNames ?? {
    Sig1Name: '',
    Sig2Name: '',
    Sig3Name: '',
    Sig4Name: '',
    Sig5Name: '',
  };
```

สุดท้ายลบ `type SignatureBlock = { key: string; label: string; required?: boolean };` (บรรทัด 19) ที่ไม่มีใครใช้แล้ว

- [ ] **Step 5: รัน test ทั้งไฟล์ให้ผ่าน**

Run: `cd apps/micro-business && bunx jest src/common/print-report.helper.spec.ts`
Expected: PASS ทุก test

- [ ] **Step 6: Commit**

```bash
git add apps/micro-business/src/common/print-report.helper.ts apps/micro-business/src/common/print-report.helper.spec.ts
git commit -m "refactor(print): take signature names from caller, drop template.signature_config

renderViaMicroReport only has the platform prisma client, but tb_workflow
lives in the tenant DB — callers resolve signatures and pass them in."
```

---

## Task 8: BE — ต่อ PO และ SR

**Files:**
- Modify: `apps/micro-business/src/procurement/purchase-order/purchase-order.service.ts:5630-5651` (`printToReport`)
- Modify: `apps/micro-business/src/inventory/store-requisition/store-requisition.service.ts:2232-2255` (`printToReport`)

**Interfaces:**
- Consumes: `loadSignatureNames` (Task 6a), `RenderViaMicroReportInput.signatureNames` (Task 7)
- Produces: —

- [ ] **Step 1: เพิ่ม import ใน PO service**

`purchase-order.service.ts` — แก้ import block บรรทัด 47-50:

```ts
import {
  renderViaMicroReport,
  formatReportDate,
  loadSignatureNames,
} from '@/common/print-report.helper';
```

- [ ] **Step 2: เรียก `loadSignatureNames` ใน PO**

ใน `printToReport` ของ PO — หลังบล็อก `if (!po) { ... }` และก่อน `return renderViaMicroReport({`:

```ts
    const signatureNames = await loadSignatureNames(this.prismaService, po);
```

แล้วเพิ่ม `signatureNames,` ใน object ที่ส่งเข้า `renderViaMicroReport`:

```ts
    return renderViaMicroReport({
      prismaSystem: this.prismaSystem,
      bu_code: this.bu_code,
      documentType: 'PO',
      datasetPrefix: 'PO',
      signatureNames,
      buildHeader: () => ({
```

- [ ] **Step 3: ทำแบบเดียวกันกับ SR**

`store-requisition.service.ts` — แก้ import block บรรทัด 51-54 ให้มี `loadSignatureNames` เหมือน PO จากนั้นใน `printToReport` หลัง `if (!sr) { ... }`:

```ts
    const signatureNames = await loadSignatureNames(this.prismaService, sr);
```

แล้วเพิ่ม `signatureNames,` ใน object ที่ส่งเข้า `renderViaMicroReport` (ถัดจาก `datasetPrefix: 'SR',`)

- [ ] **Step 4: ตรวจว่า compile ผ่านและ test เดิมไม่พัง**

Run: `cd apps/micro-business && bunx tsc --noEmit && bunx jest src/procurement/purchase-order src/inventory/store-requisition`
Expected: ไม่มี type error, test ที่มีอยู่ผ่านทั้งหมด

- [ ] **Step 5: Commit**

```bash
git add apps/micro-business/src/procurement/purchase-order/purchase-order.service.ts apps/micro-business/src/inventory/store-requisition/store-requisition.service.ts
git commit -m "feat(print): resolve PO and SR report signatures from workflow stages"
```

---

## Task 9: BE — ต่อ PR (flow ที่ inline อยู่)

**Files:**
- Modify: `apps/micro-business/src/procurement/purchase-request/purchase-request.service.ts:3150-3180`

**Interfaces:**
- Consumes: `loadSignatureNames` (Task 6a)
- Produces: —

PR ไม่ได้ใช้ `renderViaMicroReport` — มี flow เดียวกันเขียน inline อยู่ (ตามคอมเมนต์บรรทัด 8-9 ของ `print-report.helper.ts`) จึงต้องแก้แยก

- [ ] **Step 1: เพิ่ม import**

`purchase-request.service.ts` — เพิ่มใน import ของ `@/common/print-report.helper` (ถ้ายังไม่มี import block นี้ ให้สร้างใหม่ใกล้ ๆ import อื่น):

```ts
import { loadSignatureNames } from '@/common/print-report.helper';
```

- [ ] **Step 2: เอา `signature_config` ออกจาก template select**

บรรทัด ~3164-3167 เปลี่ยนเป็น:

```ts
    const template = await this.prismaSystem.tb_report_template.findFirst({
      where: { id: mapping.report_template_id, deleted_at: null },
      select: { id: true, name: true },
    });
```

- [ ] **Step 3: แทนบล็อก signature ด้วย `resolveSignatureNames`**

แทนที่บล็อก `// 3. Pull signature labels straight from the template metadata.` ทั้งบล็อก (ตั้งแต่ `type SignatureBlock = ...` ถึงจบ `for` loop, บรรทัด ~3172-3180) ด้วย:

```ts
    // 3. Signature slots come from the workflow stages flagged is_show_signature.
    const sigNames = await loadSignatureNames(this.prismaService, pr);
```

ตัวแปรยังชื่อ `sigNames` เหมือนเดิม — `...sigNames` ใน `headerData` (บรรทัด ~3197) จึงไม่ต้องแก้

- [ ] **Step 4: แก้ comment ที่ล้าสมัยบรรทัด 3150-3152**

```ts
    // 2. Resolve template via tb_print_template_mapping (document_type='PR'),
    //    scoped to the caller's BU. Signature slots come from the workflow
    //    stages, not from the template — see resolveSignatureNames().
```

- [ ] **Step 5: ตรวจว่า compile ผ่านและ test เดิมไม่พัง**

Run: `cd apps/micro-business && bunx tsc --noEmit && bunx jest src/procurement/purchase-request`
Expected: ไม่มี type error, test ที่มีอยู่ผ่านทั้งหมด

- [ ] **Step 6: Commit**

```bash
git add apps/micro-business/src/procurement/purchase-request/purchase-request.service.ts
git commit -m "feat(print): resolve PR report signatures from workflow stages"
```

---

## Task 10: BE — แก้ comment `workflow_history` ที่ล้าสมัยใน schema

**Files:**
- Modify: `packages/prisma-shared-schema-tenant/prisma/schema.prisma` (ทุกจุดที่มี comment ของ `workflow_history` — บรรทัด ~365, ~844, ~2018, ~2344)

**Interfaces:**
- Consumes: —
- Produces: —

comment ปัจจุบันระบุ shape เป็น `{"stage", "action", "meassage", "by": {id, name}, "at"}` ซึ่งไม่ตรงกับที่ `WorkflowOrchestratorService` เขียนจริง — ทำให้คนอ่านเข้าใจผิด (spec นี้เกือบพลาดเพราะ comment นี้)

- [ ] **Step 1: หาทุกจุดที่ต้องแก้**

Run:
```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
grep -n "meassage" packages/prisma-shared-schema-tenant/prisma/schema.prisma
```
Expected: เจอรายการบรรทัดของ comment `workflow_history` ทุกจุด

- [ ] **Step 2: แทนที่ comment ทุกจุดด้วย shape จริง**

แต่ละจุด แทน comment เดิมด้วย:

```prisma
  /// [{"action": "submitted", "at": "2026-07-17T10:00:00Z", "user": {"id": "...", "name": "User A"}, "current_stage": "Create Request", "next_stage": "Department Head"}]
  /// action: submitted | approved | reviewed | rejected | completed ("completed" is pushed by WorkflowOrchestratorService on final approval and is not in enum_last_action)
```

- [ ] **Step 3: ตรวจว่า schema ยัง valid**

Run: `cd packages/prisma-shared-schema-tenant && bunx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 4: Commit**

```bash
git add packages/prisma-shared-schema-tenant/prisma/schema.prisma
git commit -m "docs(schema): correct the workflow_history shape comment

The comment described {stage, by, meassage} but WorkflowOrchestratorService
writes {current_stage, user, action} — the stale comment nearly caused a
signature-resolution bug."
```

---

## Task 11: Verification เต็มระบบ

**Files:** —

**Interfaces:**
- Consumes: ทุก task ก่อนหน้า
- Produces: —

- [ ] **Step 1: FE — test + type + lint ทั้งชุด**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-inventory-frontend-react
bunx tsc --noEmit && bun test:run && bun run lint
```
Expected: ผ่านทั้งหมด

- [ ] **Step 2: BE — test + type ทั้งชุด**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2/apps/micro-business
bunx tsc --noEmit && bunx jest
```
Expected: ผ่านทั้งหมด

- [ ] **Step 3: ยืนยันว่าไม่มี code path ไหนอ่าน `template.signature_config` อีก**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
grep -rn "signature_config" apps/ --include="*.ts" | grep -v spec
```
Expected: **ไม่มีผลลัพธ์** (seed + schema ยังมีได้ — คอลัมน์ไม่ได้ถูก drop)

- [ ] **Step 4: Smoke test กับ backend จริง**

รัน backend ที่ `localhost:4000` และ FE ด้วย `VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev`

1. เปิด `/system-admin/workflow/<id>` → ติ๊ก "Show signature in report" ที่ stage ที่มีคนอนุมัติแล้ว → Save
2. เปิด PR ที่ใช้ workflow นั้นและผ่าน stage ดังกล่าวมาแล้ว → กด Print
3. ตรวจว่าช่องเซ็นแสดง **ชื่อผู้อนุมัติจริง** ไม่ใช่ชื่อ stage
4. เปิด PR ที่ยัง draft → Print → ช่องเซ็นแสดง **ชื่อ stage** (fallback)
5. ติ๊กครบ 5 stage → checkbox ที่เหลือ disable + ขึ้นข้อความ "Maximum 5 signatures per report"

Expected: ครบทั้ง 5 ข้อ, console ไม่มี error

- [ ] **Step 5: เปิด PR ทั้งสอง repo**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
git push -u origin feat/workflow-stage-signature

cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-inventory-frontend-react
git push -u origin feat/workflow-stage-signature
```

PR description ต้องระบุ **breaking change** ให้ชัด: workflow ที่มีอยู่เดิมทุกตัวจะไม่มีช่องเซ็นในรายงานจนกว่า admin จะเข้าไปติ๊ก และเอกสาร 7 ประเภทที่ไม่มี workflow (GRN, CN, IA, PC, SC, RFQ, INV) จะไม่มีช่องเซ็น — ทั้งสอง PR ต้อง merge + deploy พร้อมกัน

---

## Deployment Notes

- **ลำดับ deploy:** BE ก่อน FE ได้ (BE ที่ยังไม่มี FE = ทุก workflow มี `is_show_signature` undefined → ช่องเซ็นว่าง ไม่ crash) แต่ระหว่างนั้นรายงานจะไม่มีช่องเซ็น → ควร deploy ใกล้กัน
- **ไม่มี migration** — `is_show_signature` อยู่ใน `tb_workflow.data` (JSONB)
- **แจ้ง admin ก่อน deploy:** ต้องเข้าไปติ๊ก stage ในทุก workflow ที่ต้องการช่องเซ็น มิฉะนั้นรายงานจะไม่มีช่องเซ็น
- `tb_report_template.signature_config` ยังอยู่ใน DB เผื่อ rollback — การ drop คอลัมน์เป็นงานแยก
