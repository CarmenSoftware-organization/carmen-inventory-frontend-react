import { comboColWidth } from "../combo-col-width";

/**
 * คอลัมน์จำนวน (order / received / foc)
 *
 * โหมดแก้ไขมีช่องกรอกคู่กับตัวเลือกหน่วย โหมดอ่านเหลือแค่ตัวเลขกับชื่อหน่วย
 * จึงไม่ต้องกว้างเท่ากัน
 */
const QTY_COL = 120;
const QTY_COL_READ_ONLY = 80;

/**
 * ความกว้าง (px) ของคอลัมน์ item table ของ GRN — ใช้ร่วมกันระหว่าง group row
 * (product summary, main DataGrid) และ location rows (GrnGroupLocations) เพื่อให้
 * คอลัมน์ align กัน ทั้งสองเป็น table-fixed w-full → กว้างตามสัดส่วนของค่าเหล่านี้
 *
 * discount/tax เป็นคอลัมน์ combo เดียว (rate/amount + override) — group row โชว์
 * ยอดรวม, location row โชว์ combo แก้ได้ · ความกว้างของสองคอลัมน์นี้มาจาก
 * `combo-col-width` ที่ใช้ร่วมกับ PO เพราะเป็น control ชุดเดียวกัน
 *
 * order เป็นคอลัมน์เงื่อนไข (isPo เท่านั้น) → ผลรวมความกว้างจึงเป็นฟังก์ชัน
 * ไม่ใช่ค่าคงที่ ให้ group row (DataGrid col size) กับ location table (colgroup %)
 * ตรงกันทั้งโหมด manual และ PO
 */
export function grnItemCols(isPo: boolean, editable: boolean) {
  const col = {
    product: 200,
    /** หน่วยนับของสินค้า (มาจาก master ไม่ใช่หน่วยที่รับ) — โชว์อย่างเดียว */
    unit: 76,
    order: editable ? QTY_COL : QTY_COL_READ_ONLY, // isPo เท่านั้น
    received: editable ? QTY_COL : QTY_COL_READ_ONLY,
    foc: editable ? QTY_COL : QTY_COL_READ_ONLY,
    price: 100,
    sub: 92,
    discount: comboColWidth("discount", editable),
    net: 92,
    tax: comboColWidth("tax", editable),
    amt: 104,
    action: 64, // group row = add-location + delete (2 ปุ่ม); location row = delete
  } as const;

  /** ผลรวมความกว้างของ data columns (product → amt) — ไม่รวม action */
  const dataTotal =
    col.product +
    col.unit +
    (isPo ? col.order : 0) +
    col.received +
    col.foc +
    col.price +
    col.sub +
    col.discount +
    col.net +
    col.tax +
    col.amt;

  return { col, dataTotal };
}
