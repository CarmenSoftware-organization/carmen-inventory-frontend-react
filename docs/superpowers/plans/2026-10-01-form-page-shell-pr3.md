# FormPageShell — PR 3 (หัว `<h1>` เขียนเอง 6 หน้า + ปุ่มย้อนกลับของ wizard / review) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ย้ายหน้าที่เขียน `<h1>` + ปุ่มเอง 6 หน้า (notification-template new/edit · user edit · company-profile · default-setting · interface detail) มาใช้ `FormPageShell` + `FormToolbar` และเปลี่ยนปุ่มย้อนกลับที่ประกอบเอง (wizard 4 หน้า + qty-step · sc-form) เป็น `BackButton` · review 2 หน้าเลิก `navigate(-1)` — guard allowlist 27 → 14 ไฟล์ (เหลือถาวร 3 + ระลอกเอกสาร 10 + orphan 1)

**Architecture:** ไม่มีคอมโพเนนต์ใหม่ ยกเว้น export `FormPageHeaderSkeleton` จาก `form-page-skeleton.tsx` ให้ skeleton เฉพาะของ noti-template ใช้ · หน้า settings (company / default / interface) ไม่มี `onBack` (DocFormHeader ไม่ render ปุ่ม) และ map boolean `editing` → `mode` · Save ทุกหน้าเปลี่ยนจาก `onClick` เป็น `type="submit" form={id}` ของ FormToolbar โดยใส่ `id` ให้ `<form>` ที่มีอยู่แล้ว (onSubmit ของ form เป็น handler ตัวเดิม) · ปุ่ม Edit ซ่อนจนข้อมูลพร้อม (ส่ง `onEdit` เฉพาะตอนพร้อม) ตามพฤติกรรมเดิมที่ซ่อนทั้งแถบปุ่ม

**Tech Stack:** React 19 + React Compiler · react-router 7 · Tailwind v4 · use-intl · Vitest + Testing Library · bun

**Spec:** `docs/superpowers/specs/2026-10-01-form-page-shell-design.md` (§4 PR 3 · §5 guard) · plan ก่อนหน้า: `…-pr1.md`, `…-pr2.md`

## Global Constraints

