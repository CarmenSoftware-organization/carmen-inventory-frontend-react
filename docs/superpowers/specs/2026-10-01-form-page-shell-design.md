# FormPageShell — โครงหน้า form เดียวกันทั้งแอป (ระลอก 1: ฟอร์ม entity 39 หน้า)

ต่อจาก `2026-10-01-list-page-shell-design.md` §8 — งานถัดไปคือหน้า form

## 0. การตัดสินใจ (กับ user 2026-10-01)

สำรวจ route ที่เป็น form / detail / wizard / settings ทั้งหมด 65 ไฟล์ (รวม `spot-check/location/:id`
ที่ render ฟอร์มสร้าง; ไม่นับ `email-profile` ที่เป็นหน้า list และ `config-email.route.tsx` ที่เป็น
orphan ไม่ได้ลงทะเบียนใน `routes/router.tsx`) พบหัวหน้า **5 กลไก** ไม่ใช่ 3 ตามที่ spec เดิมประเมิน:

| กลไก | จำนวน | ตัวอย่าง |
|---|---|---|
| A. `FormToolbar` ของกลาง (`components/share/form-toolbar.tsx`) | 8 | department, location, physical-count, PR template |
| B. wrapper ประจำโมดูล → `DocFormHeader` | 25 | PO/PR/GRN/CN/SR, op-plan 8, product, role, workflow |
| C. เรียก `DocFormHeader` ตรง + ปุ่มเขียนเอง | 15 | vendor-mgmt 8, accounting 5, workflow/new, pe-review |
| D. `<h1>` เขียนเอง | 12 | wizard 4, noti-template 2, user, company, default, interface, sc-form |
| E. header component เฉพาะหน้า | 5 | pc/sc entry + review, profile |

ปุ่มย้อนกลับ 4 แบบ (BackButton ผ่าน DFH 48 · BackButton วางเอง 6 · ghost + `ArrowLeft` เขียนเอง 4 ·
`ChevronLeft` 3 · ไม่มี 4) · padding ของ wrapper 8 แบบ · max-width 3 ค่า (`4xl` 28 · `5xl` 5 · ไม่มี 32) ·
Edit เป็น outline หรือ primary แล้วแต่หน้า · Delete เป็น outline / destructive / secondary · ปุ่ม Activity
อยู่หน้าสุด / หลัง Delete / ท้ายสุด / ใน ⋯ / ไม่มี · `pd-form-toolbar.tsx` default-export ชื่อ `FormToolbar`
ชนกับของกลาง

**ขอบเขตที่เลือก:** ฟอร์ม entity 39 หน้าก่อน (38 ฟอร์ม + pe-review) (ใช้ SettingSection/card + ชุดปุ่ม Edit/Cancel/Save/Delete)
เอกสาร procurement (PO/PR/GRN/CN/SR 10), accounting (5 ไฟล์ 11 URL), entry/review (4), wizard (4),
profile (2) เป็นระลอกถัดไป

**แนวทางที่เลือก (A):** สร้าง `FormPageShell` คุม "โครง" (padding · max-width · ช่องว่าง header↔body ·
ช่อง footer ที่ pin ได้) · หัวทุกหน้าเป็น `DocFormHeader` · ยก `FormToolbar` เป็น "ชุดปุ่มมาตรฐาน" ที่รับ
title/subtitle/badges/leading เป็นของตัวเองได้ จน wrapper โมดูลเรียกใช้แทนการประกอบปุ่มเอง · wrapper
โมดูลยังอยู่แต่บางลง (ไม่เอาแนว B ยุบ wrapper 13 ตัวเป็น shell เดียว — wrapper ถือ dialog/mutation/state
ของตัวเอง เช่น wf-header ถือ delete mutation, po-header ถือ email dialog; และไม่เอาแนว C แก้แค่ class
ทีละหน้า = drift กลับ)

