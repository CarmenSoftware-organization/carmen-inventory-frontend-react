# ListPageShell — PR 1 (ของกลาง) + PR 2 (procurement · store-operation · vendor-management) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** สกัดโครงหน้า list ออกจาก `ConfigListTemplate` เป็น `ListPageShell` + `DisplayModeToggle` + `listGridMaxH` แล้วย้าย 13 หน้าแรก (procurement / store-operation / vendor-management) มาใช้ พร้อม guard test กันการประกอบหัวเองซ้ำ

**Architecture:** `ListPageShell` (`components/share/`) ถือเฉพาะ wrapper + บล็อก sticky + แถว header (`DocumentListHeader` + slot `actions`) + slot `toolbar` + content — ไม่รู้จัก table/query/permission · `ConfigListTemplate` เรียก shell ภายใน · ทุกหน้า list ใต้ `routes/` เรียก shell แทนการก๊อปมาร์กอัป · เทสต์ guard แบบ `type-ladder.test.ts` grep `routes/` แล้วแดงเมื่อพบ `<DocumentListHeader` / ลายเซ็น sticky / `<DisplayTemplate` / `<LayoutList|LayoutGrid` นอก allowlist ซึ่งหดลงทุก PR

**Tech Stack:** React 19 + React Compiler · react-router 7 · Tailwind v4 · use-intl · Vitest + Testing Library · bun

**Spec:** `docs/superpowers/specs/2026-10-01-list-page-shell-design.md`

## Global Constraints

- ภาษาสื่อสาร/commit message = ไทย · code/identifier อังกฤษ · PR title/body อังกฤษ (CLAUDE.md)
- **ไม่แตะ** query / column / filter field / i18n key / การ navigate ของหน้าที่ย้าย (spec §4)
- ห้ามเขียน `text-[…]` นอก ladder (`components/ui/type-ladder.test.ts` แดง) · ห้าม `bg-status-*` · ห้าม `--spacing-md`
- `components/` ห้าม import จาก `routes/` (ESLint module boundary) — shell และ toggle อยู่ `components/share/`
- `"use no memo"` เป็นระดับฟังก์ชัน — shell ไม่ใส่ (ไม่รับ table) · หน้าที่มี directive อยู่แล้วคงไว้ (`routes/CLAUDE.md`)
- ไม่ squash-merge (changelog อ่าน merge commit) · branch จาก `main` · `main` + `prod` + `vercel` + `dev2` เท่านั้น ห้ามแตะ `prod`
- gate ทุก task: `bun run typecheck && bun run lint` · ก่อนเปิด PR: `bun test:run` เขียวทั้ง suite
- preference ผู้ใช้: ไม่เขียนเทสต์เพิ่มนอกจาก 3 ไฟล์ที่ spec §6 ระบุ · ไม่ทำ TDD แบบเขียนเทสต์แดงก่อน — implement → typecheck → เทสต์ → commit

## Review Focus

1. **เปลี่ยนหน้า pagination แล้วตารางค้าง** หลังย้าย JSX ของตารางไปเป็น `children` ของ shell — React Compiler อาจแช่ JSX ก้อนใหม่ (`routes/CLAUDE.md`) · unit test จับไม่ได้ → Task 11 ขั้นเบราว์เซอร์กดหน้า 2 แล้วกลับหน้า 1 ทุกหน้าที่มี DataGrid
2. **หน้าไม่มี `actions`** ต้องไม่เหลือกล่องว่างดันหัวเรื่องให้เพี้ยน → Task 2 เทสต์ว่าแถว header มี child เดียวเมื่อไม่ส่ง actions
3. **pull-refresh indicator โผล่บน desktop** ถ้า shell ไม่เช็ค `isMobile` → Task 2 เทสต์ render ด้วย `distance>0` บน desktop แล้วไม่มี indicator
4. **guard regex ตาบอดเงียบ ๆ** (แก้ class ใน shell แล้ว regex ไม่ match อะไรอีก = เขียวปลอม) → Task 4 มีเทสต์ probe ว่า regex ยังจับตัวอย่างที่ควรจับ (แบบ `type-ladder.test.ts`)
5. **`DisplayModeToggle` สูญ aria-label / สถานะ active** ทำให้ screen reader และสายตาแยกปุ่มไม่ออก → Task 1 เทสต์ aria-label ทั้งสองปุ่มและ `aria-pressed` ของปุ่ม active

---

## PR 1 — ของกลาง (branch `feature/list-page-shell`, มี spec commit อยู่แล้ว)

### Task 1: `DisplayModeToggle` + ให้ `ListToolbar` เรียกใช้

**Files:**
- Create: `components/share/display-mode-toggle.tsx`
- Create: `components/share/__tests__/display-mode-toggle.test.tsx`
- Modify: `components/list-filter/list-toolbar.tsx:1-16` (imports) และ `:152-171` (บล็อก toggle)

**Interfaces:**
- Produces: `export function DisplayModeToggle({ value, onChange, className }: { value: "list" | "grid"; onChange: (mode: "list" | "grid") => void; className?: string })` และ `export type DisplayMode = "list" | "grid"`

- [ ] **Step 1: สร้างคอมโพเนนต์**

```tsx
// components/share/display-mode-toggle.tsx
import { LayoutGrid, LayoutList } from "lucide-react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DisplayMode = "list" | "grid";

interface DisplayModeToggleProps {
  readonly value: DisplayMode;
  readonly onChange: (mode: DisplayMode) => void;
  readonly className?: string;
}

/**
 * ปุ่มคู่สลับมุมมองตาราง/การ์ดของหน้า list — ที่เดียวที่วาดคู่นี้ทั้งแอป
 * (เคยถูกก๊อปไว้ใน ConfigListTemplate, ListToolbar และอีก 9 หน้า)
 * คนละเรื่องกับ `ViewModeToggle` ซึ่งสลับ my-pending / all-documents
 */
export function DisplayModeToggle({
  value,
  onChange,
  className,
}: DisplayModeToggleProps) {
  const tc = useTranslations("common");
  return (
    <div className={cn("flex items-center rounded-md border", className)}>
      <Button
        size="icon-sm"
        variant={value === "list" ? "secondary" : "ghost"}
        onClick={() => onChange("list")}
        aria-label={tc("aria.listView")}
        aria-pressed={value === "list"}
      >
        <LayoutList className="size-4" />
      </Button>
      <Button
        size="icon-sm"
        variant={value === "grid" ? "secondary" : "ghost"}
        onClick={() => onChange("grid")}
        aria-label={tc("aria.gridView")}
        aria-pressed={value === "grid"}
      >
        <LayoutGrid className="size-4" />
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: ให้ `ListToolbar` เรียกใช้** — ใน `components/list-filter/list-toolbar.tsx`
  - บรรทัด 2: `import { Columns3, LayoutGrid, LayoutList } from "lucide-react";` → `import { Columns3 } from "lucide-react";`
  - เพิ่ม `import { DisplayModeToggle } from "@/components/share/display-mode-toggle";`
  - แทนบล็อก `{displayMode && onDisplayModeChange && ( <div className="flex items-center rounded-md border"> … </div> )}` (บรรทัด ~152-171) ด้วย

```tsx
            {displayMode && onDisplayModeChange && (
              <DisplayModeToggle
                value={displayMode}
                onChange={onDisplayModeChange}
              />
            )}
