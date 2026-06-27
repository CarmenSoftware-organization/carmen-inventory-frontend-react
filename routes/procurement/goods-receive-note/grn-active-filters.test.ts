import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useGrnActiveFilters } from "./grn-active-filters";

// t(key) → key, จึง `${t("status")}: ...` = "status: ..."
vi.mock("use-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const STATUS_OPTIONS = [
  { label: "PO", value: "grn_status|string:purchase_order" },
  { label: "MN", value: "grn_status|string:manual" },
];

function setup(over: Record<string, unknown> = {}) {
  const setters = {
    setFilter: vi.fn(),
    setGrnStatus: vi.fn(),
    setSearch: vi.fn(),
  };
  const args = {
    filter: "",
    grnStatus: "",
    search: "",
    statusOptions: STATUS_OPTIONS,
    ...setters,
    ...over,
  };
  const { result } = renderHook(() => useGrnActiveFilters(args));
  return { result, setters };
}

describe("useGrnActiveFilters", () => {
  it("produces no badges when every filter is empty", () => {
    const { result } = setup();
    expect(result.current.activeFilters).toEqual([]);
  });

  it("builds filter, status, and search badges with mapped labels", () => {
    const { result } = setup({
      filter: "abc",
      grnStatus: "grn_status|string:purchase_order,grn_status|string:manual",
      search: "rice",
    });
    const af = result.current.activeFilters;
    expect(af.map((f) => f.key)).toEqual([
      "filter-abc",
      "status-grn_status|string:purchase_order",
      "status-grn_status|string:manual",
      "search-rice",
    ]);
    expect(af[1].label).toBe("status: PO");
    expect(af[3].label).toBe('"rice"');
  });

  it("ignores a status value with no matching option", () => {
    const { result } = setup({ grnStatus: "grn_status|string:ghost" });
    expect(result.current.activeFilters).toEqual([]);
  });

  it("status onRemove drops only that value and re-joins the rest", () => {
    const { result, setters } = setup({
      grnStatus: "grn_status|string:purchase_order,grn_status|string:manual",
    });
    result.current.activeFilters
      .find((f) => f.key === "status-grn_status|string:purchase_order")!
      .onRemove();
    expect(setters.setGrnStatus).toHaveBeenCalledWith("grn_status|string:manual");
  });

  it("clearAllFilters resets every setter to an empty string", () => {
    const { result, setters } = setup({
      filter: "x",
      grnStatus: "grn_status|string:manual",
      search: "y",
    });
    result.current.clearAllFilters();
    expect(setters.setFilter).toHaveBeenCalledWith("");
    expect(setters.setSearch).toHaveBeenCalledWith("");
    expect(setters.setGrnStatus).toHaveBeenCalledWith("");
  });
});
