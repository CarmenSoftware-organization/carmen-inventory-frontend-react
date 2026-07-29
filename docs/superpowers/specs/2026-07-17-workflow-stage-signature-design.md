# Show signature in report (per workflow stage)

**Date:** 2026-07-17
**Repos:** `carmen-inventory-frontend-react` (FE) + `carmen-turborepo-backend-v2` (BE)

## Problem

Admin ไม่สามารถเลือกได้ว่าช่องเซ็นในรายงานควรมี stage ไหนบ้าง ปัจจุบันช่องเซ็นถูก
hardcode ไว้ที่ระดับ report template (`tb_report_template.signature_config`) ซึ่งตั้งค่า
ผ่าน seed เท่านั้น ไม่มี UI ให้แก้ และไม่ผูกกับ workflow จริงของเอกสาร

## Solution

เพิ่ม checkbox **"Show signature in report"** ที่แต่ละ stage ของ workflow แล้วให้ backend
สร้างช่องเซ็นในรายงานจาก stage ที่ติ๊กไว้ พร้อมแสดงชื่อผู้ที่ทำ action จริงในเอกสารนั้น

Workflow กลายเป็น **single source of truth** ของช่องเซ็น — `tb_report_template.signature_config`
เลิกถูกอ่านทั้งหมด

## Background: ทำไมถึงย้อนกลับไปใช้ workflow

Commit `71f03fd0` ("mapping print po pr etc.", Danai Gingpho, 2026-04-30) ถอด workflow walk
ออกจาก `purchase-request.service.ts` โดยตั้งใจ และย้ายไปใช้ template-level `signature_config`
พร้อมสร้าง `tb_print_template_mapping` infrastructure

workflow walk เดิมเอา **ชื่อ stage ทุก stage ยกเว้นอันแรก** มาเป็น Sig1-5 อัตโนมัติ
(`Math.min(len, 5)`) — เลือกไม่ได้ ตัดที่ 5 ตัวแรกดื้อ ๆ และไม่แสดงชื่อคน

spec นี้กลับไปใช้ workflow แต่แก้ข้อจำกัดทั้งหมดของของเดิม: admin เลือก stage ได้เอง และ
ช่องเซ็นแสดงชื่อผู้อนุมัติจริง

## Decisions

| ประเด็น | ตัดสิน |
|---|---|
| แหล่งข้อมูลช่องเซ็น | workflow stages เท่านั้น — เลิกอ่าน `template.signature_config` |
| ค่าที่แสดงในช่องเซ็น | ชื่อผู้ที่ทำ action จริง; ยังไม่มี action → fallback เป็นชื่อ stage |
| ติ๊กเกิน 5 stage | FE บล็อก — checkbox ตัวที่เหลือ disabled |
| workflow เดิมใน DB | default `false` ทุก stage (ไม่มีช่องเซ็นจนกว่า admin จะติ๊ก) |
| เอกสารที่ไม่มี workflow | ไม่มีช่องเซ็น (เป็น placeholder template อยู่แล้ว) |

## Data model (FE)

field ใหม่บน stage เก็บใน `tb_workflow.data.stages[]` (JSONB) — ไม่ต้อง migrate schema

```ts
// types/workflows.ts — interface Stage
is_show_signature?: boolean;   // undefined = false (workflow เดิม)
```

- `wf-form-schema.ts` — เพิ่ม `is_show_signature: z.boolean().optional()` ใน stage schema
- `buildDefaultStages()` — ตั้ง `false` ทั้ง 2 stage; stage สร้างใหม่ default `false` เช่นกัน

ชื่อ field ใช้ prefix `is_` ตาม convention ของ codebase (`is_active`, `is_hod`, `is_notification`)

## Frontend UI

**ไฟล์:** `routes/system-admin/workflow/wf-stage-general.tsx`

checkbox วางเป็นกลุ่มที่สามข้าง Available Actions / Hide Fields — grid ปัจจุบัน
`sm:grid-cols-[2fr_1fr]` เปลี่ยนเป็น 3 คอลัมน์ ใช้ `Controller` + `Checkbox` แบบเดียวกับ
`hide_fields` ทุกประการ

**i18n** — เพิ่ม key ใน `messages/en.json` + `messages/th.json` ใต้ `systemAdmin.workflow`:

| key | en | th |
|---|---|---|
| `showSignatureInReport` | Show signature in report | แสดงช่องเซ็นในรายงาน |
| `signatureLimitReached` | Maximum 5 signatures per report | ช่องเซ็นในรายงานได้สูงสุด 5 ช่อง |

