import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { FormToolbar } from "./form-toolbar";
import { PERMISSIONS } from "@/constant/permissions";

// t(key) → key (namespace ไม่สำคัญสำหรับเทสต์นี้)
vi.mock("use-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// ตรรกะ can/canWrite เทสต์แยกไว้แล้วที่ hooks/use-can.test.ts และ
// hooks/use-license.test.ts ตรง ๆ — ที่นี่ mock ทั้ง hook เพื่อทดสอบแค่ว่า
// FormToolbar render disabled/title/dialog ถูกตามค่าที่ hook คืนมา
// (ตามแบบ side-main.test.tsx ที่ mock useVisibleModules)
const useCanReturn = vi.fn();
// DocFormHeader (ลูกของ FormToolbar) เรียก useProfile เพื่อบันทึก recent ของ ⌘K —
// เทสต์นี้ไม่มี QueryClientProvider ให้ mock ทิ้ง (buCode ว่าง = ไม่บันทึกอะไร)
vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({ buCode: undefined }),
}));

vi.mock("@/hooks/use-can", () => ({
  useCan: () => useCanReturn(),
}));

const dispatchPermissionDenied = vi.fn();
vi.mock("@/components/permission-denied-dialog", () => ({
  dispatchPermissionDenied: (...args: unknown[]) =>
    dispatchPermissionDenied(...args),
}));

const PREFIX = "configuration.department";
const UPDATE_PERMISSION = PERMISSIONS.configuration.department.update;
const DELETE_PERMISSION = PERMISSIONS.configuration.department.delete;

function setCan({
  can = () => true,
  isAdmin = false,
  canWrite = true,
}: {
  can?: (permission: string) => boolean;
  isAdmin?: boolean;
  canWrite?: boolean;
} = {}) {
  useCanReturn.mockReturnValue({ can, isAdmin, canWrite });
}

function renderToolbar(
  props: Partial<React.ComponentProps<typeof FormToolbar>>,
) {
  return render(
    <MemoryRouter>
      <FormToolbar
        entity="Purchase Request"
        mode="edit"
        formId="pr-form"
        isPending={false}
        onBack={() => {}}
        onCancel={() => {}}
        permissionPrefix={PREFIX}
        {...props}
      />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FormToolbar — canWrite true, permission granted (baseline)", () => {
  it("Save is a real submit button, enabled, no title", () => {
    setCan({ canWrite: true, can: () => true });
    renderToolbar({ mode: "edit" });
    const save = screen.getByRole("button", { name: /save/i });
    expect(save).toHaveAttribute("type", "submit");
    expect(save).not.toBeDisabled();
    expect(save).not.toHaveAttribute("title");
  });
});

describe("FormToolbar — canWrite false: real disabled + title, no dialog on click", () => {
  it("Save button is disabled with the license tooltip, even though permission is granted", async () => {
    setCan({ canWrite: false, can: () => true });
    renderToolbar({ mode: "edit" });
    const save = screen.getByRole("button", { name: /save/i });
    expect(save).toBeDisabled();
    expect(save).toHaveAttribute("title", "writeDisabledTitle");
    await userEvent
      .click(save, { skipPointerEventsCheck: true } as never)
      .catch(() => {});
    expect(dispatchPermissionDenied).not.toHaveBeenCalled();
  });

  it("Edit button (view mode) is disabled with the license tooltip", () => {
    setCan({ canWrite: false, can: () => true });
    renderToolbar({ mode: "view", onEdit: () => {} });
    const edit = screen.getByRole("button", { name: /edit/i });
    expect(edit).toBeDisabled();
    expect(edit).toHaveAttribute("title", "writeDisabledTitle");
  });

  it("Delete button is disabled with the license tooltip", () => {
    setCan({ canWrite: false, can: () => true });
    renderToolbar({ mode: "edit", onDelete: () => {} });
    const del = screen.getByRole("button", { name: /delete/i });
    expect(del).toBeDisabled();
    expect(del).toHaveAttribute("title", "writeDisabledTitle");
  });

  it("license blocks the Save button even when permission would also deny it — no dialog either way", async () => {
    setCan({ canWrite: false, can: () => false });
    renderToolbar({ mode: "edit" });
    const save = screen.getByRole("button", { name: /save/i });
    expect(save).toBeDisabled();
    expect(dispatchPermissionDenied).not.toHaveBeenCalled();
  });
});

describe("FormToolbar — canWrite true, permission denied: existing dialog-on-click pattern unchanged", () => {
  it("Save button stays clickable (aria-disabled, not real disabled) and dispatches the default permission reason", async () => {
    setCan({ canWrite: true, can: () => false });
    renderToolbar({ mode: "edit" });
    const save = screen.getByRole("button", { name: /save/i });
    expect(save).not.toBeDisabled();
    expect(save).not.toHaveAttribute("title");
    await userEvent.click(save);
    // mode="edit" → savePermission = buildPermissionKey(prefix, "update")
    expect(dispatchPermissionDenied).toHaveBeenCalledWith(UPDATE_PERMISSION);
  });

  it("Delete button dispatches the delete permission when denied but license is fine", async () => {
    setCan({ canWrite: true, can: () => false });
    renderToolbar({ mode: "edit", onDelete: () => {} });
    const del = screen.getByRole("button", { name: /delete/i });
    expect(del).not.toBeDisabled();
    await userEvent.click(del);
    expect(dispatchPermissionDenied).toHaveBeenCalledWith(DELETE_PERMISSION);
  });

  it("Edit button dispatches the update permission when denied but license is fine", async () => {
    setCan({ canWrite: true, can: () => false });
    renderToolbar({ mode: "view", onEdit: () => {} });
    const edit = screen.getByRole("button", { name: /edit/i });
    expect(edit).not.toBeDisabled();
    await userEvent.click(edit);
    expect(dispatchPermissionDenied).toHaveBeenCalledWith(UPDATE_PERMISSION);
  });
});

describe("FormToolbar — canWrite true, permission granted: buttons run their real callback", () => {
  it("Edit calls onEdit directly", async () => {
    setCan({ canWrite: true, can: () => true });
    const onEdit = vi.fn();
    renderToolbar({ mode: "view", onEdit });
    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(dispatchPermissionDenied).not.toHaveBeenCalled();
  });

  it("Delete calls onDelete directly", async () => {
    setCan({ canWrite: true, can: () => true });
    const onDelete = vi.fn();
    renderToolbar({ mode: "edit", onDelete });
    await userEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(dispatchPermissionDenied).not.toHaveBeenCalled();
  });
});
