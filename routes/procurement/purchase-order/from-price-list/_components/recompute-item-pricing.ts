import { round2 } from "@/lib/currency-utils";
import type { FromPriceListSelectedItem } from "../from-price-list-form-schema";

/**
 * Sync ฟิลด์ระดับ item (order_qty/base_qty/sub_total_price/net_amount/tax_amount/
 * total_price) ให้ตรงกับผลรวมของ locations — wizard from-price-list ไม่มี
 * PoItemComputedSync (ที่ใช้ในฟอร์ม PO ปกติ) คอย sync ให้ ดังนั้นเมื่อแก้ qty ของ
 * location หรือเพิ่ม/ลบ location ค่าระดับ item จะค้างค่าเดิมจาก detailToItem ทำให้
 * payload ที่ส่งไปขัดกับ locations เรียกฟังก์ชันนี้กับทุก item ก่อน buildPoPayload
 *
 * สูตรตรงกับ detailToItem และ step-summary.tsx (display): qty = Σ locations.order_qty
 */
export function recomputeItemFromLocations(
  item: FromPriceListSelectedItem,
): FromPriceListSelectedItem {
  const orderQty = item.locations.reduce(
    (sum, l) => sum + (Number(l.order_qty) || 0),
    0,
  );
  const factor = item.order_unit_conversion_factor || 1;
  const subTotal = round2(orderQty * item.price);
  const taxAmount = round2((subTotal * (item.tax_rate ?? 0)) / 100);
  return {
    ...item,
    order_qty: orderQty,
    base_qty: round2(orderQty * factor),
    sub_total_price: subTotal,
    net_amount: subTotal,
    tax_amount: taxAmount,
    total_price: round2(subTotal + taxAmount),
  };
}