**คำศัพท์ปุ่ม:** Edit = primary · Cancel = outline · Save = primary · Delete = outline แสดงในโหมด view
และ edit · Activity ต่อท้าย Delete · ปุ่มเพิ่มเติมของหน้า (Print, Send email) ต่อท้าย Activity — ตรงกับ
ลำดับที่ comment ใน `form-toolbar.tsx` ประกาศไว้ (Edit · Delete · Activity · Print) และตรงเสียงข้างมาก
ของหน้าที่ใช้ Edit primary (op-plan/product/role/wf/noti/company/AP/AR)

**หน้าที่โครงต่างลึก (entry/review full-bleed, wizard, profile) ทำแค่ปุ่มย้อนกลับ + ปลายทาง** — ไม่แตะ
full-bleed, fixed bar, virtualizer, sticky footer ของ wizard

## 1. สภาพปัจจุบัน (ตรวจ 2026-10-01)

`#main-content` ของ `routes/root-layout.tsx` = `m-3 flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-4`
ทุกหน้าอยู่ใน scroll container นี้ · `-mx-3 -my-3` ของหน้า full-bleed cancel `m-3` นั้น

ของกลางที่มีอยู่และพฤติกรรมจริง:

- **`DocFormHeader`** (`components/share/doc-form-header.tsx`) — props `title` `titleMuted?` `subtitle?:
  ReactNode` `backLabel` `onBack` `badges?` `actions?` `ribbon?` `workflowStep?` `workflowStepBelow?`
  `leading?` `flush?` · บันทึก "เพิ่งเปิด" ของ ⌘K เมื่อ path ลงท้าย UUID และ `!titleMuted` · ปุ่ม back
  absolute ห้อยออกซ้าย title ด้วย `-translate-x-[calc(100%+0.25rem)]` · `workflowStep`/`workflowStepBelow`
  **ไม่มีผู้เรียกเลย** (PO/PR/SR ใส่ WorkflowTrack ลง `subtitle`) · `ribbon` ใช้เฉพาะ pr-header ·
  `leading` ใช้เฉพาะ ia-form-hero กับ pe-review
- **`FormToolbar`** — title derive จาก `entity` + mode เท่านั้น (ใส่เลขเอกสาร/ชื่อสดไม่ได้) · `subtitle`
  รับแค่ string · ลำดับ/variant ปุ่มตายตัว (Edit outline) · ไม่มี `leading` · เป็นที่เดียวที่เช็ค license
  `canWrite` และ permission (`permissionPrefix` หรือ auto จาก `usePermissionPrefix()`) — นี่คือเหตุผลที่
  มีผู้ใช้แค่ 4 ไฟล์ (8 หน้า)
- **`BackButton`** (`components/share/back-button.tsx`) — doc ของมันเองห้ามประกอบ `<Button><ArrowLeft/>`
  เอง แต่ wizard 4 หน้า + qty-step + step-result ยังทำ, noti-template กับ sc-form ใช้ `ChevronLeft`
  `size="sm"`, pc-review/sc-review ใช้ `navigate(-1)`
- **`FormSkeleton`** (`components/loader/form-skeleton.tsx`) — โครง hero + sidebar 22rem แบบ full-bleed
  ซึ่งไม่มีหน้าไหนในขอบเขตเป็นแบบนั้น แต่เป็น loading state ของ edit-content 17 ไฟล์ในขอบเขต
- **`SettingSectionSkeleton`** (`components/ui/setting-section.tsx:130`) — มีอยู่แล้ว interface-page-layout
  ใช้คู่กันสองก้อน

**กับดัก permission ที่ต้องปิดก่อนขยาย FormToolbar:** `usePermissionPrefix()` ตัด `.view` จาก permission
ของ leaf แล้วประกอบ `.create/.update/.delete` — leaf ของ op-plan ทั้ง 5 ใช้ `operation_plan.view`,
price-list-template/request-price-list ใช้ `vendor_management.view`, inventory-adjustment ใช้
`inventory_management.view` → key ที่ประกอบได้ (`operation_plan.update` ฯลฯ) **ไม่มีใน `PERMISSIONS`**
และไม่มีใน `tb_permission` → `can()` คืน false → non-admin โดน permission-denied ทุกหน้า โดย admin
ไม่เห็นเพราะ bypass (บทเรียนเดียวกับ `system_configuration.view` ใน comment ของ `constant/permissions.ts`)

