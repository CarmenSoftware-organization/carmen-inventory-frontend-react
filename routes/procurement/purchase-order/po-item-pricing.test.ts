import { describe, it, expect } from "vitest";
import { computeItemPricing } from "./po-item-pricing";
import type { PoFormValues } from "./po-form-schema";

type PoItem = PoFormValues["items"][number];
type PoLocation = PoItem["locations"][number];

const loc = (l: Partial<PoLocation>) =>
  ({
    order_qty: 0,
    discount_rate: 0,
    is_discount_adjustment: false,
    discount_amount: 0,
    tax_rate: 0,
    is_tax_adjustment: false,
    tax_amount: 0,
    ...l,
  }) as PoLocation;

const item = (price: number, locations: PoLocation[]) =>
  ({ price, locations }) as PoItem;

describe("computeItemPricing", () => {
  it("รวมทุก location — คนละเรตส่วนลด/ภาษีก็ต้องคิดแยกกัน", () => {
    const result = computeItemPricing(
      item(100, [
        loc({ order_qty: 10, discount_rate: 10, tax_rate: 7 }),
        loc({ order_qty: 5, discount_rate: 0, tax_rate: 7 }),
      ]),
    );

    // 1,000 - 100 = 900 + 63 · 500 - 0 = 500 + 35
    expect(result.orderQty).toBe(15);
    expect(result.subtotal).toBe(1500);
    expect(result.discountAmount).toBe(100);
    expect(result.netAmount).toBe(1400);
    expect(result.taxAmount).toBe(98);
    expect(result.totalPrice).toBe(1498);
  });

  it("เรตอยู่ที่ location ไม่ใช่ที่ item — คิดจากเรตรวมของ item จะได้เลขคนละตัว", () => {
    const perLocation = computeItemPricing(
      item(100, [
        loc({ order_qty: 10, discount_rate: 50 }),
        loc({ order_qty: 10, discount_rate: 0 }),
      ]),
    );
    // ถ้าเผลอเอา qty มารวมก่อนแล้วค่อยคูณเรตเดียว จะได้ 2000-1000=1000
    expect(perLocation.netAmount).toBe(1500);
  });

  it("override เป็นจำนวนเงิน ชนะเรตที่กรอกไว้", () => {
    const result = computeItemPricing(
      item(100, [
        loc({
          order_qty: 10,
          discount_rate: 10,
          is_discount_adjustment: true,
          discount_amount: 250,
          tax_rate: 7,
          is_tax_adjustment: true,
          tax_amount: 10,
        }),
      ]),
    );

    expect(result.discountAmount).toBe(250);
    expect(result.netAmount).toBe(750);
    expect(result.taxAmount).toBe(10);
    expect(result.totalPrice).toBe(760);
  });

  it("ไม่มี location = ศูนย์หมด ไม่ใช่ NaN", () => {
    const result = computeItemPricing(item(100, []));
    expect(result.subtotal).toBe(0);
    expect(result.totalPrice).toBe(0);
    expect(result.orderQty).toBe(0);
  });

  it("base qty คูณตัวแปลงหน่วยของ item", () => {
    const result = computeItemPricing({
      ...item(50, [loc({ order_qty: 3 })]),
      order_unit_conversion_factor: 12,
    } as PoItem);
    expect(result.baseQty).toBe(36);
  });
});
