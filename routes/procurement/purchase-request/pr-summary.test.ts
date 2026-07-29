import { describe, it, expect } from "vitest";
import { computePrSummary } from "./pr-summary";
import type { PrFormValues } from "./pr-form-schema";

type PrItem = PrFormValues["items"][number];

const item = (partial: Partial<PrItem>) =>
  ({
    pricelist_price: 0,
    requested_qty: 0,
    approved_qty: 0,
    discount_amount: 0,
    net_amount: 0,
    tax_amount: 0,
    total_price: 0,
    exchange_rate: 1,
    ...partial,
  }) as PrItem;

describe("computePrSummary", () => {
  it("subtotal คิดจากจำนวนที่อนุมัติ ไม่ใช่จำนวนที่ขอ", () => {
    // ผู้อนุมัติหั่น 10 เหลือ 4 → แถวคิดเงินจาก 4 แถบสรุปต้องคิดจาก 4 ด้วย
    const summary = computePrSummary([
      item({
        pricelist_price: 100,
        requested_qty: 10,
        approved_qty: 4,
        net_amount: 400,
        total_price: 400,
      }),
    ]);
    expect(summary.subtotal).toBe(400);
  });

  it("ยังไม่ระบุจำนวนที่อนุมัติ = คิดเท่าที่ขอ", () => {
    const summary = computePrSummary([
      item({ pricelist_price: 100, requested_qty: 10, approved_qty: 0 }),
    ]);
    expect(summary.subtotal).toBe(1000);
  });

  it("Subtotal − Discount ต้องเท่ากับ Net", () => {
    const summary = computePrSummary([
      item({
        pricelist_price: 100,
        requested_qty: 10,
        approved_qty: 4,
        discount_amount: 40,
        net_amount: 360,
        tax_amount: 25.2,
        total_price: 385.2,
      }),
    ]);
    expect(summary.subtotal - summary.totalDiscount).toBe(summary.totalNet);
    expect(summary.totalNet + summary.totalTax).toBe(summary.grandTotal);
  });

  it("แปลงเป็นสกุลหลักเสมอ ถึงใบจะมีสกุลเดียว", () => {
    const summary = computePrSummary([
      item({
        pricelist_price: 10,
        requested_qty: 2,
        net_amount: 20,
        total_price: 20,
        exchange_rate: 35,
      }),
    ]);
    expect(summary.subtotal).toBe(700);
    expect(summary.grandTotal).toBe(700);
  });

  it("เรตว่างหรือเป็นศูนย์ถือเป็น 1 — ยอดต้องไม่หายทั้งใบ", () => {
    const summary = computePrSummary([
      item({
        pricelist_price: 10,
        requested_qty: 2,
        total_price: 20,
        exchange_rate: 0,
      }),
      item({
        pricelist_price: 10,
        requested_qty: 1,
        total_price: 10,
        exchange_rate: undefined,
      }),
    ]);
    expect(summary.subtotal).toBe(30);
    expect(summary.grandTotal).toBe(30);
  });

  it("ไม่มี item = ศูนย์หมด", () => {
    const summary = computePrSummary([]);
    expect(summary).toEqual({
      subtotal: 0,
      totalDiscount: 0,
      totalNet: 0,
      totalTax: 0,
      grandTotal: 0,
    });
  });
});
