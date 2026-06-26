import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePrActiveFilters } from "../pr-active-filters";
import { PURCHASE_REQUEST_STATUS_OPTIONS } from "@/constant/purchase-request";

// t(key) → key; formatDate(d) → d ; lookups return one known row each
vi.mock("use-intl", () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({ dateFormat: "yyyy-MM-dd" }),
}));
vi.mock("@/hooks/use-all-users", () => ({
  useAllUsers: () => ({
    data: [{ user_id: "u1", firstname: "Jane", lastname: "Doe" }],
  }),
}));
vi.mock("@/hooks/use-department", () => ({
  useDepartment: () => ({ data: { data: [{ id: "d1", name: "Kitchen" }] } }),
}));
vi.mock("@/hooks/use-workflow", () => ({
  useWorkflowTypeQuery: () => ({ data: [{ id: "w1", name: "Standard" }] }),
}));
vi.mock("@/lib/date-utils", () => ({
  formatDate: (d: string) => d,
}));

const FIRST_STATUS = PURCHASE_REQUEST_STATUS_OPTIONS[0]; // { label, value: "pr_status|string:<key>" }
const FIRST_STATUS_KEY = FIRST_STATUS.value.slice("pr_status|string:".length);

function setup(over: Record<string, unknown> = {}) {
  const setters = {
    setFilter: vi.fn(),
    setStage: vi.fn(),
    setUserId: vi.fn(),
    setDepartmentId: vi.fn(),
    setWorkflowId: vi.fn(),
    setPrDate: vi.fn(),
  };
  const args = {
    filter: "",
    stage: "",
    userId: "",
    departmentId: "",
    workflowId: "",
    prDate: "",
    ...setters,
    ...over,
  };
  const { result } = renderHook(() => usePrActiveFilters(args));
  return { result, setters };
}

describe("usePrActiveFilters", () => {
  it("produces no badges when every filter is empty", () => {
    const { result } = setup();
    expect(result.current.activeFilters).toEqual([]);
  });

  it("maps a status filter to a badge using the option label", () => {
    const { result } = setup({ filter: FIRST_STATUS.value });
    const badge = result.current.activeFilters.find(
      (f) => f.key === `status-${FIRST_STATUS_KEY}`,
    );
    expect(badge?.label).toBe(FIRST_STATUS.label);
  });

  it("resolves requester / department / workflow ids to their names", () => {
    const { result } = setup({
      userId: "requester_id|string:u1",
      departmentId: "department_id|string:d1",
      workflowId: "workflow_id|string:w1",
    });
    const byKey = Object.fromEntries(
      result.current.activeFilters.map((f) => [f.key, f.label]),
    );
    expect(byKey["user-u1"]).toBe("Jane Doe");
    expect(byKey["dept-d1"]).toBe("Kitchen");
    expect(byKey["workflow-w1"]).toBe("Standard");
  });

  it("labels a stage badge with the raw stage value", () => {
    const { result } = setup({
      stage: "workflow_current_stage|string:Approval",
    });
    const badge = result.current.activeFilters.find(
      (f) => f.key === "stage-Approval",
    );
    expect(badge?.label).toBe("Approval");
  });

  it("renders a date-range badge from a pr_date filter", () => {
    const { result } = setup({
      prDate: "pr_date|date_range:2026-01-01,2026-01-31",
    });
    const badge = result.current.activeFilters.find((f) => f.key === "prDate");
    expect(badge?.label).toBe("prDate: 2026-01-01 - 2026-01-31");
  });

  it("status onRemove drops one key and rebuilds the prefixed string", () => {
    const second = PURCHASE_REQUEST_STATUS_OPTIONS[1];
    const secondKey = second.value.slice("pr_status|string:".length);
    const { result, setters } = setup({
      filter: `pr_status|string:${FIRST_STATUS_KEY},${secondKey}`,
    });
    result.current.activeFilters
      .find((f) => f.key === `status-${FIRST_STATUS_KEY}`)!
      .onRemove();
    expect(setters.setFilter).toHaveBeenCalledWith(
      `pr_status|string:${secondKey}`,
    );
  });

  it("clearAllFilters resets every setter to an empty string", () => {
    const { result, setters } = setup({ filter: FIRST_STATUS.value });
    result.current.clearAllFilters();
    expect(setters.setFilter).toHaveBeenCalledWith("");
    expect(setters.setStage).toHaveBeenCalledWith("");
    expect(setters.setUserId).toHaveBeenCalledWith("");
    expect(setters.setDepartmentId).toHaveBeenCalledWith("");
    expect(setters.setWorkflowId).toHaveBeenCalledWith("");
    expect(setters.setPrDate).toHaveBeenCalledWith("");
  });
});
