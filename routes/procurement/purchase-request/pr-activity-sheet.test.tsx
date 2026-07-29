import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrActivitySheet } from "./pr-activity-sheet";

// t(key) → key
vi.mock("use-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({ dateFormat: "dd/MM/yyyy" }),
}));

const useActivityLogByRecord = vi.fn();
const useActivityLogDetail = vi.fn();

vi.mock("@/hooks/use-activity-log", () => ({
  useActivityLogByRecord: (...args: unknown[]) =>
    useActivityLogByRecord(...args),
  useActivityLogDetail: (...args: unknown[]) => useActivityLogDetail(...args),
}));

function log(id: string, action: string, description: string) {
  return {
    id,
    action,
    description,
    entity_type: "tb_purchase_request",
    entity_id: "pr-1",
    actor_id: null,
    actor_username: "somchai",
    actor_firstname: "Somchai",
    actor_middlename: null,
    actor_lastname: "S",
    ip_address: "127.0.0.1",
    user_agent: null,
    meta_data: null,
    old_data: null,
    new_data: null,
    audit: { created: { at: "2026-07-29T03:00:00.000Z", id: null, name: null }, updated: { at: "" } },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useActivityLogByRecord.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
  });
  useActivityLogDetail.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
  });
});

function renderSheet(open = true) {
  render(
    <PrActivitySheet
      prId="pr-1"
      prNo="PR-2026-001"
      open={open}
      onOpenChange={vi.fn()}
    />,
  );
}

describe("PrActivitySheet", () => {
  it("does not fetch while the sheet is closed", () => {
    renderSheet(false);
    expect(useActivityLogByRecord).toHaveBeenCalledWith(undefined, {
      perpage: 50,
    });
  });

  it("lists the newest entry first (backend returns oldest first)", () => {
    useActivityLogByRecord.mockReturnValue({
      data: {
        data: [log("a", "create", "created"), log("b", "update", "submitted")],
        paginate: { total: 2, page: 1, perpage: 50, pages: 1 },
      },
      isLoading: false,
      isError: false,
    });
    renderSheet();
    const entries = screen.getAllByRole("button");
    expect(entries[0]).toHaveTextContent("submitted");
    expect(entries[1]).toHaveTextContent("created");
  });

  it("shows the empty state when the document has no activity", () => {
    useActivityLogByRecord.mockReturnValue({
      data: { data: [], paginate: { total: 0, page: 1, perpage: 50, pages: 1 } },
      isLoading: false,
      isError: false,
    });
    renderSheet();
    expect(screen.getByText("activityEmpty")).toBeInTheDocument();
  });

  it("loads the diff only for the expanded entry and hides housekeeping fields", async () => {
    useActivityLogByRecord.mockReturnValue({
      data: {
        data: [log("a", "update", "edited")],
        paginate: { total: 1, page: 1, perpage: 50, pages: 1 },
      },
      isLoading: false,
      isError: false,
    });
    useActivityLogDetail.mockReturnValue({
      data: {
        ...log("a", "update", "edited"),
        changes: {
          fields: [
            { field: "pr_status", old: "draft", new: "in_progress" },
            { field: "doc_version", old: 1, new: 2 },
          ],
          children: [],
          has_changes: true,
        },
      },
      isLoading: false,
      isError: false,
    });
    renderSheet();

    expect(useActivityLogDetail).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: /edited/ }));

    expect(useActivityLogDetail).toHaveBeenCalledWith("a");
    expect(screen.getByText("Pr Status")).toBeInTheDocument();
    expect(screen.getByText("in_progress")).toBeInTheDocument();
    expect(screen.queryByText("Doc Version")).not.toBeInTheDocument();
  });
});