- ภาษาสื่อสาร/commit = ไทย · PR title/body อังกฤษ
- ไม่แตะ query / schema / field / i18n key ที่มีอยู่ / การ navigate ยกเว้น `navigate(-1)` ใน review 2 หน้า (spec §4)
- stacked PR: branch `feature/form-page-shell-wave-3` จาก `feature/form-page-shell-wave-2` (#212) · PR base = `feature/form-page-shell-wave-2` · ห้าม `--delete-branch` จนครบทั้ง stack
- gate ทุก task: `bun run typecheck && bun run lint` (baseline 137 / 0) · gate→commit ด้วย `&&` เท่านั้น · ระวังการแทน `</div>\n  );\n}` ท้ายไฟล์ที่มีคอมโพเนนต์ย่อยตามหลัง — แทนตัวแรก **หลัง** ตำแหน่งที่เปิด shell (PR 2 พลาดที่ pe-review)
- ก่อน PR: `bun test:run` เขียว ยกเว้น 2 เคส `ap-mock-repository.test.ts`
- ไม่เขียนเทสต์ใหม่ · เทสต์ที่ render หน้าที่จะเรียก FormToolbar แล้วไม่มี QueryClient ให้เติม mock `use-can` แบบเดียวกับ PR 2 (ไม่แตะ assertion)
- hook บล็อก `rm -rf` / `git checkout --` / `--amend`
- เบราว์เซอร์: iframe 596px · ปุ่ม Radix กดด้วย JS `.click()`

## Review Focus

1. **Save ของ company / default / interface เปลี่ยนจาก `onClick={onSubmit}` เป็น submit ของ `<form>`** — ต้องใส่ `id` ให้ form ตัวที่ห่อ field จริง และ form นั้น render เฉพาะตอนข้อมูลพร้อม; ถ้าปุ่มโผล่ตอน form ยังไม่ mount กดแล้วเงียบ → ส่ง `onEdit` เฉพาะตอน `ready` (โหมด edit เข้าได้เฉพาะตอนนั้น) · Task 8 ตรวจในเบราว์เซอร์ว่าปุ่ม Save ชี้ `form=` ไปที่ `<form>` ที่ mount อยู่จริงทั้ง 3 หน้า (ไม่กดบันทึก — DB dev ใช้ร่วมกัน)
2. **interface หมดอายุ** — เดิมปิด Save และ Edit ด้วย `disabled={isExpired}`; ตอนนี้ผ่าน `writeDisabledReason` (title = ข้อความ `expiredNotice`) และ `guardedSave` บน `<form onSubmit>` ยังกัน Enter-submit อยู่ · Task 5 ต้องคง `guardedSave` เป็น onSubmit
3. **company-profile / default-setting เริ่ม gate ด้วย `system_admin.business_unit.update`** (comment ใน catalog บอกว่าคีย์นี้คุมสองหน้านี้) + **user edit เริ่ม gate ด้วย `system_admin.user.update`** (auto-prefix) และ license ปิดปุ่ม — เดิมไม่เช็คเลย → PR body ประกาศ · interface ไม่ gate (leaf ไม่มี permission)
4. **review ของ pc / sc กลับไปหน้า list แทน history** — คนที่มาจากหน้า entry จะไม่กลับไป entry อีก (ต้องเข้า list แล้วเปิดใบเอง) ตาม spec §4; `navigate(-1)` เดิมยังพาไปผิดที่ถ้าเปิด review จากลิงก์ตรง · PR body ประกาศ
5. **step-result ไม่เปลี่ยน** — ปุ่มนั้นคือลิงก์มีป้าย "← Purchase Orders" บนหน้าสำเร็จ ไม่ใช่ปุ่ม back แบบไอคอน การแทนด้วย `BackButton` จะทำป้ายหาย → Ruling: ย้ายเข้า allowlist **ถาวร** (spec §4 ระบุให้แทน — เบี่ยงจาก spec โดยตั้งใจ)

---

### Task 1: branch

```bash
git checkout feature/form-page-shell-wave-2 && git pull --ff-only && git checkout -b feature/form-page-shell-wave-3
```

---

### Task 2: notification-template (2 หน้า) + header skeleton export

**Files:**
- Modify: `components/loader/form-page-skeleton.tsx` — `function HeaderSkeleton` → `export function FormPageHeaderSkeleton` (ใช้ภายในด้วยชื่อใหม่)
- Modify: `routes/system-admin/notification-template/noti-tmpl-form.tsx`

- [ ] **Step 1: export header skeleton** — rename + export, `FormPageSkeleton` เรียก `<FormPageHeaderSkeleton />`

- [ ] **Step 2: header** — บล็อก `<div className="mx-auto w-full max-w-5xl p-[…]">\n      <div className="mb-6 flex …">` … `</div>` (บรรทัด 123–203 ทั้งก้อนหัว) →

```tsx
    <FormPageShell
      header={
        <FormToolbar
          mode={f.mode}
          formId={FORM_ID}
          isPending={isPending}
          title={title}
          badges={
            !isAdd && (
              <Badge
                variant={watchedActive ? "success-light" : "warning-light"}
                size="xs"
                className="tracking-wider uppercase"
              >
                {watchedActive ? ts("active") : ts("inactive")}
              </Badge>
            )
          }
          onBack={f.handleBack}
          onCancel={f.handleCancel}
          onEdit={f.handleEdit}
          onDelete={template ? () => setShowDelete(true) : undefined}
          deleteIsPending={deleteMut.isPending}
          activity={template && { id: template.id, label: template.name }}
        />
      }
    >
```

`</div>` ปิดของคอมโพเนนต์หลัก (บรรทัด 328 — ตัวแรกหลังเปิด shell) → `</FormPageShell>` · ลบ `pendingLabel/actionLabel/submitLabel` · import: ลบ `ChevronLeft, History, Pencil, Save, Trash2, X` (lucide ทั้งบรรทัดถ้าไม่เหลือ) `Button` `openActivity`; ลบ `tActivity` `tc` `tf` ถ้า ESLint ชี้ · เพิ่ม `FormPageShell` `FormToolbar` · ความกว้าง default 4xl (เดิม 5xl — spec §2.1)

- [ ] **Step 3: skeleton ของหน้า** — `NotificationTemplateFormSkeleton`: wrapper `<div className="mx-auto w-full max-w-5xl p-[…]">` + บล็อกหัว `<div className="mb-6 flex …">…</div>` → `<FormPageShell header={<FormPageHeaderSkeleton />}>` ; body (SettingSectionSkeleton + preview grid) คงเดิม · `</div>` ปิด → `</FormPageShell>`

- [ ] **Step 4: gate + commit**

```bash
bunx prettier --write components/loader/form-page-skeleton.tsx routes/system-admin/notification-template/noti-tmpl-form.tsx && bun run typecheck && bun run lint && bun test:run routes/system-admin/notification-template && git add components/loader/form-page-skeleton.tsx routes/system-admin/notification-template && git commit -m "refactor(form): notification-template ใช้ FormToolbar + FormPageShell แทนหัว ChevronLeft ที่เขียนเอง"
```

Expected: `noti-tmpl-form.characterization.test.tsx` เขียว (mock use-can อยู่แล้ว) · Delete เดิม destructive/edit-only → outline/view+edit (ชุดมาตรฐาน)

---

### Task 3: user edit (1 หน้า) + skeleton

**Files:**
- Modify: `routes/system-admin/user/user-assigned-form.tsx:132-200,249`
- Modify: `routes/system-admin/user/user-edit-content.tsx:5,11`

- [ ] **Step 1** — บล็อก `<div className="mx-auto w-full max-w-4xl p-[…]">\n      <AnimationStyles />` + comment 3 บรรทัด + `<header …>…</header>` →

```tsx
    <FormPageShell
      header={
        <FormToolbar
          mode={mode}
          formId="user-assigned-form"
          isPending={isPending}
          title={fullName}
          leading={
            <UserAvatar first={user.user.firstname} last={user.user.lastname} />
          }
          badges={<StatusBadge active={user.user.is_active} className="shrink-0" />}
          subtitle={
            <span className="flex flex-wrap items-center gap-x-2">
              <span className="break-all">{user.user.email}</span>
              <span aria-hidden="true">·</span>
              <span>@{user.user.username}</span>
            </span>
          }
          onBack={handleBack}
          onCancel={handleCancel}
          onEdit={() => setMode("edit")}
        />
      }
    >
      <AnimationStyles />
```

(ลบ comment "header: identity + actions" และ "ปุ่ม back ห้อยออก…" เพราะไม่จริงแล้ว) · `</div>` ปิดท้าย (249) → `</FormPageShell>` · import: ลบ `Loader2, Pencil, Save, X` `Button` `BackButton`; เพิ่ม `FormPageShell` `FormToolbar` · `tc` ลบถ้าไม่เหลือ

- [ ] **Step 2** — `user-edit-content.tsx` → `FormPageSkeleton`

- [ ] **Step 3: gate + commit**

```bash
bunx prettier --write routes/system-admin/user/user-assigned-form.tsx routes/system-admin/user/user-edit-content.tsx && bun run typecheck && bun run lint && bun test:run routes/system-admin/user && git add routes/system-admin/user && git commit -m "refactor(form): user edit ใช้ FormToolbar (avatar เป็น leading) + FormPageShell แทนหัวที่ก๊อป DocFormHeader"
```

---

### Task 4: company-profile + default-setting (2 หน้า)

**Files:**
- Modify: `routes/system-admin/company-profile/company-profile-component.tsx:151-200,238`
- Modify: `routes/system-admin/default-setting/default-setting-component.tsx:157-206,221,292`

สูตรเดียวกันทั้งสองไฟล์ (ตัวแปร `editing` `isBusy` `isError` `data` `handleEdit` `handleCancel` `onSubmit` + mutation ของการ update มีอยู่แล้วทั้งคู่ — ชื่อ mutation ตรวจที่ไฟล์):

- [ ] **Step 1** — wrapper `<div className="mx-auto w-full max-w-4xl space-y-4 p-[…]">` + `<header>…</header>` ทั้งก้อน →

```tsx
    <FormPageShell
      header={
        <FormToolbar
          mode={editing ? "edit" : "view"}
          formId={FORM_ID}
          isPending={update.isPending}
          title={tm("companyProfile")}   // default-setting: expression เดิมของ <h1>
          subtitle={t("pageDescription")} // expression เดิมของ <p>
          permissionPrefix="system_admin.business_unit"
          onCancel={handleCancel}
          onEdit={!isError && !isBusy && data ? handleEdit : undefined}
        />
      }
    >
```

ไม่ส่ง `onBack` (หน้า leaf ของเมนู) · `const FORM_ID = "company-profile-form";` / `"default-setting-form"` ระดับโมดูล · `<form onSubmit={onSubmit}>` → `<form id={FORM_ID} onSubmit={onSubmit}>` · `</div>` ปิดของคอมโพเนนต์หลัก → `</FormPageShell>` (default-setting มีคอมโพเนนต์ย่อยก่อนคอมโพเนนต์หลัก — แทนตัวแรกหลังตำแหน่งเปิด shell) · import: ลบ `Loader2, Pencil, Save, X` `Button` ถ้าไม่เหลือผู้ใช้; เพิ่ม `FormPageShell` `FormToolbar`

**Ruling (ทั้งสองหน้า):** ซ่อนปุ่ม Edit จนข้อมูลพร้อม (เดิมซ่อนทั้งแถบ) · ปุ่ม Save ใน edit มาจาก FormToolbar เป็น submit ของ form (เดิม `onClick`) · pending แสดงด้วย label "Saving…" แทน spinner

- [ ] **Step 2: gate + commit**

```bash
bunx prettier --write routes/system-admin/company-profile/company-profile-component.tsx routes/system-admin/default-setting/default-setting-component.tsx && bun run typecheck && bun run lint && bun test:run routes/system-admin/company-profile && git add routes/system-admin/company-profile routes/system-admin/default-setting && git commit -m "refactor(form): company-profile/default-setting ใช้ FormToolbar (ไม่มีปุ่มย้อนกลับ) + FormPageShell"
```

---

### Task 5: interface detail

**Files:**
- Modify: `routes/system-admin/interface/interface-page-layout.tsx:97-150,169`
- Modify: `routes/system-admin/interface/interface-detail.route.tsx:55-63` (Suspense fallback)

- [ ] **Step 1: layout** — เพิ่ม `const t = useTranslations("systemAdmin.interface");` · wrapper + `<header className="mb-6 …">…</header>` →

```tsx
    <FormPageShell
      header={
        <FormToolbar
          mode={isEditing ? "edit" : "view"}
          formId="interface-config-form"
          isPending={isSaving}
          title={title}
          subtitle={description}
          submitLabel={saveLabel}
          writeDisabledReason={isExpired ? t("expiredNotice") : undefined}
          onCancel={() => {
            onCancel();
            setIsEditing(false);
          }}
          onEdit={!isError && !isLoading ? () => setIsEditing(true) : undefined}
        />
      }
    >
```

`<form onSubmit={guardedSave}>` → `<form id="interface-config-form" onSubmit={guardedSave}>` (คง `guardedSave` — Review Focus 2) · `</div>` ปิด → `</FormPageShell>` · import: ลบ `Loader2, Pencil, Save, X` `Button`; เพิ่ม `FormPageShell` `FormToolbar` · ไม่ส่ง `permissionPrefix` (leaf ไม่มี permission → ไม่ gate เหมือนเดิม)

- [ ] **Step 2: route fallback** — `<div className="mx-auto w-full max-w-4xl p-[…]"><SettingSectionSkeleton …/></div>` → `<FormPageSkeleton />` · ลบ import `SettingSectionSkeleton` ถ้าไม่เหลือ

- [ ] **Step 3: gate + commit**

```bash
bunx prettier --write routes/system-admin/interface/interface-page-layout.tsx routes/system-admin/interface/interface-detail.route.tsx && bun run typecheck && bun run lint && bun test:run routes/system-admin/interface && git add routes/system-admin/interface && git commit -m "refactor(form): interface detail ใช้ FormToolbar (หมดอายุ = writeDisabledReason) + FormPageShell"
```

---

### Task 6: ปุ่มย้อนกลับของ wizard + sc-form + review

**Files:**
- Modify: `routes/procurement/goods-receive-note/from-po/from-po-content.tsx:121-129` · `routes/procurement/purchase-order/from-pr/from-pr-content.tsx:157-165` · `routes/procurement/purchase-order/from-price-list/from-price-list-content.tsx:275-283` · `routes/procurement/purchase-request/from-template/from-template-content.tsx:70-78` · `routes/procurement/purchase-request/from-template/qty-step.tsx:188-196`
- Modify: `routes/inventory-management/spot-check/sc-form.tsx:162-171`
- Modify: `routes/inventory-management/physical-count/pc-review-component.tsx:58` · `routes/inventory-management/spot-check/sc-review-component.tsx:52-55`

- [ ] **Step 1: wizard 5 จุด** — แต่ละจุด

```tsx
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={X}
          aria-label={tc("goBack")}
          className="mt-0.5"
        >
          <ArrowLeft />
        </Button>
```

→ `<BackButton onClick={X} className="mt-0.5" />` (X = `handleCancel` / `() => navigate(PR_LIST_PATH)` / `onBack` ตามไฟล์) · import `BackButton` จาก `@/components/share/back-button` · ลบ `ArrowLeft` จาก lucide import และ `Button` / `tc` ถ้า ESLint ชี้ว่าไม่เหลือผู้ใช้ · ไม่แตะ sticky footer / Stepper / navGuard

- [ ] **Step 2: sc-form** — ปุ่ม ghost `size="sm"` + `<ChevronLeft />` → `<BackButton onClick={handleBack} />` · ลบ `ChevronLeft` จาก import

- [ ] **Step 3: review** — pc: `onBack={() => navigate(-1)}` → `onBack={() => navigate("/inventory-management/physical-count")}` · sc: `else navigate(-1);` → `else navigate("/inventory-management/spot-check");`

- [ ] **Step 4: gate + commit**

```bash
bunx prettier --write routes/procurement/goods-receive-note/from-po/from-po-content.tsx routes/procurement/purchase-order/from-pr/from-pr-content.tsx routes/procurement/purchase-order/from-price-list/from-price-list-content.tsx routes/procurement/purchase-request/from-template/from-template-content.tsx routes/procurement/purchase-request/from-template/qty-step.tsx routes/inventory-management/spot-check/sc-form.tsx routes/inventory-management/physical-count/pc-review-component.tsx routes/inventory-management/spot-check/sc-review-component.tsx && bun run typecheck && bun run lint && bun test:run routes/procurement routes/inventory-management/spot-check routes/inventory-management/physical-count && git add routes/procurement routes/inventory-management && git commit -m "refactor(form): ปุ่มย้อนกลับของ wizard 4 หน้า + sc-form ใช้ BackButton, review pc/sc กลับหน้า list แทน history"
```

---

### Task 7: guard allowlist

**Files:**
- Modify: `components/share/__tests__/form-page-shell.usage.test.ts`
- Modify: `docs/superpowers/specs/2026-10-01-form-page-shell-design.md` §5

- [ ] **Step 1** — ลบบล็อก `// ── PR 3` ทั้งก้อน แล้วเพิ่มในบล็อกถาวร:

```ts
  "routes/procurement/purchase-order/from-pr/step-result.tsx": 1, // ลิงก์มีป้าย "← Purchase Orders" บนหน้าสำเร็จ ไม่ใช่ปุ่ม back
```

**Ruling:** step-result ถาวร (Review Focus 5)

- [ ] **Step 2** — `bun test:run components/share/__tests__/form-page-shell.usage.test.ts` → 4/4 · allowlist 14 ไฟล์ · ถ้าไฟล์ของ Task 2–6 โผล่ = ย้ายไม่ครบ

- [ ] **Step 3** — แก้ spec §5 ให้ allowlist ถาวรมี step-result + เหตุผล แล้ว commit พร้อมกัน

```bash
bun run lint && git add components/share/__tests__/form-page-shell.usage.test.ts docs/superpowers/specs/2026-10-01-form-page-shell-design.md && git commit -m "test(form): guard allowlist เหลือ 14 ไฟล์ — ถาวร 3 (legal, pe-review, step-result) + ระลอกเอกสาร 10 + orphan 1"
```

---

### Task 8: ตรวจ + PR

- [ ] **Step 1** — `bun run typecheck && bun run lint && bun test:run > .superpowers/sdd/2026-10-01-form-page-shell-pr3/tests.log 2>&1; tail -15 …` → เขียวยกเว้น 2 เคสเดิม

- [ ] **Step 2: เบราว์เซอร์**

| หน้า | ดูอะไร |
|---|---|
| `/system-admin/notification-template/<id>` | 4xl · Edit · Delete · Activity · badge สถานะ · 596px back ครบ |
| `/system-admin/user/<id>` | avatar หน้าชื่อ · subtitle email · Edit → Cancel/Save |
| `/system-admin/company-profile` | ไม่มีปุ่ม back · Edit → ปุ่ม Save มี `form="company-profile-form"` และ `document.getElementById` ของ id นั้นเป็น `<form>` ที่ mount อยู่ (Review Focus 1) — **ไม่กดบันทึกจริง** backend ในเครื่องชี้ DB dev ที่ใช้ร่วมกัน (memory `local-backend-is-shared-dev-db`) |
| `/system-admin/default-setting` | เหมือน company-profile |
| `/system-admin/interface/<category>/<brand>` | Edit → Cancel ทำงาน · Save submit ผ่าน form (ไม่ต้องบันทึกจริง — config ของระบบเชื่อมต่อ) · ถ้ามี brand หมดอายุ: Edit disabled + title |
| wizard 4 หน้า (`/procurement/goods-receive-note/from-po` ฯลฯ) | BackButton ไม่มี hover พื้นหลัง, ตำแหน่งตรงหัว |
| `/inventory-management/spot-check/location/<id>` | BackButton แทน ChevronLeft |

- [ ] **Step 3: push + PR** — base `feature/form-page-shell-wave-2`

```bash
git push -u origin feature/form-page-shell-wave-3
gh pr create --base feature/form-page-shell-wave-2 --title "refactor(form): hand-built form headers and back buttons go through FormToolbar / BackButton (wave 3)" --body-file .superpowers/sdd/2026-10-01-form-page-shell-pr3/pr-body.md
```

PR body: 6 หน้า + wizard/sc-form/review · พฤติกรรมเปลี่ยน (Review Focus 1–5) · noti 5xl→4xl, Delete outline view+edit · company/default/user เริ่ม gate · spinner → label · step-result คงไว้ · guard 27→14 · ลำดับ merge #211 → #212 → PR นี้
