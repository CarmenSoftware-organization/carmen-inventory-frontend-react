import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { IntlProvider } from "use-intl";
import en from "@/messages/en.json";
import { WfStageGeneral } from "./wf-stage-general";
import type { WorkflowCreateModel } from "./wf-form-schema";
import { DEFAULT_WORKFLOW_DATA, buildDefaultStages } from "./wf-form-schema";

function makeStage(is_show_signature: boolean, name: string) {
  return { ...buildDefaultStages()[1], name, is_show_signature };
}

/** render WfStageGeneral ของ stage หนึ่งตัว โดยมี stages ทั้งชุดอยู่ใน form state */
function Harness({
  stages,
  index,
}: {
  stages: ReturnType<typeof makeStage>[];
  index: number;
}) {
  const form = useForm<WorkflowCreateModel>({
    defaultValues: {
      name: "wf",
      workflow_type: "purchase_request_workflow",
      is_active: true,
      description: "",
      data: { ...DEFAULT_WORKFLOW_DATA, stages },
    } as WorkflowCreateModel,
  });
  return (
    <WfStageGeneral form={form} index={index} isFirst={false} isDisabled={false} />
  );
}

function renderStage(stages: ReturnType<typeof makeStage>[], index: number) {
  render(
    <IntlProvider locale="en" messages={en}>
      <Harness stages={stages} index={index} />
    </IntlProvider>,
  );
}

const label = en.systemAdmin.workflow.showSignatureInReport;

describe("WfStageGeneral — show signature in report", () => {
  it("ติ๊ก checkbox แล้วสถานะเปลี่ยนเป็น checked", async () => {
    const user = userEvent.setup();
    renderStage([makeStage(false, "A")], 0);

    const cb = screen.getByRole("checkbox", { name: label });
    expect(cb).not.toBeChecked();

    await user.click(cb);
    expect(cb).toBeChecked();
  });

  it("ครบ 5 แล้ว stage ที่ยังไม่ติ๊กถูก disable และขึ้นข้อความอธิบาย", () => {
    const stages = [
      makeStage(true, "A"),
      makeStage(true, "B"),
      makeStage(true, "C"),
      makeStage(true, "D"),
      makeStage(true, "E"),
      makeStage(false, "F"),
    ];
    renderStage(stages, 5);

    expect(screen.getByRole("checkbox", { name: label })).toBeDisabled();
    expect(
      screen.getByText(en.systemAdmin.workflow.signatureLimitReached),
    ).toBeInTheDocument();
  });

  it("ครบ 5 แล้ว stage ที่ติ๊กไว้แล้วยังปลดได้", async () => {
    const user = userEvent.setup();
    const stages = [
      makeStage(true, "A"),
      makeStage(true, "B"),
      makeStage(true, "C"),
      makeStage(true, "D"),
      makeStage(true, "E"),
    ];
    renderStage(stages, 0);

    const cb = screen.getByRole("checkbox", { name: label });
    expect(cb).toBeEnabled();

    await user.click(cb);
    expect(cb).not.toBeChecked();
  });
});
