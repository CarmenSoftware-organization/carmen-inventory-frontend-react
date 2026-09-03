import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import en from "@/messages/en.json";
import type { Department } from "@/types/department";
import {
  fakeMutation,
  firstPayload,
  renderForm,
  submitForm,
} from "@/lib/test-utils/form-characterization";

const navigate = vi.fn();
const createMut = fakeMutation({ data: { id: "dep-new" } });
const updateMut = fakeMutation();
const deleteMut = fakeMutation();

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useNavigate: () => navigate,
}));

vi.mock("@/hooks/use-department", () => ({
  useCreateDepartment: () => createMut,
  useUpdateDepartment: () => updateMut,
  useDeleteDepartment: () => deleteMut,
}));
vi.mock("@/hooks/use-all-users", () => ({
  useAllUsers: () => ({ data: [], isLoading: false }),
}));
// FormToolbar ปิดปุ่ม Edit เมื่อไม่มีสิทธิ์ — เทสต์นี้สนใจเส้นทางหลัง save
// ไม่ใช่ permission ให้ผ่านหมดไปเลย
vi.mock("@/hooks/use-can", () => ({
  useCan: () => ({
    can: () => true,
    canAny: () => true,
    canAll: () => true,
    guard: (_p: unknown, fn: () => void) => fn,
    isAdmin: true,
    permissions: [],
    canWrite: true,
  }),
}));

const { DepartmentForm } = await import("./department-form");

const DEPARTMENT: Department = {
  id: "dep-1",
  doc_version: 4,
  code: "KIT",
  name: "Kitchen",
  description: "",
  is_active: true,
  department_users: [],
  hod_users: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * บันทึกพฤติกรรมปัจจุบันของ DepartmentForm ไว้ก่อนยุบเข้า hook กลาง
 * — ไม่ได้บอกว่าถูก บอกว่าตอนนี้เป็นแบบนี้ ถ้า refactor แล้วเปลี่ยน ต้องเป็นเพราะตั้งใจ
 */
describe("DepartmentForm — characterization", () => {
  /** ฟอร์มเปิดมาที่โหมด view เสมอเมื่อมี entity — ต้องกด Edit ก่อนถึงจะ submit ได้ */
  async function enterEditMode() {
    await userEvent.click(screen.getByRole("button", { name: en.common.edit }));
  }

  it("[update] เซฟแล้วอยู่หน้าเดิม ไม่เด้งกลับหน้ารายการ", async () => {
    renderForm(<DepartmentForm department={DEPARTMENT} />);
    await enterEditMode();
    await act(async () => submitForm("department-form"));

    expect(updateMut.mutate).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("[update] payload แนบ id กับ doc_version ที่โหลดมา", async () => {
    renderForm(<DepartmentForm department={DEPARTMENT} />);
    await enterEditMode();
    await act(async () => submitForm("department-form"));

    expect(firstPayload(updateMut)).toMatchObject({
      id: "dep-1",
      doc_version: 4,
    });
  });

  it("[create] เซฟแล้ว replace ไปหน้าใบที่เพิ่งสร้าง", async () => {
    renderForm(<DepartmentForm />);
    await userEvent.type(
      document.getElementById("department-code") as HTMLInputElement,
      "BAR",
    );
    await userEvent.type(
      document.getElementById("department-name") as HTMLInputElement,
      "Bar",
    );
    await act(async () => submitForm("department-form"));

    expect(createMut.mutate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/config/department/dep-new", {
      replace: true,
    });
  });
});
