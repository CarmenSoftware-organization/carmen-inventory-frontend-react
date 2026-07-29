# Product List Sortable Columns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable server-side sort on the five backend-supported product-list columns by clicking their headers.

**Architecture:** The product list is server-paginated with `manualSorting: true`. Sort UI, URL persistence, and the `?sort=field:dir` query param already exist in shared infra (`useDataGridState`, `DataGridColumnHeader`). The only change is opting the right columns into sorting by removing `enableSorting: false` from their column defs in `use-product-table.tsx`. A new contract test locks which columns may sort.

**Tech Stack:** React, TanStack Table v8, `use-intl`, Vitest, Testing Library (`renderHook`).

## Global Constraints

- Communicate with the user in Thai; code, comments, commit messages in English.
- Sort is server-side only — a column may be sortable **only** if the backend accepts its sort field. Verified backend-supported fields: `code`, `name`, `local_name`, `inventory_unit_name`, `product_status_type`. Backend-rejected (400 `Unknown argument`): `product_category_name`, `product_sub_category_name`, `product_item_group_name`.
- `bunx tsc --noEmit && bun test:run` must be clean before commit.
- Do not touch shared data-grid infra, the backend, or grid/card mode.

---

## File Structure

- **Modify:** `routes/product-management/product/use-product-table.tsx` — remove `enableSorting: false` from four column defs.
- **Create:** `routes/product-management/product/use-product-table.test.tsx` — contract test asserting `getCanSort()` per column.

Both files live together in the product route folder, matching the colocated convention.

---

### Task 1: Contract test + enable sort on supported columns

**Files:**
- Modify: `routes/product-management/product/use-product-table.tsx`
- Test: `routes/product-management/product/use-product-table.test.tsx` (create)

**Interfaces:**
- Consumes: `useProductTable({ products, totalRecords, params, tableConfig, onEdit, onDelete })` from `./use-product-table` — returns a TanStack `Table<Product>` instance. Column ids: `code`, `name`, `local_name`, `inventory_unit_name`, `product_category_name`, `product_sub_category_name`, `product_item_group_name`, `product_status_type`.
- Produces: nothing consumed by later tasks (final task).

- [ ] **Step 1: Write the failing test**

Create `routes/product-management/product/use-product-table.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { IntlProvider } from "use-intl";
import en from "@/messages/en.json";
import type { ParamsDto } from "@/types/params";
import { useProductTable } from "./use-product-table";

const params: ParamsDto = { page: 1, perpage: 10 };

// Minimal tableConfig matching the shape useDataGridState().tableConfig produces,
// so the test does not need a Router context.
const tableConfig = {
  manualPagination: true as const,
  manualSorting: true as const,
  pageCount: 0,
  state: {
    pagination: { pageIndex: 0, pageSize: 10 },
    sorting: [],
  },
  onPaginationChange: () => {},
  onSortingChange: () => {},
};

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <IntlProvider locale="en" messages={en}>
      {children}
    </IntlProvider>
  );
}

function renderProductTable() {
  return renderHook(
    () =>
      useProductTable({
        products: [],
        totalRecords: 0,
        params,
        tableConfig,
        onEdit: () => {},
        onDelete: () => {},
      }),
    { wrapper },
  );
}

const SORTABLE = [
  "code",
  "name",
  "local_name",
  "inventory_unit_name",
  "product_status_type",
];

const NOT_SORTABLE = [
  "product_category_name",
  "product_sub_category_name",
  "product_item_group_name",
];

describe("useProductTable — sortable columns", () => {
  it("enables sort only on backend-supported columns", () => {
    const { result } = renderProductTable();
    const table = result.current;
    for (const id of SORTABLE) {
      expect(table.getColumn(id)?.getCanSort(), `${id} should be sortable`).toBe(
        true,
      );
    }
  });

  it("keeps relation columns non-sortable (backend rejects those sort fields)", () => {
    const { result } = renderProductTable();
    const table = result.current;
    for (const id of NOT_SORTABLE) {
      expect(
        table.getColumn(id)?.getCanSort(),
        `${id} should NOT be sortable`,
      ).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test:run routes/product-management/product/use-product-table.test.tsx`
