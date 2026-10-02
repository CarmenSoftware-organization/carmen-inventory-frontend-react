import { memo, useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { SrStockMovement } from "@/types/store-requisition";
import { srPostedCostByDetail } from "./sr-form-helpers";
import type { SrFormValues } from "./sr-form-schema";

/**
 * ใบที่จ่ายแล้ว: เขียนต้นทุนที่ลงบัญชีจริงของทุกแถวเข้าฟอร์ม (render null)
 *
 * ใช้แทน `SrItemCostSync` เมื่อใบ completed — ตัวนั้นยิงราคาประมาณใหม่ทุกครั้งที่เปิดใบ
 * คิดจากล็อตที่เหลือ ณ วันนี้ ไม่ใช่ล็อตที่ถูกตัดไปตอนจ่าย คอลัมน์ยอดเงินกับยอดรวมท้ายใบ
 * จึงอ่านค่าจากฟอร์มชุดเดียวกับเดิม แค่ที่มาของค่าเปลี่ยนเป็น stock movement ของใบนี้
 */
export const SrItemPostedCostSync = memo(function SrItemPostedCostSync({
  form,
  movement,
}: {
  form: UseFormReturn<SrFormValues>;
  movement: SrStockMovement | undefined;
}) {
  "use no memo";
  useEffect(() => {
    if (!movement?.is_posted) return;
    const posted = srPostedCostByDetail(movement.items);
    const items = form.getValues("items") ?? [];
    items.forEach((item, index) => {
      const cost = item.id ? posted.get(item.id) : undefined;
      if (!cost) return;
      // ค่าพวกนี้เป็น display ล้วน — ไม่ dirty ฟอร์ม (ทรงเดียวกับ SrItemCostSync)
      if (form.getValues(`items.${index}.total_cost`) !== cost.total_cost) {
        form.setValue(`items.${index}.total_cost`, cost.total_cost);
      }
      if (
        form.getValues(`items.${index}.cost_per_unit`) !== cost.cost_per_unit
      ) {
        form.setValue(`items.${index}.cost_per_unit`, cost.cost_per_unit);
      }
    });
  }, [movement, form]);

  return null;
});
