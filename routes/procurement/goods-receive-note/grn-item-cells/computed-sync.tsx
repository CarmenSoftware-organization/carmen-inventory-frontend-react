import { memo, useEffect } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import type { GrnFormValues } from "../grn-form-schema";
import { useGrnItemLine } from "./use-grn-item-line";

/**
 * เขียน derived amounts (discount/tax auto + net + total) กลับเข้า form เพื่อให้
 * ยอดท้ายใบ + payload อ่านได้ — render-null ติดตั้ง 1 ตัวต่อแถวที่ระดับ grid
 * (mirror PoItemComputedSync) discount_amount/tax_amount เขียนเฉพาะตอนไม่
 * override (auto); override → คงค่าที่ผู้ใช้กรอกไว้
 */
export const GrnItemComputedSync = memo(function GrnItemComputedSync({
  form,
  index,
}: {
  form: UseFormReturn<GrnFormValues>;
  index: number;
}) {
  "use no memo";
  const isDiscAdj =
    useWatch({
      control: form.control,
      name: `items.${index}.is_discount_adjustment`,
    }) ?? false;
  const isTaxAdj =
    useWatch({
      control: form.control,
      name: `items.${index}.is_tax_adjustment`,
    }) ?? false;
  const { discountAmount, netAmount, taxAmount, totalPrice } = useGrnItemLine(
    form,
    index,
  );

  useEffect(() => {
    if (!isDiscAdj) {
      const cur = form.getValues(`items.${index}.discount_amount`);
      if (cur !== discountAmount) {
        form.setValue(`items.${index}.discount_amount`, discountAmount);
      }
    }
    if (!isTaxAdj) {
      const cur = form.getValues(`items.${index}.tax_amount`);
      if (cur !== taxAmount) {
        form.setValue(`items.${index}.tax_amount`, taxAmount);
      }
    }
    const curNet = form.getValues(`items.${index}.net_amount`);
    if (curNet !== netAmount) {
      form.setValue(`items.${index}.net_amount`, netAmount);
    }
    const curTotal = form.getValues(`items.${index}.total_price`);
    if (curTotal !== totalPrice) {
      form.setValue(`items.${index}.total_price`, totalPrice);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form is stable (useForm ref)
  }, [
    index,
    discountAmount,
    taxAmount,
    netAmount,
    totalPrice,
    isDiscAdj,
    isTaxAdj,
  ]);

  return null;
});
