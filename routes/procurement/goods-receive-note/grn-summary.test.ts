import { describe, it, expect } from "vitest";
import { sumGrnItems } from "./grn-summary";

const row = (over: Record<string, number> = {}) => ({
  discount_amount: 0,
  net_amount: 0,
  tax_amount: 0,
  total_price: 0,
  ...over,
});

describe("sumGrnItems", () => {
  it("ใบเปล่า = ทุกยอดเป็น 0 ไม่ใช่ NaN", () => {
    expect(sumGrnItems([])).toEqual({
      subtotal: 0,
      totalDiscount: 0,
      totalNet: 0,
      totalTax: 0,
      grandTotal: 0,
    });
    expect(sumGrnItems(undefined)).toEqual(sumGrnItems([]));
  });

  it("บวกทุกแถวแล้ว subtotal ย้อนจาก net + discount", () => {
    // ฟอร์มไม่ได้เก็บ subtotal ต่อแถว จึงต้องย้อนกลับมา
    const s = sumGrnItems([
      row({
        net_amount: 270,
        discount_amount: 30,
        tax_amount: 18.9,
        total_price: 288.9,
      }),
      row({
        net_amount: 100,
        discount_amount: 0,
        tax_amount: 7,
        total_price: 107,
      }),
    ]);
    expect(s).toEqual({
      subtotal: 400,
      totalDiscount: 30,
      totalNet: 370,
      totalTax: 25.9,
      grandTotal: 395.9,
    });
  });

  it("แถวที่เพิ่งเพิ่มยังไม่มีตัวเลข นับเป็น 0 ไม่ทำให้ทั้งแถบเป็น NaN", () => {
    const s = sumGrnItems([
      row({ net_amount: 100, total_price: 107, tax_amount: 7 }),
      {} as never,
      { net_amount: undefined } as never,
    ]);
    expect(s.totalNet).toBe(100);
    expect(s.grandTotal).toBe(107);
    expect(Number.isNaN(s.subtotal)).toBe(false);
  });

  it("เศษสตางค์จากหลายแถวถูกปัดสองตำแหน่ง ไม่ปล่อยทศนิยมลอยตัวออกจอ", () => {
    const s = sumGrnItems([
      row({ net_amount: 0.1, total_price: 0.1 }),
      row({ net_amount: 0.2, total_price: 0.2 }),
    ]);
    expect(s.totalNet).toBe(0.3);
    expect(s.grandTotal).toBe(0.3);
  });

  it("ยอดติดลบจาก override ไหลขึ้นแถบสรุปตามจริง ไม่ถูกกลืนเป็น 0", () => {
    const s = sumGrnItems([
      row({ net_amount: -200, total_price: -214, tax_amount: -14 }),
    ]);
    expect(s.totalNet).toBe(-200);
    expect(s.grandTotal).toBe(-214);
  });
});
