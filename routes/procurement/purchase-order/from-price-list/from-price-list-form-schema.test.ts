import { describe, it, expect } from "vitest";
import { createPoSchema } from "../po-form-schema";
import {
  getDefaultValues,
  WIZARD_ITEM_TEMPLATE,
  type FromPriceListFormValues,
} from "./from-price-list-form-schema";

const tv = (key: string, values?: Record<string, string | number>) =>
  values ? `${key}:${JSON.stringify(values)}` : key;
const tf = (key: string) => key;

function makeValid(
  overrides: Partial<FromPriceListFormValues> = {},
): FromPriceListFormValues {
  return {
    workflow_id: "wf-1",
    vendor_id: "v1",
    vendor_name: "Acme Vendor",
    delivery_date: "2026-06-01T00:00:00.000Z",
    currency_id: "cur-1",
    currency_code: "THB",
    exchange_rate: 1,
    description: "",
    order_date: "2026-05-28T00:00:00.000Z",
    credit_term_id: "",
    credit_term_name: "",
    credit_term_value: 0,
    buyer_id: "user-1",
    buyer_name: "Alice",
    email: "",
    remarks: "",
    note: "",
    items: [
      {
        ...WIZARD_ITEM_TEMPLATE,
        product_id: "p-1",
        product_code: "P01",
        product_name: "Product A",
        product_local_name: "สินค้า A",
        order_unit_id: "u-1",
        order_unit_name: "PCS",
        order_qty: 5,
        base_unit_id: "u-1",
        base_unit_name: "PCS",
        base_qty: 5,
        price: 100,
        sub_total_price: 500,
        net_amount: 500,
        total_price: 535,
        tax_profile_id: "tp-1",
        tax_profile_name: "VAT 7%",
        tax_rate: 7,
        tax_amount: 35,
        locations: [{ id: "loc-1", order_qty: 5, received_qty: 0 }],
      },
    ],
    ...overrides,
  };
}

describe("createPoSchema (used by from-price-list wizard)", () => {
  it("accepts a fully populated wizard form", () => {
    const schema = createPoSchema(tv, tf, true);
    const result = schema.safeParse(makeValid());
    expect(result.success).toBe(true);
  });

  it("rejects empty workflow_id", () => {
    const schema = createPoSchema(tv, tf, true);
    const result = schema.safeParse(makeValid({ workflow_id: "" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path[0] === "workflow_id"),
      ).toBe(true);
    }
  });

  it("rejects empty delivery_date", () => {
    const schema = createPoSchema(tv, tf, true);
    const result = schema.safeParse(makeValid({ delivery_date: "" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path[0] === "delivery_date"),
      ).toBe(true);
    }
  });

  it("rejects empty vendor_id", () => {
    const schema = createPoSchema(tv, tf, true);
    const result = schema.safeParse(makeValid({ vendor_id: "" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "vendor_id")).toBe(
        true,
      );
    }
  });

  it("rejects empty currency_id", () => {
    const schema = createPoSchema(tv, tf, true);
    const result = schema.safeParse(makeValid({ currency_id: "" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path[0] === "currency_id"),
      ).toBe(true);
    }
  });
});

describe("getDefaultValues", () => {
  it("sets order_date to today's ISO string when no profile is given", () => {
    const before = Date.now();
    const values = getDefaultValues();
    const after = Date.now();
    const ts = new Date(values.order_date).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it("seeds buyer from profile when provided", () => {
    const values = getDefaultValues({
      userId: "u-9",
      fullName: "Bob Builder",
      email: "bob@example.com",
    });
    expect(values.buyer_id).toBe("u-9");
    expect(values.buyer_name).toBe("Bob Builder");
    expect(values.email).toBe("bob@example.com");
  });

  it("falls back to empty strings when profile fields are missing", () => {
    const values = getDefaultValues({});
    expect(values.buyer_id).toBe("");
    expect(values.buyer_name).toBe("");
    expect(values.email).toBe("");
  });

  it("defaults exchange_rate to 1 and items to empty", () => {
    const values = getDefaultValues();
    expect(values.exchange_rate).toBe(1);
    expect(values.items).toEqual([]);
  });
});
