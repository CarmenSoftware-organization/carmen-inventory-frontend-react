/**
 * ความกว้าง (px) ของคอลัมน์ combo ในตารางรายการเอกสารจัดซื้อ
 *
 * discount กับ tax ไม่ใช่ช่องตัวเลขเดียว แต่เป็นชุดควบคุมในช่องเดียว
 * (ปุ่ม override + ช่อง rate/โปรไฟล์ภาษี + ช่องยอด) — PO กับ GRN ใส่ control
 * ชุดเดียวกันเป๊ะ ความกว้างจึงต้องเท่ากัน วันไหนปรับ combo ก็ปรับที่นี่ที่เดียว
 *
 * โหมดอ่านอย่างเดียวไม่มี control เหลือแค่ยอดเดียว — กว้างเท่าคอลัมน์เงินอื่น
 * (sub/net/amt) พอ คืนที่ให้ชื่อสินค้ากับคอลัมน์อื่นไป
 *
 * ที่แชร์กันมีแค่สองค่านี้ ส่วนคอลัมน์อื่นแยกกันตามเดิม เพราะสองตารางมีชุด
 * คอลัมน์ไม่เหมือนกัน (GRN มี FOC ที่ PO ไม่มี · Order ของ GRN เป็นคอลัมน์
 * เงื่อนไข · ปุ่มใน action คนละจำนวน) และไม่เคยต้อง align ข้ามหน้ากันอยู่แล้ว
 */
export const COMBO_COL = {
  /** [override] rate% | amount */
  discount: 176,
  /** [override] tax-profile | amount */
  tax: 196,
  /** โหมดอ่าน — เท่าคอลัมน์เงินตัวเลขล้วน */
  readOnly: 96,
} as const;

/** ความกว้างคอลัมน์ combo ตามว่าแถวแก้ได้หรือไม่ */
export function comboColWidth(
  kind: "discount" | "tax",
  editable: boolean,
): number {
  return editable ? COMBO_COL[kind] : COMBO_COL.readOnly;
}