## 2. ของกลางใหม่ / ที่แก้

### 2.1 `components/share/form-page-shell.tsx` (ใหม่)

```tsx
interface FormPageShellProps {
  readonly header: ReactNode;           // FormToolbar / wrapper โมดูล / DocFormHeader (flush เสมอ)
  readonly width?: "default" | "wide";  // default = max-w-4xl · wide = ไม่จำกัด (ตารางหลายคอลัมน์)
  readonly footer?: ReactNode;          // SummaryFooterBar — มีแล้ว wrapper ยืดเต็มจอให้ mt-auto ทำงาน
  readonly children: ReactNode;
}

// markup
<div className={cn(
  "mx-auto w-full p-[max(1rem,env(safe-area-inset-bottom))]",
  width === "default" && "max-w-4xl",
  footer && "flex min-h-full flex-col",
)}>
  {header}
  <div className={cn("mt-6 min-w-0", footer && "flex-1")}>{children}</div>
  {footer}
</div>
```

- padding ค่าเดียว `p-[max(1rem,env(safe-area-inset-bottom))]` (เสียงข้างมาก 31 หน้า) — ปุ่ม back ที่
  ห้อยออกซ้าย 2rem มีที่พอเพราะ `#main-content` ให้ `px-4` + `m-3` เพิ่มอีก
- ช่องว่าง header→body = `mt-6` ค่าเดียว (เดิมมี mb-6/mt-6/space-y-4/space-y-3/space-y-5/gap-4)
- `wide` ให้เฉพาะ: product (`pd-form`), price-list (`pl-form`), request-price-list (`rfp-form`, เดิม 5xl),
  workflow detail (`wf-detail`, มี diagram) — ที่เหลือ `default` (noti-template ลดจาก 5xl, pc-form จาก
  full-width `px-4`, role ยังเท่าเดิม)
- `footer` ใช้เฉพาะ inventory-adjustment ในระลอกนี้ (ย้าย `SummaryFooterBar` ของ ia-summary ออกมาเป็น
  `footer` — ปุ่มใน footer ใช้ `form={formId}` อยู่แล้ว ไม่ต้องอยู่ใน `<form>`) เป็น hook ให้เอกสาร
  procurement ระลอกหน้า
- `AnimationStyles` / `Reveal` ของแต่ละหน้าอยู่ใน `header`/`children` ตามเดิม (shell ไม่รู้จัก)
- ไม่มี `key` remount เพิ่ม — หน้า `useEntityForm` 26 หน้าไม่เคยมี พฤติกรรม reset เท่าเดิม

### 2.2 `components/share/doc-form-header.tsx` (แก้)

- `onBack?: () => void` — ไม่ส่ง = ไม่ render `BackButton` (company-profile / default-setting / interface
  เป็น leaf ของเมนู ไม่มี list ให้กลับ) · `backLabel` ยังบังคับเมื่อมี `onBack`
- ลบ `workflowStep` / `workflowStepBelow` และ markup ของมัน (dead code; ribbon เหลือแบบเดียวคือแถวเดียว)
- `title` ยังเป็น string (ใช้กับ `title` attribute และ recent documents)
- ภายใน `FormPageShell` เรียกแบบ `flush` เสมอ — shell ให้ gutter แล้ว (`FormToolbar` default `flush`
  อยู่แล้ว; ผู้เรียกตรงในขอบเขตส่ง `flush` อยู่แล้วทุกไฟล์)

### 2.3 `components/share/form-toolbar.tsx` → ชุดปุ่มมาตรฐาน (แก้)

