import { memo, useEffect } from "react";
import { useWatch, type Control, type UseFormReturn } from "react-hook-form";
import { formatCurrency } from "@/lib/currency-utils";
import type { PoFormValues } from "../po-form-schema";
import { computeItemPricing } from "../po-item-pricing";

/** Read-only display ของ sub/disc/net/tax/total — คำนวณ local เพื่อแสดงผล (ไม่เขียน form) */
export const ComputedPricingCell = function ComputedPricingCell({
  control,
  index,
  field: displayField,
}: {
  control: Control<PoFormValues>;
  index: number;
  field:
    | "sub_total_price"
    | "discount_amount"
    | "net_amount"
    | "tax_amount"
    | "total_price";
}) {
  "use no memo";
  const item = useWatch({ control, name: `items.${index}` });
  const { subtotal, discountAmount, netAmount, taxAmount, totalPrice } =
    computeItemPricing(item);
  const values = {
    sub_total_price: subtotal,
    discount_amount: discountAmount,
    net_amount: netAmount,
    tax_amount: taxAmount,
    total_price: totalPrice,
  };
  return (
    <span className="block text-right tabular-nums">
      {formatCurrency(values[displayField])}
    </span>
  );
};

/**
 * เขียน derived fields (order_qty mirror + pricing + base_qty) กลับเข้า form
 * เพื่อให้ payload (mapItemToPayload) และ summary อ่านได้
 *
 * Render-null — ติดตั้ง 1 ตัวต่อ item ที่ระดับ grid (ไม่ซ้ำ desktop/mobile)
 * จึงรัน setValue ครั้งเดียวต่อ item แทนที่จะซ้ำใน ItemRow + ItemCard
 */

/**
 * เขียน derived fields (order_qty mirror + pricing + base_qty) กลับเข้า form
 * เพื่อให้ payload (mapItemToPayload) และ summary อ่านได้
 *
 * Render-null — ติดตั้ง 1 ตัวต่อ item ที่ระดับ grid (ไม่ซ้ำ desktop/mobile)
 * จึงรัน setValue ครั้งเดียวต่อ item แทนที่จะซ้ำใน ItemRow + ItemCard
 */
export const PoItemComputedSync = memo(function PoItemComputedSync({
  control,
  form,
  index,
}: {
  control: Control<PoFormValues>;
  form: UseFormReturn<PoFormValues>;
  index: number;
}) {
  "use no memo";
  const item = useWatch({ control, name: `items.${index}` });
  const {
    orderQty,
    subtotal,
    discountAmount,
    netAmount,
    taxAmount,
    totalPrice,
    baseQty,
  } = computeItemPricing(item);

  useEffect(() => {
    form.setValue(`items.${index}.order_qty`, orderQty);
    form.setValue(`items.${index}.sub_total_price`, subtotal);
    form.setValue(`items.${index}.discount_amount`, discountAmount);
    form.setValue(`items.${index}.net_amount`, netAmount);
    form.setValue(`items.${index}.tax_amount`, taxAmount);
    form.setValue(`items.${index}.total_price`, totalPrice);
    form.setValue(`items.${index}.base_qty`, baseQty);
  }, [
    form,
    index,
    orderQty,
    subtotal,
    discountAmount,
    netAmount,
    taxAmount,
    totalPrice,
    baseQty,
  ]);

  return null;
});
