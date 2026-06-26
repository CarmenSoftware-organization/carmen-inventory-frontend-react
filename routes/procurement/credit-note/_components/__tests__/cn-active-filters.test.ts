import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCnActiveFilters } from "../cn-active-filters";

vi.mock("use-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const TYPE_OPTIONS = [
  { label: "Credit", value: "credit_note_type|string:credit" },
  { label: "Debit", value: "credit_note_type|string:debit" },
];
const STATUS_OPTIONS = [
  { label: "Draft", value: "cn_status|string:draft" },
  { label: "Posted", value: "cn_status|string:posted" },
];

function setup(over: Record<string, unknown> = {}) {
  const setters = {
    setFilter: vi.fn(),
    setCnType: vi.fn(),
    setCnStatus: vi.fn(),
    setSearch: vi.fn(),
  };
  const args = {
    filter: "",
    cnType: "",
    cnStatus: "",
    search: "",
    typeOptions: TYPE_OPTIONS,
    statusOptions: STATUS_OPTIONS,
    ...setters,
    ...over,
  };
  const { result } = renderHook(() => useCnActiveFilters(args));
  return { result, setters };
}

describe("useCnActiveFilters", () => {
  it("produces no badges when every filter is empty", () => {
    const { result } = setup();
    expect(result.current.activeFilters).toEqual([]);
  });

  it("builds filter, type, status, and search badges in order", () => {
    const { result } = setup({
      filter: "abc",
      cnType: "credit_note_type|string:credit",
      cnStatus: "cn_status|string:draft,cn_status|string:posted",
      search: "oil",
    });
    const af = result.current.activeFilters;
    expect(af.map((f) => f.key)).toEqual([
      "filter-abc",
      "type-credit_note_type|string:credit",
      "status-cn_status|string:draft",
      "status-cn_status|string:posted",
      "search-oil",
    ]);
    expect(af[1].label).toBe("type: Credit");
    expect(af[2].label).toBe("status: Draft");
    expect(af[4].label).toBe('"oil"');
  });

  it("status onRemove drops only that value and re-joins the rest", () => {
    const { result, setters } = setup({
      cnStatus: "cn_status|string:draft,cn_status|string:posted",
    });
    result.current.activeFilters
      .find((f) => f.key === "status-cn_status|string:draft")!
      .onRemove();
    expect(setters.setCnStatus).toHaveBeenCalledWith("cn_status|string:posted");
  });

  it("type onRemove of the last value clears the param", () => {
    const { result, setters } = setup({
      cnType: "credit_note_type|string:credit",
    });
    result.current.activeFilters
      .find((f) => f.key.startsWith("type-"))!
      .onRemove();
    expect(setters.setCnType).toHaveBeenCalledWith("");
  });

  it("clearAllFilters resets every setter to an empty string", () => {
    const { result, setters } = setup({
      filter: "x",
      cnType: "credit_note_type|string:credit",
      cnStatus: "cn_status|string:draft",
      search: "y",
    });
    result.current.clearAllFilters();
    expect(setters.setFilter).toHaveBeenCalledWith("");
    expect(setters.setSearch).toHaveBeenCalledWith("");
    expect(setters.setCnType).toHaveBeenCalledWith("");
    expect(setters.setCnStatus).toHaveBeenCalledWith("");
  });
});
