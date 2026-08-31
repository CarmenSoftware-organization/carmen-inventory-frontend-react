import { describe, it, expect } from "vitest";
import { computeLineAmounts, type LineAmountInput } from "@/lib/line-pricing";

/**
 * เครื่องคิดเงินของบรรทัดสินค้า — ใช้ร่วมกันทั้ง PR · PO · GRN · CN
 * สูตรเพี้ยนที่นี่ที่เดียว = ยอดเงินทุกโมดูลผิดพร้อมกัน
 */
const line = (over: Partial<LineAmountInput> = {}): LineAmountInput => ({
  price: 100,
  qty: 3,
  discRate: 0,
  isDiscAdj: false,
  discAmt: 0,
  taxRate: 0,
  isTaxAdj: false,
  taxAmt: 0,
  ...over,
});

describe("computeLineAmounts — ลำดับการคิด", () => {
  it("ไม่มีส่วนลดไม่มีภาษี: ทุกชั้นเท่ากับราคา × จำนวน", () => {
    expect(computeLineAmounts(line())).toEqual({
      subtotal: 300,
      discountAmount: 0,
      netAmount: 300,
      taxAmount: 0,
      totalPrice: 300,
    });
  });

  it("ส่วนลดคิดจาก subtotal ส่วนภาษีคิดจากยอดหลังหักส่วนลด", () => {
    // 300 − 10% = 270 แล้วภาษี 7% ของ 270 = 18.90 (ไม่ใช่ 7% ของ 300)
    expect(computeLineAmounts(line({ discRate: 10, taxRate: 7 }))).toEqual({
      subtotal: 300,
      discountAmount: 30,
      netAmount: 270,
      taxAmount: 18.9,
      totalPrice: 288.9,
    });
  });

  it("ภาษีคิดบนยอดสุทธิเสมอ — ไม่ใช่บน subtotal", () => {
    const withDiscount = computeLineAmounts(line({ discRate: 50, taxRate: 7 }));
    const noDiscount = computeLineAmounts(line({ taxRate: 7 }));
    expect(withDiscount.taxAmount).toBe(10.5);
    expect(noDiscount.taxAmount).toBe(21);
  });
});

describe("computeLineAmounts — override ที่ผู้ใช้กรอกเอง", () => {
  it("เปิด override ส่วนลด = ใช้ยอดที่กรอก ไม่สนอัตรา", () => {
    const r = computeLineAmounts(
      line({ discRate: 10, isDiscAdj: true, discAmt: 55 }),
    );
    expect(r.discountAmount).toBe(55);
    expect(r.netAmount).toBe(245);
  });

  it("เปิด override ภาษี = ใช้ยอดที่กรอก ไม่สนอัตรา", () => {
    const r = computeLineAmounts(
      line({ taxRate: 7, isTaxAdj: true, taxAmt: 5 }),
    );
    expect(r.taxAmount).toBe(5);
    expect(r.totalPrice).toBe(305);
  });

  it("override ทั้งคู่พร้อมกันได้ อัตราถูกเมินทั้งสองตัว", () => {
    const r = computeLineAmounts(
      line({
        discRate: 99,
        isDiscAdj: true,
        discAmt: 100,
        taxRate: 99,
        isTaxAdj: true,
        taxAmt: 7,
      }),
    );
    expect(r).toEqual({
      subtotal: 300,
      discountAmount: 100,
      netAmount: 200,
      taxAmount: 7,
      totalPrice: 207,
    });
  });

  it("override เปิดแต่กรอก 0 = ส่วนลด 0 จริง ๆ ไม่ใช่ตกกลับไปใช้อัตรา", () => {
    // เคสที่คนตั้งใจ "ไม่ลด" ทั้งที่อัตรามีค่า — ตกกลับไปคิดจากอัตราคือคิดเงินผิด
    const r = computeLineAmounts(
      line({ discRate: 10, isDiscAdj: true, discAmt: 0 }),
    );
    expect(r.discountAmount).toBe(0);
    expect(r.netAmount).toBe(300);
  });
});

describe("computeLineAmounts — การปัดเศษ", () => {
  it("ปัดทีละชั้น ไม่ใช่ปัดตอนจบ", () => {
    // 33.333 × 3 = 99.999 → subtotal 100 แล้วชั้นต่อไปคิดจาก 100
    const r = computeLineAmounts(line({ price: 33.333, qty: 3 }));
    expect(r.subtotal).toBe(100);
    expect(r.netAmount).toBe(100);
  });

  it("ยอดที่ลงเอยด้วยเศษสตางค์ถูกปัดสองตำแหน่ง", () => {
    const r = computeLineAmounts(line({ price: 10.005, qty: 1, taxRate: 7 }));
    expect(r.subtotal).toBe(10.01);
    expect(r.taxAmount).toBe(0.7);
    expect(r.totalPrice).toBe(10.71);
  });

  it("ทศนิยมลอยตัวไม่หลุดออกมาเป็น 0.30000000000000004", () => {
    const r = computeLineAmounts(line({ price: 0.1, qty: 3 }));
    expect(r.subtotal).toBe(0.3);
    expect(r.totalPrice).toBe(0.3);
  });
});

describe("computeLineAmounts — ค่าขอบ", () => {
  it("จำนวน 0 = ทุกยอดเป็น 0 ไม่ใช่ NaN", () => {
    const r = computeLineAmounts(line({ qty: 0, discRate: 10, taxRate: 7 }));
    expect(r).toEqual({
      subtotal: 0,
      discountAmount: 0,
      netAmount: 0,
      taxAmount: 0,
      totalPrice: 0,
    });
  });

  it("ส่วนลด 100% = ยอดสุทธิ 0 และไม่มีภาษี", () => {
    const r = computeLineAmounts(line({ discRate: 100, taxRate: 7 }));
    expect(r.netAmount).toBe(0);
    expect(r.taxAmount).toBe(0);
    expect(r.totalPrice).toBe(0);
  });

  it("override ส่วนลดมากกว่ายอด = ยอดสุทธิติดลบ (ไม่กลืนให้เป็น 0 เงียบ ๆ)", () => {
    // ปล่อยให้ติดลบโดยตั้งใจ — ตัวเลขประหลาดต้องเห็นบนจอ ไม่ใช่ถูกซ่อน
    const r = computeLineAmounts(
      line({ isDiscAdj: true, discAmt: 500, taxRate: 7 }),
    );
    expect(r.netAmount).toBe(-200);
    expect(r.taxAmount).toBe(-14);
    expect(r.totalPrice).toBe(-214);
  });
});
