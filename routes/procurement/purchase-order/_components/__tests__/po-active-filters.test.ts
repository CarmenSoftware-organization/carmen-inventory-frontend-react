import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePoActiveFilters } from "../po-active-filters";

const TYPE_OPTIONS = [
  { label: "General", value: "po_type|string:general" },
  { label: "Blanket", value: "po_type|string:blanket" },
];

function setup(over: Record<string, unknown> = {}) {
  const setters = {
    setFilter: vi.fn(),
    setPoType: vi.fn(),
    setSearch: vi.fn(),
  };
  const args = {
    filter: "",
    poType: "",
    search: "",
    typeOptions: TYPE_OPTIONS,
    ...setters,
    ...over,
  };
  const { result } = renderHook(() => usePoActiveFilters(args));
  return { result, setters };
}

describe("usePoActiveFilters", () => {
  it("produces no badges when every filter is empty", () => {
    const { result } = setup();
    expect(result.current.activeFilters).toEqual([]);
  });

  it("builds filter, type, and search badges in order", () => {
    const { result } = setup({
      filter: "abc",
      poType: "po_type|string:general,po_type|string:blanket",
      search: "milk",
    });
    const af = result.current.activeFilters;
    expect(af.map((f) => f.key)).toEqual([
      "filter-abc",
      "type-po_type|string:general",
      "type-po_type|string:blanket",
      "search-milk",
    ]);
    expect(af[1].label).toBe("Type: General");
    expect(af[3].label).toBe('"milk"');
  });

  it("ignores a type value that has no matching option", () => {
    const { result } = setup({ poType: "po_type|string:ghost" });
    expect(result.current.activeFilters).toEqual([]);
  });

  it("type onRemove drops only that value and re-joins the rest", () => {
    const { result, setters } = setup({
      poType: "po_type|string:general,po_type|string:blanket",
    });
    result.current.activeFilters
      .find((f) => f.key === "type-po_type|string:general")!
      .onRemove();
    expect(setters.setPoType).toHaveBeenCalledWith("po_type|string:blanket");
  });

  it("removing the last type value clears the param", () => {
    const { result, setters } = setup({ poType: "po_type|string:general" });
    result.current.activeFilters
      .find((f) => f.key.startsWith("type-"))!
      .onRemove();
    expect(setters.setPoType).toHaveBeenCalledWith("");
  });

  it("clearAllFilters resets every setter to an empty string", () => {
    const { result, setters } = setup({
      filter: "x",
      poType: "po_type|string:general",
      search: "y",
    });
    result.current.clearAllFilters();
    expect(setters.setFilter).toHaveBeenCalledWith("");
    expect(setters.setSearch).toHaveBeenCalledWith("");
    expect(setters.setPoType).toHaveBeenCalledWith("");
  });
});
