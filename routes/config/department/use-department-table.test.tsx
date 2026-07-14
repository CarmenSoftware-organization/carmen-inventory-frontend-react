import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlProvider } from "use-intl";
import en from "@/messages/en.json";
import type { ParamsDto } from "@/types/params";
import { useDepartmentTable } from "./use-department-table";

const params: ParamsDto = { page: 1, perpage: 10 };

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

// useDepartmentTable → useConfigTable → useCan()/usePermissionPrefix() need
// QueryClientProvider (useProfile) and a Router (useLocation), unlike
// useProductTable which calls useReactTable directly. Mirrors the wrapper in
// department-form.test.tsx.
function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient();
  return (
    <QueryClientProvider client={qc}>
      <IntlProvider locale="en" messages={en}>
        <MemoryRouter>{children}</MemoryRouter>
      </IntlProvider>
    </QueryClientProvider>
  );
}

function renderDepartmentTable() {
  return renderHook(
    () =>
      useDepartmentTable({
        data: [],
        totalRecords: 0,
        params,
        tableConfig,
        onEdit: () => {},
        onDelete: () => {},
      }),
    { wrapper },
  );
}

describe("useDepartmentTable — account_code column", () => {
  it("exposes a non-sortable account_code column", () => {
    const { result } = renderDepartmentTable();
    const column = result.current.getColumn("account_code");
    expect(column, "account_code column must exist").not.toBeUndefined();
    expect(column?.getCanSort(), "account_code should not be sortable").toBe(false);
  });
});
