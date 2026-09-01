import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntlProvider } from "use-intl";
import en from "@/messages/en.json";
import type { Workflow } from "@/types/workflows";

const mockAvailability = vi.fn();

vi.mock("./use-workflow-mutations", () => ({
  useDeleteWorkflow: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("./use-workflow-availability", () => ({
  useWorkflowEditAvailability: () => mockAvailability(),
}));
// DocFormHeader ใช้ useLocation กับ useProfile ด้วย ไม่ได้ใช้แค่ useNavigate
vi.mock("react-router", () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/system-admin/workflow/wf-1" }),
  Link: ({ children }: { children?: unknown }) => children,
}));
vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({ buCode: "BLAVG" }),
}));
vi.mock("@/components/share/activity-sheet-host", () => ({
  openActivity: vi.fn(),
}));

const { WfHeader } = await import("./wf-header");

const workflow = {
  id: "wf-1",
  name: "General PR",
  workflow_type: "purchase_request",
  is_active: true,
  description: null,
} as unknown as Workflow;

/** ตัวเลขชุดนี้มาจาก BL01 ของจริง — เคสที่ tester แจ้งเข้ามา */
const counts = (in_progress: number) => ({
  data: {
    workflow_id: "wf-1",
    workflow_type: "purchase_request",
    can_edit: in_progress === 0,
    blocked_reason: in_progress === 0 ? null : "WORKFLOW_HAS_IN_PROGRESS_DOCUMENTS",
    documents: { draft: 318, in_progress, done: 52, total: 370 + in_progress },
  },
});

function renderHeader(onEdit = vi.fn()) {
  render(
    <IntlProvider locale="en" messages={en}>
      <WfHeader
        workflow={workflow}
        isEditing={false}
        isPending={false}
        onEdit={onEdit}
        onCancel={vi.fn()}
        formId="wf-form"
      />
    </IntlProvider>,
  );
  return onEdit;
}

describe("WfHeader — เข้าโหมดแก้เมื่อยังมีเอกสารดำเนินการอยู่", () => {
  beforeEach(() => mockAvailability.mockReset());

  // backend ปฏิเสธการบันทึกอยู่แล้ว ปล่อยให้เข้าไปกรอกจนเสร็จคือให้เสียเวลาไปกับงานที่บันทึกไม่ได้
  it("ไม่เข้าโหมดแก้ และเด้ง dialog บอกเหตุผล เมื่อมีเอกสาร in_progress", async () => {
    mockAvailability.mockReturnValue(counts(990));
    const onEdit = renderHeader();

    await userEvent.click(screen.getByRole("button", { name: /edit/i }));

    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.getByText(/can’t edit this workflow yet/i)).toBeInTheDocument();
    // บอกจำนวนที่ค้าง ผู้ใช้จะได้รู้ว่าต้องไปเคลียร์เท่าไร
    expect(screen.getByText(/990 document/i)).toBeInTheDocument();
  });

  it("เข้าโหมดแก้ได้ตามปกติเมื่อไม่มีเอกสารค้าง", async () => {
    mockAvailability.mockReturnValue(counts(0));
    const onEdit = renderHeader();

    await userEvent.click(screen.getByRole("button", { name: /edit/i }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/can’t edit this workflow yet/i)).not.toBeInTheDocument();
  });

  // ถ้าอ่านสถานะไม่ได้ อย่าล็อกปุ่ม — ปล่อยไปตกที่การ์ดฝั่ง backend ซึ่งเป็นตัวบังคับจริง
  // การล็อกเพราะ "ไม่รู้" จะทำให้แก้ workflow ไม่ได้เลยเวลา endpoint ล่ม
  it.each([
    ["query ยังโหลดไม่เสร็จ", { data: undefined }],
    ["query ล้มเหลว", { data: null }],
  ])("ปล่อยให้กด Edit ได้เมื่อ %s", async (_label, result) => {
    mockAvailability.mockReturnValue(result);
    const onEdit = renderHeader();

    await userEvent.click(screen.getByRole("button", { name: /edit/i }));

    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("แสดงจำนวนเอกสารแยกสถานะบน header", () => {
    mockAvailability.mockReturnValue(counts(990));
    renderHeader();

    expect(screen.getByText(/draft: 318/i)).toBeInTheDocument();
    expect(screen.getByText(/in progress: 990/i)).toBeInTheDocument();
    expect(screen.getByText(/done: 52/i)).toBeInTheDocument();
  });
});