**กฎ 5 ช่อง:** นับ stage ที่ติ๊กจาก `form.watch("data.stages")` — ถ้าครบ 5 แล้ว checkbox ของ
stage ที่ยัง**ไม่**ติ๊กจะ `disabled` พร้อมข้อความ `signatureLimitReached` อธิบายเหตุผล
(ไม่ disabled เงียบ ๆ) stage ที่ติ๊กแล้วยังปลดได้เสมอ

## Backend: signature resolution

### Shape จริงของ `workflow_history`

`tb_purchase_request.workflow_history` (JSONB, ระดับ header) เขียนโดย
`workflow-orchestrator.service.ts` — **ไม่ใช่** `WorkflowPersistenceHelper.appendHistory`
(อันนั้นเขียน `detail.history` ระดับ detail คนละตัวกัน)

```json
{ "action": "submitted",
  "at": "2026-07-17T10:00:00Z",
  "user": { "id": "...", "name": "สมชาย ใจดี" },
  "current_stage": "Create Request",
  "next_stage": "Department Head" }
```

- ชื่อ stage อยู่ที่ **`current_stage`** ไม่ใช่ `name`
- ไม่มี field `status` และไม่มี `seq`
- `action` ค่าที่เป็นไปได้: `submitted` / `approved` / `reviewed` / `rejected` (จาก
  `enum_last_action`) บวก `completed` ที่ orchestrator push เป็น string ดิบตอน final approval
- `user.name` มาจาก `resolveUserName()` ทุก entry และมี `enrichHistoryUserNames()` เติมย้อนหลัง

> **หมายเหตุ:** comment ใน `packages/prisma-shared-schema-tenant/prisma/schema.prisma:365`
> ระบุ shape เป็น `{stage, action, meassage, by, at}` — **ล้าสมัย ไม่ตรงกับของจริง**
> ควรแก้ comment ให้ตรงในงานนี้ด้วย

### Pure function

```ts
// apps/micro-business/src/common/print-report.helper.ts
type HistoryEntry = {
  action?: string;
  at?: string;
  user?: { id?: string; name?: string };
  current_stage?: string;
  next_stage?: string;
};

const SIGNING_ACTIONS = new Set(['submitted', 'approved']);

export function resolveSignatureNames(
  stages: Array<{ name: string; is_show_signature?: boolean }>,
  history: HistoryEntry[],
): SignatureNameMap
```

ตรรกะ:

1. กรอง stage ที่ `is_show_signature === true` → เอา 5 ตัวแรกตามลำดับ stage
2. แต่ละ stage หา entry ที่ `current_stage === stage.name` และ `action ∈ SIGNING_ACTIONS`
   → เอาอันที่ `at` ใหม่สุด → ใช้ `user.name`
3. ไม่เจอ หรือ `user.name` ว่าง → fallback เป็น `stage.name`

`submitted` รวมอยู่ใน `SIGNING_ACTIONS` เพราะ stage แรก (Create Request) คนสร้างเอกสารทำ action
`submitted` ไม่ใช่ `approved` — ถ้าเอาแต่ `approved` stage แรกจะ fallback ตลอดกาล

`rejected` / `reviewed` (send-back) ไม่นับเป็นการเซ็น `completed` ก็ไม่นับ เพราะเป็น entry
สังเคราะห์ที่ orchestrator push ซ้ำด้วยชื่อคน approve คนสุดท้าย ไม่ใช่การกระทำจริงของ stage นั้น

การเลือก entry ใหม่สุดทำให้ send-back แล้วอนุมัติซ้ำได้ชื่อคนอนุมัติรอบล่าสุด ซึ่งถูกต้อง

### จุดต่อ

`tb_workflow` อยู่ **tenant DB** แต่ `renderViaMicroReport` รับแค่ `prismaSystem` (platform DB)
→ helper **ไม่โหลด workflow เอง** รับผลลัพธ์ที่ resolve มาแล้วแทน:

```ts
export interface RenderViaMicroReportInput {
  prismaSystem: PrismaSystem;         // เดิม — platform DB สำหรับ template/mapping
  // ...
  signatureNames?: SignatureNameMap;  // ใหม่; ไม่ส่ง = ช่องเซ็นว่าง
}
```

ทุก caller ที่มี workflow โหลด `tb_workflow` เองด้วย tenant client ที่ถืออยู่แล้ว โดยหาจาก
`<doc>.workflow_id` (`findFirst({ where: { id: doc.workflow_id, deleted_at: null }, select: { data: true } })`)
— `doc.workflow_id` เป็น nullable ถ้า null ให้ข้ามไป ไม่ส่ง `signatureNames`

