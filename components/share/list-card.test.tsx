import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { ListCard, ListCardRow } from "./list-card";

// t(key) → key (namespace ไม่สำคัญสำหรับเทสต์นี้)
vi.mock("use-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// ตรรกะ can/canWrite เทสต์แยกไว้แล้วที่ hooks/use-can.test.ts — ที่นี่สนแค่ว่า
// ปุ่มลบของการ์ดอ่านผลจาก useDeleteGate มาต่อสายถูกไหม (ตามแบบ use-config-table.test.tsx)
const useCanReturn = vi.fn();
vi.mock("@/hooks/use-can", () => ({
  useCan: () => useCanReturn(),
}));

vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({ dateFormat: "DD/MM/YYYY" }),
}));

const dispatchPermissionDenied = vi.fn();
vi.mock("@/components/permission-denied-dialog", () => ({
  dispatchPermissionDenied: (...args: unknown[]) =>
    dispatchPermissionDenied(...args),
}));

// /config/department → leaf permission "configuration.department.view"
// → prefix "configuration.department" → ปุ่มลบเช็ค "configuration.department.delete"
const DELETE_PERMISSION = "configuration.department.delete";

function renderCard(onDelete: () => void) {
  return render(
    <MemoryRouter initialEntries={["/config/department"]}>
      <ListCard title="Kitchen" onOpen={() => {}} onDelete={onDelete}>
        <ListCardRow label="code">KIT</ListCardRow>
      </ListCard>
    </MemoryRouter>,
  );
}

describe("ListCard — ปุ่มลบ", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("มีสิทธิ์ + สัญญาปกติ → เรียก onDelete ตรง ๆ ไม่เด้ง dialog", async () => {
    useCanReturn.mockReturnValue({
      can: () => true,
      isAdmin: false,
      canWrite: true,
    });
    const onDelete = vi.fn();
    renderCard(onDelete);

    await userEvent.click(screen.getByRole("button", { name: "delete" }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(dispatchPermissionDenied).not.toHaveBeenCalled();
  });

  it("ไม่มีสิทธิ์ลบ → เด้ง permission dialog อย่างเดียว ไม่เรียก onDelete", async () => {
    useCanReturn.mockReturnValue({
      can: () => false,
      isAdmin: false,
      canWrite: true,
    });
    const onDelete = vi.fn();
    renderCard(onDelete);

    await userEvent.click(screen.getByRole("button", { name: "delete" }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(dispatchPermissionDenied).toHaveBeenCalledTimes(1);
    expect(dispatchPermissionDenied).toHaveBeenCalledWith(DELETE_PERMISSION);
  });

  it("admin ข้าม permission ได้ตามปกติ", async () => {
    useCanReturn.mockReturnValue({
      can: () => false,
      isAdmin: true,
      canWrite: true,
    });
    const onDelete = vi.fn();
    renderCard(onDelete);

    await userEvent.click(screen.getByRole("button", { name: "delete" }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(dispatchPermissionDenied).not.toHaveBeenCalled();
  });

  it("สัญญาหมดอายุ → ปุ่มถูกปิดจริง ไม่เรียก onDelete และไม่เด้ง dialog", async () => {
    useCanReturn.mockReturnValue({
      can: () => true,
      isAdmin: true,
      canWrite: false,
    });
    const onDelete = vi.fn();
    renderCard(onDelete);

    const btn = screen.getByRole("button", { name: "delete" });
    expect(btn).toBeDisabled();

    await userEvent.click(btn);

    expect(onDelete).not.toHaveBeenCalled();
    expect(dispatchPermissionDenied).not.toHaveBeenCalled();
  });

  it("route ที่ไม่มี permission prefix (เช่น PR) → ไม่บล็อกอะไร", async () => {
    useCanReturn.mockReturnValue({
      can: () => false,
      isAdmin: false,
      canWrite: true,
    });
    const onDelete = vi.fn();
    render(
      <MemoryRouter initialEntries={["/procurement/purchase-request"]}>
        <ListCard title="PR-001" onOpen={() => {}} onDelete={onDelete}>
          <ListCardRow label="code">PR-001</ListCardRow>
        </ListCard>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole("button", { name: "delete" }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(dispatchPermissionDenied).not.toHaveBeenCalled();
  });
});
