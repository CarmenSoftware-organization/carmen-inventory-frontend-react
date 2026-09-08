import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import en from "@/messages/en.json";
import type { RoleDetail } from "@/types/role";
import {
  fakeMutation,
  firstPayload,
  renderForm,
  submitForm,
} from "@/lib/test-utils/form-characterization";

const navigate = vi.fn();
const createMut = fakeMutation({ data: { id: "role-new" } });
const updateMut = fakeMutation();
const deleteMut = fakeMutation();

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useNavigate: () => navigate,
}));

vi.mock("../shared/use-role", () => ({
  useCreateRole: () => createMut,
  useUpdateRole: () => updateMut,
  useDeleteRole: () => deleteMut,
}));
vi.mock("./use-role-print", () => ({
  useRolePrint: () => ({ printRole: vi.fn(), isPrinting: false }),
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

const { RoleForm } = await import("./role-form");

const ROLE: RoleDetail = {
  id: "role-1",
  doc_version: 5,
  application_role_name: "Storekeeper",
  permissions: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * บันทึกพฤติกรรมปัจจุบันของ RoleForm ไว้ก่อนยุบเข้า hook กลาง
 * — ไม่ได้บอกว่าถูก บอกว่าตอนนี้เป็นแบบนี้ ถ้า refactor แล้วเปลี่ยน ต้องเป็นเพราะตั้งใจ
 */
describe("RoleForm — characterization", () => {
  /** ฟอร์มเปิดมาที่โหมด view เสมอเมื่อมี entity — ต้องกด Edit ก่อนถึงจะ submit ได้ */
  async function enterEditMode() {
    await userEvent.click(screen.getByRole("button", { name: en.common.edit }));
  }

  it("[update] เซฟแล้วเด้งกลับหน้ารายการ", async () => {
    renderForm(<RoleForm role={ROLE} />);
    await enterEditMode();
    await act(async () => submitForm("role-form"));

    expect(updateMut.mutate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/system-admin/role");
  });

  it("[update] payload แนบ id กับ doc_version ที่โหลดมา", async () => {
    renderForm(<RoleForm role={ROLE} />);
    await enterEditMode();
    await act(async () => submitForm("role-form"));

    expect(firstPayload(updateMut)).toMatchObject({
      id: "role-1",
      doc_version: 5,
    });
  });

  it("[create] เซฟแล้วกลับหน้ารายการ", async () => {
    renderForm(<RoleForm />);
    // ช่องชื่อ role ไม่มี id/label ผูก — หยิบจาก placeholder ที่ i18n ให้มา
    await userEvent.type(
      screen.getByPlaceholderText(en.systemAdmin.role.namePlaceholder),
      "Auditor",
    );
    await act(async () => submitForm("role-form"));

    expect(createMut.mutate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/system-admin/role");
  });
});
