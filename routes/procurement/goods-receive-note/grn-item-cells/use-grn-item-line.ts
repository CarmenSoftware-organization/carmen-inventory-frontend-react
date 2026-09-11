import { useWatch, type UseFormReturn } from "react-hook-form";
import { computeLineAmounts } from "@/lib/line-pricing";
import type { GrnFormValues } from "../grn-form-schema";

/**
 * อ่านค่าที่ต้องใช้คำนวณของแถวเดียว → computeLineAmounts (honor override)
 * ฐานคิดของ GRN = unit_price × received_qty
 */
export function useGrnItemLine(
  form: UseFormReturn<GrnFormValues>,
  index: number,
) {
  "use no memo";
  const [price, qty, discRate, discAmt, isDiscAdj, taxRate, taxAmt, isTaxAdj] =
    useWatch({
      control: form.control,
      name: [
        `items.${index}.unit_price`,
        `items.${index}.received_qty`,
        `items.${index}.discount_rate`,
        `items.${index}.discount_amount`,
        `items.${index}.is_discount_adjustment`,
        `items.${index}.tax_rate`,
        `items.${index}.tax_amount`,
        `items.${index}.is_tax_adjustment`,
      ] as const,
    });
  return computeLineAmounts({
    price: Number(price) || 0,
    qty: Number(qty) || 0,
    discRate: Number(discRate) || 0,
    isDiscAdj: !!isDiscAdj,
    discAmt: Number(discAmt) || 0,
    taxRate: Number(taxRate) || 0,
    isTaxAdj: !!isTaxAdj,
    taxAmt: Number(taxAmt) || 0,
  });
}
