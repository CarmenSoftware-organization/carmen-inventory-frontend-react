import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntlProvider } from "use-intl";
import en from "@/messages/en.json";
import { WfLastAssigneeDialog } from "./wf-last-assignee-dialog";

const person = (id: string, firstname: string) => ({
  user_id: id,
  firstname,
  middlename: "",
  lastname: "Test",
  email: `${id}@example.com`,
});

function renderDialog(onResolve = vi.fn()) {
  render(
    <IntlProvider locale="en" messages={en}>
      <WfLastAssigneeDialog
        leavingUser={person("u-1", "Somchai")}
        candidates={[person("u-2", "Malee"), person("u-3", "Nok")]}
        onResolve={onResolve}
      />
    </IntlProvider>,
  );
  return onResolve;
}

describe("WfLastAssigneeDialog — ขอคนแทนก่อนเอาคนสุดท้ายออก", () => {
  it("ยังกดยืนยันไม่ได้จนกว่าจะเลือกคนแทน", () => {
    renderDialog();

    expect(
      screen.getByRole("button", { name: /replace and remove/i }),
    ).toBeDisabled();
  });

  // ปิดกล่องโดยไม่เลือก = ไม่เอาใครออก ไม่งั้นการกดยกเลิกจะทิ้ง stage ให้ว่างซึ่งเป็นสิ่งที่ dialog กันอยู่
  it("ยกเลิกแล้วไม่ส่งคนแทนกลับไป", async () => {
    const onResolve = renderDialog();

    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onResolve).toHaveBeenCalledWith(undefined);
  });

  it("เลือกคนแทนแล้วยืนยัน ส่งคนที่เลือกกลับไป", async () => {
    const onResolve = renderDialog();

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByRole("option", { name: /malee/i }));
    await userEvent.click(
      screen.getByRole("button", { name: /replace and remove/i }),
    );

    expect(onResolve).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "u-2" }),
    );
  });
});
