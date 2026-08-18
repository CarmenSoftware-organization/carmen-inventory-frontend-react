import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import type { ColumnDef, CellContext } from "@tanstack/react-table";
import { useConfigTable } from "./use-config-table";

// t(key) → key (namespace ไม่สำคัญสำหรับเทสต์นี้)
vi.mock("use-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// ตรรกะ can/canWrite เทสต์แยกไว้แล้วที่ hooks/use-can.test.ts — ที่นี่ mock
// ทั้ง hook เพื่อทดสอบแค่ว่า useConfigTable ต่อสาย canWrite → action column
// → DataGridRowActions ถูก (ตามแบบ form-toolbar.test.tsx)
const useCanReturn = vi.fn();
vi.mock("@/hooks/use-can", () => ({
  useCan: () => useCanReturn(),
}));

const dispatchPermissionDenied = vi.fn();
vi.mock("@/components/permission-denied-dialog", () => ({
  dispatchPermissionDenied: (...args: unknown[]) =>
    dispatchPermissionDenied(...args),
}));

interface Row {
  id: string;
}

const params = { page: 1, perpage: 10 };
const tableConfig = {
  manualPagination: true as const,
  manualSorting: true as const,
  pageCount: 0,
  state: { pagination: { pageIndex: 0, pageSize: 10 }, sorting: [] },
  onPaginationChange: () => {},
  onSortingChange: () => {},
};

function wrapper({ children }: { children: React.ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

function renderTable(onDelete: (item: Row) => void) {
  return renderHook(
    () =>
      useConfigTable<Row>({
        data: [{ id: "row-1" }],
        columns: [] as ColumnDef<Row>[],
        totalRecords: 1,
        params,
        tableConfig,
        onDelete,
        permissionPrefix: "configuration.department",
      }),
    { wrapper },
  );
}

/** Render the "action" column's cell for the first row so we can assert on the DOM it produces. */
function renderActionCell(onDelete: (item: Row) => void) {
  const { result } = renderTable(onDelete);
  const actionColumn = result.current
    .getAllColumns()
    .find((c) => c.id === "action");
  if (!actionColumn) throw new Error("action column not found");
  const cellFn = actionColumn.columnDef.cell as (
    ctx: CellContext<Row, unknown>,
  ) => React.ReactNode;
  const element = cellFn({
    row: { original: { id: "row-1" } },
  } as CellContext<Row, unknown>);
  return render(<>{element}</>);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useConfigTable — canWrite false: row Delete is disabled with the license title", () => {
  it("threads writeDisabled + a translated title through to the row's Delete action", async () => {
    useCanReturn.mockReturnValue({
      can: () => true,
      isAdmin: false,
      canWrite: false,
    });
    const onDelete = vi.fn();
    renderActionCell(onDelete);

    await userEvent.click(screen.getByRole("button", { name: "rowActions" }));
    const item = screen.getByText("delete").closest('[role="menuitem"]');
    expect(item).toHaveAttribute("data-disabled");
    expect(item).toHaveAttribute("title", "writeDisabledTitle");

    await userEvent.click(screen.getByText("delete"));
    expect(onDelete).not.toHaveBeenCalled();
    expect(dispatchPermissionDenied).not.toHaveBeenCalled();
  });
});

describe("useConfigTable — canWrite true: row Delete behaves as before (permission-gated only)", () => {
  it("Delete runs normally when the user can write and has permission", async () => {
    useCanReturn.mockReturnValue({
      can: () => true,
      isAdmin: false,
      canWrite: true,
    });
    const onDelete = vi.fn();
    renderActionCell(onDelete);

    await userEvent.click(screen.getByRole("button", { name: "rowActions" }));
    const item = screen.getByText("delete").closest('[role="menuitem"]');
    expect(item).not.toHaveAttribute("data-disabled");
    expect(item).not.toHaveAttribute("title");

    await userEvent.click(screen.getByText("delete"));
    expect(onDelete).toHaveBeenCalledWith({ id: "row-1" });
  });

  it("Delete is permission-dimmed (dialog-on-click) when canWrite is true but the permission is missing", async () => {
    useCanReturn.mockReturnValue({
      can: () => false,
      isAdmin: false,
      canWrite: true,
    });
    const onDelete = vi.fn();
    renderActionCell(onDelete);

    await userEvent.click(screen.getByRole("button", { name: "rowActions" }));
    const item = screen.getByText("delete").closest('[role="menuitem"]');
    expect(item).not.toHaveAttribute("data-disabled");

    await userEvent.click(screen.getByText("delete"));
    expect(onDelete).not.toHaveBeenCalled();
    expect(dispatchPermissionDenied).toHaveBeenCalledTimes(1);
  });
});
