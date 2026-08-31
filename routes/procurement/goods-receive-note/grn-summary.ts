import { round2 } from "@/lib/currency-utils";
import type { GrnFormValues } from "./grn-form-schema";

export interface GrnSummary {
  subtotal: number;
  totalDiscount: number;
  totalNet: number;
  totalTax: number;
  grandTotal: number;
}

/**
 * รวมยอดทั้งใบจากแถวที่คำนวณไว้แล้ว (`GrnItemComputedSync` เขียนค่าต่อแถวลงฟอร์ม)
 *
 * **ไม่คิดใหม่จากราคา/จำนวน** — คิดซ้ำที่นี่แปลว่ามีสูตรสองชุดที่ drift จากกันได้
 * ยอดต่อแถวมาจาก `computeLineAmounts` ที่เดียว ตรงนี้แค่บวก
 *
 * `subtotal` ย้อนจาก net + discount เพราะฟอร์มไม่ได้เก็บ subtotal ต่อแถวไว้
 *
 * ค่าที่อ่านไม่ออก (undefined จากแถวที่เพิ่งเพิ่ม) นับเป็น 0 — ไม่ใช่ NaN ที่จะ
 * ลามไปทั้งแถบสรุป
 */
export function sumGrnItems(
  items: readonly Partial<GrnFormValues["items"][number]>[] | undefined,
): GrnSummary {
  let totalDiscount = 0;
  let totalNet = 0;
  let totalTax = 0;
  let grandTotal = 0;

  for (const it of items ?? []) {
    totalDiscount += Number(it?.discount_amount) || 0;
    totalNet += Number(it?.net_amount) || 0;
    totalTax += Number(it?.tax_amount) || 0;
    grandTotal += Number(it?.total_price) || 0;
  }

  return {
    subtotal: round2(totalNet + totalDiscount),
    totalDiscount: round2(totalDiscount),
    totalNet: round2(totalNet),
    totalTax: round2(totalTax),
    grandTotal: round2(grandTotal),
  };
}
