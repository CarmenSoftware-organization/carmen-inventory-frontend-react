import { round2 } from "@/lib/currency-utils";
import { computeLineAmounts } from "@/lib/line-pricing";
import type { PoFormValues } from "./po-form-schema";

/**
 * item-level pricing = ผลรวมของทุก location (แต่ละ location มี Disc%/Tax ของตัวเอง)
 * price เป็นระดับ item; qty/disc%/tax% มาจาก location
 */
export function computeItemPricing(
  item: PoFormValues["items"][number] | undefined,
) {
  const price = Number(item?.price ?? 0);
  const conversion = Number(item?.order_unit_conversion_factor ?? 1);

  let orderQty = 0;
  let subtotal = 0;
  let discountAmount = 0;
  let netAmount = 0;
  let taxAmount = 0;
  let totalPrice = 0;

  for (const loc of item?.locations ?? []) {
    const qty = Number(loc?.order_qty) || 0;
    const line = computeLineAmounts({
      price,
      qty,
      discRate: Number(loc?.discount_rate) || 0,
      isDiscAdj: loc?.is_discount_adjustment ?? false,
      discAmt: Number(loc?.discount_amount) || 0,
      taxRate: Number(loc?.tax_rate) || 0,
      isTaxAdj: loc?.is_tax_adjustment ?? false,
      taxAmt: Number(loc?.tax_amount) || 0,
    });
    orderQty += qty;
    subtotal += line.subtotal;
    discountAmount += line.discountAmount;
    netAmount += line.netAmount;
    taxAmount += line.taxAmount;
    totalPrice += line.totalPrice;
  }

  const baseQty = round2(orderQty * conversion);

  return {
    orderQty,
    subtotal: round2(subtotal),
    discountAmount: round2(discountAmount),
    netAmount: round2(netAmount),
    taxAmount: round2(taxAmount),
    totalPrice: round2(totalPrice),
    baseQty,
  };
}