Expected: FAIL — the first test fails because `code`, `local_name`, `inventory_unit_name`, and `product_status_type` currently carry `enableSorting: false`, so `getCanSort()` returns `false` (only `name` is already sortable). The second test passes.

- [ ] **Step 3: Enable sort on the four supported columns**

In `routes/product-management/product/use-product-table.tsx`, remove the `enableSorting: false` line from exactly four column defs. Leave the three relation columns unchanged.

`code` column — remove the line:
```tsx
    {
      accessorKey: "code",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("code")} />
      ),
      cell: ({ row }) => (
        <CellAction onClick={() => onEdit(row.original)}>
          {row.original.code}
        </CellAction>
      ),
      meta: { headerTitle: tfl("code"), skeleton: columnSkeletons.text },
    },
```
(deletes `enableSorting: false,` that sat between the `cell` and `meta` entries)

`local_name` column — remove the line:
```tsx
    {
      accessorKey: "local_name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("localName")} />
      ),
      size: 300,
      meta: { headerTitle: tfl("localName"), skeleton: columnSkeletons.text },
    },
```
(deletes `enableSorting: false,` that sat before `size: 300`)

`inventory_unit_name` column — remove the line:
```tsx
    {
      accessorKey: "inventory_unit_name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("unit")} />
      ),
      meta: { headerTitle: tfl("unit"), skeleton: columnSkeletons.text },
    },
```
(deletes `enableSorting: false,` that sat before `meta`)

`product_status_type` column — remove the line:
```tsx
    {
      id: "product_status_type",
      accessorKey: "product_status_type",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("status")}
          className="justify-center"
        />
      ),
      cell: ({ row }) => {
        const status = row.getValue<string>("product_status_type");
        return (
          <Badge
            size="sm"
            variant={status === "active" ? "success" : "secondary"}
          >
            {getProductStatusLabel(ts, status)}
          </Badge>
        );
      },
      size: 100,
      meta: {
        headerTitle: tfl("status"),
        cellClassName: "text-center",
        skeleton: columnSkeletons.badge,
      },
    },
```
(deletes `enableSorting: false,` that sat between `size: 100` and `meta`)

**Do NOT remove** `enableSorting: false` from `product_category_name`, `product_sub_category_name`, or `product_item_group_name` — the backend returns 400 for those sort fields.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test:run routes/product-management/product/use-product-table.test.tsx`
Expected: PASS (both tests).

- [ ] **Step 5: Typecheck**

Run: `bunx tsc --noEmit`
Expected: no output (clean).

- [ ] **Step 6: Commit**

```bash
git add routes/product-management/product/use-product-table.tsx routes/product-management/product/use-product-table.test.tsx
git commit -m "feat(product): sortable code/name/local_name/unit/status columns

Enable server-side sort on the five backend-verified columns. Category,
sub-category and item group stay non-sortable (backend returns 400 for
their sort fields). Adds a contract test locking which columns may sort."
```

---

## Self-Review

**Spec coverage:**
- Enable sort on code/name/local_name/inventory_unit_name/product_status_type → Task 1 Step 3. ✓
- Keep category/sub-category/item-group non-sortable → Task 1 Step 3 (explicit "Do NOT remove"). ✓
- Contract test asserting `getCanSort()` per column → Task 1 Steps 1–4. ✓
- No backend / grid-mode / default-sort / infra changes → not touched; single-file scope holds. ✓
- `bunx tsc --noEmit && bun test:run` clean → Steps 4–5. ✓

**Placeholder scan:** No TBD/TODO; all code shown in full. ✓

**Type consistency:** Column ids used in the test (`code`, `name`, `local_name`, `inventory_unit_name`, `product_status_type`, `product_category_name`, `product_sub_category_name`, `product_item_group_name`) match the ids in `use-product-table.tsx`. `tableConfig` shape matches `useDataGridState().tableConfig`. `ParamsDto`, `useProductTable` signature match source. ✓
