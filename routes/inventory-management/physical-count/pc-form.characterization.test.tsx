import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import en from "@/messages/en.json";
import type { PhysicalCount } from "@/types/physical-count";
import {
  fakeMutation,
  firstPayload,
  renderForm,
  submitForm,
} from "@/lib/test-utils/form-characterization";

const navigate = vi.fn();
const createMut = fakeMutation({ data: { id: "pc-new" } });
const updateMut = fakeMutation();
const deleteMut = fakeMutation();

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useNavigate: () => navigate,
}));

vi.mock("../shared/use-physical-count", () => ({
  useCreatePhysicalCount: () => createMut,
  useUpdatePhysicalCount: () => updateMut,
  useDeletePhysicalCount: () => deleteMut,
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

const { PcForm } = await import("./pc-form");

const PHYSICAL_COUNT: PhysicalCount = {
  id: "pc-1",
  doc_version: 2,
  department_id: "dep-1",
  department_name: "Kitchen",
  is_active: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * บันทึกพฤติกรรมปัจจุบันของ PcForm ไว้ก่อนยุบเข้า hook กลาง
 * — ไม่ได้บอกว่าถูก บอกว่าตอนนี้เป็นแบบนี้ ถ้า refactor แล้วเปลี่ยน ต้องเป็นเพราะตั้งใจ
 */
describe("PcForm — characterization", () => {
  /** ฟอร์มเปิดมาที่โหมด view เสมอเมื่อมี entity — ต้องกด Edit ก่อนถึงจะ submit ได้ */
  async function enterEditMode() {
    await userEvent.click(screen.getByRole("button", { name: en.common.edit }));
  }

  it("[update] เซฟแล้วอยู่หน้าเดิม ไม่เด้งกลับหน้ารายการ", async () => {
    renderForm(<PcForm physicalCount={PHYSICAL_COUNT} />);
    await enterEditMode();
    await act(async () => submitForm("pc-form"));

    expect(updateMut.mutate).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("[update] payload แนบ id กับ doc_version ที่โหลดมา", async () => {
    renderForm(<PcForm physicalCount={PHYSICAL_COUNT} />);
    await enterEditMode();
    await act(async () => submitForm("pc-form"));

    expect(firstPayload(updateMut)).toMatchObject({
      id: "pc-1",
      doc_version: 2,
    });
  });

  /** โหมด add ต้องเลือกแผนกผ่าน lookup ซึ่งขับใน jsdom ไม่คุ้ม — ยังไม่ได้ครอบ */
  it.todo("[create] เซฟแล้วกลับหน้ารายการ");
});
