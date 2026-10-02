# ListPageShell — PR 3 (system-admin · report · config · operation-plan) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ย้าย 26 หน้า list ใน system-admin / report / config / operation-plan มาใช้ `ListPageShell` (+ `DocumentListActions` / `DisplayModeToggle` / `listGridMaxH`) ให้ guard allowlist เหลือ 12 ไฟล์ (PR 4 11 + ถาวร 1)

**Architecture:** ของกลางมีครบแล้วจาก PR 1 (#207) — งานนี้ไม่สร้างคอมโพเนนต์ใหม่ · หน้าที่ก๊อป wrapper ของ CLT (sticky clone) แปลงด้วยสคริปต์เดียวกับ PR 2 · หน้าที่โครงต่าง (ไม่ sticky / `DisplayTemplate` / `<h1>` สด) แก้มือตาม recipe ต่อหน้า · ปุ่ม action ที่ตรงกับ `DocumentListActions` 1:1 แทนด้วยมัน ส่วนบล็อก action ที่มีปุ่มเฉพาะหน้า (Init, Update rate, generateNext, Import/Export/Scan) **คงไว้ทั้งก้อน**ใน slot `actions`

**Tech Stack:** React 19 + React Compiler · react-router 7 · Tailwind v4 · use-intl · Vitest · bun · Python 3 (สคริปต์แปลง)

**Spec:** `docs/superpowers/specs/2026-10-01-list-page-shell-design.md` · plan ก่อนหน้า: `docs/superpowers/plans/2026-10-01-list-page-shell-pr1-pr2.md`

## Global Constraints

- ภาษาสื่อสาร/commit = ไทย · PR title/body อังกฤษ (CLAUDE.md)
- **ไม่แตะ** query / column / filter field / i18n key / การ navigate (spec §4) — ข้อยกเว้นที่ประกาศไว้ในแต่ละ task เท่านั้น
- `components/` ห้าม import จาก `routes/` · `"use no memo"` ระดับฟังก์ชัน คงของเดิม (coam มี 2 จุด)
- ไม่ squash-merge · branch จาก `main` หลัง #207 + #208 merge (ถ้ายังไม่ merge ให้แตกจาก `feature/list-page-shell-wave-1` แล้วเปิด PR base ที่ branch นั้น เหมือน ruling ของ PR 2)
- gate ทุก task: `bun run typecheck && bun run lint` (lint baseline = 137 warnings ห้ามเพิ่ม) · ก่อน PR: `bun test:run` เขียวยกเว้น 2 แดงเดิมใน `routes/accounting/accounts-payable/ap-mock-repository.test.ts`
- ไม่เขียนเทสต์ใหม่ (preference ผู้ใช้) · เทสต์เดิมที่ต้องเขียวโดยไม่แก้ assertion: `routes/system-admin/interface/interface-list.test.tsx` และทุกเทสต์ใต้ 4 โมดูลนี้
- ปุ่ม pagination ในเบราว์เซอร์กดด้วย JS `.click()` (ref click ของ extension ไม่ยิง onClick) · มือถือดูผ่านหน้าต่างแคบหรือ iframe กว้าง <640px (`resize_window` ไม่เปลี่ยน viewport)

## Review Focus

1. **ตารางค้างตอนเปลี่ยนหน้า** หลัง JSX ตารางกลายเป็น children ของ shell (กับดัก React Compiler, `routes/CLAUDE.md`) — ไม่มี unit test → Task 9 กด 1→2→1 ทุกหน้าที่มี >1 หน้า ถ้าค้างใส่ `"use no memo"` ที่คอมโพเนนต์หน้านั้น commit แยก
2. **ปุ่ม Export/Print "coming soon" ที่ disabled หายไป** (op-plan 5 หน้า + recipe-equipment-category) เมื่อแทนด้วย `DocumentListActions hideExportPrint` — เป็นการตัดสินใจในแผนนี้ (ดู Task 3) ผู้ใช้ต้องเห็นใน PR body
3. **noti-tmpl เปลี่ยนจาก `<Link>` เป็น `navigate()`** — เปิดแท็บใหม่ด้วย cmd-click ไม่ได้อีก (ปุ่ม Add ของทุกหน้า list อื่นเป็น navigate อยู่แล้ว) → Task 6 ระบุ · Task 9 กดปุ่มแล้วต้องไปหน้า new
4. **หน้า `max-w-4xl` 3 หน้า (email-profile / email-template / interface) กลายเป็นเต็มความกว้าง** — การ์ด/ตารางในนั้นออกแบบมาที่ 56rem อาจยืดจนอ่านยาก → Task 8 ให้ดูในเบราว์เซอร์ก่อน commit ถ้าเนื้อหาเสียทรง คง `max-w-4xl` ไว้ที่ **children** (ไม่ใช่ที่ wrapper) แล้วบันทึก ruling
5. **document-component มีสูตรความสูง 4 ค่าตาม `summarySlotVisible`** — แทนผิดแล้วตารางจะถูกแถบสรุปทับ → Task 2 แทนเฉพาะกิ่ง `!summarySlotVisible` และเปิดหน้าทั้งสองสถานะ

---

### Task 1: branch + สคริปต์แปลง

**Files:**
- Create: `.superpowers/sdd/2026-10-01-list-page-shell-pr3/shellify.py` (scratch, gitignored — ถ้าโฟลเดอร์ `.superpowers/sdd/2026-10-01-list-page-shell-pr1-pr2/shellify.py` ยังอยู่ ใช้ตัวนั้นได้เลย เนื้อหาเดียวกัน)

**Interfaces:**
- Produces: `python3 shellify.py <file.tsx>...` — แปลงหน้า "sticky clone" (มี `pb-[max(1rem…` + sticky block + `mt-3 space-y-3`) เป็น `<ListPageShell>`; actions/toolbar ยกไปทั้งก้อน (ตัด JSX comment, ห่อ `<>` ถ้ามีหลาย element); แทน `(lf.)?activeFilters.length > 0 ? 13rem : 1[01]rem` ด้วย `listGridMaxH(...)`

- [ ] **Step 1: branch**

```bash
git checkout main && git pull
git checkout -b feature/list-page-shell-wave-2
```

(ถ้า #207/#208 ยังไม่ merge: `git checkout -b feature/list-page-shell-wave-2 feature/list-page-shell-wave-1`)

- [ ] **Step 2: สคริปต์** — เขียนไฟล์ด้านล่างทั้งก้อน

```python
import re, sys
FILES = sys.argv[1:]
STICKY_OPEN = '      <div className="sticky top-0 z-20 space-y-3 pb-3 sm:static sm:pb-0">\n'
WRAP_OPEN = '    <div className="pb-[max(1rem,env(safe-area-inset-bottom))]">\n'
HDR_OPEN = '        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">\n'
MT3 = '      <div className="mt-3 space-y-3">\n'
for p in FILES:
    s = open(p).read()
    imp = 'import { DocumentListHeader } from "@/components/share/document-list-header";\n'
    assert imp in s, f"{p}: no DLH import"
    s = s.replace(imp, 'import { ListPageShell } from "@/components/share/list-page-shell";\nimport { listGridMaxH } from "@/components/share/list-grid-max-h";\n')
    i_ret = s.index('  return (\n' + WRAP_OPEN)
    i_sticky = s.index(STICKY_OPEN, i_ret)
    i_hdr = s.index(HDR_OPEN, i_sticky)
    i_dlh = s.index('<DocumentListHeader', i_hdr)
    i_dlh_end = s.index('/>', i_dlh) + 2
    dlh = s[i_dlh:i_dlh_end]
    m = re.search(r'count=\{([^}]*)\}', dlh)
    count = m.group(1) if m else None
    i_hdr_close = s.index('\n        </div>\n', i_dlh_end) + 1
    strip_c = lambda x: re.sub(r'\{/\*.*?\*/\}', '', x, flags=re.S).strip()
    actions = strip_c(s[i_dlh_end:i_hdr_close])
    i_mt3 = s.index(MT3, i_hdr_close)
    i_sticky_close = s.rindex('\n      </div>\n', i_hdr_close, i_mt3) + 1
    toolbar = strip_c(s[i_hdr_close + len('        </div>\n'):i_sticky_close])
    tops = [l for l in toolbar.split('\n') if l.startswith('        <') and not l.startswith('        </')] + ([toolbar.split('\n')[0]] if toolbar.startswith('<') else [])
    if len(tops) > 1:
        toolbar = '<>\n' + toolbar + '\n</>'
    i_content = i_mt3 + len(MT3)
    i_mt3_close = s.index('\n      </div>\n', i_content) + 1
    content = s[i_content:i_mt3_close]
    i_outer_close = s.index('\n    </div>\n  );\n}', i_mt3_close) + 1
    trailing = s[i_mt3_close + len('      </div>\n'):i_outer_close]
    head = f'  return (\n    <ListPageShell\n      title={{t("title")}}\n      description={{t("desc")}}\n'
    if count: head += f'      count={{{count}}}\n'
    if actions: head += f'      actions={{\n{actions}\n      }}\n'
    if toolbar: head += f'      toolbar={{\n{toolbar}\n      }}\n'
    head += '    >\n'
    new = head + content + trailing + '    </ListPageShell>\n  );\n}'
    s = s[:i_ret] + new + s[i_outer_close + len('    </div>\n  );\n}'):]
    s, n = re.subn(r'((?:lf\.)?activeFilters\.length > 0)\n\s*\? "max-h-\[calc\(100vh-13rem-3rem\)\]"\n\s*: "max-h-\[calc\(100vh-1[01]rem-3rem\)\]",', r'listGridMaxH(\1),', s)
    assert n >= 1, f"{p}: max-h not replaced"
    assert 'DocumentListHeader' not in s and 'sticky top-0 z-20' not in s and 'mt-3 space-y-3' not in s
    open(p, 'w').write(s)
    print(f"{p}: actions={'yes' if actions else 'no'} toolbar={'yes' if toolbar else 'no'} count={count} maxh={n}")
```

ข้อจำกัดที่ต้องรู้: ใช้ได้กับไฟล์ที่ `title={t("title")}` / `description={t("desc")}` เท่านั้น (ทุกหน้า sticky clone ในกลุ่มนี้เป็นแบบนั้น) · หลังรันต้อง `bunx prettier --write` เสมอ · import ที่ไม่ใช้แล้ว (`Plus`, `Button`, `DropdownMenu*`, `SearchInput` …) สคริปต์ไม่ลบ — ESLint `no-unused-vars` เป็น error จะบอกเอง

- [ ] **Step 3: ไม่ commit** (scratch) — ไปต่อ Task 2

### Task 2: 4 หน้า sticky clone + ListToolbar ไม่มีปุ่ม Add — activity-log · document · user-activity · user

**Files:**
- Modify: `routes/system-admin/activity-log/activity-log-component.tsx`, `routes/system-admin/user-activity/user-activity-component.tsx`, `routes/system-admin/user/user-component.tsx` (สคริปต์ล้วน)
- Modify: `routes/system-admin/document/document-component.tsx` (สคริปต์ + แก้มือสูตรความสูง ~บรรทัด 268-278)
- Modify: `components/share/__tests__/list-page-shell.usage.test.ts` (ตัด 4 บรรทัด)

**Interfaces:**
- Consumes: `ListPageShell`, `listGridMaxH` (PR 1)

- [ ] **Step 1: รันสคริปต์** — `python3 <path>/shellify.py` กับ 4 ไฟล์ · คาด `actions=no toolbar=yes count=totalRecords` ทั้ง 4 · document จะได้ `maxh=1` (จับได้แค่กิ่งล่าง) — ถ้า assert `max-h not replaced` แดงที่ document ให้ดู Step 2 ก่อน

- [ ] **Step 2: document-component สูตรความสูง** — บล็อกเดิม

```tsx
              className={cn(
                "flex flex-col",
                summarySlotVisible
                  ? lf.activeFilters.length > 0
                    ? "max-h-[calc(100vh-17rem-3rem)]"
                    : "max-h-[calc(100vh-14rem-3rem)]"
                  : lf.activeFilters.length > 0
                    ? "max-h-[calc(100vh-13rem-3rem)]"
                    : "max-h-[calc(100vh-10rem-3rem)]",
              )}
```

→ (สคริปต์แทนกิ่งล่างให้แล้ว ถ้ายังไม่แทนให้แก้มือ)

```tsx
              className={cn(
                "flex flex-col",
                // แถบสรุป (summary slot) สูง 4rem กินพื้นที่เหนือตาราง — บวกจากสูตรกลาง
                summarySlotVisible
                  ? lf.activeFilters.length > 0
                    ? "max-h-[calc(100vh-17rem-3rem)]"
                    : "max-h-[calc(100vh-14rem-3rem)]"
                  : listGridMaxH(lf.activeFilters.length > 0),
              )}
```

- [ ] **Step 3: prettier + ลบ import ที่ไม่ใช้ตาม ESLint** — `bunx prettier --write <4 ไฟล์>` แล้ว `bunx eslint <4 ไฟล์>` ลบ import ที่รายงาน `no-unused-vars` (คาดว่าไม่มี — หน้ากลุ่มนี้ไม่มีปุ่มในหัว)

- [ ] **Step 4: allowlist + ตรวจ** — ตัด 4 ไฟล์ออกจาก `ALLOWED` ใน guard test
Run: `bun run typecheck && bun run lint && bun test:run components/share/__tests__/list-page-shell.usage.test.ts routes/system-admin/activity-log routes/system-admin/document routes/system-admin/user-activity routes/system-admin/user`
Expected: เขียว

- [ ] **Step 5: Commit**

```bash
git add routes/system-admin/activity-log/activity-log-component.tsx routes/system-admin/document/document-component.tsx routes/system-admin/user-activity/user-activity-component.tsx routes/system-admin/user/user-component.tsx components/share/__tests__/list-page-shell.usage.test.ts
git commit -m "refactor(list): activity-log/document/user-activity/user ใช้ ListPageShell"
```

### Task 3: 5 หน้า operation-plan — ปุ่ม Export/Print "coming soon" + Add + dropdown → `DocumentListActions hideExportPrint`

**Files:**
- Modify: `routes/operation-plan/equipment/eq-component.tsx`, `routes/operation-plan/cuisine/cuisine-component.tsx`, `routes/operation-plan/category/recipe-category-component.tsx`, `routes/operation-plan/equipment-category/equipment-category-component.tsx`, `routes/operation-plan/recipe/recipe-component.tsx`
- Modify: guard allowlist (ตัด 5)

**Interfaces:**
- Consumes: `DocumentListActions` (`onAdd`, `addLabel`, `hideExportPrint`)

**การตัดสินใจ (ประกาศใน PR body):** ทั้ง 5 หน้าวาดปุ่ม Export/Print ที่ `disabled title={tc("comingSoon")}` + dropdown มือถือที่มีสองรายการ disabled — ไม่เคยทำงาน หน้า list อื่นทั้งแอปโชว์ Export/Print เฉพาะที่ใช้ได้จริง จึง**ตัดปุ่ม placeholder ทิ้ง** เหลือ Add ผ่าน `DocumentListActions hideExportPrint` (เมื่อมี export จริงค่อยส่ง `onExport` — ปุ่มกลับมาเอง)

- [ ] **Step 1: แทนบล็อก action ทั้ง 5 ไฟล์** — ใน Python/มือ: หาบล็อกตั้งแต่บรรทัด `          <div className="flex w-full items-center gap-2 sm:w-auto">` ถึง `\n          </div>\n` ที่ปิดมัน (ครอบ Export/Print disabled + Add + `<DropdownMenu>…</DropdownMenu>`) แทนด้วย

```tsx
          <DocumentListActions
            onAdd={<onClick เดิมของปุ่ม Add>}
            addLabel={t("add")}
            hideExportPrint
          />
```

`onAdd` ต่อไฟล์ (คัดลอกจาก `onClick` ของปุ่ม `<Plus>` เดิม ห้ามเปลี่ยน path):
  - eq: `() => navigate("/operation-plan/equipment/new", listReturnState())`
  - cuisine: `() => navigate("/operation-plan/cuisine/new", listReturnState())`
  - recipe-category: `() => navigate("/operation-plan/category/new", listReturnState())`
  - recipe: `() => navigate("/operation-plan/recipe/new", listReturnState())`
  - equipment-category: `() => { setEditCategory(null); setDialogOpen(true); }` — เปิดไฟล์ดู setter ชื่อจริงก่อน (grep `<Plus aria-hidden` ขึ้นไป 8 บรรทัด)

เพิ่ม `import { DocumentListActions } from "@/components/share/document-list-actions";`

- [ ] **Step 2: รันสคริปต์** กับ 5 ไฟล์ → คาด `actions=yes toolbar=yes count=totalRecords maxh=2`

- [ ] **Step 3: prettier + ESLint ลบ import ที่ตาย** — คาด: `Download`, `Printer`, `Plus`, `MoreHorizontal` จาก lucide (คง `Loader2` ถ้ายังใช้ที่ sentinel), `DropdownMenu*` ทั้งชุด, อาจรวม `Button` และ `tc` (ถ้าไม่เหลือที่ใช้ ลบ `const tc = useTranslations("common")` ด้วย)

- [ ] **Step 4: allowlist + ตรวจ**
Run: `bun run typecheck && bun run lint && bun test:run components/share/__tests__/list-page-shell.usage.test.ts routes/operation-plan`
Expected: เขียว

- [ ] **Step 5: Commit**

```bash
git add routes/operation-plan components/share/__tests__/list-page-shell.usage.test.ts
git commit -m "refactor(list): 5 หน้า operation-plan ใช้ ListPageShell + ตัดปุ่ม Export/Print ที่ยังไม่ทำงาน"
```

### Task 4: system-admin ที่เหลือ 4 หน้า — inventory-period · running-code · role · workflow

**Files:**
- Modify: `routes/system-admin/inventory-period/inventory-period-component.tsx` (สคริปต์ล้วน — action block คงไว้)
- Modify: `routes/system-admin/running-code/running-code-component.tsx` (สคริปต์ล้วน — action block คงไว้)
- Modify: `routes/system-admin/role/role-component.tsx`, `routes/system-admin/workflow/wf-component.tsx` (Plus → DLA แล้วสคริปต์)
- Modify: guard allowlist (ตัด 4)

**Interfaces:** เหมือน Task 3

**ทำไมสองหน้าแรกคง action block:** inventory-period มี dropdown เฉพาะหน้า (generateNext/export/print) ที่อยู่**หลัง** Add ทุกขนาดจอ · running-code มีปุ่ม Init + dropdown มือถือที่รวม Init — `DocumentListActions` วาง `extraActions` ก่อน Add และ dropdown มือถือไม่รับรายการเพิ่ม แทนแล้วพฤติกรรมเปลี่ยน → คงทั้งก้อนใน slot `actions` (shell รับ ReactNode ใด ๆ)

- [ ] **Step 1: role + wf แทนปุ่ม Add** — บล็อก

```tsx
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              size="sm"
              onClick={…}
            >
              <Plus aria-hidden="true" />
              {t("add")}        // wf: {t("newWorkflow")}
            </Button>
          </div>
```

→ role: `<DocumentListActions onAdd={() => navigate("/system-admin/role/new", listReturnState())} addLabel={t("add")} hideExportPrint />` · wf: `<DocumentListActions onAdd={() => navigate(`/system-admin/workflow/new?type=${docType}`, listReturnState())} addLabel={t("newWorkflow")} hideExportPrint />` + import DLA

- [ ] **Step 2: รันสคริปต์** กับ 4 ไฟล์ → inventory-period/running-code `actions=yes` (ก้อนเดิม) · role/running-code toolbar = `<div className="flex w-full items-center gap-2"><div className="flex-1"><SearchInput …/></div></div>` ยกไปทั้งก้อน · wf toolbar = `<SearchInput …/>` ตัวเดียว · ทุกไฟล์ `maxh=1`

- [ ] **Step 3: prettier + ESLint** — role/wf: ลบ `Plus`, อาจ `Button` · inventory-period/running-code: ไม่ควรมี import ตาย

- [ ] **Step 4: allowlist + ตรวจ**
Run: `bun run typecheck && bun run lint && bun test:run components/share/__tests__/list-page-shell.usage.test.ts routes/system-admin/inventory-period routes/system-admin/running-code routes/system-admin/role routes/system-admin/workflow`
Expected: เขียว (`wf-*` มีเทสต์หลายไฟล์ ต้องไม่แก้)

- [ ] **Step 5: Commit**

```bash
git add routes/system-admin/inventory-period/inventory-period-component.tsx routes/system-admin/running-code/running-code-component.tsx routes/system-admin/role/role-component.tsx routes/system-admin/workflow/wf-component.tsx components/share/__tests__/list-page-shell.usage.test.ts
git commit -m "refactor(list): inventory-period/running-code/role/workflow ใช้ ListPageShell"
```

### Task 5: sticky clone ที่มี toolbar เอง — exchange-rate · report-list

**Files:**
- Modify: `routes/config/exchange-rate/exchange-rate-component.tsx` (toggle → `DisplayModeToggle`, action block คงไว้, สคริปต์)
- Modify: `routes/report/list/report-component.tsx` (แก้มือ — content wrapper เป็น `mt-3` ไม่ใช่ `mt-3 space-y-3` สคริปต์ใช้ไม่ได้)
- Modify: guard allowlist (ตัด 2)

**Interfaces:**
- Consumes: `DisplayModeToggle` (`value`, `onChange`, `className`)

- [ ] **Step 1: exchange-rate** — แทนบล็อก `<div className="flex items-center rounded-md border"> … 2 ปุ่ม LayoutList/LayoutGrid … </div>` (อยู่ใน `{!isMobile && ( … )}`) ด้วย `<DisplayModeToggle value={displayMode} onChange={setDisplayMode} />` (คง `{!isMobile && (…)}` ไว้) · import `DisplayModeToggle` · ตัด `LayoutGrid, LayoutList` จาก lucide import · หน้านี้ใช้ `max-h-[calc(100vh-13rem-3rem)]` ค่าเดียวไม่มี ternary → สคริปต์จะ assert `max-h not replaced` แดง: ให้แก้มือ**ก่อน**รันสคริปต์เป็น `className={cn("flex flex-col", listGridMaxH(false))}` (ไม่มี ActiveFilterBar ในหน้านี้ — ตารางสูงขึ้น 3rem ระบุใน PR body) และคอมเมนต์บรรทัด `assert n >= 1` ชั่วคราวตอนรันไฟล์นี้ · รันสคริปต์ → `actions=yes` (Add manual + Update คงไว้) `toolbar=yes`

- [ ] **Step 2: report-list แก้มือ** — โครงเดิม: `<div className="pb-[max…">` › sticky block { header row (DLH, ไม่มี actions) · toolbar (`flex w-full items-center gap-2` มี SearchInput/ViewSelector/ListFilter/toggle) · `<ActiveFilterBar>` } › `<div className="mt-3">` content. แปลงเป็น

```tsx
  return (
    <ListPageShell
      title={t("title")}
      description={t("desc")}
      count={…ตามเดิมถ้ามี…}
      toolbar={
        <>
          <div className="flex w-full items-center gap-2">
            …SearchInput / span / ViewSelector / ListFilter เดิมทุกบรรทัด…
            <DisplayModeToggle
              value={displayMode}
              onChange={setDisplayMode}
              className="hidden sm:flex"
            />
          </div>
          <ActiveFilterBar filters={lf.activeFilters} onClearAll={lf.clearAll} />
        </>
      }
    >
      …เนื้อหาเดิมใต้ <div className="mt-3"> (ตัด div นั้นทิ้ง shell ห่อให้)…
    </ListPageShell>
  );
```

aria-label ของปุ่มเปลี่ยนจาก `t("listView")`/`t("gridView")` (namespace report) เป็น `common.aria.listView/gridView` ของ `DisplayModeToggle` — ข้อความเดียวกัน คีย์ report เดิมอาจกลายเป็นคีย์ตาย **ไม่ลบ** (spec: ไม่แตะ i18n) · `max-h-[calc(100vh-13rem-3rem)]` → `listGridMaxH(lf.activeFilters.length > 0)` (มี ActiveFilterBar) · ตัด `LayoutGrid, LayoutList` import

- [ ] **Step 3: prettier + ESLint + allowlist + ตรวจ**
Run: `bun run typecheck && bun run lint && bun test:run components/share/__tests__/list-page-shell.usage.test.ts routes/config/exchange-rate routes/report/list`
Expected: เขียว

- [ ] **Step 4: Commit**

```bash
git add routes/config/exchange-rate/exchange-rate-component.tsx routes/report/list/report-component.tsx components/share/__tests__/list-page-shell.usage.test.ts
git commit -m "refactor(list): exchange-rate/report list ใช้ ListPageShell + DisplayModeToggle"
```

### Task 6: หน้าไม่ sticky 4 หน้า — history · schedules · notification-template · dashboard-dataset

**Files:**
- Modify: `routes/report/history/history-component.tsx`, `routes/report/schedules/schedule-component.tsx`, `routes/system-admin/notification-template/noti-tmpl.tsx`, `routes/system-admin/dashboard-dataset/dashboard-dataset-component.tsx` (แก้มือทั้งหมด)
- Modify: guard allowlist (ตัด 4)

**Interfaces:** `ListPageShell`, `DocumentListActions`, `DisplayModeToggle`, `listGridMaxH`

พฤติกรรมที่เปลี่ยนโดยตั้งใจ: ทั้ง 4 หน้าได้บล็อก sticky บนมือถือ · noti-tmpl เสีย padding `p-3` ที่ซ้อน root-layout · noti-tmpl ปุ่ม Add จาก `<Link>` เป็น `navigate()`

- [ ] **Step 1: history** — wrapper เดิม (ไม่มี `pb-[max`) › DLH › toolbar `flex flex-wrap items-center justify-between gap-2` (SearchInput + toggle) › content. ใหม่: `<ListPageShell title description count={…เดิม}>` · `toolbar={<div className="flex flex-wrap items-center justify-between gap-2"><div className="w-full flex-1 sm:w-auto sm:flex-initial"><SearchInput …/></div><DisplayModeToggle value={displayMode} onChange={setDisplayMode} className="hidden sm:flex" /></div>}` · children = บล็อก `{isGridMode ? <GridContent…/> : <DataGrid…>}` เดิม · `max-h-[calc(100vh-13rem-3rem)]` → `listGridMaxH(false)` (หน้านี้ไม่มี ActiveFilterBar — ตารางสูงขึ้น 3rem ระบุใน PR body) · ตัด `LayoutGrid, LayoutList`

- [ ] **Step 2: schedules** — header row (DLH + `<Button size="sm" onClick={() => setCreateOpen(true)}><Plus …/>{t("createSchedule")}</Button>`) › DataGrid. ใหม่: `<ListPageShell title description actions={<DocumentListActions onAdd={() => setCreateOpen(true)} addLabel={t("createSchedule")} hideExportPrint />}>` · children = DataGrid เดิม · max-h 13rem → `listGridMaxH(false)` (ไม่มี filter bar) · ตัด `Plus`

- [ ] **Step 3: noti-tmpl** — เดิม `<div className="space-y-4 p-3 pb-[max…">` › row (DLH + `<Button asChild><Link to={`${LIST_PATH}/new`}>`) › `<SearchInput>` › DataGrid. ใหม่:

```tsx
  const navigate = useNavigate();   // เพิ่ม import { useNavigate } from "react-router"
  …
  return (
    <ListPageShell
      title={t("title")}
      description={t("desc")}
      count={totalRecords}
      actions={
        <DocumentListActions
          onAdd={() => navigate(`${LIST_PATH}/new`)}
          addLabel={t("add")}
          hideExportPrint
        />
      }
      toolbar={
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-auto sm:flex-initial">
            <SearchInput defaultValue={search} onSearch={setSearch} />
          </div>
        </div>
      }
    >
      <DataGrid …เดิม…>
    </ListPageShell>
  );
```

ตัด `Link` (ถ้าไม่เหลือที่ใช้), `Plus` · `DataGridContainer` เดิมไม่มี max-h — **ไม่เพิ่ม** (หน้าเล็ก)

- [ ] **Step 4: dashboard-dataset** — เดิม `<div className="space-y-4 pb-[max…">` › DLH › `<div className="relative max-w-sm">` (Search icon + Input) › loading/empty/card grid. ใหม่: `<ListPageShell title description count={total} toolbar={<div className="relative max-w-sm">…Input เดิม…</div>}>` children = ส่วนที่เหลือ (loading/empty/cards) · ไม่มี actions

- [ ] **Step 5: prettier + ESLint + allowlist + ตรวจ**
Run: `bun run typecheck && bun run lint && bun test:run components/share/__tests__/list-page-shell.usage.test.ts routes/report routes/system-admin/notification-template routes/system-admin/dashboard-dataset`
Expected: เขียว

- [ ] **Step 6: Commit**

```bash
git add routes/report/history/history-component.tsx routes/report/schedules/schedule-component.tsx routes/system-admin/notification-template/noti-tmpl.tsx routes/system-admin/dashboard-dataset/dashboard-dataset-component.tsx components/share/__tests__/list-page-shell.usage.test.ts
git commit -m "refactor(list): history/schedules/notification-template/dashboard-dataset ใช้ ListPageShell"
```

### Task 7: `DisplayTemplate` 4 หน้า — account-grouping · chart-of-account-mapping · title-master · recipe-equipment-category

**Files:**
- Modify: `routes/config/account-grouping/account-grouping-page.tsx`, `routes/config/chart-of-account-mapping/coam-component.tsx`, `routes/config/title-master/title-master-page.tsx`, `routes/operation-plan/recipe-equipment-category/recipe-equipment-category-component.tsx`
- Modify: guard allowlist (ตัด 4)

**Interfaces:** `ListPageShell` (slot `actions` รับ fragment ได้ · `toolbar` รับ fragment ได้)

สูตร: `import DisplayTemplate …` → `import { ListPageShell } …` · `<DisplayTemplate` → `<ListPageShell` · `</DisplayTemplate>` → `</ListPageShell>` · prop `filterBar` ตัดทิ้ง (ถ้ามี) · `toolbar` ที่เป็น fragment หลาย element ห่อด้วย `<div className="flex flex-wrap items-center gap-2">…</div>` (DisplayTemplate เคยห่อให้ shell ไม่ห่อ) · `toolbar` ที่เป็น `<SearchInput>` เดี่ยวห่อ `<div className="flex flex-wrap items-center gap-2"><div className="w-full sm:w-auto sm:flex-initial">…</div></div>` เหมือน stock-replenishment (PR 2) · `actions` ที่เป็น fragment หลายปุ่ม ห่อ `<div className="flex w-full items-center gap-2 sm:w-auto">…</div>` (รูปเดียวกับ `DocumentListActions`)

- [ ] **Step 1: account-grouping** — title/description เป็นอังกฤษ hardcode **คงไว้** (i18n นอกขอบเขต) · toolbar = SearchInput (ห่อตามสูตร) · actions = `<Button size="sm" onClick={() => setEditing(null)}><Plus className="size-4" /> Add Group</Button>` → `<DocumentListActions onAdd={() => setEditing(null)} addLabel="Add Group" hideExportPrint />` ตัด `Plus` · `DataGridContainer scroll className="max-h-[calc(100vh-14rem)]"` → คงเดิม + comment `// สูตรเฉพาะ: ตารางนี้ไม่มี pagination bar และโครงต่างจาก listGridMaxH — ยังไม่ normalise` (หน้านี้เป็น mock/ทดลอง ไม่ใช่ตาราง DataGrid มาตรฐาน — เปิดดูก่อน ถ้าเป็น DataGrid มาตรฐานใช้ `listGridMaxH(false)`)

- [ ] **Step 2: coam** — actions = fragment 5 ปุ่ม (ยังไม่ผูก handler) ห่อ div ตามสูตร คงทุกปุ่ม · toolbar SearchInput ห่อตามสูตร · มี `"use no memo"` 2 จุด คงไว้

- [ ] **Step 3: title-master** — toolbar = fragment (SearchInput ใน `min-w-52 flex-1 sm:flex-initial` + `StatusFilter`) ห่อ `<div className="flex flex-wrap items-center gap-2">` · actions = fragment (Refresh icon + Add) → ห่อ div ตามสูตร คงทั้งสองปุ่ม (Refresh เป็นปุ่มเฉพาะหน้า) · `max-h-[calc(100vh-13rem)]` คงเดิม + comment เหมือน Step 1 (เปิดดู)

- [ ] **Step 4: recipe-equipment-category** — `ListToolbar variant="bare"` → ปกติ (ตัด `variant`, ตัด `filterBar`, ตัด import `ActiveFilterBar`) · actions: Export/Print disabled + Add → `<DocumentListActions onAdd={() => { setEditCategory(null); setDialogOpen(true); }} addLabel={t("add")} hideExportPrint />` (ตัดสินใจเดียวกับ Task 3) ตัด `Download, Plus, Printer` · `DataGridContainer className="flex max-h-[calc(100vh-13rem-3rem)] flex-col"` → `className={cn("flex flex-col", listGridMaxH(lf.activeFilters.length > 0))}` (import `cn` ถ้ายังไม่มี)

- [ ] **Step 5: prettier + ESLint + allowlist + ตรวจ**
Run: `bun run typecheck && bun run lint && bun test:run components/share/__tests__/list-page-shell.usage.test.ts routes/config/account-grouping routes/config/chart-of-account-mapping routes/config/title-master routes/operation-plan/recipe-equipment-category`
Expected: เขียว

- [ ] **Step 6: Commit**

```bash
git add routes/config/account-grouping/account-grouping-page.tsx routes/config/chart-of-account-mapping/coam-component.tsx routes/config/title-master/title-master-page.tsx routes/operation-plan/recipe-equipment-category/recipe-equipment-category-component.tsx components/share/__tests__/list-page-shell.usage.test.ts
git commit -m "refactor(list): 4 หน้า DisplayTemplate ย้ายมา ListPageShell"
```

### Task 8: หน้า `<h1>` สด 3 หน้า — email-profile · email-template · interface

**Files:**
- Create: `routes/system-admin/email-profile/email-profile-component.tsx` (ย้าย body จาก `.route.tsx`)
- Modify: `routes/system-admin/email-profile/email-profile.route.tsx` → wrapper 5 บรรทัด
- Create: `routes/system-admin/email-template/email-template-component.tsx`
- Modify: `routes/system-admin/email-template/email-template.route.tsx` → wrapper
- Modify: `routes/system-admin/interface/interface-list.tsx` (header → shell)
- Test เดิมต้องเขียว: `routes/system-admin/interface/interface-list.test.tsx` · อ่าน `routes/system-admin/interface/CLAUDE.md` ก่อนแตะ

**Interfaces:** `ListPageShell`, `DocumentListActions`

ไม่มีลายเซ็นใน guard — ไม่มี allowlist ให้ตัด

- [ ] **Step 1: email-profile แยกไฟล์** — ย้ายทุกอย่างใน `email-profile.route.tsx` ยกเว้นบรรทัด `export function Component()` ไป `email-profile-component.tsx` โดยเปลี่ยนเป็น `export default function EmailProfileComponent()` (import ทั้งหมดย้ายตาม) · `.route.tsx` เหลือ

```tsx
import EmailProfileComponent from "./email-profile-component";

export function Component() {
  return <EmailProfileComponent />;
}
```

- [ ] **Step 2: email-profile header** — เดิม

```tsx
    <div className="mx-auto w-full max-w-4xl p-[max(1rem,env(safe-area-inset-bottom))]">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">{t("desc")}</p>
        </div>
        {!isError && !isLoading && (
          <Button size="sm" onClick={openAdd}>
            <Plus className="size-3.5" aria-hidden="true" />
            {t("add")}
          </Button>
        )}
      </header>
      …body…
    </div>
```

→

```tsx
    <ListPageShell
      title={t("title")}
      description={t("desc")}
      actions={
        !isError && !isLoading ? (
          <DocumentListActions
            onAdd={openAdd}
            addLabel={t("add")}
            hideExportPrint
          />
        ) : undefined
      }
    >
      …body เดิม…
    </ListPageShell>
```

ตัด `Plus` (และ `Button` ถ้าไม่เหลือ) · **ก่อน commit เปิด `/system-admin/email-profile` ดู** — body เป็นการ์ดรายการโปรไฟล์ ถ้ายืดเต็มจอแล้วอ่านยาก ให้ห่อ body ด้วย `<div className="mx-auto w-full max-w-4xl">` (ใน children ไม่ใช่ wrapper) แล้วบันทึก ruling — Review Focus #4

- [ ] **Step 3: email-template** — ทำเหมือน Step 1-2 ทุกประการ (`EmailTemplateComponent`, `email-template-component.tsx`)

- [ ] **Step 4: interface-list** — อ่าน `routes/system-admin/interface/CLAUDE.md` · เดิม wrapper `mx-auto w-full max-w-4xl p-[max…]` + `<header className="mb-6"><h1>…<p>…</header>` ไม่มีปุ่ม → `<ListPageShell title={t("title")} description={t("desc")}>` children = ส่วนที่เหลือ (error / skeleton / empty / group cards) · ดูเบราว์เซอร์เรื่อง max-w เหมือน Step 2 · รัน `bun test:run routes/system-admin/interface` ต้องเขียวโดยไม่แก้ assertion

- [ ] **Step 5: prettier + ESLint + ตรวจ**
Run: `bun run typecheck && bun run lint && bun test:run routes/system-admin/email-profile routes/system-admin/email-template routes/system-admin/interface components/share/__tests__/list-page-shell.usage.test.ts`
Expected: เขียว

- [ ] **Step 6: Commit**

```bash
git add routes/system-admin/email-profile routes/system-admin/email-template routes/system-admin/interface/interface-list.tsx
git commit -m "refactor(list): email-profile/email-template/interface ใช้ ListPageShell + ย้าย body ออกจาก .route.tsx"
```

### Task 9: ตรวจทั้ง suite + เบราว์เซอร์ 26 หน้า + PR

- [ ] **Step 1: ทั้ง suite**
Run: `bun run typecheck && bun run lint && bun test:run`
Expected: typecheck สะอาด · lint 137 warnings · suite เขียวยกเว้น 2 แดงเดิมของ `ap-mock-repository.test.ts` · `ALLOWED` ใน guard เหลือ 12 บรรทัด (ถาวร 1 + PR 4 11)

- [ ] **Step 2: เบราว์เซอร์** (dev server :3000, admin@zebra.com) เปิดทุกหน้า desktop; มือถือผ่าน iframe กว้าง 596px หรือหน้าต่างแคบ อย่างน้อย 5 หน้า (เลือกจากคนละกลุ่ม):

| กลุ่ม | path | จุดเฉพาะ |
|---|---|---|
| system-admin | `/system-admin/activity-log` · `/document` · `/user-activity` · `/user` | ไม่มีปุ่ม Add · document: เปิดสถานะที่มี summary slot และไม่มี ตารางไม่ถูกทับ |
| system-admin | `/system-admin/inventory-period` · `/running-code` · `/role` · `/workflow` | ปุ่มเฉพาะหน้า (⋯ generateNext / Init / ปุ่ม Add) ครบ |
| system-admin | `/system-admin/notification-template` · `/dashboard-dataset` · `/email-profile` · `/email-template` · `/interface` | noti-tmpl: Add ไปหน้า new · 3 หน้าหลังดูความกว้าง |
| report | `/report/list` · `/history` · `/schedules` | toggle list/grid · schedules: Add เปิด dialog |
| config | `/config/exchange-rate` · `/account-grouping` · `/chart-of-account-mapping` · `/title-master` | exchange-rate: Add manual + Update · coam: 5 ปุ่ม · title-master: Refresh + Add |
| operation-plan | `/operation-plan/category` · `/cuisine` · `/equipment-category` · `/equipment` · `/recipe` · `/recipe-equipment-category` | ปุ่ม Export/Print disabled หายไป เหลือ Add (ตั้งใจ) |

ทุกหน้าที่มี DataGrid >1 หน้า: JS `.click()` ปุ่ม `aria-label="Page 2"` แล้ว `"Page 1"` แถวต้องเปลี่ยน — ค้างเมื่อไรใส่ `"use no memo";` ที่คอมโพเนนต์หน้านั้น commit แยก `fix(list): <หน้า> ตารางค้างตอนเปลี่ยนหน้าหลังย้าย shell`

- [ ] **Step 3: PR**

```bash
git push -u origin feature/list-page-shell-wave-2
gh pr create --title "refactor(list): system-admin, report, config, operation-plan lists use ListPageShell" --body "$(cat <<'EOF'
## Summary
Wave 2 of the list-page unification (spec `docs/superpowers/specs/2026-10-01-list-page-shell-design.md`, PR 3 of 4): 26 pages move to `ListPageShell`. Guard allowlist shrinks 35 → 12.

Deliberate visible changes (everything else is frame-only):
- operation-plan category / cuisine / equipment-category / equipment / recipe and recipe-equipment-category: the disabled "coming soon" Export/Print buttons are removed; only Add remains (`DocumentListActions hideExportPrint`). They come back automatically when a real `onExport` is wired.
- notification-template: Add button navigates via `navigate()` instead of `<Link>` (same destination); page no longer double-pads (`p-3` on top of the root layout).
- history / schedules / notification-template / dashboard-dataset and the 4 former `DisplayTemplate` pages gain the module icon and the mobile sticky header block.
- email-profile / email-template / interface: page body moved out of `.route.tsx` into `*-component.tsx`; <max-w note from Task 8 — full width or kept at 56rem>.
- report list: list/grid toggle aria-labels now come from `common.aria.*`.
- Table heights normalised to `listGridMaxH`: history, schedules and exchange-rate were `13rem` with no filter bar (now 10rem, table 3rem taller).

No change to queries, columns, filter fields, i18n keys or navigation targets.

## Test plan
- [ ] `bun run typecheck && bun run lint` (137 warnings = baseline)
- [ ] `bun test:run` — green except the 2 pre-existing `ap-mock-repository.test.ts` failures
- [ ] All 26 pages on desktop; pagination 1→2→1 on every page with >1 page; mobile check on ≥5 pages
EOF
)"
```

---

## PR 4 (plan ถัดไป)

accounting 5 หน้า (toolbar เดิมลง slot, ไม่แตะ i18n) · inventory-adjustment · physical-count / spot-check / transaction (ถอด `InvListShell` / `-mx-3 -my-3`) · product / category (tree) · ลบ `components/display-template.tsx` + `InvListShell` + ตัด `ListToolbar variant="bare"` เมื่อไม่เหลือผู้ใช้ · allowlist เหลือ `accounting-dashboard-page.tsx` บรรทัดเดียว
