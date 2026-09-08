import { useEffect } from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, type UseFormReturn } from "react-hook-form";
import { IntlProvider } from "use-intl";
import en from "@/messages/en.json";
import { WfGeneral } from "./wf-general";
import { DEFAULT_WORKFLOW_DATA } from "./wf-form-schema";
import type { WorkflowCreateModel } from "./wf-form-schema";
import { WORKFLOW_TYPE } from "@/types/workflows";

const label = en.systemAdmin.workflow.inheritSignatureFromPr;

function renderGeneral(workflowType: string, inherit?: boolean) {
  let captured!: UseFormReturn<WorkflowCreateModel>;
  const capture = (form: UseFormReturn<WorkflowCreateModel>) => {
    captured = form;
  };

  function Harness({
    onReady,
  }: {
    readonly onReady: (form: UseFormReturn<WorkflowCreateModel>) => void;
  }) {
    const form = useForm<WorkflowCreateModel>({
      defaultValues: {
        name: "wf",
        workflow_type: workflowType,
        is_active: true,
        description: "",
        data: {
          ...DEFAULT_WORKFLOW_DATA,
          stages: [],
          inherit_signature_from_pr: inherit,
        },
      } as WorkflowCreateModel,
    });
    useEffect(() => onReady(form), [form, onReady]);
    return <WfGeneral form={form} isDisabled={false} />;
  }

  render(
    <IntlProvider locale="en" messages={en}>
      <Harness onReady={capture} />
    </IntlProvider>,
  );
  return () => captured;
}

describe("WfGeneral — inherit signatures from PR", () => {
  // มีแต่ PO ที่มีเอกสารต้นทาง — PR/SR ติ๊กไปก็ไม่มีใครอ่าน และ backend ลบ key ทิ้งอยู่ดี
  it.each([WORKFLOW_TYPE.PR, WORKFLOW_TYPE.SR])(
    "ไม่ขึ้นช่องนี้กับ %s",
    (type) => {
      renderGeneral(type);
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    },
  );

  it("ขึ้นช่องนี้กับ PO และติ๊กแล้วค่าเข้าไปอยู่ใน data", async () => {
    const getForm = renderGeneral(WORKFLOW_TYPE.PO);
    const checkbox = screen.getByRole("checkbox", { name: label });
    expect(checkbox).toHaveAttribute("data-state", "unchecked");

    await userEvent.click(checkbox);

    expect(checkbox).toHaveAttribute("data-state", "checked");
    expect(getForm().getValues("data.inherit_signature_from_pr")).toBe(true);
  });

  it("workflow ที่เปิดค่าไว้แล้ว render มาเป็นติ๊ก", () => {
    renderGeneral(WORKFLOW_TYPE.PO, true);
    expect(screen.getByRole("checkbox", { name: label })).toHaveAttribute(
      "data-state",
      "checked",
    );
  });
});
