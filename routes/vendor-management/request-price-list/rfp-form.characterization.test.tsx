import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import en from "@/messages/en.json";
import type { RequestPriceList } from "@/types/request-price-list";
import {
  fakeMutation,
  firstPayload,
  renderForm,
  submitForm,
} from "@/lib/test-utils/form-characterization";

const navigate = vi.fn();
const createMut = fakeMutation({ data: { id: "rfp-new" } });
const updateMut = fakeMutation();
const deleteMut = fakeMutation();

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useNavigate: () => navigate,
}));

vi.mock("./use-rfp", () => ({
  useCreateRequestPriceList: () => createMut,
  useUpdateRequestPriceList: () => updateMut,
  useDeleteRequestPriceList: () => deleteMut,
}));
vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({
    defaultCurrencyCode: "THB",
    dateFormat: "DD/MM/YYYY",
    dateTimeFormat: "DD/MM/YYYY HH:mm",
    buCode: "BU-1",
  }),
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

const { RequestPriceListForm } = await import("./rfp-form");

const RFP = {
  id: "rfp-1",
  doc_version: 2,
  name: "Q1 Produce RFP",
  start_date: "2026-01-01",
  end_date: "2026-03-31",
  custom_message: "",
  email_template_id: null,
  info: "{}",
  dimension: {},
  pricelist_template: {
    id: "plt-1",
    name: "Produce",
    status: "active",
    currency: { id: "cur-1", code: "THB" },
  },
  vendor_count: 0,
} as unknown as RequestPriceList;

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * บันทึกพฤติกรรมปัจจุบันของ RequestPriceListForm ไว้ก่อนยุบเข้า hook กลาง
 * — ไม่ได้บอกว่าถูก บอกว่าตอนนี้เป็นแบบนี้ ถ้า refactor แล้วเปลี่ยน ต้องเป็นเพราะตั้งใจ
 */
describe("RequestPriceListForm — characterization", () => {
  /** ฟอร์มเปิดมาที่โหมด view เสมอเมื่อมี entity — ต้องกด Edit ก่อนถึงจะ submit ได้ */
  async function enterEditMode() {
    await userEvent.click(screen.getByRole("button", { name: en.common.edit }));
  }

  it("[update] เซฟแล้วอยู่หน้าเดิม ไม่เด้งกลับหน้ารายการ", async () => {
    renderForm(<RequestPriceListForm requestPriceList={RFP} />);
    await enterEditMode();
    await act(async () => submitForm("rfp-form"));

    expect(updateMut.mutate).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("[update] payload แนบ id กับ doc_version ที่โหลดมา", async () => {
    renderForm(<RequestPriceListForm requestPriceList={RFP} />);
    await enterEditMode();
    await act(async () => submitForm("rfp-form"));

    expect(firstPayload(updateMut)).toMatchObject({
      id: "rfp-1",
      doc_version: 2,
    });
  });

  /** โหมด add ต้องเลือก template/vendor ผ่าน lookup ซึ่งขับใน jsdom ไม่คุ้ม */
  it.todo("[create] พฤติกรรมหลังสร้าง");
});
