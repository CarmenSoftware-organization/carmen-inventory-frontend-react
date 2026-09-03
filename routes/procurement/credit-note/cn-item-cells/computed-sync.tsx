import { memo, useEffect } from "react";
import { useWatch, type Control, type UseFormReturn } from "react-hook-form";
import type { CnFormValues } from "../cn-form-schema";
import { useCnItemLine } from "./helpers";

/**
 * คำนวณ + set discount/net/tax/total ของ item — mount ตลอด (ทุก row) เพื่อให้ยอด
 * recompute เสมอ ตามประเภทใบลดหนี้ (quantity_return vs amount_discount)
 * — ไม่เขียนทับ net_amount ที่ผู้ใช้กรอก (amount_discount), discount_amount ที่
 * override (is_discount_adjustment) หรือ tax_amount ที่ override (is_tax_adjustment)
 */
export const CnItemComputedSync = memo(function CnItemComputedSync({
  control,
  form,
  index,
}: {
  control: Control<CnFormValues>;
  form: UseFormReturn<CnFormValues>;
  index: number;
}) {
  "use no memo";
  const type = useWatch({ control, name: "credit_note_type" });
  const [isDiscAdj, isTaxAdj] = useWatch({
    control,
    name: [
      `items.${index}.is_discount_adjustment`,
      `items.${index}.is_tax_adjustment`,
    ] as const,
  });
  const { discount_amount, net_amount, tax_amount, total_amount } =
    useCnItemLine(form, index, type);

  useEffect(() => {
    // amount_discount → ไม่มีส่วนลดต่อบรรทัด: ล้าง override/amount ที่ค้างจาก
    // quantity_return (กันยอด/payload เพี้ยนตอนสลับประเภท)
    if (type === "amount_discount") {
      if (isDiscAdj) {
        form.setValue(`items.${index}.is_discount_adjustment`, false);
      }
      if (form.getValues(`items.${index}.discount_amount`) !== 0) {
        form.setValue(`items.${index}.discount_amount`, 0);
      }
    } else if (!isDiscAdj) {
      // discount_amount: เขียนเฉพาะโหมด auto (override → คงค่า user)
      if (
        form.getValues(`items.${index}.discount_amount`) !== discount_amount
      ) {
        form.setValue(`items.${index}.discount_amount`, discount_amount);
      }
    }
    if (form.getValues(`items.${index}.net_amount`) !== net_amount) {
      form.setValue(`items.${index}.net_amount`, net_amount);
    }
    // tax_amount: เขียนเฉพาะโหมด auto (override → คงค่า user)
    if (!isTaxAdj) {
      if (form.getValues(`items.${index}.tax_amount`) !== tax_amount) {
        form.setValue(`items.${index}.tax_amount`, tax_amount);
      }
    }
    if (form.getValues(`items.${index}.total_amount`) !== total_amount) {
      form.setValue(`items.${index}.total_amount`, total_amount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form is stable (useForm ref)
  }, [
    index,
    type,
    discount_amount,
    net_amount,
    tax_amount,
    total_amount,
    isDiscAdj,
    isTaxAdj,
  ]);

  return null;
});