```ts
interface FormToolbarProps {
  readonly entity: string;
  readonly mode: FormMode;                 // "add" | "view" | "edit"
  readonly formId: string;
  readonly isPending: boolean;
  readonly onBack?: () => void;            // optional แล้ว (ส่งต่อ DocFormHeader)
  readonly onCancel: () => void;
  readonly onEdit?: () => void;
  readonly onDelete?: () => void;
  readonly deleteIsPending?: boolean;
  readonly title?: string;                 // ใหม่ — ทับ title ที่ derive จาก entity ทุกโหมด
  readonly titleMuted?: boolean;           // ใหม่ — ส่งต่อ DocFormHeader
  readonly subtitle?: ReactNode;           // ขยายจาก string
  readonly badges?: ReactNode;             // เปลี่ยนชื่อจาก statusBadge
  readonly leading?: ReactNode;            // ใหม่ — ส่งต่อ DocFormHeader
  readonly submitLabel?: string;           // ใหม่ — label ตอน idle (pending ยังใช้ form.creating/saving)
  readonly submitSlot?: ReactNode;         // แทนปุ่ม Save ทั้งปุ่ม (product: disabled จน dirty; IA: set doc_status)
  readonly writeDisabledReason?: string;   // ใหม่ — ปิด Edit/Save/Delete พร้อม title (interface หมดอายุ)
  readonly children?: ReactNode;           // ปุ่มเพิ่มของหน้า ต่อท้าย Activity
  readonly editTitle?: string;
  readonly permissionPrefix?: string;
  readonly flush?: boolean;                // default true
  readonly activity?: { id: string; label?: string };
}
```

ลำดับและ variant (ตาม §0):

| mode | ปุ่มซ้าย→ขวา |
|---|---|
| view | **Edit** (primary, เมื่อมี `onEdit`) · Delete (outline, เมื่อมี `onDelete`) · Activity (outline) · `children` |
| edit | Cancel (outline) · **Save** (primary, `type="submit" form={formId}`) หรือ `submitSlot` · Delete · Activity · `children` |
| add | Cancel · Save/`submitSlot` · Activity (ปกติไม่ส่ง) · `children` — ไม่มี Delete |

- คง `key` + `type="button"` บนปุ่ม Edit (กัน React reuse DOM node ข้ามโหมดแล้ว submit ฟอร์ม —
  comment ในโค้ดเดิมอ้าง role-form-hero)
- **license:** `!canWrite` → Edit/Save/Delete `disabled` + `title={tl("writeDisabledTitle")}` เหมือนเดิม;
  `writeDisabledReason` ใช้ทางเดียวกัน (มาก่อน permission)
- **permission (กติกาใหม่):** `prefix = permissionPrefix ?? usePermissionPrefix()` แล้ว gate
  **ต่อ action** ก็ต่อเมื่อ `isKnownPermission(\`${prefix}.${action}\`)` — key ต้องอยู่ใน `PERMISSIONS`
  จริง · `permissionPrefix` ที่ส่งมาเองก็ผ่านกติกาเดียวกัน (กันพิมพ์ผิด) · key ที่ไม่รู้จัก = ไม่ gate
  (พฤติกรรมเดิมของหน้าที่ไม่เคยเช็ค)
- เพิ่มใน `constant/permissions.ts`: `PERMISSION_KEYS: ReadonlySet<string>` (flatten leaf ของ
  `PERMISSIONS` ตอนโหลดโมดูล) และ `isKnownPermission(key: string): boolean`
- ผลข้างเคียงที่ตั้งใจ: หน้าที่ย้ายมาแล้ว key ตรง catalog จะ gate permission เพิ่ม — role, user, workflow,
  notification-template (`configuration.notification_template`), product, vendor, price-list, physical-count
  (เดิมอยู่แล้ว), company-profile/default-setting (ส่ง `permissionPrefix="system_admin.business_unit"`
  ตาม comment ใน catalog ที่บอกว่าคีย์นี้คุมสองหน้านี้; มีแค่ `.update` จึง gate เฉพาะ Edit/Save) ·
  หน้าที่ key ไม่ตรง catalog (op-plan 8, plt, rfp, IA, interface) ไม่ gate เหมือนเดิม · license `canWrite`
  ปิดปุ่มเขียน **ทุกหน้า** ที่ย้ายมา (เดิมมีแค่ 8)

