import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import en from "@/messages/en.json";
import type { PriceList } from "@/types/price-list";
import {
  fakeMutation,
  firstPayload,
  renderForm,
  submitForm,
} from "@/lib/test-utils/form-characterization";

const navigate = vi.fn();
const createMut = fakeMutation({ data: { id: "pl-new" } });
const updateMut = fakeMutation();
const deleteMut = fakeMutation();

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useNavigate: () => navigate,
}));

vi.mock("@/hooks/use-price-list", () => ({
  useCreatePriceList: () => createMut,
  useUpdatePriceList: () => updateMut,
  useDeletePriceList: () => deleteMut,
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

const { PriceListForm } = await import("./pl-form");

const PRICE_LIST = {
  id: "pl-1",
  doc_version: 3,
  no: "PL-001",
  name: "Q1 Produce",
  status: "draft",
  description: "",
  vendor: { id: "ven-1", name: "Acme Foods" },
  currency: { id: "cur-1", code: "THB" },
  // getDefaultValues split ด้วย " - " แล้ว schema บังคับทั้งสองข้าง —
  // ปล่อยว่างเมื่อไร submit เงียบทันทีโดยไม่มี error โผล่บนจอ
  effectivePeriod: "2026-01-01 - 2026-03-31",
  note: "",
  pricelist_detail: [],
} as unknown as PriceList;

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * บันทึกพฤติกรรมปัจจุบันของ PriceListForm ไว้ก่อนยุบเข้า hook กลาง
 * — ไม่ได้บอกว่าถูก บอกว่าตอนนี้เป็นแบบนี้ ถ้า refactor แล้วเปลี่ยน ต้องเป็นเพราะตั้งใจ
 */
describe("PriceListForm — characterization", () => {
  /** ฟอร์มเปิดมาที่โหมด view เสมอเมื่อมี entity — ต้องกด Edit ก่อนถึงจะ submit ได้ */
  async function enterEditMode() {
    await userEvent.click(screen.getByRole("button", { name: en.common.edit }));
  }

  it("[update] เซฟแล้วอยู่หน้าเดิม ไม่เด้งกลับหน้ารายการ", async () => {
    renderForm(<PriceListForm priceList={PRICE_LIST} />);
    await enterEditMode();
    await act(async () => submitForm("pl-form"));

    expect(updateMut.mutate).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("[update] payload แนบ id กับ doc_version ที่โหลดมา", async () => {
    renderForm(<PriceListForm priceList={PRICE_LIST} />);
    await enterEditMode();
    await act(async () => submitForm("pl-form"));

    expect(firstPayload(updateMut)).toMatchObject({
      id: "pl-1",
      doc_version: 3,
    });
  });

  /** โหมด add ต้องเลือก vendor/currency/ช่วงวันที่ผ่าน lookup+datepicker */
  it.todo("[create] พฤติกรรมหลังสร้าง");
});
