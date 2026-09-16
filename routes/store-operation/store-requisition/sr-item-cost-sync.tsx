import { memo, useEffect } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { useBuCode } from "@/hooks/use-bu-code";
import { useProductCostByLocationQty } from "@/hooks/use-product-cost";
import type { SrFormValues } from "./sr-form-schema";

/**
 * ดึงต้นทุนของแถวจาก backend แล้วเขียนกลับเข้าฟอร์ม (render null)
 *
 * `GET /{bu}/cost/products/{product_id}/location/{from_location_id}/qty/{qty}` —
 * ต้นทุนผูกกับล็อตที่มีอยู่จริงในคลังต้นทาง ณ ตอนนั้น คิดฝั่ง client ไม่ได้
 *
 * ติดตั้งหนึ่งตัวต่อแถวที่ระดับ `SrItemFields` ไม่ใช่ในเซลล์ — เซลล์ยอดเงินกับ
 * ยอดรวมท้ายใบจะได้อ่านค่าเดียวกันจากฟอร์ม ไม่ใช่ต่างคนต่างยิง (ทรงเดียวกับ
 * `PoItemComputedSync` และ IA)
 */
export const SrItemCostSync = memo(function SrItemCostSync({
  form,
  index,
  fromLocationId,
}: {
  form: UseFormReturn<SrFormValues>;
  index: number;
  fromLocationId: string;
}) {
  "use no memo";
  const buCode = useBuCode();
  const control = form.control;
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";
  const qty = useWatch({ control, name: `items.${index}.requested_qty` });
  const { data } = useProductCostByLocationQty(
    buCode,
    productId || undefined,
    fromLocationId || undefined,
    typeof qty === "number" ? qty : 0,
  );

  useEffect(() => {
    if (!data) return;
    // เขียนเฉพาะตอนค่าต่างจริง — เท่ากันแล้วยัง setValue ซ้ำคือ render วนเปล่า
    // และค่าพวกนี้เป็น display ล้วน ไม่ต้อง dirty ฟอร์มให้ติด discard dialog
    if (form.getValues(`items.${index}.total_cost`) !== data.total_cost) {
      form.setValue(`items.${index}.total_cost`, data.total_cost);
    }
    if (
      form.getValues(`items.${index}.cost_per_unit`) !==
      data.average_cost_per_unit
    ) {
      form.setValue(
        `items.${index}.cost_per_unit`,
        data.average_cost_per_unit,
      );
    }
  }, [data, form, index]);

  return null;
});
