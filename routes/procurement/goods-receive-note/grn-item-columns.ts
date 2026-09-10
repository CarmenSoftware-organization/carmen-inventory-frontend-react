import { comboColWidth } from "../shared/combo-col-width";

/**
 * คอลัมน์จำนวน (order / received / foc)
 *
 * โหมดแก้ไขมีช่องกรอกคู่กับตัวเลือกหน่วย โหมดอ่านเหลือแค่ตัวเลขกับชื่อหน่วย
 * จึงไม่ต้องกว้างเท่ากัน
 */
const QTY_COL = 120;
const QTY_COL_READ_ONLY = 80;

/**
 * ความกว้าง (px) ของคอลัมน์ item table ของ GRN
 *
 * 1 แถว = 1 บรรทัดของเอกสาร (สินค้า + คลัง) ตารางเดียวจบ ไม่มีตารางซ้อนให้ต้อง
 * align กันอีกแล้ว ค่าพวกนี้จึงเป็น size ของ DataGrid ล้วน ๆ
 *
 * discount/tax มาจาก `combo-col-width` ที่ใช้ร่วมกับ PO เพราะเป็น control ชุดเดียวกัน
 */
export function grnItemCols(editable: boolean) {
  return {
    product: 200,
    /** ช่องเลือกคลังยาวกว่าชื่อคลัง โหมดอ่านจึงคืนที่ให้คอลัมน์อื่นได้ */
    location: editable ? 190 : 150,
    /** หน่วยนับของสินค้า (มาจาก master ไม่ใช่หน่วยที่รับ) — โชว์อย่างเดียว */
    unit: 76,
    /** จำนวนที่สั่ง — คอลัมน์เงื่อนไข มีเฉพาะใบที่อิง PO */
    order: editable ? QTY_COL : QTY_COL_READ_ONLY,
    received: editable ? QTY_COL : QTY_COL_READ_ONLY,
    foc: editable ? QTY_COL : QTY_COL_READ_ONLY,
    price: editable ? 110 : 100,
    sub: 92,
    discount: comboColWidth("discount", editable),
    net: 92,
    tax: comboColWidth("tax", editable),
    amt: 104,
    action: editable ? 64 : 48,
    /** ช่องเล็กหัวแถว (#) */
    leading: 40,
  } as const;
}