### 2.4 `routes/product-management/product/pd-form-toolbar.tsx` (เปลี่ยนชื่อ export)

default export `FormToolbar` → named export `PdFormToolbar` · `pd-form.tsx` import ชื่อใหม่ · ภายในเรียก
`FormToolbar` ของกลาง (§3)

### 2.5 `components/loader/form-page-skeleton.tsx` (ใหม่)

```tsx
export function FormPageSkeleton({ width }: { readonly width?: "default" | "wide" })
```

= `FormPageShell` + header skeleton (วงกลม back `size-7` · แท่ง title `h-6 w-48` · แท่งปุ่ม `h-8 w-20`) +
`SettingSectionSkeleton first fields={["half","half","half","half"]}` + `SettingSectionSkeleton
fields={["half","half","full"]}` — แทน `FormSkeleton` ใน edit-content 17 ไฟล์ + `ia-new-content` (spinner)
ของขอบเขตนี้ · `FormSkeleton` เดิมเหลือให้ procurement (po/pr/grn/sr) และ sc-by-location จนระลอกหน้า

## 3. wrapper โมดูลที่ยังอยู่ (บางลง: render `FormToolbar` แทนประกอบปุ่มเอง)

| wrapper | ส่งให้ FormToolbar | ของที่ wrapper ยังถือ |
|---|---|---|
| `operation-plan/category/recipe-category-toolbar.tsx` | `title` = add ? tr("add") : name ∥ untitled · `badges` = code pill · `activity` | useWatch code/name |
| `operation-plan/cuisine/cuisine-toolbar.tsx` | เหมือน category + `badges` เพิ่ม StatusDotBadge (ไม่ใช่ add) | — |
| `operation-plan/equipment/eq-toolbar.tsx` | เหมือน cuisine, ไม่มี `activity` | — |
| `operation-plan/recipe/recipe-toolbar.tsx` | `badges` = code pill + status (`<Select>` ในโหมด edit อยู่ใน badges ต่อไป) | — |
| `product-management/product/pd-form-toolbar.tsx` (→ `PdFormToolbar`) | `title`/`titleMuted` ชื่อสด · `badges` status dot + hint · `subtitle` identity strip · `submitSlot` (disabled จน dirty ∥ pending images, label createProduct) · `activity` | — |
| `system-admin/role/role-form-hero.tsx` | `title` ชื่อ · `children` = Print (view) · Delete ผ่าน `onDelete` (outline แทน secondary) | `printRole` |
| `system-admin/workflow/wf-header.tsx` | `mode` = isEditing ? "edit" : "view" · `badges` status/type/counts (view) · `subtitle` description · `submitLabel` saveChanges · `onDelete` เปิด dialog ของตัวเอง · `activity` | delete mutation · availability query · WarningDialog · DeleteDialog |
| `inventory-management/inventory-adjustment/ia-form-hero.tsx` | `leading` ไอคอนประเภท · `badges` status · `submitSlot` (Save set `doc_status=draft` ตอนคลิก) · `children` = PrintDocumentButton · `activity` | — |

ผลที่เปลี่ยนเห็นได้: Edit เป็น primary ทุกหน้า (เดิม IA/vendor/config เป็น outline) · Delete เป็น outline
และโผล่ในโหมด view ด้วย (เดิม op-plan/noti/product โชว์เฉพาะ edit และเป็น destructive; role เป็น
secondary) · Activity อยู่หลัง Delete ทุกหน้า (เดิม op-plan/product/wf/noti วางหน้าสุด, vendor วางท้ายสุด
หลัง Delete อยู่แล้ว)

