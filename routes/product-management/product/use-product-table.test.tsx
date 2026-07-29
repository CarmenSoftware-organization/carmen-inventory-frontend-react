import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { IntlProvider } from "use-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

// useProductTable uses useProfile (needs a QueryClientProvider) besides intl.
const queryClient = new QueryClient();

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="en" messages={en}>
        {children}
      </IntlProvider>
    </QueryClientProvider>
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
      const column = table.getColumn(id);
      // The sort field sent to the backend is the column id verbatim
      // (useDataGridState.onSortingChange emits `${id}:${dir}`). Pin id === the
      // backend-accepted field name so a future accessorKey/id rename can't
      // silently emit an unrecognized field and surface a 400 to users.
      expect(column?.id, `${id} column id must equal the backend field`).toBe(
        id,
      );
      expect(column?.getCanSort(), `${id} should be sortable`).toBe(true);
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
