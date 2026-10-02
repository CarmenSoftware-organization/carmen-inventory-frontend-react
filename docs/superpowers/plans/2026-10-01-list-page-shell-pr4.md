# ListPageShell — PR 4 (accounting · inventory-management · product-management + ลบของเก่า) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ย้าย 11 หน้า list สุดท้าย (accounting 5 · inventory-management 4 · product-management 2) มาใช้ `ListPageShell` แล้วลบ `DisplayTemplate` / `InvListShell` / `ListToolbar variant="bare"` / คีย์ i18n ที่ตกค้าง ให้ guard allowlist เหลือ `accounting-dashboard-page.tsx` บรรทัดเดียว

**Architecture:** ของกลางครบแล้วจาก PR 1 (#207) ไม่สร้างคอมโพเนนต์ใหม่ · หน้า sticky clone 5 หน้าแปลงด้วย transformer รุ่น 2 (รองรับไม่มี `mt-3` wrapper และ max-h แบบ string เดี่ยว) · หน้าที่เหลือแก้มือ · accounting 5 หน้า**ไม่แตะ i18n/filter** (ข้อความอังกฤษ hardcode คงไว้ toolbar เดิมลง slot) · inventory 3 หน้า (pc / sc / transaction) **เลิก full-bleed** วางบน padding ของ root-layout และย้าย `<AnimationStyles />` ไปใน children เพื่อให้ `Reveal` ยังมี keyframes · ปิดท้ายด้วยลบโค้ดตาย

**Tech Stack:** React 19 + React Compiler · react-router 7 · Tailwind v4 · use-intl · Vitest · bun · Python 3

**Spec:** `docs/superpowers/specs/2026-10-01-list-page-shell-design.md` · plan ก่อนหน้า: `…-pr1-pr2.md`, `…-pr3.md`

## Global Constraints

- ภาษาสื่อสาร/commit = ไทย · PR title/body อังกฤษ
- **ไม่แตะ** query / column / filter field / i18n key ของหน้าที่ย้าย / การ navigate — ยกเว้นที่ประกาศใน task (ลบคีย์ตกค้าง `report.listView/gridView` เป็น cleanup ที่ reviewer PR 3 ขอ)
- `"use no memo"` คงของเดิม · `components/` ห้าม import `routes/`
- ไม่ squash-merge · branch จาก `main` หลัง #207/#208/#209 merge (ถ้ายังไม่ merge แตกจาก `feature/list-page-shell-wave-2` แล้วเปิด PR base ที่นั่น)
- gate ทุก task: `bun run typecheck && bunx eslint <ไฟล์ที่แตะ> --quiet` (ใช้ eslint ตรง ๆ ไม่ pipe grep — PR 3 เคยหลุด error เพราะ grep คืน 0) · lint รวมต้องคง 137 warnings · ก่อน PR: `bun test:run` เขียวยกเว้น 2 แดงเดิมใน `routes/accounting/accounts-payable/ap-mock-repository.test.ts`
- ไม่เขียนเทสต์ใหม่ · เทสต์เดิมใต้ 3 โมดูลต้องเขียวโดยไม่แก้ assertion
- เบราว์เซอร์: pagination กดด้วย JS `.click()` · มือถือผ่าน iframe 596px · JS ต่อครั้ง < 40 วินาที (CDP timeout 45s) · ถ้า extension หลุด เรียก `tabs_context_mcp` ใหม่แล้วทำต่อเป็นชุดเล็ก

## Review Focus

1. **pc / sc เสียทรง 2 คอลัมน์** — เดิม `InvListShell` ให้ full-bleed + `section.grid lg:grid-cols-[1fr_22rem]` โดย header อยู่ในคอลัมน์ซ้าย; หลังย้าย header ขึ้นไปอยู่เหนือ grid เต็มความกว้าง คอลัมน์ขวา (22rem) จะเริ่มสูงกว่าเดิม → Task 4 ถ่ายภาพ desktop เทียบก่อน/หลัง ถ้าคอลัมน์ขวาโดดต้องใส่ `lg:pt-…` หรือบันทึก ruling ว่ายอมรับ
2. **Reveal ไม่มี keyframes** — `AnimationStyles` เคยถูกวางโดย `InvListShell` / wrapper ของ transaction ถ้าลืมย้ายมา children เนื้อหาจะ "ไม่โผล่" (opacity 0 ค้าง) → Task 4 เช็คว่าการ์ด/ตารางแสดงจริงหลังโหลด ไม่ใช่แค่ header
3. **transaction `relative isolate`** — wrapper เดิมสร้าง stacking context ให้ glass card / sticky ภายใน ถอดแล้ว z-index ของ ListFilter sheet หรือ DataGrid sticky header อาจทับผิดชั้น → Task 4 เปิด filter sheet + เลื่อนตารางดู
4. **journal-voucher reformat** — ไฟล์ไม่เคยผ่าน prettier (โค้ดบรรทัดเดียว) การ format ทั้งไฟล์ทำ diff บวมจนรีวิว logic ไม่เห็น → Task 1 แยก commit "format only" ก่อน แล้ว Task 3 ค่อยแก้ logic
5. **ตารางค้างตอนเปลี่ยนหน้า** (React Compiler, `routes/CLAUDE.md`) → Task 6 กด 1→2→1 ทุกหน้าที่มี >1 หน้า (ia, pd, ap-invoice, accounting-document, transaction) ค้างเมื่อไรใส่ `"use no memo"` ที่หน้านั้น commit แยก

---

### Task 1: branch + transformer รุ่น 2 + format journal-voucher

**Files:**
- Create: `.superpowers/sdd/2026-10-01-list-page-shell-pr4/shellify2.py` (scratch, gitignored)
- Modify (format only): `routes/accounting/journal-voucher/journal-voucher-list.tsx`

**Interfaces:**
- Produces: `python3 shellify2.py <file>...` — เหมือนรุ่น PR 3 แต่ (ก) `mt-3 space-y-3` wrapper เป็น optional: ถ้าไม่มี content = ทุกอย่างหลังบล็อก sticky ถึงปิด wrapper (ข) max-h: ternary → `listGridMaxH(expr)`; string เดี่ยว `max-h-[calc(100vh-10rem-3rem)]` หรือ `max-h-[calc(100vh-13rem)]` (= 13rem เท่ากัน) → `listGridMaxH(false)`; ไม่มี `DataGridContainer` เลย → ข้าม (ค) title/description/count ดึงจาก DLH เดิม (ง) ห่อ `<>` เมื่อ toolbar/actions มีหลาย element หรือขึ้นต้นด้วย `{`

- [ ] **Step 1: branch**

```bash
git checkout main && git pull && git checkout -b feature/list-page-shell-wave-3
# ถ้า #209 ยังไม่ merge: git checkout -b feature/list-page-shell-wave-3 feature/list-page-shell-wave-2
```

- [ ] **Step 2: สคริปต์**

```python
import re, sys
FILES = sys.argv[1:]
STICKY_OPEN = '      <div className="sticky top-0 z-20 space-y-3 pb-3 sm:static sm:pb-0">\n'
WRAP_OPEN = '    <div className="pb-[max(1rem,env(safe-area-inset-bottom))]">\n'
HDR_OPEN = '        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">\n'
MT3 = '      <div className="mt-3 space-y-3">\n'
SHELL = 'import { ListPageShell } from "@/components/share/list-page-shell";\nimport { listGridMaxH } from "@/components/share/list-grid-max-h";\n'
def wrap_if_many(x):
    tops = [l for l in x.split('\n') if l.startswith('        <') and not l.startswith('        </')] + ([x.split('\n')[0]] if x.startswith('<') else [])
    return '<>\n' + x + '\n</>' if (len(tops) > 1 or x.startswith('{')) else x
for p in FILES:
    s = open(p).read()
    imp = 'import { DocumentListHeader } from "@/components/share/document-list-header";\n'
    assert imp in s, f"{p}: no DLH import"
    s = s.replace(imp, SHELL)
    i_ret = s.index('  return (\n' + WRAP_OPEN)
    i_sticky = s.index(STICKY_OPEN, i_ret)
    i_hdr = s.index(HDR_OPEN, i_sticky)
    i_dlh = s.index('<DocumentListHeader', i_hdr)
    i_dlh_end = s.index('/>', i_dlh) + 2
    dlh = s[i_dlh:i_dlh_end]
    strip_c = lambda x: re.sub(r'\{/\*.*?\*/\}', '', x, flags=re.S).strip()
    title = re.search(r'title=(\{[^\n]*\}|"[^"]*")', dlh).group(1)
    desc = re.search(r'description=(\{[^\n]*\}|"[^"]*")', dlh).group(1)
    m = re.search(r'count=\{([^}]*)\}', dlh); count = m.group(1) if m else None
    i_hdr_close = s.index('\n        </div>\n', i_dlh_end) + 1
    actions = wrap_if_many(strip_c(s[i_dlh_end:i_hdr_close]))
    i_outer_close = s.index('\n    </div>\n  );\n}', i_hdr_close) + 1
    i_mt3 = s.find(MT3, i_hdr_close, i_outer_close)
    if i_mt3 != -1:
        i_sticky_close = s.rindex('\n      </div>\n', i_hdr_close, i_mt3) + 1
        toolbar = wrap_if_many(strip_c(s[i_hdr_close + len('        </div>\n'):i_sticky_close]))
        i_content = i_mt3 + len(MT3)
        i_mt3_close = s.index('\n      </div>\n', i_content) + 1
        content = s[i_content:i_mt3_close] + s[i_mt3_close + len('      </div>\n'):i_outer_close]
    else:
        # ไม่มี wrapper mt-3: บล็อก sticky ปิดที่ '      </div>\n' ตัวแรกหลัง header ที่อยู่ระดับ 6 ช่อง
        i_sticky_close = s.index('\n      </div>\n', i_hdr_close) + 1
        toolbar = wrap_if_many(strip_c(s[i_hdr_close + len('        </div>\n'):i_sticky_close]))
        content = s[i_sticky_close + len('      </div>\n'):i_outer_close]
    head = f'  return (\n    <ListPageShell\n      title={title}\n      description={desc}\n'
    if count: head += f'      count={{{count}}}\n'
    if actions: head += f'      actions={{\n{actions}\n      }}\n'
    if toolbar: head += f'      toolbar={{\n{toolbar}\n      }}\n'
    head += '    >\n'
    s = s[:i_ret] + head + content + '    </ListPageShell>\n  );\n}' + s[i_outer_close + len('    </div>\n  );\n}'):]
    s, n = re.subn(r'((?:lf\.)?activeFilters\.length > 0)\n\s*\? "max-h-\[calc\(100vh-13rem-3rem\)\]"\n\s*: "max-h-\[calc\(100vh-1[01]rem-3rem\)\]",', r'listGridMaxH(\1),', s)
    if n == 0:
        s, n = re.subn(r'className="((?:flex )?)max-h-\[calc\(100vh-(?:10rem-3rem|13rem)\)\]((?: flex-col)?)"', lambda m: 'className={cn("%s%s".trim(), listGridMaxH(false))}' % (m.group(1), m.group(2).strip()), s)
        s = s.replace('cn("".trim(), ', 'cn(')
        if n and 'import { cn } from "@/lib/utils";' not in s:
            s = s.replace(SHELL, SHELL + 'import { cn } from "@/lib/utils";\n', 1)
    if n == 0 and 'DataGridContainer' in s:
        raise AssertionError(f"{p}: max-h not handled")
    assert 'DocumentListHeader' not in s and 'sticky top-0 z-20' not in s and 'mt-3 space-y-3' not in s
    open(p, 'w').write(s)
    print(f"{p}: actions={'yes' if actions else 'no'} toolbar={'yes' if toolbar else 'no'} count={count} maxh={n}")
```

หลังรันต้อง `bunx prettier --write` เสมอ (string `cn("flex flex-col".trim(), …)` ที่ออกมาให้แก้มือเป็น `cn("flex flex-col", …)` ถ้า prettier ไม่ทำให้) · import ที่ตายให้ ESLint ชี้

- [ ] **Step 3: format journal-voucher แยก commit**

```bash
bunx prettier --write routes/accounting/journal-voucher/journal-voucher-list.tsx
bunx eslint routes/accounting/journal-voucher/journal-voucher-list.tsx --quiet && bun run typecheck
git add routes/accounting/journal-voucher/journal-voucher-list.tsx
git commit -m "style(jv): จัดรูปแบบ journal-voucher-list ด้วย prettier (ไม่แก้ logic)"
```

### Task 2: 5 หน้า sticky clone — inventory-adjustment · product · category · accounting-document · ap-invoice

**Files:**
- Modify: `routes/inventory-management/inventory-adjustment/ia-component.tsx` (สคริปต์ล้วน — actions Export/Print+dropdown ไม่มี Add คงไว้)
- Modify: `routes/product-management/product/pd-component.tsx` (สคริปต์ล้วน — มี DLA + ListToolbar แล้ว)
- Modify: `routes/product-management/category/category-component.tsx` (Plus → DLA แล้วสคริปต์; ไม่มี DataGrid = ข้าม max-h)
- Modify: `routes/accounting/documents/accounting-document-list.tsx` (toggle → `DisplayModeToggle` แล้วสคริปต์; actions Export+New คงไว้; ไม่มี `mt-3`)
- Modify: `routes/accounting/accounts-payable/ap-invoice-list.tsx` (toggle → `DisplayModeToggle` ถ้ามี แล้วสคริปต์; actions Pay Selected + New Invoice คงไว้; ไม่มี `mt-3`; `max-h-[calc(100vh-13rem)]` = 13rem เท่าสูตรกลาง)
- Modify: guard allowlist (ตัด 5)

**Interfaces:** `ListPageShell`, `listGridMaxH`, `DocumentListActions`, `DisplayModeToggle` (PR 1)

- [ ] **Step 1: category** — บล็อก `<div className="flex w-full items-center gap-2 sm:w-auto"><Button onClick={() => handleAdd()} size="sm"><Plus className="h-3 w-3" />{t("add")}</Button></div>` → `<DocumentListActions onAdd={() => handleAdd()} addLabel={t("add")} hideExportPrint />` + import DLA · ตัด `Plus` จาก lucide

- [ ] **Step 2: accounting-document + ap-invoice toggle** — แทนบล็อก `<div className="flex items-center rounded-md border"> …2 ปุ่ม LayoutList/LayoutGrid… </div>` ด้วย `<DisplayModeToggle value={displayMode} onChange={setDisplayMode} />` (ap-invoice ใช้ตัวแปร `mode`/`setMode`? เปิดดูชื่อจริง — grep `LayoutList` ขึ้นไป 6 บรรทัด) · aria-label เดิมเป็น `tc("aria.listView")` (accounting-document) / string อังกฤษ (ap-invoice) → กลายเป็น `common.aria.*` ทั้งคู่ · ตัด `LayoutGrid, LayoutList` จาก lucide · import `DisplayModeToggle`

- [ ] **Step 3: รันสคริปต์** กับ 5 ไฟล์ · คาด: ia `actions=yes toolbar=yes maxh=1` · pd `maxh=1` · category `maxh=0` (ไม่มี DataGridContainer) · accounting-document / ap-invoice `maxh=1` (string เดี่ยว → `listGridMaxH(false)`)

- [ ] **Step 4: prettier + ESLint + typecheck + allowlist + เทสต์**
Run: `bunx prettier --write <5 ไฟล์> && bunx eslint <5 ไฟล์> --quiet && bun run typecheck` → ตัด 5 ไฟล์จาก `ALLOWED` → `bun test:run components/share/__tests__/list-page-shell.usage.test.ts routes/inventory-management/inventory-adjustment routes/product-management routes/accounting/documents routes/accounting/accounts-payable`
Expected: เขียว (ยกเว้น 2 แดงเดิมของ `ap-mock-repository.test.ts` ถ้าโดน glob)

- [ ] **Step 5: Commit**

```bash
git add routes/inventory-management/inventory-adjustment/ia-component.tsx routes/product-management/product/pd-component.tsx routes/product-management/category/category-component.tsx routes/accounting/documents/accounting-document-list.tsx routes/accounting/accounts-payable/ap-invoice-list.tsx components/share/__tests__/list-page-shell.usage.test.ts
git commit -m "refactor(list): IA/product/category/accounting-document/AP invoice ใช้ ListPageShell"
```

### Task 3: accounting แก้มือ 3 หน้า — ap-payment · journal-voucher · ar-invoice

**Files:**
- Modify: `routes/accounting/accounts-payable/ap-payment-list.tsx`
- Modify: `routes/accounting/journal-voucher/journal-voucher-list.tsx` (หลัง format ใน Task 1)
- Create: `routes/accounting/accounts-receivable/ar-invoice-list.tsx` (ย้าย body จาก `.route.tsx`)
- Modify: `routes/accounting/accounts-receivable/ar-invoice-list.route.tsx` → wrapper
- Modify: guard allowlist (ตัด 3)

**Interfaces:** เหมือน Task 2 · ข้อความอังกฤษ hardcode **คงไว้ทุกตัว** (i18n ของ accounting เป็นงานแยก)

- [ ] **Step 1: ap-payment** — เดิม `<div className="pb-[max…]"><div className="space-y-4">` › header row (DLH + `<Button size="sm" onClick={() => navigate("/accounting/accounts-payable/payment/new")}><Plus/>New Payment</Button>`) › toolbar `flex flex-wrap items-center justify-between gap-3` (SearchInput + 3 StatusFilter + ฝั่งขวา Sort/Columns/toggle) › content. ใหม่:

```tsx
  return (
    <ListPageShell
      title="Payment Voucher Directory"
      description="Supplier payment workflow and execution"
      actions={
        <DocumentListActions
          onAdd={() => navigate("/accounting/accounts-payable/payment/new")}
          addLabel="New Payment"
          hideExportPrint
        />
      }
      toolbar={
        …บล็อก <div className="flex flex-wrap items-center justify-between gap-3"> เดิมทั้งก้อน
        โดยแทนคู่ปุ่ม LayoutList/LayoutGrid ด้วย <DisplayModeToggle value={mode} onChange={setMode} />
        (ชื่อ state จริงดูในไฟล์ — ตัวอย่างข้างบนใช้ mode/setMode ตามที่เห็นในบรรทัด `mode === "list"`)…
      }
    >
      …content เดิม (ตัด wrapper space-y-4 — shell ให้ space-y-3)…
    </ListPageShell>
  );
```

`max-h-[calc(100vh-13rem)]` → `cn("…", listGridMaxH(false))` (13rem เท่าเดิม) · ตัด `Plus`, `LayoutGrid`, `LayoutList` · พฤติกรรมที่เปลี่ยน: ได้บล็อก sticky มือถือ + ไอคอนโมดูล · ระยะ `space-y-4` → `space-y-3`

- [ ] **Step 2: journal-voucher** — หลัง prettier โครงคือ `<div className="space-y-3 pb-8">` › header row (DLH + `<div className="flex gap-2"><Button …><Plus/> New JV</Button></div>`) › toolbar (SearchInput + StatusFilter + Sort/Columns/toggle/Refresh) › `{displayMode === "list" ? <DataGrid…> : <div grid…>}`. ใหม่: `<ListPageShell title="Journal Voucher" description="General Ledger entries, workflow and posting history" actions={<DocumentListActions onAdd={() => navigate("/accounting/journal-voucher/new")} addLabel="New JV" hideExportPrint />} toolbar={…บล็อก toolbar เดิม toggle → DisplayModeToggle…}>` children = ternary เดิม · `max-h-[calc(100vh-12rem)]` → `listGridMaxH(false)` (ตารางสูงขึ้น 1rem ระบุใน PR body) · ปุ่ม Refresh (`RefreshCw`) อยู่ใน toolbar ฝั่งขวาคงไว้ · ตัด `Plus, LayoutGrid, LayoutList`

- [ ] **Step 3: ar-invoice แยก route** — ย้ายทุกอย่างใน `ar-invoice-list.route.tsx` ไป `ar-invoice-list.tsx` เปลี่ยน `export function Component()` → `export default function ArInvoiceList()` · `.route.tsx` เหลือ wrapper 5 บรรทัด (`import ArInvoiceList from "./ar-invoice-list"; export function Component() { return <ArInvoiceList />; }`) · ใน component: `<div className="space-y-4">` › header row (DLH count={rows.length} + Button New Invoice) › `<SearchInput …/>` › `<div className="overflow-x-auto"><table>…` → `<ListPageShell title="AR Invoice" description="City ledger and customer invoices" count={rows.length} actions={<DocumentListActions onAdd={() => navigate(`${AR_INVOICE_PATH}/new`)} addLabel="New Invoice" hideExportPrint />} toolbar={<div className="flex flex-wrap items-center gap-2"><div className="w-full sm:w-auto sm:flex-initial"><SearchInput defaultValue={search} onSearch={setSearch} onInputChange={setSearch} /></div></div>}>` children = `<div className="overflow-x-auto">…</div>` เดิม · ตัด `Plus` (`Button` ยังใช้ใน cell link คงไว้)

- [ ] **Step 4: ESLint + typecheck + allowlist + เทสต์**
Run: `bunx prettier --write <4 ไฟล์> && bunx eslint <4 ไฟล์> --quiet && bun run typecheck` → ตัด ap-payment / journal-voucher / `ar-invoice-list.route.tsx` จาก `ALLOWED` → `bun test:run components/share/__tests__/list-page-shell.usage.test.ts routes/accounting`
Expected: เขียวยกเว้น 2 แดงเดิม `ap-mock-repository.test.ts`

- [ ] **Step 5: Commit**

```bash
git add routes/accounting/accounts-payable/ap-payment-list.tsx routes/accounting/journal-voucher/journal-voucher-list.tsx routes/accounting/accounts-receivable components/share/__tests__/list-page-shell.usage.test.ts
git commit -m "refactor(list): AP payment/JV/AR invoice ใช้ ListPageShell (คงข้อความอังกฤษและ filter เดิม)"
```

### Task 4: inventory เลิก full-bleed — physical-count · spot-check · transaction

**Files:**
- Modify: `routes/inventory-management/physical-count/pc-component.tsx` (~L254-270)
- Modify: `routes/inventory-management/spot-check/sc-component.tsx` (~L197-212)
- Modify: `routes/inventory-management/transaction/transaction-component.tsx` (~L325-409)
- Modify: guard allowlist (ตัด 3)

**Interfaces:**
- Consumes: `ListPageShell` · `AnimationStyles`, `Reveal` จาก `@/components/share/reveal` (AnimationStyles = `<style>` keyframes ที่ Reveal ต้องการ ต้องอยู่ในต้นไม้ render ที่ใดก็ได้)
- Produces: pc / sc ไม่ใช้ `InvListShell` อีก → Task 5 ลบได้

พฤติกรรมที่เปลี่ยนโดยตั้งใจ (spec §0): เลิก `-mx-3 -my-3` + padding ของตัวเอง ใช้ padding ของ root-layout · header ขึ้นเหนือ grid 2 คอลัมน์ (pc / sc) · ได้บล็อก sticky บนมือถือ

- [ ] **Step 1: physical-count** — เดิม

```tsx
    <InvListShell>
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]">
        <div>
          <Reveal>
            <DocumentListHeader title={t("title")} description={t("desc")} count={locations.length} />
          </Reveal>
          <Reveal delay={60}> …PeriodSelectorCard… </Reveal>
          …
```

→

```tsx
    <ListPageShell
      title={t("title")}
      description={t("desc")}
      count={locations.length}
    >
      <AnimationStyles />
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]">
        <div>
          <Reveal delay={60}> …PeriodSelectorCard… </Reveal>
          …
```

ปิด `</InvListShell>` → `</ListPageShell>` · import: ตัด `InvListShell` จาก `./shared/inv-shared` (คง `InvSearchBar` ฯลฯ), เพิ่ม `AnimationStyles` ใน import จาก `@/components/share/reveal`, แทน DLH import ด้วย `ListPageShell` · ตรวจว่า `Reveal` ตัวแรก (ที่ห่อ DLH) ถูกลบทั้งคู่เปิด/ปิด ไม่เหลือ `<Reveal>` เปล่า

- [ ] **Step 2: spot-check** — โครงเดียวกับ pc แต่ header row มี `<ViewToggle view={view} setView={setView} t={t} />` อยู่ขวา →

```tsx
    <ListPageShell
      title={t("title")}
      description={t("desc")}
      count={locations.length}
      actions={<ViewToggle view={view} setView={setView} t={t} />}
    >
      <AnimationStyles />
      <section className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]">
        <div>
          {isLocationsView && (
            <Reveal delay={80}> …KpiTile grid… </Reveal>
          )}
          …
```

(ลบ `<Reveal>` + `<div className="flex flex-wrap items-start justify-between gap-3">` ที่ห่อ DLH/ViewToggle ทั้งก้อน) · import เหมือน Step 1

- [ ] **Step 3: transaction** — เดิม `<div className="relative isolate -mx-3 -my-3"><AnimationStyles /><div className="relative px-4 pt-4 pb-[max(2rem,…)] lg:p-4">` › `<Reveal><DLH/></Reveal>` › `<Reveal delay={60}>` toolbar (SearchInput glass + ViewSelector + ListFilter) › `{lf.activeFilters.length > 0 && <Reveal delay={120}><div className="mt-3"><ActiveFilterBar/></div></Reveal>}` › summary › glass DataGrid. ใหม่:

```tsx
    <ListPageShell
      title={t("title")}
      description={t("desc")}
      count={totalRecords}
      toolbar={
        <>
          <Reveal delay={60}>
            <div className="flex w-full flex-wrap items-center gap-2">
              …SearchInput / ViewSelector / ListFilter เดิมทุกบรรทัด (ตัด mt-4 ออกจาก div นี้ — shell ให้ space-y-3)…
            </div>
          </Reveal>
          {lf.activeFilters.length > 0 && (
            <Reveal delay={120}>
              <ActiveFilterBar filters={lf.activeFilters} onClearAll={lf.clearAll} />
            </Reveal>
          )}
        </>
      }
    >
      <AnimationStyles />
      <Reveal delay={180}>
        <TransactionSummary data={data?.summary ?? EMPTY_SUMMARY} />
      </Reveal>
      <Reveal delay={240}>
        <div className="border-border/60 bg-card overflow-hidden rounded-xl border">
          <DataGrid …เดิม…>
      …
    </ListPageShell>
```

(ตัด `mt-4` / `mt-3` ที่เคยคั่นระหว่างบล็อก — `space-y-3` ของ shell ทำหน้าที่แทน · ปิด 2 `</div>` ของ wrapper เดิม → `</ListPageShell>`) · `DataGridContainer` เดิมไม่มี max-h **ไม่เพิ่ม** · import: แทน DLH ด้วย `ListPageShell`; `AnimationStyles, Reveal` คงเดิม

- [ ] **Step 4: ESLint + typecheck + allowlist + เทสต์**
Run: `bunx prettier --write <3 ไฟล์> && bunx eslint <3 ไฟล์> --quiet && bun run typecheck` → ตัด 3 ไฟล์จาก `ALLOWED` → `bun test:run components/share/__tests__/list-page-shell.usage.test.ts routes/inventory-management`
Expected: เขียว

- [ ] **Step 5: เบราว์เซอร์ก่อน commit** (Review Focus #1–3) — `/inventory-management/physical-count`, `/spot-check`, `/transaction` desktop: การ์ด/ตารางโผล่จริง (Reveal ทำงาน) · pc/sc คอลัมน์ขวา 22rem ไม่ลอยสูงผิดปกติ (ถ้าดูแปลก เพิ่ม `lg:pt-2` หรือบันทึก ruling) · transaction เปิด Filter sheet แล้วปิด, เลื่อนตารางให้ header sticky ของ DataGrid ทำงาน · มือถือ 596px ผ่าน iframe ทั้ง 3

- [ ] **Step 6: Commit**

```bash
git add routes/inventory-management/physical-count/pc-component.tsx routes/inventory-management/spot-check/sc-component.tsx routes/inventory-management/transaction/transaction-component.tsx components/share/__tests__/list-page-shell.usage.test.ts
git commit -m "refactor(list): physical-count/spot-check/transaction ใช้ ListPageShell เลิก full-bleed"
```

### Task 5: ลบโค้ดตาย — DisplayTemplate · InvListShell · ListToolbar bare · คีย์ i18n ตกค้าง

**Files:**
- Delete: `components/display-template.tsx`
- Modify: `routes/inventory-management/shared/inv-shared.tsx` (ลบ `InvListShell` ~L448-459; ถ้า `AnimationStyles` ไม่มีผู้ใช้อื่นในไฟล์ ตัดออกจาก import บรรทัด 4)
- Modify: `components/list-filter/list-toolbar.tsx` (ลบ `"bare"` จาก union บรรทัด 33, ตัด `isBare` L77 และ `if (isBare) return inner;` L100 พร้อม comment ที่อ้าง DisplayTemplate เหนือมัน)
- Modify: `messages/en.json` (ลบ `"listView"`/`"gridView"` ใน namespace `report` ~L4616-4617 — **ไม่ใช่** `common.aria.*` ที่ L597-598), `messages/th.json` (~L4606-4607 เช่นกัน)
- Modify: `components/share/__tests__/list-page-shell.usage.test.ts` (allowlist เหลือ 1 บรรทัด + ตัด `<DisplayTemplate` ออกจาก `SIGNATURES` และ probe เพราะคอมโพเนนต์ไม่มีแล้ว)
- ตรวจ docs: `grep -rn "DisplayTemplate\|InvListShell" docs CLAUDE.md routes/CLAUDE.md components` ต้องเหลือแค่ประวัติใน spec/plan

**Interfaces:** ไม่มี consumer

- [ ] **Step 1: ยืนยันไม่มีผู้ใช้** — `grep -rn "DisplayTemplate" --include='*.ts' --include='*.tsx' components routes` ต้องเหลือเฉพาะไฟล์ที่กำลังลบ/แก้ · `grep -rn "InvListShell" routes` เหลือเฉพาะ inv-shared · `grep -rn 'variant="bare"' routes components` ว่าง · `grep -rn 't("listView")\|t("gridView")' routes` ว่าง

- [ ] **Step 2: ลบ/แก้ตามรายการ Files** · guard test: `SIGNATURES` เหลือ 3 ตัว, probe เหลือ 4 บรรทัด (`toBe(4)`), `ALLOWED` = `{ "routes/accounting/dashboard/accounting-dashboard-page.tsx": 1 }` พร้อม comment ถาวร · เช็คว่า `messages/*.json` ยัง parse ได้ (`bun -e 'JSON.parse(require("fs").readFileSync("messages/en.json","utf8"))'` ทั้ง 2 ไฟล์) และไม่มีเทสต์ที่เทียบ key ระหว่าง en/th แดง

- [ ] **Step 3: ตรวจ**
Run: `bun run typecheck && bun run lint && bun test:run`
Expected: typecheck สะอาด · lint **≤ 137** warnings (ลบไฟล์อาจทำให้ลด) · suite เขียวยกเว้น 2 แดงเดิม

- [ ] **Step 4: Commit**

```bash
git add -A components/display-template.tsx routes/inventory-management/shared/inv-shared.tsx components/list-filter/list-toolbar.tsx messages/en.json messages/th.json components/share/__tests__/list-page-shell.usage.test.ts
git commit -m "chore(list): ลบ DisplayTemplate/InvListShell/ListToolbar bare และคีย์ report.listView ที่ไม่มีผู้ใช้"
```

### Task 6: ตรวจทั้ง suite + เบราว์เซอร์ 11 หน้า + PR

- [ ] **Step 1:** `bun run typecheck && bun run lint && bun test:run` — เขียวยกเว้น 2 แดงเดิม · guard allowlist 1 บรรทัด

- [ ] **Step 2: เบราว์เซอร์** (dev :3000, admin) desktop ทั้ง 11 หน้า + มือถือ ≥4 หน้า:

| หน้า | path | จุดเฉพาะ |
|---|---|---|
| AP invoice / AP payment | `/accounting/accounts-payable/invoice` · `/payment` | Pay Selected + New Invoice / New Payment · StatusFilter ครบ · toggle · pagination (invoice) |
| AR invoice | `/accounting/accounts-receivable/invoice` | ตาราง mock + ค้นหา · New Invoice |
| Accounting documents | `/accounting/documents/<kind>` (เปิดจากเมนู) | Export + New · title ตาม kind |
| Journal voucher | `/accounting/journal-voucher` | New JV · Refresh · toggle |
| IA | `/inventory-management/inventory-adjustment` | Export/Print + ⋯ มือถือ · pagination |
| Physical count / Spot check | `/inventory-management/physical-count` · `/spot-check` | 2 คอลัมน์ · Reveal โผล่ · sc: ViewToggle อยู่หัว |
| Transaction | `/inventory-management/transaction` | glass toolbar · summary · pagination |
| Product / Category | `/product-management/product` · `/category` | pagination (product) · tree + summary bar (category) |

- [ ] **Step 3: PR**

```bash
git push -u origin feature/list-page-shell-wave-3
gh pr create --title "refactor(list): accounting, inventory, product lists use ListPageShell; remove DisplayTemplate" --body "$(cat <<'EOF'
## Summary
Final wave of the list-page unification (spec `docs/superpowers/specs/2026-10-01-list-page-shell-design.md`, PR 4 of 4): the last 11 pages move to `ListPageShell`; `DisplayTemplate`, `InvListShell` and `ListToolbar variant="bare"` are deleted; the guard allowlist is down to `accounting-dashboard-page.tsx` (a dashboard that borrows the list header — landing pages are a separate spec).

Deliberate visible changes:
- physical-count / spot-check / transaction: no longer full-bleed (`-mx-3 -my-3`); they sit on the root-layout padding like every other list and gain the mobile sticky header block. The header moves above the two-column grid on physical-count / spot-check.
- Accounting pages keep their hardcoded English strings and custom StatusFilter toolbars (i18n is out of scope); single "New …" buttons go through `DocumentListActions`; list/grid pairs through `DisplayModeToggle` (aria-labels now from `common.aria.*`).
- Table heights: journal-voucher `12rem` → `listGridMaxH(false)` (10rem, table 2rem taller); AP invoice / AP payment `13rem` are unchanged in effect (10rem+3rem).
- `journal-voucher-list.tsx` was never prettier-formatted; the first commit is format-only.
- Orphaned `report.listView` / `report.gridView` i18n keys removed (en + th).

No change to queries, columns, filter fields or navigation targets.

## Test plan
- [ ] `bun run typecheck && bun run lint` (≤ 137 warnings)
- [ ] `bun test:run` — green except the 2 pre-existing `ap-mock-repository.test.ts` failures
- [ ] All 11 pages on desktop; pagination 1→2→1 where >1 page; mobile (596px) on physical-count, spot-check, transaction, AP invoice
EOF
)"
```

---

## หลัง PR 4 merge (นอก plan นี้)

- spec ถัดไปตามที่ตกลง: หน้า form 65 หน้า (`DocFormHeader` / `FormToolbar` / wrapper ประจำโมดูล) และหน้า landing 12 หน้า
- การตัดสินใจค้าง: บล็อก sticky บนมือถือไม่มีพื้นหลัง (ของเดิมทุกหน้า list) — แก้ 1 บรรทัดที่ `ListPageShell` (`bg-background`) ถ้าต้องการ