## 4. การย้าย (39 หน้า + หน้าพิเศษ)

ทุกหน้า: wrapper เดิม → `<FormPageShell header={…} width? footer?>` · header = `FormToolbar` (ตรงหรือผ่าน
wrapper §3) · ลบ `<div className="mb-6">` / `mt-6` / `space-y-*` ที่เคยคั่น header กับ body

### PR 1 — ของกลาง + guard + กลุ่ม A/C (17 หน้า)

ของกลาง: §2.1 shell · §2.2 DFH · §2.3 FormToolbar + `PERMISSION_KEYS` · §2.5 skeleton · §5 guard test ·
อัปเดต `components/share/form-toolbar.test.tsx` (ชื่อ prop `badges`, Edit primary, กติกา permission:
key ไม่รู้จัก = ไม่ gate)

| หน้า | ไฟล์ | กลไกเดิม | หมายเหตุ |
|---|---|---|---|
| department new/edit | `routes/config/department/department-form.tsx` | A | `statusBadge`→`badges` |
| location new/edit | `routes/config/location/location-form.tsx` | A | เหมือนกัน |
| PR template new/edit | `routes/procurement/purchase-request-template/prt-form.tsx` | A | เหมือนกัน |
| physical-count new/edit | `routes/inventory-management/physical-count/pc-form.tsx` | A | เลิก `px-4` full-width → default 4xl; Print ยังเป็น `children` |
| vendor new/edit | `routes/vendor-management/vendor/vendor-form.tsx` | C | `title={watchedName ∥ placeholder}` `titleMuted` · `badges` code+status · Delete/Activity ผ่าน prop |
| price-list new/edit | `routes/vendor-management/price-list/pl-form.tsx` | C | `wide` |
| price-list-template new/edit | `routes/vendor-management/price-list-template/plt-form.tsx` | C | `useState<FormMode>` ใช้ได้ตรง |
| request-price-list new/edit | `routes/vendor-management/request-price-list/rfp-form.tsx` | C | `wide` (เดิม 5xl) |
| workflow new | `routes/system-admin/workflow/wf-new-form.tsx` | C | `mode="add"` `submitLabel` createWorkflow |

skeleton: `department-edit-content` `location-edit-content` `prt-edit-content` `pc-edit-content`
`vendor-edit-content` `pl-edit-content` `plt-edit-content` `rfp-edit-content` → `FormPageSkeleton`

### PR 2 — กลุ่ม B wrapper (15 หน้า) + pe-review

| หน้า | ไฟล์ฟอร์ม | wrapper (§3) | หมายเหตุ |
|---|---|---|---|
| recipe category new/edit | `routes/operation-plan/category/recipe-category-form.tsx` | recipe-category-toolbar | `space-y-4`→shell |
| cuisine new/edit | `routes/operation-plan/cuisine/cuisine-form.tsx` | cuisine-toolbar | |
| equipment new/edit | `routes/operation-plan/equipment/eq-form.tsx` | eq-toolbar | |
| recipe new/edit | `routes/operation-plan/recipe/recipe-form.tsx` | recipe-toolbar | |
| product new/edit | `routes/product-management/product/pd-form.tsx` | PdFormToolbar | `wide`; เลิก `px-4` |
| role new/edit | `routes/system-admin/role/role-form.tsx` | role-form-hero | เลิก `px-4` → P1 |
| workflow detail | `routes/system-admin/workflow/wf-detail.tsx` | wf-header | `wide`; เลิก `space-y-3 px-4` |
| inventory-adjustment new/edit | `routes/inventory-management/inventory-adjustment/ia-form.tsx` | ia-form-hero | `footer` = SummaryFooterBar ย้ายจาก ia-summary |
| period-end review | `routes/inventory-management/period-end/pe-review.tsx` | — (DFH ตรง, ไม่ใช่ฟอร์ม) | shell + DFH `flush` + `leading` คงปุ่ม Refresh/Close; เลิก `p-3 md:p-4` |

