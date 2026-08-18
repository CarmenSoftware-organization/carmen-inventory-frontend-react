import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataGridRowActions } from "./data-grid-row-actions";

// t(key) → key (namespace ไม่สำคัญสำหรับเทสต์นี้)
vi.mock("use-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const dispatchPermissionDenied = vi.fn();
vi.mock("@/components/permission-denied-dialog", () => ({
  dispatchPermissionDenied: (...args: unknown[]) =>
    dispatchPermissionDenied(...args),
}));

async function openMenu() {
  await userEvent.click(screen.getByRole("button", { name: "rowActions" }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DataGridRowActions — writeDisabled (license) beats editDenied/deleteDenied (permission)", () => {
  it("Delete item is really disabled with the license title, even when deleteDenied is also true", async () => {
    const onDelete = vi.fn();
    render(
      <DataGridRowActions
        onDelete={onDelete}
        deleteDenied
        writeDisabled
        writeDisabledTitle="license expired, contact admin"
      />,
    );
    await openMenu();
    const item = screen.getByText("delete").closest('[role="menuitem"]');
    expect(item).toHaveAttribute("data-disabled");
    expect(item).toHaveAttribute("title", "license expired, contact admin");
  });

  it("clicking a writeDisabled Delete item calls neither onDelete nor dispatchPermissionDenied", async () => {
    const onDelete = vi.fn();
    render(
      <DataGridRowActions
        onDelete={onDelete}
        writeDisabled
        writeDisabledTitle="license expired"
      />,
    );
    await openMenu();
    // Radix ปิดการเลือกเมนูที่ disabled จริง (pointer-events: none) ไม่ fire onSelect
    await userEvent.click(screen.getByText("delete"));
    expect(onDelete).not.toHaveBeenCalled();
    expect(dispatchPermissionDenied).not.toHaveBeenCalled();
  });

  it("Edit item is also disabled with the same title when writeDisabled", async () => {
    render(
      <DataGridRowActions
        onEdit={() => {}}
        onDelete={() => {}}
        writeDisabled
        writeDisabledTitle="license expired"
      />,
    );
    await openMenu();
    const item = screen.getByText("edit").closest('[role="menuitem"]');
    expect(item).toHaveAttribute("data-disabled");
    expect(item).toHaveAttribute("title", "license expired");
  });
});

describe("DataGridRowActions — deleteDenied only (permission), writeDisabled false: unchanged dialog-on-click behavior", () => {
  it("Delete item stays selectable, dims, and dispatches on click", async () => {
    const onDelete = vi.fn();
    render(<DataGridRowActions onDelete={onDelete} deleteDenied />);
    await openMenu();
    const item = screen.getByText("delete").closest('[role="menuitem"]');
    expect(item).not.toHaveAttribute("data-disabled");
    expect(item).not.toHaveAttribute("title");
    await userEvent.click(screen.getByText("delete"));
    expect(onDelete).not.toHaveBeenCalled();
    expect(dispatchPermissionDenied).toHaveBeenCalledTimes(1);
  });
});

describe("DataGridRowActions — writeDisabled false, no denial: real callback runs", () => {
  it("Delete item calls onDelete", async () => {
    const onDelete = vi.fn();
    render(<DataGridRowActions onDelete={onDelete} />);
    await openMenu();
    await userEvent.click(screen.getByText("delete"));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(dispatchPermissionDenied).not.toHaveBeenCalled();
  });
});
