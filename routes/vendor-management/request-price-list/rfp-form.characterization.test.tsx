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
vi.mock("@/hooks/use-vendor", () => ({
  useVendor: () => ({
    data: {
      data: [{ id: "ven-1", code: "V001", name: "Acme Foods", contacts: [] }],
      paginate: { total: 1 },
    },
    isLoading: false,
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

const rv = en.vendorManagement.requestPriceList.vendors;

/** ใบที่มีผู้ขายเดิมอยู่แล้วหนึ่งราย พร้อม url_token ที่ส่งให้ผู้ขายไปแล้ว */
const RFP_WITH_VENDOR = {
  ...RFP,
  vendor_count: 1,
  vendors: [
    {
      id: "rv-1",
      vendor_id: "ven-1",
      vendor_name: "Acme Foods",
      vendor_code: "V001",
      contact_person: "Som",
      contact_phone: "02-000",
      contact_email: "som@acme.test",
      url_token: "tok-1",
      has_submitted: false,
      pricelist: null,
    },
  ],
} as unknown as RequestPriceList;

async function enterEdit() {
  await userEvent.click(screen.getByRole("button", { name: en.common.edit }));
}

async function removeFirstVendor() {
  await userEvent.click(screen.getByRole("button", { name: rv.removeVendor }));
  await userEvent.click(screen.getByRole("button", { name: en.common.delete }));
}

async function addAcmeBack() {
  await userEvent.click(screen.getByRole("button", { name: rv.addVendor }));
  const boxes = screen.getAllByRole("checkbox");
  await userEvent.click(boxes[boxes.length - 1]);
  await userEvent.click(screen.getByRole("button", { name: /Add 1 vendor/i }));
}

type VendorsPayload = {
  vendors?: {
    add?: { vendor_id: string }[];
    remove?: { vendor_id: string }[];
  };
};

describe("RequestPriceListForm — เพิ่ม/ลบผู้ขาย", () => {
  it("ลบผู้ขายเดิมแล้วบันทึก ส่ง remove ไปรายการเดียว", async () => {
    renderForm(<RequestPriceListForm requestPriceList={RFP_WITH_VENDOR} />);
    await enterEdit();
    await removeFirstVendor();
    await act(async () => submitForm("rfp-form"));

    const { vendors } = firstPayload(updateMut) as VendorsPayload;
    expect(vendors?.remove?.map((v) => v.vendor_id)).toEqual(["ven-1"]);
    expect(vendors?.add).toBeUndefined();
  });

  /**
   * ลบแล้วเปลี่ยนใจเพิ่มกลับในการแก้ไขรอบเดียวกัน = ไม่มีอะไรเปลี่ยน ต้องไม่ส่ง
   * ทั้ง add และ remove — ถ้าส่งทั้งคู่ backend จะลบแถวเดิมแล้วสร้างใหม่
   * `url_token` เปลี่ยน ลิงก์ที่ส่งให้ผู้ขายไปแล้วใช้ไม่ได้
   */
  it("ลบแล้วเพิ่มคนเดิมกลับ ต้องไม่ส่งทั้ง add และ remove", async () => {
    renderForm(<RequestPriceListForm requestPriceList={RFP_WITH_VENDOR} />);
    await enterEdit();
    await removeFirstVendor();
    expect(screen.queryByText("Acme Foods")).toBeNull();

    await addAcmeBack();
    expect(screen.getByText("Acme Foods")).toBeTruthy();

    await act(async () => submitForm("rfp-form"));
    const { vendors } = firstPayload(updateMut) as VendorsPayload;
    expect(vendors?.remove).toBeUndefined();
    expect(vendors?.add).toBeUndefined();
  });
});
