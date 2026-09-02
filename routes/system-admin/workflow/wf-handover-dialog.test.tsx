import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntlProvider } from "use-intl";
import en from "@/messages/en.json";
import type { User } from "@/types/workflows";
import { WfHandoverDialog } from "./wf-handover-dialog";
import type { WorkflowAssigneeStage } from "./use-workflow-assignee-impact";

const stage = (
  workflow_id: string,
  workflow_name: string,
  name: string,
  in_progress_documents: number,
): WorkflowAssigneeStage => ({
  workflow_id,
  workflow_name,
  workflow_type: "purchase_request",
  stage: name,
  assignee_count: 1,
  is_sole_assignee: true,
  in_progress_documents,
});

const candidates = [
  { user_id: "u-2", firstname: "Malee", lastname: "Test" },
  { user_id: "u-3", firstname: "Nok", lastname: "Test" },
] as unknown as User[];

function renderDialog(stages: WorkflowAssigneeStage[], onConfirm = vi.fn()) {
  render(
    <IntlProvider locale="en" messages={en}>
      <WfHandoverDialog
        open
        stages={stages}
        leavingUserName="Somchai Test"
        candidates={candidates}
        isPending={false}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    </IntlProvider>,
  );
  return onConfirm;
}

const both = [
  stage("wf-1", "PR ทั่วไป", "HOD", 5),
  stage("wf-2", "PO ทั่วไป", "Purchase", 990),
];

describe("WfHandoverDialog — เลือกคนรับช่วงก่อนลบ user", () => {
  // เอกสารที่ค้างเยอะสุดคือความเสียหายที่กำลังเกิดอยู่ ต้องให้เห็นก่อน
  it("เรียง stage ที่มีเอกสารค้างเยอะสุดขึ้นก่อน", () => {
    renderDialog(both);

    const names = screen.getAllByText(/ทั่วไป/).map((el) => el.textContent);
    expect(names).toEqual(["PO ทั่วไป", "PR ทั่วไป"]);
  });

  // ส่งไปครึ่งเดียวก็ยังเหลือ stage ที่ไม่มีคนอยู่ดี ซึ่งคือสภาพที่ dialog นี้มีไว้กัน
  it("ยังยืนยันไม่ได้จนกว่าจะเลือกครบทุก stage", async () => {
    renderDialog(both);
    const confirm = screen.getByRole("button", { name: /^hand over$/i });
    expect(confirm).toBeDisabled();

    await userEvent.click(screen.getAllByRole("combobox")[0]);
    await userEvent.click(screen.getByRole("option", { name: /malee/i }));

    expect(confirm).toBeDisabled();
  });

  it("เลือกครบแล้วส่งคู่ workflow+stage+คนแทน ออกไปครบทุกรายการ", async () => {
    const onConfirm = renderDialog(both);

    for (const combo of screen.getAllByRole("combobox")) {
      await userEvent.click(combo);
      await userEvent.click(screen.getByRole("option", { name: /malee/i }));
    }
    await userEvent.click(screen.getByRole("button", { name: /^hand over$/i }));

    expect(onConfirm).toHaveBeenCalledWith([
      { workflow_id: "wf-2", stage: "Purchase", replacement_user_id: "u-2" },
      { workflow_id: "wf-1", stage: "HOD", replacement_user_id: "u-2" },
    ]);
  });

  it("บอกจำนวนเอกสารที่รออยู่ของแต่ละ stage", () => {
    renderDialog(both);

    expect(screen.getByText(/990 waiting/i)).toBeInTheDocument();
    expect(screen.getByText(/5 waiting/i)).toBeInTheDocument();
  });
});
