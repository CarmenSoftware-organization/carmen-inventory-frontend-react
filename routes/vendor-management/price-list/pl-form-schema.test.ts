import { describe, it, expect } from "vitest";
import { createPriceListSchema, getDefaultValues } from "./pl-form-schema";
import type { PriceList } from "@/types/price-list";

const tv = (key: string) => key;
const tf = (key: string) => key;
const schema = createPriceListSchema(tv, tf);

function detail(overrides: Partial<Record<string, unknown>> = {}) {
  // ราคาที่ vendor กรอกจริงคือ net (price_without_tax); guard MOQ เทียบตัวนี้
  // ให้ price mirror ตาม net เมื่อ scenario ระบุแค่ price เพื่อสะท้อน UI จริง
  const price = (overrides.price as number) ?? 100;
  return {
    product_id: "p1",
    unit_id: "u1",
    moq_qty: 1,
    price,
    price_without_tax: (overrides.price_without_tax as number) ?? price,
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

  it("จับราคากลับชั้นจาก price (gross) แม้ net (price_without_tax) ยังไม่ถูก commit (=0) — regression PL-DOC-03", () => {
    // model ปัจจุบัน: vendor กรอก price (gross) สด; price_without_tax เป็น derived
    // ที่คำนวณตอน submit → ระหว่างพิมพ์ยังคง 0 · guard ต้องเทียบ price (field ที่
    // commit สด) ไม่งั้น 0 > 0 = false แล้วปล่อยราคากลับชั้นผ่าน
    const result = schema.safeParse(
      formValues([
        detail({ moq_qty: 1, price: 20, price_without_tax: 0 }),
        detail({ moq_qty: 100, price: 30, price_without_tax: 0 }),
      ]),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message === "moqTierPrice"),
      ).toBe(true);
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

describe("getDefaultValues — effective date", () => {
  const basePriceList = (effectivePeriod: string): PriceList => ({
    id: "pl1",
    no: "PL001",
    name: "PL",
    status: "draft",
    description: "",
    vendor: { id: "v1", name: "V" },
    currency: { id: "c1", code: "THB" },
    effectivePeriod,
    note: "",
    pricelist_detail: [],
  });

  it("เก็บ ISO ดิบจาก effectivePeriod ไม่ round-trip ผ่าน UTC date (กัน off-by-one)", () => {
    // backend ส่ง full ISO — timezone +7 ทำให้ toISOString().split() หล่นไป 1 วัน
    const dv = getDefaultValues(
      basePriceList(
        "2026-07-19T17:00:00.000Z - 2026-07-24T17:00:00.000Z",
      ),
    );
    expect(dv.effective_from_date).toBe("2026-07-19T17:00:00.000Z");
    expect(dv.effective_to_date).toBe("2026-07-24T17:00:00.000Z");
  });

  it("effectivePeriod ที่ parse ไม่ได้ → คืน empty string", () => {
    const dv = getDefaultValues(basePriceList("ไม่ใช่วันที่ - เลย"));
    expect(dv.effective_from_date).toBe("");
    expect(dv.effective_to_date).toBe("");
  });
});
