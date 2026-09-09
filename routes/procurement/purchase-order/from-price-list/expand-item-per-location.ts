import { round2 } from "@/lib/currency-utils";
import type { FromPriceListSelectedItem } from "./from-price-list-form-schema";

/**
 * กาง item ของ wizard (1 สินค้า เลือกได้หลายคลัง) ออกเป็น item ของ PO ทีละคลัง
 *
 * **แถวหนึ่งของ PO = คลังเดียว** ตั้งแต่ backend เลิก group location ส่วน wizard
 * ยังให้เลือกหลายคลังในการ์ดใบเดียวได้อยู่ เพราะเป็นเรื่องของ *การเลือก* ไม่ใช่
 * โครงข้อมูล — จุดแปลงคือตรงนี้ที่เดียว
 *
 * ของเดิมชื่อ `recomputeItemFromLocations` และ **บวก** qty ทุกคลังรวมเป็นแถวเดียว
 * (`qty = Σ locations.order_qty`) แล้วส่ง `locations[]` ไปด้วย ตอนนี้คลังไหนก็แถว
 * ของคลังนั้น ยอดจึงคิดจาก qty ของคลังเดียว ไม่มีการบวกข้ามคลังอีก
 *
 * คลังที่ยังไม่ได้เลือก (`id` ว่าง) ถูกตัดทิ้ง — การ์ดที่ไม่ได้เลือกคลังเลยจะไม่
 * ผลิตแถวใด ๆ ซึ่งตรงกับ `canProceed` ของ step ที่บังคับให้เลือกคลังก่อนอยู่แล้ว
 */
export function expandItemPerLocation(
  item: FromPriceListSelectedItem,
): FromPriceListSelectedItem[] {
  const factor = item.order_unit_conversion_factor || 1;
  return (item.locations ?? [])
    .filter((loc) => !!loc.id)
    .map((loc) => {
      const orderQty = Number(loc.order_qty) || 0;
      const subTotal = round2(orderQty * item.price);
      const taxAmount = round2((subTotal * (item.tax_rate ?? 0)) / 100);
      return {
        ...item,
        location_id: loc.id,
        location_code: loc.location_code ?? "",
        location_name: loc.location_name ?? "",
        order_qty: orderQty,
        base_qty: round2(orderQty * factor),
        sub_total_price: subTotal,
        net_amount: subTotal,
        tax_amount: taxAmount,
        total_price: round2(subTotal + taxAmount),
      };
    });
}
