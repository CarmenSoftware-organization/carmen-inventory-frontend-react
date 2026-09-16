import { describe, it, expect } from "vitest";
import { computeItemPricing } from "./po-item-pricing";
import type { PoFormValues } from "./po-form-schema";

type PoItem = PoFormValues["items"][number];

/**
 * แถวหนึ่ง = คลังเดียว ตั้งแต่ backend เลิก group location — เทสต์ชุดเดิมทดสอบ
 * การรวมยอดข้าม `locations[]` ซึ่งไม่มีอยู่แล้ว จึงเขียนใหม่ตามพฤติกรรมจริง
 */
const item = (v: Partial<PoItem>) =>
  ({
    price: 0,
    order_qty: 0,
    discount_rate: 0,
    is_discount_adjustment: false,
    discount_amount: 0,
    tax_rate: 0,
    is_tax_adjustment: false,
    tax_amount: 0,
    order_unit_conversion_factor: 1,
    ...v,
  }) as PoItem;

describe("computeItemPricing", () => {
  it("คิดจาก qty ของแถวเดียว ไม่ต้องรวมข้ามคลังอีก", () => {
    const r = computeItemPricing(
      item({ price: 100, order_qty: 10, discount_rate: 10, tax_rate: 7 }),
    );
    // 1,000 - 100 = 900 → ภาษี 7% ของ 900 = 63
    expect(r.orderQty).toBe(10);
    expect(r.subtotal).toBe(1000);
    expect(r.discountAmount).toBe(100);
    expect(r.netAmount).toBe(900);
    expect(r.taxAmount).toBe(63);
    expect(r.totalPrice).toBe(963);
  });

  it("override เป็นจำนวนเงิน ชนะเรตที่กรอกไว้", () => {
    const r = computeItemPricing(
      item({
        price: 100,
        order_qty: 10,
        discount_rate: 10,
        is_discount_adjustment: true,
        discount_amount: 250,
        tax_rate: 7,
      }),
    );
    expect(r.discountAmount).toBe(250);
    expect(r.netAmount).toBe(750);
  });

  it("override ภาษีเป็นจำนวนเงินก็เหมือนกัน", () => {
    const r = computeItemPricing(
      item({
        price: 100,
        order_qty: 10,
        tax_rate: 7,
        is_tax_adjustment: true,
        tax_amount: 5,
      }),
    );
    expect(r.taxAmount).toBe(5);
    expect(r.totalPrice).toBe(1005);
  });

  it("base qty คิดจาก conversion factor ของหน่วยสั่งซื้อ", () => {
    const r = computeItemPricing(
      item({ price: 1, order_qty: 3, order_unit_conversion_factor: 12 }),
    );
    expect(r.baseQty).toBe(36);
  });

  it("ไม่มี item เลย → ศูนย์ทั้งชุด ไม่ใช่ NaN", () => {
    const r = computeItemPricing(undefined);
    expect(r.orderQty).toBe(0);
    expect(r.totalPrice).toBe(0);
    expect(r.baseQty).toBe(0);
  });
});
