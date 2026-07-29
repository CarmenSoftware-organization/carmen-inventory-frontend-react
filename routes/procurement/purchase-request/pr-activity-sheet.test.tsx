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

function log(
  id: string,
  action: string,
  actorFirstname: string,
  newData: Record<string, unknown> | null = null,
) {
  return {
    id,
    action,
    description: `${action} on tb_purchase_request (${id})`,
    entity_type: "tb_purchase_request",
    entity_id: "pr-1",
    actor_id: null,
    actor_username: "somchai",
    actor_firstname: actorFirstname,
    actor_middlename: null,
    actor_lastname: "S",
    ip_address: "127.0.0.1",
    user_agent: null,
    meta_data: null,
    old_data: null,
    new_data: newData,
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
        data: [log("a", "create", "Anong"), log("b", "update", "Boonmee")],
        paginate: { total: 2, page: 1, perpage: 50, pages: 1 },
      },
      isLoading: false,
      isError: false,
    });
    renderSheet();
    const entries = screen.getAllByRole("button");
    expect(entries[0]).toHaveTextContent("Boonmee");
    expect(entries[1]).toHaveTextContent("Anong");
  });

  it("never shows the raw description — it names the backing table", () => {
    useActivityLogByRecord.mockReturnValue({
      data: {
        data: [log("a", "update", "Anong")],
        paginate: { total: 1, page: 1, perpage: 50, pages: 1 },
      },
      isLoading: false,
      isError: false,
    });
    renderSheet();
    expect(screen.queryByText(/tb_purchase_request/)).not.toBeInTheDocument();
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

  it("loads the diff only for the expanded entry and hides noisy fields", async () => {
    useActivityLogByRecord.mockReturnValue({
      data: {
        data: [log("a", "update", "Anong")],
        paginate: { total: 1, page: 1, perpage: 50, pages: 1 },
      },
      isLoading: false,
      isError: false,
    });
    useActivityLogDetail.mockReturnValue({
      data: {
        ...log("a", "update", "Anong"),
        changes: {
          fields: [
            { field: "pr_status", old: "draft", new: "in_progress" },
            { field: "doc_version", old: 1, new: 2 },
            { field: "workflow_history", old: [], new: [{ action: "submit" }] },
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

    await userEvent.click(screen.getByRole("button", { name: /Anong/ }));

    expect(useActivityLogDetail).toHaveBeenCalledWith("a");
    expect(screen.getByText("Pr Status")).toBeInTheDocument();
    expect(screen.getByText("in_progress")).toBeInTheDocument();
    expect(screen.queryByText("Doc Version")).not.toBeInTheDocument();
    expect(screen.queryByText("Workflow History")).not.toBeInTheDocument();
  });

  it("names the item row an array change belongs to", async () => {
    const newData = {
      tb_purchase_request_detail: [
        { id: "row-1", sequence_no: 2, product_name: "Coffee Beans" },
      ],
    };
    useActivityLogByRecord.mockReturnValue({
      data: {
        data: [log("a", "update", "Anong", newData)],
        paginate: { total: 1, page: 1, perpage: 50, pages: 1 },
      },
      isLoading: false,
      isError: false,
    });
    useActivityLogDetail.mockReturnValue({
      data: {
        ...log("a", "update", "Anong", newData),
        changes: {
          fields: [],
          children: [
            {
              relation: "tb_purchase_request_detail",
              added: [{ id: "row-2", sequence_no: 3, product_name: "Sugar" }],
              removed: [],
              updated: [
                {
                  id: "row-1",
                  fields: [
                    { field: "approved_qty", old: 5, new: 8 },
                    { field: "history", old: [], new: [{ at: "now" }] },
                  ],
                },
              ],
            },
          ],
          has_changes: true,
        },
      },
      isLoading: false,
      isError: false,
    });
    renderSheet();

    await userEvent.click(screen.getByRole("button", { name: /Anong/ }));

    // หัวข้อตารางลูกต้องไม่ใช่ชื่อตารางจริง
    expect(screen.getByText(/^Detail/)).toBeInTheDocument();
    expect(screen.queryByText(/tb_/)).not.toBeInTheDocument();
    // แถวที่ถูกแก้ต้องบอกได้ว่าเป็นรายการไหน ไม่ใช่แค่ตัวเลขที่เปลี่ยน
    expect(screen.getByText("#2 · Coffee Beans")).toBeInTheDocument();
    expect(screen.getByText("Approved Qty")).toBeInTheDocument();
    expect(screen.queryByText("History")).not.toBeInTheDocument();
    // แถวที่เพิ่มเข้ามาก็บอกชื่อ ไม่ใช่แค่จำนวน
    expect(screen.getByText("#3 · Sugar")).toBeInTheDocument();
  });
});