```

- [ ] **Step 3: เทสต์**

```tsx
// components/share/__tests__/display-mode-toggle.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DisplayModeToggle } from "../display-mode-toggle";

// t(key) → key (แบบเดียวกับ document-list-actions.test.tsx)
vi.mock("use-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("DisplayModeToggle", () => {
  it("labels both buttons and marks the active one", () => {
    render(<DisplayModeToggle value="grid" onChange={() => {}} />);
    const list = screen.getByRole("button", { name: "aria.listView" });
    const grid = screen.getByRole("button", { name: "aria.gridView" });
    expect(list).toHaveAttribute("aria-pressed", "false");
    expect(grid).toHaveAttribute("aria-pressed", "true");
  });

  it("reports the clicked mode", async () => {
    const onChange = vi.fn();
    render(<DisplayModeToggle value="list" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "aria.gridView" }));
    expect(onChange).toHaveBeenCalledWith("grid");
  });
});
```

- [ ] **Step 4: ตรวจ**

Run: `bun run typecheck && bun run lint && bun test:run components/share/__tests__/display-mode-toggle.test.tsx components/list-filter`
Expected: เขียวทั้งหมด (เทสต์เดิมของ list-toolbar ถ้ามี ต้องไม่แก้ assertion)

- [ ] **Step 5: Commit**

```bash
git add components/share/display-mode-toggle.tsx components/share/__tests__/display-mode-toggle.test.tsx components/list-filter/list-toolbar.tsx
git commit -m "refactor(list): สกัดปุ่มสลับ list/grid เป็น DisplayModeToggle ตัวเดียว"
```

### Task 2: `ListPageShell` + `listGridMaxH`

**Files:**
- Create: `components/share/list-page-shell.tsx`
- Create: `components/share/__tests__/list-page-shell.test.tsx`

**Interfaces:**
- Consumes: `DocumentListHeader` (`components/share/document-list-header.tsx`), `usePullToRefresh` (`hooks/use-pull-to-refresh.ts` คืน `{ containerRef, distance, isRefreshing, progress }`), `useIsMobile` (`hooks/use-mobile.ts`)
- Produces:
  - `export function ListPageShell(props: ListPageShellProps)` — props ตาม spec §2.1
  - `export const LIST_GRID_MAX_H = { base, withFilters } as const`
  - `export function listGridMaxH(hasActiveFilters: boolean): string`

- [ ] **Step 1: สร้าง shell** — มาร์กอัปย้ายจาก `components/templates/config-list-template.tsx:328-383` ตรง ๆ

```tsx
// components/share/list-page-shell.tsx
import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { DocumentListHeader } from "@/components/share/document-list-header";
import { useIsMobile } from "@/hooks/use-mobile";
import type { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { cn } from "@/lib/utils";

/**
 * ความสูง DataGridContainer ของหน้า list — สองสูตรเดียวทั้งแอป
 * (13rem เมื่อมี ActiveFilterBar กินอีกแถว) หน้าที่มีแถบสรุปเพิ่มเหนือตาราง
 * เขียน calc เองได้ แต่ต้องมี comment บอกว่าชดเชยอะไร
 */
export const LIST_GRID_MAX_H = {
  base: "max-h-[calc(100vh-10rem-3rem)]",
  withFilters: "max-h-[calc(100vh-13rem-3rem)]",
} as const;

export function listGridMaxH(hasActiveFilters: boolean): string {
  return hasActiveFilters ? LIST_GRID_MAX_H.withFilters : LIST_GRID_MAX_H.base;
}

interface ListPageShellProps {
  readonly title: string;
  readonly description: string;
  readonly count?: number;
  /** ปกติคือ <DocumentListActions …> — ไม่ส่ง = ไม่มีปุ่มฝั่งขวาของหัว */
  readonly actions?: ReactNode;
  /** ปกติคือ <ListToolbar …> — accounting ส่ง toolbar ของตัวเอง */
  readonly toolbar?: ReactNode;
  /** ผล usePullToRefresh — มีค่า = ผูก containerRef + วาด indicator บนมือถือ */
  readonly pullRefresh?: ReturnType<typeof usePullToRefresh>;
  readonly children: ReactNode;
}

/**
 * โครงหน้า list ของทุกโมดูล — wrapper · บล็อก sticky บนมือถือ · แถวหัว
 * (DocumentListHeader + actions) · toolbar · content
 *
 * เป็นจุดเดียวที่คุมโครงนี้ทั้งแอป (เคยถูกก๊อปจาก ConfigListTemplate 29 หน้า)
 * guard: components/share/__tests__/list-page-shell.usage.test.ts
 * ไม่ใส่ "use no memo" เพราะไม่รับ table instance — หน้าที่มีตารางคุม directive เอง
 */
export function ListPageShell({
  title,
  description,
  count,
  actions,
  toolbar,
  pullRefresh,
  children,
}: ListPageShellProps) {
  const isMobile = useIsMobile();
  const showPull =
    !!pullRefresh &&
    isMobile &&
    (pullRefresh.distance > 0 || pullRefresh.isRefreshing);

  return (
    <div
      ref={pullRefresh?.containerRef}
      className="pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      {showPull && (
        <div
          data-testid="pull-refresh-indicator"
          className="text-muted-foreground flex items-center justify-center overflow-hidden transition-all"
          style={{
            height: pullRefresh.isRefreshing ? 48 : pullRefresh.distance,
          }}
          aria-hidden={!pullRefresh.isRefreshing}
        >
          <RefreshCw
            className={cn("size-4", pullRefresh.isRefreshing && "animate-spin")}
            style={{
              transform: pullRefresh.isRefreshing
                ? undefined
                : `rotate(${pullRefresh.progress * 360}deg)`,
            }}
          />
        </div>
      )}
      {/* Sticky top section on mobile */}
      <div className="sticky top-0 z-20 space-y-3 pb-3 sm:static sm:pb-0">
        <div
          data-testid="list-page-header"
          className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
        >
          <DocumentListHeader
            title={title}
            description={description}
            count={count}
          />
          {actions}
        </div>
        {toolbar}
      </div>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: เทสต์**

```tsx
// components/share/__tests__/list-page-shell.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ListPageShell, listGridMaxH } from "../list-page-shell";

// ModuleTileIcon ใน DocumentListHeader อ่าน pathname → ต้องมี router
function renderShell(ui: React.ReactElement) {
  return render(
    <MemoryRouter initialEntries={["/procurement/purchase-request"]}>
      {ui}
    </MemoryRouter>,
  );
}

const mobile = vi.hoisted(() => ({ value: false }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => mobile.value }));

const pull = {
  containerRef: { current: null },
  distance: 40,
  isRefreshing: false,
  progress: 0.5,
};

describe("ListPageShell", () => {
  it("renders header, count, actions, toolbar and content", () => {
    renderShell(
      <ListPageShell
        title="Purchase Requests"
        description="All PRs"
        count={12}
        actions={<button type="button">Add</button>}
        toolbar={<input aria-label="search" />}
      >
        <p>rows</p>
      </ListPageShell>,
    );
    expect(
      screen.getByRole("heading", { name: "Purchase Requests" }),
    ).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(screen.getByLabelText("search")).toBeInTheDocument();
    expect(screen.getByText("rows")).toBeInTheDocument();
  });

  it("leaves the header row with a single child when actions is omitted", () => {
    renderShell(
      <ListPageShell title="T" description="D">
        <p>rows</p>
      </ListPageShell>,
    );
    expect(screen.getByTestId("list-page-header").childElementCount).toBe(1);
  });

  it("shows the pull-refresh indicator only on mobile", () => {
    mobile.value = false;
    const { unmount } = renderShell(
      <ListPageShell title="T" description="D" pullRefresh={pull}>
        <p>rows</p>
      </ListPageShell>,
    );
    expect(
      screen.queryByTestId("pull-refresh-indicator"),
    ).not.toBeInTheDocument();
    unmount();

    mobile.value = true;
    renderShell(
      <ListPageShell title="T" description="D" pullRefresh={pull}>
        <p>rows</p>
      </ListPageShell>,
    );
    expect(screen.getByTestId("pull-refresh-indicator")).toBeInTheDocument();
  });
});

describe("listGridMaxH", () => {
  it("adds a row of height when filters are active", () => {
    expect(listGridMaxH(false)).toBe("max-h-[calc(100vh-10rem-3rem)]");
    expect(listGridMaxH(true)).toBe("max-h-[calc(100vh-13rem-3rem)]");
  });
});
```

- [ ] **Step 3: ตรวจ**

Run: `bun run typecheck && bun run lint && bun test:run components/share/__tests__/list-page-shell.test.tsx`
Expected: PASS 4 เทสต์ · `useIsMobile` ถูก mock แล้ว ไม่ต้อง stub `matchMedia`

- [ ] **Step 4: Commit**

```bash
git add components/share/list-page-shell.tsx components/share/__tests__/list-page-shell.test.tsx
git commit -m "feat(list): เพิ่ม ListPageShell โครงหน้า list กลาง + listGridMaxH"
```

### Task 3: `ConfigListTemplate` ย้ายมาใช้ shell

**Files:**
- Modify: `components/templates/config-list-template.tsx:1-10` (imports), `:328-383` (wrapper → shell), `:384-443` (content ใช้ `listGridMaxH`), `:407-427` (toggle → `DisplayModeToggle`)
- Test (เดิม ต้องเขียวโดยไม่แก้): `components/templates/config-list-template.license.test.tsx`

**Interfaces:**
- Consumes: `ListPageShell`, `listGridMaxH` (Task 2) · `DisplayModeToggle` (Task 1)

- [ ] **Step 1: imports** — บรรทัด 4-10

```tsx
import { Columns3, Loader2 } from "lucide-react";
```

(ตัด `LayoutGrid`, `LayoutList`, `RefreshCw` — `Loader2` ยังใช้ที่ sentinel grid) · ตัด `import { DocumentListHeader } …` · เพิ่ม

```tsx
import { ListPageShell, listGridMaxH } from "@/components/share/list-page-shell";
import { DisplayModeToggle } from "@/components/share/display-mode-toggle";
```

- [ ] **Step 2: แทน `return ( <div ref=… className="pb-[max…">` ถึงปิด `</div>` ของบล็อก sticky (บรรทัด 328-383)** ด้วย

```tsx
  return (
    <ListPageShell
      title={t("title")}
      description={t("desc")}
      pullRefresh={pullRefresh}
      actions={
        <DocumentListActions
          onAdd={handleAddClick}
          addDisabled={addBlocked}
          addLabel={t("add")}
          onExport={handleExport}
          isExporting={isExporting}
          showExport={!!exportColumns}
          hideExportPrint={hideExportPrint}
          extraActions={extraActions}
        />
      }
      toolbar={
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex w-full flex-1 items-center gap-2 sm:w-auto">
              <div className="flex-1 sm:flex-initial">
                <SearchInput defaultValue={search} onSearch={setSearch} />
              </div>
              <span className="bg-border hidden h-4 w-px sm:block" />
              {/* Saved views + registry filter sheet — ทำงานทั้ง desktop และ mobile
                  (ListFilter ปรับ side เอง ผ่าน useIsMobile ภายในตัวมัน) */}
              <ViewSelector
                view={lf.view}
                snapshot={{ filters: lf.values, sort: lf.sortParam || undefined }}
              />
              <ListFilter
                fields={filterFields}
                values={lf.values}
                setValue={lf.setValue}
                onClearAll={lf.clearAll}
                onSaveClick={() => setSaveDialogOpen(true)}
                activeCount={lf.activeFilters.length}
              />
            </div>
            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              <DataGridSortMenu table={table} />
              {!isGridMode && (
                <DataGridColumnVisibility
                  table={table}
                  trigger={
                    <Button
                      size="icon-sm"
                      variant="outline"
                      aria-label={tc("aria.toggleColumns")}
                    >
                      <Columns3 className="size-4" />
                    </Button>
                  }
                />
              )}
              {renderCard && (
                <DisplayModeToggle
                  value={displayMode}
                  onChange={setDisplayMode}
                />
              )}
            </div>
          </div>
          {/* Active filter badges — driven by registry field values, not statusOptions */}
          <ActiveFilterBar filters={lf.activeFilters} onClearAll={lf.clearAll} />
        </>
      }
    >
```

- [ ] **Step 3: content** — ตัด `<div className="mt-3 space-y-3">` ที่เปิดบรรทัด 385 และ `</div>` คู่ของมัน (shell ห่อให้แล้ว) · `DataGridContainer` className เปลี่ยนเป็น

```tsx
            <DataGridContainer
              className={cn("flex flex-col", listGridMaxH(lf.activeFilters.length > 0))}
            >
```

· `renderDialog`, `renderDeleteFlow`, `SaveViewDialog` อยู่ต่อท้ายใน children เหมือนเดิม · ปิดด้วย `</ListPageShell>` แทน `</div>` ตัวนอกสุด · `isMobile` ยังใช้ที่ `usePullToRefresh({ disabled: !isMobile })` และ `isGridMode` — คงไว้

- [ ] **Step 4: ตรวจ**

Run: `bun run typecheck && bun run lint && bun test:run components/templates`
Expected: `config-list-template.license.test.tsx` เขียวโดยไม่แก้ · ไม่มี unused import

- [ ] **Step 5: เบราว์เซอร์** — `bun dev` แล้วเปิด `/config/currency` (CLT, มี renderCard) และ `/config/department` (CLT ไม่มี card) ความกว้าง desktop + <640px: หัว+badge นับ · ปุ่ม Add/Export/Print · toggle list/grid ทำงาน · กดหน้า 2 แล้วกลับหน้า 1 ตารางเปลี่ยน · มือถือ: ลากลงเห็น indicator หมุน

- [ ] **Step 6: Commit**

```bash
git add components/templates/config-list-template.tsx
git commit -m "refactor(config-list): ให้ ConfigListTemplate ใช้ ListPageShell + DisplayModeToggle"
```

### Task 4: guard test + เปิด PR 1

**Files:**
- Create: `components/share/__tests__/list-page-shell.usage.test.ts`

**Interfaces:** ไม่มี (static test)

- [ ] **Step 1: เขียน guard** — allowlist = ทุกไฟล์ที่ยังประกอบหัวเอง ณ วันนี้ (จาก spec §4) · ตัวเลขคือจำนวนลายเซ็นที่พบในไฟล์นั้น เป็นค่าประมาณจากการ grep — Step 2 จะรันแล้วคัดลอกตัวเลขจริงมาใส่ (รูปแบบเดียวกับ `ALLOWED_OFF_LADDER` ใน `type-ladder.test.ts`)

```ts
// components/share/__tests__/list-page-shell.usage.test.ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const ROOT = join(import.meta.dirname, "../../..");

/**
 * ลายเซ็นของหัวหน้า list ที่ประกอบเอง — ทั้งหมดต้องมาจาก ListPageShell /
 * DisplayModeToggle เท่านั้น (spec 2026-10-01-list-page-shell-design.md §5)
 *
 * - `<DocumentListHeader` — ห้ามเรียกตรงจาก routes/ (shell เรียกให้)
 * - ลายเซ็น sticky แบบเต็มของ ConfigListTemplate ที่ถูกก๊อป 29 หน้า
 *   (จงใจเป็น string เต็ม: `routes/profile/user-profile-setting.tsx` มี
 *   `sticky top-0 z-20` ของตัวเองคนละเรื่อง ไม่ใช่หน้า list)
 * - `<DisplayTemplate` — คอมโพเนนต์ที่กำลังถูกถอด
 * - `<LayoutList` / `<LayoutGrid` — ปุ่มคู่ต้องผ่าน DisplayModeToggle
 */
const SIGNATURES = [
  /<DocumentListHeader\b/g,
  /sticky top-0 z-20 space-y-3 pb-3 sm:static sm:pb-0/g,
  /<DisplayTemplate\b/g,
  /<Layout(?:List|Grid)\b/g,
];

function tsxFiles(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) return tsxFiles(rel);
    return e.name.endsWith(".tsx") && !e.name.endsWith(".test.tsx")
      ? [rel]
      : [];
  });
}

const sources = tsxFiles("routes").map((file) => ({
  file,
  src: readFileSync(join(ROOT, file), "utf-8"),
}));

/**
 * หน้าที่ยังไม่ย้าย — หดลงทุก PR ของงานนี้ จบงานเหลือบรรทัดเดียว
 * ค่า = จำนวนลายเซ็นที่พบในไฟล์ (เปลี่ยนเมื่อแตะไฟล์ = ต้องมาอัปเดตที่นี่)
 */
const ALLOWED: Record<string, number> = {
  // ── ถาวร — หัว dashboard ยืม DocumentListHeader ไม่ใช่หน้า list (งาน landing คนละ spec)
  "routes/accounting/dashboard/accounting-dashboard-page.tsx": 1,

  // ── PR 2: procurement · store-operation · vendor-management
  "routes/procurement/credit-note/cn-component.tsx": 2,
  "routes/procurement/goods-receive-note/grn-component.tsx": 2,
  "routes/procurement/purchase-order/po-component.tsx": 2,
  "routes/procurement/purchase-request/pr-component.tsx": 2,
  "routes/procurement/purchase-request-template/prt-component.tsx": 2,
  "routes/procurement/approval/approval-component.tsx": 1,
  "routes/store-operation/store-requisition/sr-component.tsx": 4,
  "routes/store-operation/stock-replenishment/stock-repl-component.tsx": 1,
  "routes/store-operation/wastage-reporting/wr-component.tsx": 1,
  "routes/vendor-management/price-list-template/plt-component.tsx": 2,
  "routes/vendor-management/price-list/pl-component.tsx": 2,
  "routes/vendor-management/request-price-list/rfp-component.tsx": 4,
  "routes/vendor-management/vendor/vendor-component.tsx": 2,

  // ── PR 3: system-admin · report · config · operation-plan
  "routes/system-admin/activity-log/activity-log-component.tsx": 2,
  "routes/system-admin/document/document-component.tsx": 2,
  "routes/system-admin/user-activity/user-activity-component.tsx": 2,
  "routes/system-admin/user/user-component.tsx": 2,
  "routes/system-admin/inventory-period/inventory-period-component.tsx": 2,
  "routes/system-admin/role/role-component.tsx": 2,
  "routes/system-admin/running-code/running-code-component.tsx": 2,
  "routes/system-admin/workflow/wf-component.tsx": 2,
  "routes/system-admin/notification-template/noti-tmpl.tsx": 1,
  "routes/system-admin/dashboard-dataset/dashboard-dataset-component.tsx": 1,
  "routes/report/list/report-component.tsx": 4,
  "routes/report/history/history-component.tsx": 3,
  "routes/report/schedules/schedule-component.tsx": 1,
  "routes/config/exchange-rate/exchange-rate-component.tsx": 4,
  "routes/config/account-grouping/account-grouping-page.tsx": 1,
  "routes/config/chart-of-account-mapping/coam-component.tsx": 1,
  "routes/config/title-master/title-master-page.tsx": 1,
  "routes/operation-plan/category/recipe-category-component.tsx": 2,
  "routes/operation-plan/cuisine/cuisine-component.tsx": 2,
  "routes/operation-plan/equipment-category/equipment-category-component.tsx": 2,
  "routes/operation-plan/equipment/eq-component.tsx": 2,
  "routes/operation-plan/recipe/recipe-component.tsx": 2,
  "routes/operation-plan/recipe-equipment-category/recipe-equipment-category-component.tsx": 1,

  // ── PR 4: accounting · inventory-management · product-management
  "routes/accounting/accounts-payable/ap-invoice-list.tsx": 4,
  "routes/accounting/accounts-payable/ap-payment-list.tsx": 3,
  "routes/accounting/accounts-receivable/ar-invoice-list.route.tsx": 1,
  "routes/accounting/documents/accounting-document-list.tsx": 4,
  "routes/accounting/journal-voucher/journal-voucher-list.tsx": 3,
  "routes/inventory-management/inventory-adjustment/ia-component.tsx": 2,
  "routes/inventory-management/physical-count/pc-component.tsx": 1,
  "routes/inventory-management/spot-check/sc-component.tsx": 1,
  "routes/inventory-management/transaction/transaction-component.tsx": 1,
  "routes/product-management/product/pd-component.tsx": 2,
  "routes/product-management/category/category-component.tsx": 2,
};

function countSignatures(src: string): number {
  return SIGNATURES.reduce(
    (n, re) => n + (src.match(re)?.length ?? 0),
    0,
  );
}

describe("list pages go through ListPageShell", () => {
  it("only hand-built list headers listed with a reason remain", () => {
    const counts: Record<string, number> = {};
    for (const { file, src } of sources) {
      const n = countSignatures(src);
      if (n > 0) counts[file] = n;
    }
    expect(counts).toEqual(ALLOWED);
  });

  it("still finds every signature it claims to guard", () => {
    // กัน regex ตาบอดเงียบ ๆ — ถ้าแก้ class ใน shell แล้วลืมมาแก้ที่นี่ เทสต์บน
    // จะเขียวเพราะไม่ match อะไรเลย ไม่ใช่เพราะย้ายครบ
    const probe = [
      `<DocumentListHeader title="x" description="y" />`,
      `<div className="sticky top-0 z-20 space-y-3 pb-3 sm:static sm:pb-0">`,
      `<DisplayTemplate title="x">`,
      `<LayoutList className="size-4" />`,
      `<LayoutGrid className="size-4" />`,
    ].join("\n");
    expect(countSignatures(probe)).toBe(5);
  });
});
```

- [ ] **Step 2: รันครั้งแรกแล้วปรับตัวเลข** — `bun test:run components/share/__tests__/list-page-shell.usage.test.ts` · `toEqual` จะแดงตรงตัวเลขที่ประมาณไว้ไม่ตรง ให้คัดลอกตัวเลขจริงจาก "Received" มาใส่ `ALLOWED` · **ชุดไฟล์** ต้องตรงกับ spec §4 — ไฟล์เกิน/ขาดแปลว่า spec นับผิด ให้แก้ spec §4 ด้วยแล้ว commit ไปพร้อมกัน · รันอีกรอบต้องเขียว

- [ ] **Step 3: ตรวจทั้ง suite**

Run: `bun run typecheck && bun run lint && bun test:run`
Expected: เขียวทั้งหมด (จำนวนเทสต์เพิ่ม = 2 + 4 + 2)

- [ ] **Step 4: Commit + PR**

```bash
git add components/share/__tests__/list-page-shell.usage.test.ts docs/superpowers/specs/2026-10-01-list-page-shell-design.md
git commit -m "test(list): guard กันประกอบหัวหน้า list เองนอก ListPageShell (allowlist 50 หน้า)"
git push -u origin feature/list-page-shell
gh pr create --title "refactor(list): extract ListPageShell from ConfigListTemplate" --body "$(cat <<'EOF'
## Summary
- Extract the list-page frame (wrapper, mobile sticky block, header row, toolbar slot) from `ConfigListTemplate` into `components/share/list-page-shell.tsx`
- Extract the list/grid button pair into `DisplayModeToggle`; `ListToolbar` and `ConfigListTemplate` use it
- `listGridMaxH()` replaces the two copied `max-h-[calc(...)]` formulas
- Guard test `list-page-shell.usage.test.ts` fails on any hand-built list header outside an allowlist of the 50 pages still to migrate (PR 2–4 shrink it)

Spec: `docs/superpowers/specs/2026-10-01-list-page-shell-design.md`

## Test plan
- [ ] `bun run typecheck && bun run lint && bun test:run`
- [ ] `/config/currency` and `/config/department` on desktop + <640px: header/count, Add/Export/Print, list/grid toggle, pagination moves rows, pull-to-refresh spinner on mobile
EOF
)"
```

- [ ] **Step 5: รอ merge PR 1** (user กด merge เป็น merge commit) แล้ว `git checkout main && git pull`

---

## PR 2 — procurement · store-operation · vendor-management (branch `feature/list-page-shell-wave-1` จาก `main` หลัง PR 1 merge)

สูตรเดียวกันทุกหน้า (spec §4): ตัด wrapper `pb-[max…]` + บล็อก sticky + แถว header → `<ListPageShell>` · ปุ่มเขียนสด → `DocumentListActions` · toggle สด → `DisplayModeToggle` · `max-h-[calc…]` → `listGridMaxH(...)` · `<div className="mt-3 space-y-3">` ตัดทิ้ง (shell ห่อให้) · ลบ import ที่ไม่ใช้ · **ไม่แตะ** อย่างอื่น · ทุก task จบด้วย `bun run typecheck && bun run lint` และตัดไฟล์นั้นออกจาก `ALLOWED` ใน guard test

### Task 5: 7 หน้าที่ใช้ `ListToolbar` อยู่แล้ว — cn · grn · pr · po · plt · pl · vendor

**Files:**
- Modify: `routes/procurement/credit-note/cn-component.tsx:26` (import), `:139-169` (wrapper), `:155-156,:202-203` (max-h)
- Modify: `routes/procurement/goods-receive-note/grn-component.tsx:28` (import), wrapper (grep `pb-[max(1rem`), `:308-309,:358-359` (max-h)
- Modify: `routes/procurement/purchase-request/pr-component.tsx:42`, wrapper, `:333-334`
- Modify: `routes/procurement/purchase-order/po-component.tsx` (import `DocumentListHeader`), `:344-383` (wrapper), max-h (grep)
- Modify: `routes/vendor-management/price-list-template/plt-component.tsx:27`, wrapper, `:263-264`
- Modify: `routes/vendor-management/price-list/pl-component.tsx:31`, wrapper, `:297-298`
- Modify: `routes/vendor-management/vendor/vendor-component.tsx:30`, wrapper, `:226-227`
- Modify: `components/share/__tests__/list-page-shell.usage.test.ts` (ตัด 7 บรรทัด)

**Interfaces:**
- Consumes: `ListPageShell`, `listGridMaxH` จาก `@/components/share/list-page-shell`

- [ ] **Step 1: cn-component.tsx (ตัวอย่างเต็ม — อีก 6 ไฟล์ทำเหมือนกันทุกประการ)**

import: แทน `import { DocumentListHeader } from "@/components/share/document-list-header";` ด้วย
`import { ListPageShell, listGridMaxH } from "@/components/share/list-page-shell";`

บล็อก `return (` เดิม

```tsx
  return (
    <div className="pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="sticky top-0 z-20 space-y-3 pb-3 sm:static sm:pb-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <DocumentListHeader
            title={t("title")}
            description={t("desc")}
            count={totalRecords}
          />
          <DocumentListActions
            onExport={handleExport}
            isExporting={isExporting}
            onAdd={() =>
              navigate("/procurement/credit-note/new", listReturnState())
            }
            addLabel={t("add")}
          />
        </div>

        <ListToolbar
          search={search}
          onSearch={setSearch}
          lf={lf}
          fields={cnFilterFields}
          onSaveViewClick={() => setSaveViewDialogOpen(true)}
          table={table}
          displayMode={displayMode}
          onDisplayModeChange={setDisplayMode}
        />
      </div>

      <div className="mt-3 space-y-3">
```

→ ใหม่

```tsx
  return (
    <ListPageShell
      title={t("title")}
      description={t("desc")}
      count={totalRecords}
      actions={
        <DocumentListActions
          onExport={handleExport}
          isExporting={isExporting}
          onAdd={() =>
            navigate("/procurement/credit-note/new", listReturnState())
          }
          addLabel={t("add")}
        />
      }
      toolbar={
        <ListToolbar
          search={search}
          onSearch={setSearch}
          lf={lf}
          fields={cnFilterFields}
          onSaveViewClick={() => setSaveViewDialogOpen(true)}
          table={table}
          displayMode={displayMode}
          onDisplayModeChange={setDisplayMode}
        />
      }
    >
```

ท้ายไฟล์: `</div>` คู่ของ `mt-3 space-y-3` และ `</div>` ตัวนอกสุด → เหลือ `</ListPageShell>` ตัวเดียว (dialog/SaveViewDialog ที่เคยอยู่หลัง `mt-3` ย้ายมาอยู่ใน children ต่อท้าย — ลำดับ DOM เดิม) · ทั้งสองจุด `DataGridContainer`:

```tsx
            <DataGridContainer
              className={cn("flex flex-col", listGridMaxH(lf.activeFilters.length > 0))}
            >
```

- [ ] **Step 2: อีก 6 ไฟล์** — สูตรเดียวกับ Step 1 ต่างกันแค่ props ที่ส่งให้ `DocumentListActions` / `ListToolbar` ซึ่ง**คัดลอกจากของเดิมในไฟล์นั้นโดยไม่แก้**:
  - grn: `onAdd={() => setShowCreateDialog(true)}` · max-h เดิมเป็น `11rem` สองจุด (ก๊อปผิด ไม่มีแถบเพิ่ม) → `listGridMaxH` เช่นกัน
  - pr: `onAdd={handleAdd} addDisabled={!canCreatePr}` · `ListToolbar` มี `beforeViewSelector={<ViewModeToggle … />}` คงไว้ในก้อน toolbar
  - po: เหมือน pr (`addDisabled={!canCreatePo}`, `beforeViewSelector` ViewModeToggle) · เปิดไฟล์ดูบรรทัด 344-383
  - plt / pl / vendor: `onAdd={() => navigate("/vendor-management/<path>/new", listReturnState())}` ตามของเดิม
  - ทุกไฟล์: ตรวจว่า `cn` ยัง import อยู่ (ใช้ใน className ของ DataGridContainer)

- [ ] **Step 3: ตัด 7 ไฟล์ออกจาก `ALLOWED`** ใน `components/share/__tests__/list-page-shell.usage.test.ts`

- [ ] **Step 4: ตรวจ**

Run: `bun run typecheck && bun run lint && bun test:run components/share/__tests__/list-page-shell.usage.test.ts routes/procurement routes/vendor-management`
Expected: เขียว · guard ไม่พบ 7 ไฟล์นี้อีก

- [ ] **Step 5: Commit**

```bash
git add routes/procurement/credit-note/cn-component.tsx routes/procurement/goods-receive-note/grn-component.tsx routes/procurement/purchase-request/pr-component.tsx routes/procurement/purchase-order/po-component.tsx routes/vendor-management/price-list-template/plt-component.tsx routes/vendor-management/price-list/pl-component.tsx routes/vendor-management/vendor/vendor-component.tsx components/share/__tests__/list-page-shell.usage.test.ts
git commit -m "refactor(list): CN/GRN/PR/PO/PLT/PL/Vendor ใช้ ListPageShell"
```

### Task 6: prt-component.tsx — ปุ่ม export/print/add ที่เขียนซ้ำ → `DocumentListActions`

**Files:**
- Modify: `routes/procurement/purchase-request-template/prt-component.tsx:5,:41` (imports), wrapper (grep `pb-[max(1rem` ~บรรทัด 230-310), `:310-311,:353-354` (max-h)
- Modify: guard allowlist

**Interfaces:**
- Consumes: `ListPageShell`, `listGridMaxH`, `DocumentListActions` (`@/components/share/document-list-actions` — props `onAdd addLabel onExport isExporting`)

- [ ] **Step 1: imports** — บรรทัด 5 `import { Download, Loader2, MoreHorizontal, Plus, Printer } from "lucide-react";` → `import { Loader2 } from "lucide-react";` (ถ้า `Loader2` ไม่ถูกใช้ที่อื่นในไฟล์ ลบทั้งบรรทัด) · ลบ import `DropdownMenu*` ถ้าไม่มีที่ใช้อื่น · แทน import `DocumentListHeader` ด้วย `ListPageShell, listGridMaxH` · เพิ่ม `import { DocumentListActions } from "@/components/share/document-list-actions";`

- [ ] **Step 2: wrapper** — บล็อก `<div className="flex w-full items-center gap-2 sm:w-auto"> … </DropdownMenu> </div>` (ปุ่ม Export/Print/Add + dropdown มือถือ ซึ่งเหมือน `DocumentListActions` ทุกบรรทัด) แทนทั้งก้อนด้วย

```tsx
  return (
    <ListPageShell
      title={t("title")}
      description={t("desc")}
      count={totalRecords}
      actions={
        <DocumentListActions
          onExport={handleExport}
          isExporting={isExporting}
          onAdd={() =>
            navigate(
              "/procurement/purchase-request-template/new",
              listReturnState(),
            )
          }
          addLabel={t("add")}
        />
      }
      toolbar={
        <ListToolbar
          search={search}
          onSearch={setSearch}
          lf={lf}
          fields={prtFilterFields}
          onSaveViewClick={() => setSaveViewDialogOpen(true)}
          table={table}
          displayMode={displayMode}
          onDisplayModeChange={setDisplayMode}
        />
      }
    >
```

ท้ายไฟล์และ `DataGridContainer` สองจุด ทำเหมือน Task 5 Step 1 · `tc` ยังถูกใช้ที่อื่นหรือไม่ ถ้าไม่ ลบ `const tc = useTranslations("common")`

- [ ] **Step 3: ตัด prt ออกจาก `ALLOWED`** · Run: `bun run typecheck && bun run lint && bun test:run components/share/__tests__/list-page-shell.usage.test.ts routes/procurement/purchase-request-template` → เขียว

- [ ] **Step 4: Commit**

```bash
git add routes/procurement/purchase-request-template/prt-component.tsx components/share/__tests__/list-page-shell.usage.test.ts
git commit -m "refactor(list): PR template ใช้ ListPageShell + DocumentListActions แทนปุ่มที่เขียนซ้ำ"
```

### Task 7: sr-component.tsx — toolbar สด → `ListToolbar` (ให้เหมือน PO/PR)

**Files:**
- Modify: `routes/store-operation/store-requisition/sr-component.tsx:5,:33` (imports), wrapper (grep `pb-[max(1rem` ~บรรทัด 400-480), `:494-495` (max-h)
- Modify: guard allowlist

**Interfaces:**
- Consumes: `ListPageShell`, `listGridMaxH`, `ListToolbar` (`@/components/list-filter/list-toolbar` — props `search onSearch lf fields onSaveViewClick table displayMode onDisplayModeChange beforeViewSelector`)

พฤติกรรมที่เปลี่ยนโดยตั้งใจ (ให้ตรง PO/PR ซึ่งเป็นเอกสารกลุ่มเดียวกัน): เมนู Sort/Columns จะแสดงในโหมด grid ด้วย (เดิมซ่อน) · ระยะ `gap-x-6` ระหว่างกลุ่มกลายเป็น `gap-2` ของ `ListToolbar`

- [ ] **Step 1: imports** — บรรทัด 5 → `import { Loader2 } from "lucide-react";` (ตัด `Columns3, LayoutGrid, LayoutList`) · แทน `DocumentListHeader` ด้วย `ListPageShell, listGridMaxH` · เพิ่ม `import { ListToolbar } from "@/components/list-filter/list-toolbar";` · ลบ import `SearchInput`, `ViewSelector`, `ListFilter`, `ActiveFilterBar`, `DataGridSortMenu`, `DataGridColumnVisibility` ถ้าไม่มีที่ใช้อื่นในไฟล์ (grep ชื่อก่อนลบ)

- [ ] **Step 2: wrapper** — ตั้งแต่ `return (` ถึง `<div className="mt-3 space-y-3">` แทนด้วย

```tsx
  return (
    <ListPageShell
      title={t("title")}
      description={t("desc")}
      count={totalRecords}
      actions={
        <DocumentListActions
          onExport={handleExport}
          isExporting={isExporting}
          onAdd={handleAdd}
          addLabel={t("add")}
          addDisabled={!canCreateSr}
        />
      }
      toolbar={
        <ListToolbar
          search={search}
          onSearch={setSearch}
          lf={lf}
          fields={srFilterFields}
          onSaveViewClick={() => setSaveViewDialogOpen(true)}
          table={table}
          displayMode={displayMode}
          onDisplayModeChange={setDisplayMode}
          beforeViewSelector={
            <ViewModeToggle
              value={viewMode}
              onChange={handleViewModeChange}
              myPendingLabel={t("myPending")}
              allDocumentsLabel={t("allDocuments")}
              className="hidden items-center gap-2 sm:flex"
            />
          }
        />
      }
    >
```

ท้ายไฟล์และ `DataGridContainer` ทำเหมือน Task 5 Step 1 · `tc` ถ้าไม่เหลือที่ใช้ ลบ

- [ ] **Step 3: ตัด sr ออกจาก `ALLOWED`** · Run: `bun run typecheck && bun run lint && bun test:run components/share/__tests__/list-page-shell.usage.test.ts routes/store-operation/store-requisition` → เขียว

- [ ] **Step 4: Commit**

```bash
git add routes/store-operation/store-requisition/sr-component.tsx components/share/__tests__/list-page-shell.usage.test.ts
git commit -m "refactor(list): SR ใช้ ListPageShell + ListToolbar ให้โครงเดียวกับ PO/PR"
```

### Task 8: rfp-component.tsx — คง toolbar เอง (มี chip คำค้น) แต่ใช้ shell + `DisplayModeToggle`

**Files:**
- Modify: `routes/vendor-management/request-price-list/rfp-component.tsx:4,:31` (imports), wrapper (grep `pb-[max(1rem` ~บรรทัด 220-290), `:335-336` (max-h)
- Modify: guard allowlist

**Interfaces:**
- Consumes: `ListPageShell`, `listGridMaxH`, `DisplayModeToggle` (`@/components/share/display-mode-toggle`)

ทำไมไม่ย้ายไป `ListToolbar`: หน้านี้มี `clearAllFilters` ที่ล้าง search ด้วย และ `activeFilters` ที่ต่อ chip คำค้นเอง (บรรทัด 117-135 มี comment อธิบาย) `ListToolbar` ผูก `ActiveFilterBar` กับ `lf.clearAll` ตายตัว ย้ายแล้วพฤติกรรมเปลี่ยน — นอกขอบเขต

- [ ] **Step 1: imports** — บรรทัด 4 → `import { Columns3, Loader2 } from "lucide-react";` · แทน `DocumentListHeader` ด้วย `ListPageShell, listGridMaxH` · เพิ่ม `import { DisplayModeToggle } from "@/components/share/display-mode-toggle";`

- [ ] **Step 2: wrapper**

```tsx
  return (
    <ListPageShell
      title={t("title")}
      description={t("desc")}
      count={totalRecords}
      actions={
        <DocumentListActions
          onExport={handleExport}
          isExporting={isExporting}
          onAdd={() =>
            navigate(
              "/vendor-management/request-price-list/new",
              listReturnState(),
            )
          }
          addLabel={t("add")}
        />
      }
      toolbar={
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex w-full flex-1 items-center gap-2 sm:w-auto">
              <div className="flex-1 sm:flex-initial">
                <SearchInput defaultValue={search} onSearch={setSearch} />
              </div>
              <span className="bg-border hidden h-4 w-px sm:block" />
              <ViewSelector
                view={lf.view}
                snapshot={{ filters: lf.values, sort: lf.sortParam || undefined }}
              />
              <ListFilter
                fields={rfpFilterFields}
                values={lf.values}
                setValue={lf.setValue}
                onClearAll={clearAllFilters}
                onSaveClick={() => setSaveViewDialogOpen(true)}
                activeCount={lf.activeFilters.length}
              />
            </div>
            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              <DataGridSortMenu table={table} />
              {!isGridMode && (
                <DataGridColumnVisibility
                  table={table}
                  trigger={
                    <Button
                      size="icon-sm"
                      variant="outline"
                      aria-label={tc("aria.toggleColumns")}
                    >
                      <Columns3 className="size-4" />
                    </Button>
                  }
                />
              )}
              <DisplayModeToggle value={displayMode} onChange={setDisplayMode} />
            </div>
          </div>
          <ActiveFilterBar filters={activeFilters} onClearAll={clearAllFilters} />
        </>
      }
    >
```

ท้ายไฟล์และ `DataGridContainer` ทำเหมือน Task 5 Step 1

- [ ] **Step 3: ตัด rfp ออกจาก `ALLOWED`** · Run: `bun run typecheck && bun run lint && bun test:run components/share/__tests__/list-page-shell.usage.test.ts routes/vendor-management/request-price-list` → เขียว

- [ ] **Step 4: Commit**

```bash
git add routes/vendor-management/request-price-list/rfp-component.tsx components/share/__tests__/list-page-shell.usage.test.ts
git commit -m "refactor(list): RFP ใช้ ListPageShell + DisplayModeToggle (คง toolbar ที่มี chip คำค้น)"
```

### Task 9: approval + wastage-reporting — `DisplayTemplate` + `ListToolbar` bare → shell + `ListToolbar` ปกติ

**Files:**
- Modify: `routes/procurement/approval/approval-component.tsx:15,:19` (imports), return (grep `<DisplayTemplate`), `:183` (ปิด)
- Modify: `routes/store-operation/wastage-reporting/wr-component.tsx:17-18` (imports), return (grep `<DisplayTemplate`), `:149` (ปิด)
- Modify: guard allowlist

**Interfaces:**
- Consumes: `ListPageShell` · `ListToolbar` แบบไม่ bare (ต่อ `ActiveFilterBar` ท้ายให้เอง)

พฤติกรรมที่เปลี่ยนโดยตั้งใจ: ได้ไอคอนโมดูล + บล็อก sticky บนมือถือ · ไม่ส่ง `table` จึงไม่มี Sort/Columns เหมือนเดิม

- [ ] **Step 1: approval-component.tsx** — ลบ `import DisplayTemplate …` และ `import { ActiveFilterBar } …` · เพิ่ม `import { ListPageShell } from "@/components/share/list-page-shell";` · บล็อก return

```tsx
  return (
    <ListPageShell
      title={t("title")}
      description={t("desc")}
      toolbar={
        <ListToolbar
          search={search}
          // ค้นหาและ filter ประเภทเอกสารทำที่ SQL ทั้งคู่ จึงใช้ร่วมกันได้ตรง ๆ
          // เดิมต้องล้าง filter ทิ้งตอนค้น เพราะทั้งสองทำฝั่ง client บนข้อมูลหน้าแรก
          onSearch={setSearch}
          lf={lf}
          fields={APPROVAL_FILTER_FIELDS}
          onSaveViewClick={() => setSaveViewDialogOpen(true)}
        />
      }
    >
```

(ตัด `variant="bare"` และ prop `filterBar` ทั้งก้อน) · บรรทัด 183 `</DisplayTemplate>` → `</ListPageShell>` · children เดิม (summary cards + ตารางคิว) ไม่แตะ

- [ ] **Step 2: wr-component.tsx** — ทำเหมือน Step 1 (`fields={wrFilterFields}`) · ถ้าในไฟล์มี `max-h-[calc…]` ของตารางที่ชดเชยแถบสรุป ให้คงสูตรเดิมและเติม comment `// สูงกว่า listGridMaxH เพราะมีแถบสรุป (nItems/nExpired/…) กินอีกแถวเหนือตาราง` — ห้ามเปลี่ยนตัวเลข

- [ ] **Step 3: ตัด 2 ไฟล์ออกจาก `ALLOWED`** · Run: `bun run typecheck && bun run lint && bun test:run components/share/__tests__/list-page-shell.usage.test.ts routes/procurement/approval routes/store-operation/wastage-reporting` → เขียว

- [ ] **Step 4: Commit**

```bash
git add routes/procurement/approval/approval-component.tsx routes/store-operation/wastage-reporting/wr-component.tsx components/share/__tests__/list-page-shell.usage.test.ts
git commit -m "refactor(list): Approval/Wastage ใช้ ListPageShell แทน DisplayTemplate"
```

### Task 10: stock-repl-component.tsx — `DisplayTemplate` ไม่มี filter registry

**Files:**
- Modify: `routes/store-operation/stock-replenishment/stock-repl-component.tsx:16` (import), return (grep `<DisplayTemplate`), `:301` (ปิด)
- Modify: guard allowlist

**Interfaces:**
- Consumes: `ListPageShell` — `actions` รับ ReactNode ใด ๆ (ปุ่ม Refresh ไม่ใช่ Add จึงไม่ผ่าน `DocumentListActions`)

- [ ] **Step 1: แก้** — ลบ `import DisplayTemplate …` · เพิ่ม `import { ListPageShell } from "@/components/share/list-page-shell";` · บล็อก return

```tsx
  return (
    <ListPageShell
      title={t("title")}
      description={t("desc")}
      actions={
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          <RefreshCcw />
          {tc("refresh")}
        </Button>
      }
      toolbar={
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-auto sm:flex-initial">
            <SearchInput defaultValue={search} onSearch={setSearch} />
          </div>
        </div>
      }
    >
```

· บรรทัด 301 `</DisplayTemplate>` → `</ListPageShell>`

- [ ] **Step 2: ตัดออกจาก `ALLOWED`** · Run: `bun run typecheck && bun run lint && bun test:run components/share/__tests__/list-page-shell.usage.test.ts routes/store-operation/stock-replenishment` → เขียว

- [ ] **Step 3: Commit**

```bash
git add routes/store-operation/stock-replenishment/stock-repl-component.tsx components/share/__tests__/list-page-shell.usage.test.ts
git commit -m "refactor(list): Stock replenishment ใช้ ListPageShell แทน DisplayTemplate"
```

### Task 11: ตรวจทั้ง suite + เบราว์เซอร์ + PR 2

**Files:** ไม่มีไฟล์ใหม่ (แก้ตามที่เจอเท่านั้น)

- [ ] **Step 1: ทั้ง suite**

Run: `bun run typecheck && bun run lint && bun test:run`
Expected: เขียว · guard allowlist เหลือ 38 บรรทัด (51 − 13)

- [ ] **Step 2: เบราว์เซอร์** — `bun dev` (dev backend, admin@zebra.com) เปิดทั้ง 13 หน้า desktop และ <640px:

| หน้า | path | จุดเฉพาะ |
|---|---|---|
| CN / GRN / PR / PO | `/procurement/credit-note` · `/goods-receive-note` · `/purchase-request` · `/purchase-order` | PR/PO: ViewModeToggle my-pending/all ยังสลับได้ · GRN: ปุ่ม Add เปิด dialog |
| PR template | `/procurement/purchase-request-template` | มือถือ: ปุ่ม ⋯ มี Export/Print |
| Approval | `/procurement/approval` | ได้ไอคอนโมดูล + sticky ใหม่ · summary cards ครบ |
| SR | `/store-operation/store-requisition` | Sort/Columns โชว์ใน grid ด้วย (ตั้งใจ) · ViewModeToggle |
| Stock repl. / Wastage | `/store-operation/stock-replenishment` · `/wastage-reporting` | ปุ่ม Refresh · แถบสรุปไม่ทับตาราง |
| PLT / PL / RFP / Vendor | `/vendor-management/price-list-template` · `/price-list` · `/request-price-list` · `/vendor` | RFP: chip คำค้น + Clear all ล้าง search ด้วย |

ทุกหน้าที่มี DataGrid: กดหน้า 2 แล้วกลับหน้า 1 แถวต้องเปลี่ยน — ถ้าค้าง ใส่ `"use no memo";` บรรทัดแรกของคอมโพเนนต์หน้านั้น (ไม่ใช่ที่ shell) แล้ว commit แยก `fix(list): <หน้า> ตารางค้างตอนเปลี่ยนหน้าหลังย้าย shell`

- [ ] **Step 3: PR**

```bash
git push -u origin feature/list-page-shell-wave-1
gh pr create --title "refactor(list): procurement, store-operation, vendor lists use ListPageShell" --body "$(cat <<'EOF'
## Summary
Wave 1 of the list-page unification (spec `docs/superpowers/specs/2026-10-01-list-page-shell-design.md`, PR 2 of 4): 13 pages drop their hand-copied header/sticky markup for `ListPageShell`.

- CN / GRN / PR / PO / PLT / PL / Vendor: frame only
- PR template: hand-rolled export/print/add → `DocumentListActions`
- SR: hand-rolled toolbar → `ListToolbar` (same as PO/PR; sort/columns now visible in grid mode)
- RFP: keeps its toolbar (search chip + clear-all semantics), list/grid pair → `DisplayModeToggle`
- Approval / Wastage / Stock replenishment: `DisplayTemplate` → shell (module icon + mobile sticky block gained)
- Guard allowlist shrinks 51 → 38

No change to queries, columns, filter fields, i18n keys or navigation.

## Test plan
- [ ] `bun run typecheck && bun run lint && bun test:run`
- [ ] All 13 pages opened on desktop + <640px: header/count, actions, sticky block, pagination moves rows
EOF
)"
```

---

## PR 3 / PR 4

plan แยก (`2026-10-xx-list-page-shell-pr3.md`, `…-pr4.md`) หลัง PR 2 merge — สูตรต่อหน้าเหมือน Task 5–10 ตรงตามแถวใน spec §4 · กรณีเฉพาะที่ plan นั้นต้องเขียนเป็น task ของตัวเอง: email-profile / email-template / ar-invoice-list ย้าย body ออกจาก `.route.tsx` · accounting ยัด toolbar เดิมลง slot · pc / sc / transaction ถอด `InvListShell` / `-mx-3 -my-3` · PR 4 ลบ `components/display-template.tsx` และ `InvListShell` เมื่อ grep ไม่เหลือผู้ใช้
