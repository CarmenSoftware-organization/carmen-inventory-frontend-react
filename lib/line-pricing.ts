import { round2 } from "@/lib/currency-utils";

/**
 * Input สำหรับคำนวณยอดของบรรทัดสินค้า (line item / location) — รองรับ override
 * discount/tax: ถ้า `isDiscAdj`/`isTaxAdj` = true ใช้ amount ที่กรอกเอง แทนการ
 * คำนวณจาก rate
 */
export interface LineAmountInput {
  readonly price: number;
  readonly qty: number;
  readonly discRate: number;
  readonly isDiscAdj: boolean;
  readonly discAmt: number;
  readonly taxRate: number;
  readonly isTaxAdj: boolean;
  readonly taxAmt: number;
}

/**
 * คำนวณยอด: subtotal → discount → net → tax → total (round2 ทุกชั้น)
 * override ปิด → amount = auto จาก rate · override เปิด → amount = ที่กรอกเอง
 * ใช้ร่วมกันทั้ง PR และ PO (per-location) เพื่อให้สูตรเดียวกัน ไม่ drift
 */
export function computeLineAmounts(input: LineAmountInput) {
  const subtotal = round2(input.price * input.qty);
  const discountAmount = input.isDiscAdj
    ? input.discAmt
    : round2((subtotal * input.discRate) / 100);
  const netAmount = round2(subtotal - discountAmount);
  const taxAmount = input.isTaxAdj
    ? input.taxAmt
    : round2((netAmount * input.taxRate) / 100);
  const totalPrice = round2(netAmount + taxAmount);
  return { subtotal, discountAmount, netAmount, taxAmount, totalPrice };
}