skeleton: `recipe-category-edit-content` `cuisine-edit-content` `eq-edit-content` `recipe-edit-content`
`pd-edit-content` `role-edit-content` `wf-edit-content` `ia-edit-content` `ia-new-content` → `FormPageSkeleton`

characterization tests ที่ต้องปรับตามพฤติกรรมใหม่ (Delete ในโหมด view, ลำดับปุ่ม):
`recipe-category-form` `recipe-form` `eq-form` `role-form` (.characterization.test.tsx)

### PR 3 — กลุ่ม D (6 หน้า) + หน้าพิเศษ

| หน้า | ไฟล์ | ทำอะไร |
|---|---|---|
| notification-template new/edit | `routes/system-admin/notification-template/noti-tmpl-form.tsx` | FormToolbar `title`/`badges` status · `activity` · default 4xl (เดิม 5xl) · ChevronLeft หายไปเอง |
| user edit | `routes/system-admin/user/user-assigned-form.tsx` | FormToolbar `leading`=UserAvatar `title`=fullName `badges`=StatusBadge `subtitle`=email · @username · ลบ header ที่ก๊อป DFH |
| company-profile | `routes/system-admin/company-profile/company-profile-component.tsx` | ไม่มี `onBack` · `title`=ชื่อหน้า `subtitle`=description · `mode`=editing?"edit":"view" · body ห่อ `<form id>` ให้ Save เป็น submit · `permissionPrefix="system_admin.business_unit"` |
| default-setting | `routes/system-admin/default-setting/default-setting-component.tsx` | เหมือน company-profile |
| interface detail | `routes/system-admin/interface/interface-page-layout.tsx` | เหมือน company แต่ไม่ส่ง `permissionPrefix` · `writeDisabledReason` เมื่อ `isExpired` · `<form>` เดิมใส่ `id` |

skeleton: `user-edit-content` → `FormPageSkeleton` (noti-template / interface มี skeleton ของตัวเองที่เป็น SettingSectionSkeleton อยู่แล้ว คงไว้)

หน้าพิเศษ — ปุ่มย้อนกลับเท่านั้น:

| ไฟล์ | เดิม | ใหม่ |
|---|---|---|
| `routes/procurement/goods-receive-note/from-po/from-po-content.tsx:121` | ghost + ArrowLeft | `BackButton` |
| `routes/procurement/purchase-order/from-pr/from-pr-content.tsx:157` และ `step-result.tsx:162` | ghost + ArrowLeft | `BackButton` |
| `routes/procurement/purchase-order/from-price-list/from-price-list-content.tsx:275` | ghost + ArrowLeft | `BackButton` |
| `routes/procurement/purchase-request/from-template/from-template-content.tsx:70` และ `qty-step.tsx:188` | ghost + ArrowLeft | `BackButton` |
| `routes/inventory-management/spot-check/sc-form.tsx:162` | ghost `size="sm"` + ChevronLeft | `BackButton` |
| `routes/inventory-management/physical-count/pc-review-component.tsx:58` | `navigate(-1)` | path ของ list physical-count |
| `routes/inventory-management/spot-check/sc-review-component.tsx:54` | `navigate(-1)` (fallback) | path ของ list spot-check |

ไม่แตะ: `profile/user-profile-setting.tsx` (BackButton ขนาด 44px เพื่อ touch target; header sticky บนมือถือ) ·
`pr-form-dialogs.tsx:175` `navigate(-1)` ใน confirm dialog (ระลอก procurement)

## 5. กฎกันถอยหลัง — `components/share/__tests__/form-page-shell.usage.test.ts`

แบบเดียวกับ `list-page-shell.usage.test.ts` (สแกน `routes/**/*.tsx` ที่ไม่ใช่ test, นับลายเซ็นต่อไฟล์,
เทียบ `ALLOWED` ทั้งก้อน, มี probe test กันทุก regex และ test ที่อ่าน source ของ shell ยืนยันว่า signature
ตรงกับที่ shell เขียนจริง):

