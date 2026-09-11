import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import en from "@/messages/en.json";
import {
  fakeMutation,
  renderForm,
} from "@/lib/test-utils/form-characterization";

const navigate = vi.fn();
const createMut = fakeMutation({ data: { id: "wf-new" } });

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useNavigate: () => navigate,
}));
vi.mock("./use-wf-mutations", () => ({
  useCreateWorkflow: () => createMut,
}));

const WorkflowNewForm = (await import("./wf-new-form")).default;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("WorkflowNewForm — กันข้อมูลหายตอนออกจากหน้า", () => {
  it("ยังไม่กรอกอะไร กด Cancel ออกได้เลย ไม่ต้องถาม", async () => {
    renderForm(<WorkflowNewForm />);
    await userEvent.click(
      screen.getByRole("button", { name: en.common.cancel }),
    );

    expect(navigate).toHaveBeenCalledWith("/system-admin/workflow");
  });

  it("กรอกแล้วกด Cancel ต้องถามก่อน ยังไม่พาออก", async () => {
    renderForm(<WorkflowNewForm />);
    await userEvent.type(
      screen.getByLabelText(new RegExp(en.systemAdmin.workflow.workflowName)),
      "PR approval",
    );
    await userEvent.click(
      screen.getByRole("button", { name: en.common.cancel }),
    );

    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByText(en.form.discardTitle)).toBeTruthy();
  });

  it("ยืนยันทิ้งแล้วถึงพาออก", async () => {
    renderForm(<WorkflowNewForm />);
    await userEvent.type(
      screen.getByLabelText(new RegExp(en.systemAdmin.workflow.workflowName)),
      "PR approval",
    );
    await userEvent.click(
      screen.getByRole("button", { name: en.common.cancel }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: en.form.discard }),
    );

    expect(navigate).toHaveBeenCalledWith("/system-admin/workflow");
  });
});
