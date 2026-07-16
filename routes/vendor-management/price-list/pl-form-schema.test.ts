import { describe, it, expect } from "vitest";
import { createPriceListSchema } from "./pl-form-schema";

const tv = (key: string) => key;
const tf = (key: string) => key;
const schema = createPriceListSchema(tv, tf);

function detail(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    product_id: "p1",
    unit_id: "u1",
    moq_qty: 1,
    price: 100,
    price_without_tax: 100,
    tax_profile_id: "tax1",
    tax_rate: 7,
    tax_amt: 7,
    lead_time_days: 0,
    is_preferred: false,
    ...overrides,
  };
}

function formValues(details: ReturnType<typeof detail>[]) {
  return {
    name: "PL",
    description: "",
    status: "draft",
    vendor_id: "v1",
    currency_id: "c1",
    effective_from_date: "2026-01-01",
    effective_to_date: "2026-12-31",
    note: "",
    pricelist_detail: details,
  };
}

describe("createPriceListSchema — MOQ tier price", () => {
  it("ยอมเมื่อชั้น MOQ สูงกว่าราคาถูกลงหรือเท่าเดิม", () => {
    const result = schema.safeParse(
      formValues([
        detail({ moq_qty: 1, price: 12.5 }),
        detail({ moq_qty: 50, price: 10.5 }),
        detail({ moq_qty: 100, price: 10.5 }),
      ]),
    );
    expect(result.success).toBe(true);
  });

  it("ไม่ยอมเมื่อชั้น MOQ สูงกว่าราคาแพงกว่า — error ชี้ที่ price ของแถวผิด", () => {
    const result = schema.safeParse(
      formValues([
        detail({ moq_qty: 1, price: 10 }),
        detail({ moq_qty: 50, price: 12 }),
      ]),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.message === "moqTierPrice",
      );
      expect(issue?.path).toEqual(["pricelist_detail", 1, "price"]);
    }
  });

  it("เทียบเฉพาะกลุ่ม product+unit เดียวกัน — ข้ามกลุ่มไม่เกี่ยวกัน", () => {
    const result = schema.safeParse(
      formValues([
        detail({ product_id: "p1", moq_qty: 1, price: 10 }),
        detail({ product_id: "p2", moq_qty: 50, price: 999 }),
        detail({ product_id: "p1", unit_id: "u2", moq_qty: 50, price: 999 }),
      ]),
    );
    expect(result.success).toBe(true);
  });

  it("ลำดับแถวสลับกันก็ยังตรวจตาม MOQ น้อย→มาก", () => {
    const result = schema.safeParse(
      formValues([
        detail({ moq_qty: 100, price: 15 }),
        detail({ moq_qty: 1, price: 10 }),
      ]),
    );
    expect(result.success).toBe(false);
  });

  it("MOQ ซ้ำแถวใน product+unit เดียวกัน → error ที่ moq_qty แถวหลัง", () => {
    const result = schema.safeParse(
      formValues([
        detail({ moq_qty: 50, price: 10 }),
        detail({ moq_qty: 50, price: 12 }),
      ]),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.message === "moqDuplicate",
      );
      expect(issue?.path).toEqual(["pricelist_detail", 1, "moq_qty"]);
    }
  });

  it("MOQ เท่ากันแต่คนละ product → ไม่นับเป็นซ้ำ", () => {
    const result = schema.safeParse(
      formValues([
        detail({ product_id: "p1", moq_qty: 50, price: 10 }),
        detail({ product_id: "p2", moq_qty: 50, price: 12 }),
      ]),
    );
    expect(result.success).toBe(true);
  });
});