```ts
const SIGNATURES = [
  /<ArrowLeft\b/g,                                   // ปุ่มย้อนกลับต้องเป็น BackButton
  /navigate\(-1\)/g,                                 // ปลายทางต้องเป็น path ของ list
  /p-\[max\(1rem,env\(safe-area-inset-bottom\)\)\]/g, // padding ของโครงเขียนเองไม่ได้ — มาจาก shell
  /<DocFormHeader\b/g,                               // หัวฟอร์มผ่าน FormToolbar (ยกเว้นที่ระบุเหตุผล)
];
```

`ALLOWED` หลัง PR 3:

- ถาวร: `routes/legal/legal-page.tsx` (ArrowLeft ลิงก์กลับแอป ไม่ใช่ฟอร์ม) ·
  `routes/inventory-management/period-end/pe-review.tsx` (DFH ตรง — ไม่ใช่ฟอร์ม)
- ชั่วคราว (ระลอกเอกสาร): procurement 5 wrapper + `pr-form-dialogs.tsx` · accounting 4 ไฟล์ · entry/review ·
  wizard 4 (padding safe-area ของ wizard เขียนเอง) · profile 2

`ChevronLeft` ไม่อยู่ใน signature เพราะใช้ถูกต้องเป็นลูกศรเลื่อนใน gallery/lightbox/timeline 4 ไฟล์
หลังย้าย noti-template กับ sc-form แล้ว ไม่เหลือที่ใช้เป็นปุ่มย้อนกลับ

## 6. การตรวจ

- `bun run typecheck` สะอาด · `bun run lint` ไม่เกิน baseline 137 warnings, 0 error · `bun test:run` ผ่าน
  (ยกเว้น `ap-mock-repository.test.ts` 2 เคสที่แดงบน main อยู่แล้ว)
- เบราว์เซอร์ (desktop + mobile iframe 596px) อย่างน้อยหน้าละ 1 ตัวแทนต่อกลุ่ม: department edit (A) ·
  vendor edit (C) · recipe edit (B, Select ใน badges) · product edit (wide + submitSlot) · IA edit (footer
  pin ตอนเนื้อสั้น) · wf detail (wide) · company-profile (ไม่มี back) · interface (writeDisabledReason) ·
  wizard from-po (BackButton) — เช็คปุ่ม back ไม่โดนตัดบนมือถือ และ Delete โผล่ในโหมด view
- ทดสอบ permission ด้วย user non-admin ที่ไม่มี `.update` ของ role: ปุ่ม Edit ยังคลิกได้แล้วเด้ง dialog ·
  op-plan: ไม่ gate

## 7. ลำดับส่งงาน

PR 1 → PR 2 → PR 3 ซ้อนกัน (stacked) base = main · merge ด้วย merge commit ตามลำดับ · ห้าม
`--delete-branch` จนครบ (memory `stacked-pr-merge-no-delete-branch`) · ยังไม่ deploy

## 8. นอกขอบเขต (spec ถัดไป)

- เอกสาร procurement (PO/PR/GRN/CN/SR) + accounting 5 ไฟล์ + entry/review + wizard: ย้ายเข้า shell
  (ใช้ `footer` กับ `width="wide"`), wrapper ใช้ FormToolbar, ลบ `FormSkeleton` เมื่อหมดผู้ใช้
- ยุบ wrapper op-plan 4 ตัวเป็น `routes/operation-plan/shared/` ตัวเดียว (หลังบางลงแล้วเหลือต่างกันแค่ badge)
- orphan `routes/system-admin/config-email/config-email.route.tsx` ไม่ได้ลงทะเบียนใน router — ลบหรือลงทะเบียน
  เป็นการตัดสินใจแยก (`setting-section.tsx:10` ยังอ้างเป็น consumer)
- accounting i18n · landing 12 หน้า · dark mode toggle
