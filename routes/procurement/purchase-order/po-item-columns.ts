/**
 * ความกว้าง (px) ของคอลัมน์ item table — ใช้ร่วมกันระหว่าง product row
 * (main DataGrid) และ location rows (LocationsEditor) เพื่อให้คอลัมน์ align กัน
 * ทั้งสองเป็น table-fixed w-full → กว้างตามสัดส่วนของค่าเหล่านี้
 *
 * discount/tax เป็นคอลัมน์ combo เดียว (rate+amount override) — product row โชว์
 * ยอดรวม, location row โชว์ combo แก้ได้ (ไม่ซ้ำ rate/amount แยกคอลัมน์)
 */

import { comboColWidth } from "../combo-col-width";

/** คอลัมน์เงินที่เป็นตัวเลขล้วน (sub/net/amt) กว้างเท่านี้พอ */
const MONEY_COL = 96;

/**
 * ความกว้างคอลัมน์ตามว่าแถว location แก้ได้หรือไม่
 *
 * โหมดอ่านอย่างเดียวไม่มี combo (ปุ่ม override + ช่อง rate + ช่องยอด) เหลือแค่
 * ตัวเลขยอดเดียว discount/tax จึงไม่ต้องกว้างเท่าโหมดแก้ไข — คืนที่ให้ชื่อสินค้า
 * กับคอลัมน์อื่นไป
 *
 * @param editable - แถว location แก้ได้ไหม (`!disabled && !readOnly`)
 */
export function poItemCols(editable: boolean) {
  const col = {
    product: 200,
    /** หน่วยสั่งซื้อ — เป็น lookup เลือกได้ จึงกว้างกว่าคอลัมน์ตัวเลข */
    unit: 88,
    order: 96,
    rec: 104, // "Received Qty" เต็มคำ ไม่ใช่ "Rec"
    price: 92,
    sub: MONEY_COL,
    discount: comboColWidth("discount", editable),
    net: MONEY_COL,
    tax: comboColWidth("tax", editable),
    amt: 100,
    action: 48,
  } as const;

  /** ผลรวมความกว้างของ data columns (product → amt) — ไม่รวม action */
  const dataTotal =
    col.product +
    col.unit +
    col.order +
    col.rec +
    col.price +
    col.sub +
    col.discount +
    col.net +
    col.tax +
    col.amt;

  return { col, dataTotal };
}
