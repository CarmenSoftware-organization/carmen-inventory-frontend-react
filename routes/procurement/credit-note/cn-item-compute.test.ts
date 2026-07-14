import { describe, expect, it } from "vitest";
import { computeCnItemAmounts } from "./cn-item-compute";

const base = {
  quantity: 3,
  unit_price: 100,
  net_amount: 0,
  discount_rate: 0,
  discount_amount: 0,
  is_discount_adjustment: false,
  tax_rate: 7,
  tax_amount: 0,
  is_tax_adjustment: false,
};

describe("computeCnItemAmounts", () => {
  it("quantity_return: subtotal = qty × price, no discount, tax from rate", () => {
    expect(computeCnItemAmounts("quantity_return", base)).toEqual({
      sub_total: 300,
      discount_amount: 0,
      net_amount: 300,
      tax_amount: 21,
      total_amount: 321,
    });
  });

  it("quantity_return: ignores the entered net_amount", () => {
    const r = computeCnItemAmounts("quantity_return", {
      ...base,
      net_amount: 9999,
    });
    expect(r.net_amount).toBe(300);
  });

  it("quantity_return: discount rate → net = subtotal − discount, tax on net", () => {
    const r = computeCnItemAmounts("quantity_return", {
      ...base,
      discount_rate: 10,
    });
    expect(r).toEqual({
      sub_total: 300,
      discount_amount: 30,
      net_amount: 270,
      tax_amount: 18.9,
      total_amount: 288.9,
    });
  });

  it("quantity_return: honors the entered discount_amount when adjustment on", () => {
    const r = computeCnItemAmounts("quantity_return", {
      ...base,
      is_discount_adjustment: true,
      discount_amount: 50,
    });
    expect(r).toEqual({
      sub_total: 300,
      discount_amount: 50,
      net_amount: 250,
      tax_amount: 17.5,
      total_amount: 267.5,
    });
  });

  it("amount_discount: net = entered CN amount, no line discount", () => {
    const r = computeCnItemAmounts("amount_discount", {
      ...base,
      net_amount: 250,
      // discount fields ignored for amount_discount
      discount_rate: 10,
      is_discount_adjustment: true,
      discount_amount: 99,
    });
    expect(r).toEqual({
      sub_total: 250,
      discount_amount: 0,
      net_amount: 250,
      tax_amount: 17.5,
      total_amount: 267.5,
    });
  });

  it("uses the entered tax_amount when is_tax_adjustment is true", () => {
    const r = computeCnItemAmounts("quantity_return", {
      ...base,
      is_tax_adjustment: true,
      tax_amount: 5,
    });
    expect(r).toEqual({
      sub_total: 300,
      discount_amount: 0,
      net_amount: 300,
      tax_amount: 5,
      total_amount: 305,
    });
  });

  it("rounds to 2 decimals", () => {
    const r = computeCnItemAmounts("quantity_return", {
      ...base,
      quantity: 1,
      unit_price: 33.333,
      tax_rate: 7,
    });
    expect(r.net_amount).toBe(33.33);
    expect(r.tax_amount).toBe(2.33);
    expect(r.total_amount).toBe(35.66);
  });

  it("handles NaN/undefined inputs as 0", () => {
    const r = computeCnItemAmounts("quantity_return", {
      quantity: Number.NaN,
      unit_price: Number.NaN,
      net_amount: Number.NaN,
      discount_rate: Number.NaN,
      discount_amount: Number.NaN,
      is_discount_adjustment: false,
      tax_rate: Number.NaN,
      tax_amount: Number.NaN,
      is_tax_adjustment: false,
    });
    expect(r).toEqual({
      sub_total: 0,
      discount_amount: 0,
      net_amount: 0,
      tax_amount: 0,
      total_amount: 0,
    });
  });
});
