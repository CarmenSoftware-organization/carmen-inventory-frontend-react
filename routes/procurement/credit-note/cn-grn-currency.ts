import type { GoodsReceiveNote } from "@/types/goods-receive-note";

/**
 * id สกุลเงินของ GRN ที่ใบลดหนี้อ้าง — รับได้ทั้งรูป object (`currency.id`) และรูปแบน (`currency_id`)
 *
 * ช่อง Currency ของหน้า CN ล็อกตาม GRN ผู้ใช้แก้เองไม่ได้ ค่าจึงมาจากแถวของ lookup GRN
 * อย่างเดียว เดิมอ่านแค่ `currency.id` แต่ endpoint `vendor/:vendor_id/cn` ส่ง `currency_id`
 * แบบแบน (ไม่ collapse เหมือน list ตัวอื่น) currency เลยว่างทุกครั้ง แล้ว gateway ตีกลับ
 * `currency_id: Invalid UUID` — สร้าง CN จากหน้าจอไม่ได้เลยทุก BU (ตั้งแต่ 2026-09-17)
 * @returns id สกุลเงิน หรือ "" ถ้า GRN ไม่มีสกุลเงิน
 */
export function grnCurrencyId(grn: Pick<GoodsReceiveNote, "currency" | "currency_id">): string {
  return grn.currency?.id ?? grn.currency_id ?? "";
}
