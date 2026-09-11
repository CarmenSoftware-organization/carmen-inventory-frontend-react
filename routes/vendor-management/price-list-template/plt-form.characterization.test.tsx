import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import en from "@/messages/en.json";
import type { PriceListTemplate } from "@/types/price-list-template";
import {
  fakeMutation,
  renderForm,
} from "@/lib/test-utils/form-characterization";

const navigate = vi.fn();
const createMut = fakeMutation({ data: { id: "plt-new" } });
const updateMut = fakeMutation();
const deleteMut = fakeMutation();

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useNavigate: () => navigate,
}));

vi.mock("@/hooks/use-price-list-template", () => ({
  useCreatePriceListTemplate: () => createMut,
  useUpdatePriceListTemplate: () => updateMut,
  useDeletePriceListTemplate: () => deleteMut,
}));

vi.mock("@/hooks/use-all-products", () => ({
  useAllProducts: () => ({
    data: [{ id: "prod-1", code: "P001", name: "Tomato" }],
    isLoading: false,
  }),
}));

const { PriceListTemplateForm } = await import("./plt-form");

const tpl = en.vendorManagement.priceListTemplate;

/** template ที่มีสินค้า 1 ตัว 2 MOQ tier */
const TEMPLATE = {
  id: "plt-1",
  name: "Fresh Produce",
  status: "draft",
  description: "",
  currency: { id: "cur-1", code: "THB" },
  validity_period: 30,
  vendor_instructions: "",
  products: [
    {
      id: "row-1",
      product_id: "prod-1",
      product_code: "P001",
      product_name: "Tomato",
      default_order: { unit_id: "u1", unit_name: "KG" },
      moq: [
        { unit_id: "u1", unit_name: "KG", qty: 10, note: "" },
        { unit_id: "u1", unit_name: "KG", qty: 50, note: "" },
      ],
    },
  ],
} as unknown as PriceListTemplate;

const EMPTY_TEMPLATE = { ...TEMPLATE, products: [] } as PriceListTemplate;

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * UX ของส่วนสินค้าใน PLT — เขียนไว้ก่อนย้าย field array/handler/dialog ออกจาก
 * plt-form ไป plt-item-fields เพื่อพิสูจน์ว่าหน้าตาและการกดใช้งานไม่เปลี่ยน
 */
describe("PriceListTemplateForm — ส่วนสินค้าในเทมเพลต", () => {
  const tierBtns = () => screen.queryAllByLabelText(tpl.removeTier);
  const productBtns = () => screen.queryAllByLabelText(tpl.removeProduct);
  const enterEdit = () =>
    userEvent.click(screen.getByRole("button", { name: en.common.edit }));

  it("[view] เห็นหัวข้อกับตารางรวมกลุ่ม ยังไม่มีปุ่มลบอะไรทั้งนั้น", () => {
    renderForm(<PriceListTemplateForm priceListTemplate={TEMPLATE} />);

    expect(screen.getByText(tpl.productsTitle)).toBeTruthy();
    expect(screen.getByText("Tomato")).toBeTruthy();
    expect(productBtns()).toHaveLength(0);
    expect(tierBtns()).toHaveLength(0);
  });

  it("[edit] เห็นการ์ดสินค้า พร้อมปุ่มเพิ่ม tier และปุ่มลบสินค้า", async () => {
    renderForm(<PriceListTemplateForm priceListTemplate={TEMPLATE} />);
    await enterEdit();

    expect(screen.getByText("P001 — Tomato")).toBeTruthy();
    expect(screen.getByRole("button", { name: tpl.addTier })).toBeTruthy();
    expect(productBtns()).toHaveLength(1);
    expect(tierBtns()).toHaveLength(2);
  });

  it("[edit] กดเพิ่ม tier ได้ tier เพิ่มมาหนึ่งอัน ไม่ต้องยืนยัน", async () => {
    renderForm(<PriceListTemplateForm priceListTemplate={TEMPLATE} />);
    await enterEdit();

    await userEvent.click(screen.getByRole("button", { name: tpl.addTier }));
    expect(tierBtns()).toHaveLength(3);
  });

  it("[edit] ลบ tier ต้องถามยืนยันก่อน ยืนยันแล้วหายไปหนึ่ง", async () => {
    renderForm(<PriceListTemplateForm priceListTemplate={TEMPLATE} />);
    await enterEdit();

    await userEvent.click(tierBtns()[0]);
    expect(screen.getByText(tpl.removeTierTitle)).toBeTruthy();
    expect(tierBtns()).toHaveLength(2);

    await userEvent.click(
      screen.getByRole("button", { name: en.common.delete }),
    );
    // เหลือ tier เดียว → ปุ่มลบ tier ซ่อนหมด (ลบ tier สุดท้ายไม่ได้)
    expect(tierBtns()).toHaveLength(0);
  });

  it("[edit] ลบทั้งสินค้าต้องถามยืนยันโดยบอกชื่อสินค้า แล้วการ์ดหายทั้งใบ", async () => {
    renderForm(<PriceListTemplateForm priceListTemplate={TEMPLATE} />);
    await enterEdit();

    await userEvent.click(productBtns()[0]);
    expect(
      screen.getByText(tpl.removeProductTitle.replace("{name}", "Tomato")),
    ).toBeTruthy();

    await userEvent.click(
      screen.getByRole("button", { name: en.common.delete }),
    );
    expect(productBtns()).toHaveLength(0);
    expect(screen.queryByText("P001 — Tomato")).toBeNull();
  });

  it("[edit] ไม่มีสินค้าเลย → ขึ้นกล่องว่างข้าง tree", async () => {
    renderForm(<PriceListTemplateForm priceListTemplate={EMPTY_TEMPLATE} />);
    await enterEdit();

    expect(screen.getByText(tpl.detail.noItems)).toBeTruthy();
    expect(productBtns()).toHaveLength(0);
  });
});