| จุด | ทำอะไร |
|---|---|
| `print-report.helper.ts` | เพิ่ม `resolveSignatureNames` + รับ `signatureNames`; ลบบล็อกอ่าน `template.signature_config` (บรรทัด 95-108) |
| `purchase-order.service.ts` `printToReport` | โหลด `tb_workflow` ด้วย `this.prismaService` → `resolveSignatureNames(wf.data.stages, po.workflow_history)` → ส่งเข้า helper |
| `store-requisition.service.ts` | เหมือน PO |
| `purchase-request.service.ts:3172-3179` | ใช้ flow ที่ inline อยู่ — เปลี่ยนบล็อกอ่าน `template.signature_config` เป็นโหลด workflow แล้วเรียก `resolveSignatureNames` ตรง ๆ |
| GRN, CN, IA, PC, SC, RFQ, INV | ไม่ส่ง `signatureNames` → ช่องเซ็นว่าง |

helper ยังรู้จักแค่ platform DB, ตรรกะ signature เป็น pure function ที่ test ได้โดยไม่ต้อง mock
prisma, service ที่ไม่มี workflow ไม่ต้องแบกโค้ดที่ไม่ได้ใช้

`tb_report_template.signature_config` ไม่มี code path ไหนอ่านอีก — **คอลัมน์ยังอยู่ใน DB ไม่ drop**
(กันไว้เผื่อ rollback; drop เป็นงานแยกภายหลัง)

## Cleanup

ลบ `routes/system-admin/signature-config.tsx` — ไม่มีไฟล์ไหน import (ยืนยันด้วย grep ทั้ง repo)
ไม่ได้ register ใน `router.tsx` เขียนลง app-config `<doc>_signature_config` ซึ่งไม่มี backend
path ไหนอ่าน เก็บไว้จะยิ่งสับสนเมื่อ workflow กลายเป็น source of truth

ตรวจว่ามี test/hook ที่อ้างถึงไฟล์นี้หรือ `useSignatureCandidates` แล้วลบตามถ้าไม่มีผู้ใช้อื่น

## ผลกระทบที่ยอมรับแล้ว

- **GRN, CN, IA, PC, SC, RFQ, INV** — ไม่มีช่องเซ็น ทั้ง 8 ประเภทนี้เป็น placeholder template
  ตาม `seed.print-templates.ts` (บรรทัด 7-8) มีแค่ PR/PO ที่เป็น template จริง ซึ่งทั้งคู่มี workflow
- **workflow เดิมทุกตัว** — ไม่มีช่องเซ็นจนกว่า admin จะเข้าไปติ๊ก ต้องแจ้ง admin ก่อน deploy

## Testing

**FE** (`wf-stage-general.test.tsx`)

- ติ๊ก checkbox → form state เปลี่ยน
- ติ๊กครบ 5 → checkbox ของ stage ที่ยังไม่ติ๊ก disabled + ขึ้นข้อความ `signatureLimitReached`
- ติ๊กครบ 5 → checkbox ของ stage ที่ติ๊กแล้วยังปลดได้
- ปลด 1 ตัวจาก 5 → checkbox ที่เหลือกลับมาติ๊กได้

**BE** (`print-report.helper.spec.ts` — unit test `resolveSignatureNames`)

- ไม่ติ๊กเลย → map ว่างทุกช่อง
- ติ๊ก 3 stage อนุมัติครบ → ได้ชื่อคน 3 ช่อง
- stage แรก action `submitted` → ได้ชื่อคนสร้าง (ไม่ fallback)
- ติ๊กแต่ยังไม่มี action → fallback เป็นชื่อ stage
- entry `action: 'completed'` → ไม่ถูกหยิบมาใช้
- entry `action: 'rejected'` / `'reviewed'` → fallback เป็นชื่อ stage
- ติ๊ก 7 stage → ตัดที่ 5 ตัวแรกตามลำดับ stage
- `user.name` ว่าง → fallback เป็นชื่อ stage
- send-back แล้วอนุมัติซ้ำ → ได้ชื่อคนอนุมัติรอบล่าสุด (`at` ใหม่สุด)
- `workflow_history` เป็น `null` / ไม่ใช่ array → ไม่ throw, fallback ทุกช่อง

## Verification

- FE: `bunx tsc --noEmit && bun test:run && bun run lint`
- BE: unit tests ผ่าน + smoke test พิมพ์ PR จริงที่ติ๊ก stage แล้วเห็นชื่อผู้อนุมัติในช่องเซ็น
