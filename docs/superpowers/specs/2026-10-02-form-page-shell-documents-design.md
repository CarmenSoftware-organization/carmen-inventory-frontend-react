# FormPageShell — ระลอกเอกสาร procurement (PO · PR · GRN · CN · SR)

ต่อจาก `2026-10-01-form-page-shell-design.md` §8 (ระลอก 1 = ฟอร์ม entity 39 หน้า merge แล้วใน #211–#213)
ผลสำรวจละเอียด (file:line ทุกปุ่ม) อยู่ที่ `.superpowers/sdd/form-doc-wave-survey.md` (scratch, git-ignored)

## 0. การตัดสินใจ (กับ user 2026-10-02)

- **ขอบเขต:** procurement 5 โมดูล = 10 หน้า (new/edit ของ PO · PR · GRN · CN · SR) · accounting ทั้งหมด
  (AP invoice · AP payment · AR invoice · accounting-document-detail) **ไม่ทำ** — รอ spec accounting i18n
  ของมันเอง (mock-backed, ข้อความอังกฤษ hardcode, ปุ่ม stub รอ API)
- **ปุ่ม Edit = primary** ตามชุดมาตรฐาน (spec เดิม §2.3) — วันนี้ outline ทั้ง 5 โมดูล
- **เขียน characterization test ก่อน refactor** (ยกเว้นจาก default "ไม่เขียนเทสต์" ของ user โดยตั้งใจ) —
  หัว/footer เอกสารมีเงื่อนไขเยอะ (สถานะ, stage role, AP lock, terminal) และวันนี้ไม่มีเทสต์ที่ render หน้า
  PO/PR/GRN/SR เลย
- **แนวทาง:** ใช้ `FormToolbar` ตรง ๆ + เพิ่ม prop `ribbon` ตัวเดียว — ไม่สร้าง "document toolbar" variant
  (ผลสำรวจ: FormToolbar ครอบได้ราว 80% ที่เหลือใช้ `submitSlot` / `children` / ส่ง `onDelete` ตามเงื่อนไข)

## 1. สภาพปัจจุบัน (ตรวจ 2026-10-02)

ทั้ง 5 โมดูลโครงเดียวกัน: wrapper ไม่มี padding (`flex min-h-full flex-col space-y-4`; PR ใช้ `flex-1`;
SR ไม่มี `space-y`) · `DocFormHeader` non-flush (`px-4`) · `<form>` ใส่ `px-4` เอง · `SummaryFooterBar`
(`sticky bottom-0 mt-auto`) เป็นพี่น้องของ form · หัวเป็น wrapper ประจำโมดูลที่ประกอบปุ่มเอง

| | PO | PR | GRN | CN | SR |
|---|---|---|---|---|---|
| หัว | `po-header.tsx` | `pr-header.tsx` + `pr-form-actions.tsx` | `grn-header.tsx` | `cn-header.tsx` | `sr-header.tsx` |
| Edit | outline · `view && canEdit` | outline · `!VIEW_ONLY && !voided` | outline · `canEdit`; **AP-lock = Edit disabled + Tooltip** | outline · `!isLocked` | outline · stage role ∈ CREATE/APPROVE/ISSUE |
| Save | submit · label "Save" แม้โหมด add | submit · label "Save" แม้โหมด add | **`type=button` handler** + **Save draft** (`!isPastDraft`) | submit · saveDenied pattern | submit · **disabled + title เมื่อไม่มีแผนก** |
| Delete | view+edit · `canEdit && !terminal` | view+edit · DRAFT (เช็คเจ้าของใน handler) | **edit เท่านั้น** · `!isPastDraft` | **edit เท่านั้น** · `!isLocked` | **edit เท่านั้น** |
| ปุ่มเพิ่ม | **Close** (อยู่หน้าสุด) · **Send email** | – | – | – | – |
| DocActionsMenu | comment · activity · print | duplicate · comment · activity · print | comment · activity · print | comment · activity · print | duplicate · comment · activity · print |
| gating | ไม่มี | ไม่มี | useCan + buildPermissionKey (ไม่ตรวจ catalog) | เหมือน GRN | ไม่มี |
| ของที่หัวถือ | `PoSendEmailDialog` · comments query | – | comments query | comments query | **history Sheet** · duplicate nav · comments query |
| ribbon | – | **มี** (ช่องกรอก workflow + description) | – | – | – |
| footer | `PoFooterAction` | `PrFooterAction` | `GrnSummaryFooter` | `CnFooterAction` | `SrFooter` |
| key remount | `id` | `id` | `id` | `id` | `audit.updated.at` (remount ทุก save) |
| skeleton | `FormSkeleton` | `FormSkeleton` ×3 | `FormSkeleton` | `DocFormSkeleton` | `FormSkeleton` ×2 |

catalog (`constant/permissions.ts`): purchase_request / store_requisition มีแต่ view · purchase_order `viewOnly` ·
goods_received_note create/update/delete/commit · credit_note crud

## 2. ของกลาง

### 2.1 `FormToolbar` — เพิ่ม `ribbon`

```ts
readonly ribbon?: ReactNode; // ส่งต่อ DocFormHeader.ribbon — แถวช่องข้อมูลใต้หัว (PR)
```

ไม่มี prop อื่นเพิ่ม · เทสต์ `form-toolbar.test.tsx` เพิ่ม 1 เคส: ribbon render ใต้หัว

### 2.2 `DocFormHeader` — แก้ comment เก่า

comment เหนือ ribbon (doc-form-header.tsx ~:104) อ้างว่า PO/GRN/CN/SR ใช้ ribbon — ไม่จริง เหลือ PR ตัวเดียว

### 2.3 `components/loader/doc-page-skeleton.tsx` (ใหม่) — `DocPageSkeleton`

= `FormPageShell width="wide"` + `FormPageHeaderSkeleton` + แถบ ribbon (grid 6 ช่อง `h-8`) + การ์ดตารางรายการ
(หัวตาราง + 5 แถว) · แทน `FormSkeleton` ใน `*-edit-content.tsx` / `pr-new-content` / `store-requisition-new.route`
และ `DocFormSkeleton` ใน `cn-edit-content` · `FormSkeleton` **ยังไม่ลบ** (CreateWorkflowGate, sc-by-location-content
ยังใช้) · `DocFormSkeleton` ลบได้ถ้าไม่เหลือผู้ใช้

## 3. รูปแบบการย้ายต่อหน้า

- wrapper → `<FormPageShell width="wide" header={<XHeader …/>} footer={<XFooter …/>}>` · `<form>` เอา `px-4` ออก
- shell อยู่ **ในคอมโพเนนต์ฟอร์มที่ถูก key** (ไม่ใช่ใน edit-content) — remount ไม่ทำให้ skeleton กระพริบ
- wrapper ของหัวยังอยู่ คืน fragment: `<FormToolbar …/>` + dialog/sheet ที่มันถือ
- `title={doc_no ?? entity}` เสมอ (label ของ ⌘K recent documents) · ห้าม `titleMuted`
- badges / subtitle (รวม WorkflowTrack / WorkflowStepButton) ย้ายมาทั้งก้อนไม่แก้
- `DocActionsMenu` เป็น `children` · **ไม่ส่ง `activity`** (เมนูมี Activity อยู่แล้ว)
- Delete ที่เดิมเป็น edit-only: ส่ง `onDelete={!isView && … ? fn : undefined}` — คงพฤติกรรมเดิม (ไม่ใช่กติกา view+edit
  ของระลอก 1 เพราะเอกสารลบได้เฉพาะ draft และหน้าดูเป็นที่ทำงาน workflow)

| โมดูล | เฉพาะ |
|---|---|
| CN | map ตรง · `permissionPrefix` ไม่ต้องส่ง (auto จาก leaf = `procurement.credit_note` อยู่ใน catalog) |
| GRN | `submitSlot` = Save draft (outline, `!isPastDraft`) + Save (`type=button` → `onSave`) · AP-lock: `writeDisabledReason={apLocked ? t("editLockedByAp",{docNos}) : undefined}` — Tooltip component กลายเป็น native title (ยอมรับ) |
| PO | Close + Send email เป็น `children` (Close ย้ายจากหน้าสุดไปหลัง Delete — ยอมรับ) · `submitLabel={tc("save")}` คง label เดิมในโหมด add |
| SR | `submitSlot` = Save ที่ disabled + title เมื่อไม่มีแผนก · `onEdit` เฉพาะ stage role ที่แก้ได้ · history Sheet อยู่ใน fragment · key `updated_at` คงไว้ |
| PR | `ribbon` = grid ช่อง workflow/description เดิม · `PrFormActions` ถูกแทนด้วย FormToolbar (ปุ่ม Duplicate อยู่ใน DocActionsMenu children) · `pr-form-dialogs.tsx` `navigate(-1)` → `toList()` |

## 4. เทสต์

- **characterization test ใหม่** — `po-form` / `pr-form` / `grn-form` / `sr-form` / `cn-form` `.characterization.test.tsx`
  ตามแบบ `pc-form.characterization.test.tsx` (mock react-router, hook ของโมดูล, `@/hooks/use-can`, ใช้
  `renderForm` จาก `lib/test-utils/form-characterization`) ครอบ:
  - ชุดปุ่มบนหัวต่อโหมด (add / view / edit) และสถานะหลัก (draft / in-progress / terminal / void)
  - เงื่อนไขพิเศษ: GRN AP-lock, SR ไม่มีแผนก + stage role, PO Close/Send email ตามสถานะ, PR Delete เฉพาะ draft
  - ปุ่ม workflow ใน footer ที่ควรโผล่ตาม role (Submit / Approve / Reject / Send back / Commit / Void / Issue)
- เขียนและเขียว **บนโค้ดเดิมก่อน** (commit แยก) → refactor → เปลี่ยน assertion เฉพาะที่ตั้งใจ (Edit primary,
  ลำดับ Close) พร้อมบอกใน commit message · `cn-general-fields.test.tsx` ที่มีอยู่ต้องเขียวต่อโดยไม่แก้
- guard `form-page-shell.usage.test.ts`: เอา 6 ไฟล์ procurement ออก (`cn-header` `grn-header` `po-header`
  `sr-header` `pr-header` `pr-form-dialogs`) · accounting 4 ไฟล์ย้ายหัวข้อเป็น "ชั่วคราว — รอ spec accounting
  i18n" · allowlist รวม 14 → 8

## 5. พฤติกรรมที่เปลี่ยน (ประกาศใน PR body)

- Edit เป็น primary ทั้ง 5 โมดูล
- license `canWrite` ปิดปุ่มเขียนของ PO/PR/SR (เดิมไม่เช็ค) · permission gate ของ PO/PR/SR ยังไม่มีผล (key ไม่อยู่ใน catalog)
- GRN/CN ได้ catalog check (key มีอยู่แล้ว พฤติกรรมเท่าเดิม)
- PO: Close ย้ายไปหลัง Delete · GRN: tooltip AP-lock เป็น native title
- PR: ปิด dialog "ไม่มีแผนก" แล้วกลับ list (พร้อม filter) แทน history
- ระยะห่างแนวตั้ง: หัว→body = `mt-6` (เดิม space-y-4 / SR ไม่มี) · padding รอบหน้า = shell p-4

## 6. การตรวจ

- typecheck / lint (baseline 137/0) / suite (ยกเว้น 2 เคส ap-mock-repository เดิม) / guard
- เบราว์เซอร์ทุกโมดูล: view + edit ของใบ draft และใบที่เดินแล้ว · footer ติดก้นจอ · ribbon ของ PR ตรงคอลัมน์ฟอร์ม ·
  596px · ไม่กดปุ่ม workflow / save ที่เขียน DB (dev DB ใช้ร่วมกัน — memory `local-backend-is-shared-dev-db`;
  ใบที่มีประวัติตาม memory `t02-workflow-test-documents`)

## 7. แบ่ง PR (stacked, merge commit, ห้าม `--delete-branch` จนครบ)

1. **CN + GRN + `DocPageSkeleton`** — tests: cn/grn characterization
2. **PO + SR** — tests: po/sr characterization
3. **PR + `FormToolbar.ribbon`** — tests: pr characterization + form-toolbar ribbon case · guard ปิดท้าย

## 8. นอกขอบเขต

- accounting ทั้งหมด (i18n, AP/AR เข้า shell, accounting-document-detail ที่เป็น layout เต็มจอ + footer ใน Card,
  ลบเงื่อนไข `isJournalVoucher` ที่ตายในหัว financial-reports)
- ลบ `FormSkeleton` (รอ CreateWorkflowGate / sc-by-location ย้าย)
- helper กลางสำหรับ badge กลุ่ม status/version ที่ซ้ำ 5 หัว (dedupe ทีหลังได้)
