import { useWatch, type UseFormReturn } from "react-hook-form";
import { COMBO_COL } from "../../shared/combo-col-width";
import type { CnFormValues } from "../cn-form-schema";
import {
  computeCnItemAmounts,
  type CnCreditNoteType,
  type CnItemAmounts,
} from "../cn-item-compute";

/**
 * ความกว้าง (px) ของคอลัมน์ — ใช้ร่วมกันระหว่างแถวหลัก (ยอดตาม GRN) กับแถวที่
 * กางออก (ฝั่งคืน) สองแถวจึงตรงคอลัมน์กัน วันไหนปรับก็ปรับที่นี่ที่เดียว
 *
 * discount/tax กว้างตาม combo ของฝั่งคืนเสมอ แม้แถวหลักจะเป็นตัวเลขล้วน —
 * ถ้าย่อตามแถวหลัก แถวกางจะไม่มีที่พอให้ [rate | ยอด | override]
 */
export const CN_COL = {
  leading: 36,
  product: 200,
  location: 130,
  qty: 130,
  price: 100,
  sub: 110,
  discount: COMBO_COL.discount,
  net: 96,
  tax: COMBO_COL.tax,
  amount: 120,
  action: 40,
} as const;

/** ผลรวมความกว้างของช่วงที่แถวกางครอบ (product → amount, +action ถ้ามี) */
export function cnReturnRowTotal(showActionCol: boolean): number {
  return (
    CN_COL.product +
    CN_COL.location +
    CN_COL.qty +
    CN_COL.price +
    CN_COL.sub +
    CN_COL.discount +
    CN_COL.net +
    CN_COL.tax +
    CN_COL.amount +
    (showActionCol ? CN_COL.action : 0)
  );
}

/** อ่านค่าที่ต้องใช้คำนวณของ item เดียว → computeCnItemAmounts (honor override) */
export function useCnItemLine(
  form: UseFormReturn<CnFormValues>,
  index: number,
  type: CnCreditNoteType,
): CnItemAmounts {
  "use no memo";
  const [
    quantity,
    unitPrice,
    netAmount,
    discRate,
    discAmt,
    isDiscAdj,
    taxRate,
    taxAmt,
    isTaxAdj,
  ] = useWatch({
    control: form.control,
    name: [
      `items.${index}.quantity`,
      `items.${index}.unit_price`,
      `items.${index}.net_amount`,
      `items.${index}.discount_rate`,
      `items.${index}.discount_amount`,
      `items.${index}.is_discount_adjustment`,
      `items.${index}.tax_rate`,
      `items.${index}.tax_amount`,
      `items.${index}.is_tax_adjustment`,
    ] as const,
  });
  return computeCnItemAmounts(type, {
    quantity: Number(quantity) || 0,
    unit_price: Number(unitPrice) || 0,
    net_amount: Number(netAmount) || 0,
    discount_rate: Number(discRate) || 0,
    discount_amount: Number(discAmt) || 0,
    is_discount_adjustment: !!isDiscAdj,
    tax_rate: Number(taxRate) || 0,
    tax_amount: Number(taxAmt) || 0,
    is_tax_adjustment: !!isTaxAdj,
  });
}
