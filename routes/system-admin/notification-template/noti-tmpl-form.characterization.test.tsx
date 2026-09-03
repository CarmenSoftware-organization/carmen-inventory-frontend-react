import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import en from "@/messages/en.json";
import type { NotificationTemplate } from "@/types/noti-tmpl";
import {
  fakeMutation,
  firstPayload,
  renderForm,
  submitForm,
} from "@/lib/test-utils/form-characterization";

const navigate = vi.fn();
const createMut = fakeMutation({ data: { id: "nt-new" } });
const updateMut = fakeMutation();
const deleteMut = fakeMutation();

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useNavigate: () => navigate,
}));

vi.mock("@/hooks/use-notification-template", () => ({
  useCreateNotificationTemplate: () => createMut,
  useUpdateNotificationTemplate: () => updateMut,
  useDeleteNotificationTemplate: () => deleteMut,
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

const { NotificationTemplateForm } = await import("./noti-tmpl-form");

const TEMPLATE: NotificationTemplate = {
  id: "nt-1",
  doc_version: 6,
  name: "PR approved",
  type: "app",
  subject: "Your PR was approved",
  body: "hello",
  description: "",
  is_active: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * บันทึกพฤติกรรมปัจจุบันของ NotificationTemplateForm ไว้ก่อนยุบเข้า hook กลาง
 * — ไม่ได้บอกว่าถูก บอกว่าตอนนี้เป็นแบบนี้ ถ้า refactor แล้วเปลี่ยน ต้องเป็นเพราะตั้งใจ
 */
describe("NotificationTemplateForm — characterization", () => {
  /** ฟอร์มเปิดมาที่โหมด view เสมอเมื่อมี entity — ต้องกด Edit ก่อนถึงจะ submit ได้ */
  async function enterEditMode() {
    await userEvent.click(screen.getByRole("button", { name: en.common.edit }));
  }

  it("[update] เซฟแล้วเด้งกลับหน้ารายการ", async () => {
    renderForm(<NotificationTemplateForm template={TEMPLATE} />);
    await enterEditMode();
    await act(async () => submitForm("notification-template-form"));

    expect(updateMut.mutate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalled();
  });

  it("[update] payload แนบ id กับ doc_version ที่โหลดมา", async () => {
    renderForm(<NotificationTemplateForm template={TEMPLATE} />);
    await enterEditMode();
    await act(async () => submitForm("notification-template-form"));

    expect(firstPayload(updateMut)).toMatchObject({
      id: "nt-1",
      doc_version: 6,
    });
  });

  it("[create] เซฟแล้วกลับหน้ารายการ", async () => {
    renderForm(<NotificationTemplateForm />);
    await userEvent.type(
      document.getElementById("nt-name") as HTMLInputElement,
      "PR rejected",
    );
    // body เป็น required ใน schema เหมือนกัน ไม่กรอกก็ไม่ผ่าน validation
    await userEvent.type(
      document.getElementById("nt-body") as HTMLTextAreaElement,
      "your PR was rejected",
    );
    await act(async () => submitForm("notification-template-form"));

    expect(createMut.mutate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalled();
  });
});
