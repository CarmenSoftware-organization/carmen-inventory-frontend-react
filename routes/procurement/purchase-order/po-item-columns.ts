/**
 * ความกว้าง (px) ของคอลัมน์ item table — ใช้ร่วมกันระหว่าง product row
 * (main DataGrid) และ location rows (LocationsEditor) เพื่อให้คอลัมน์ align กัน
 * ทั้งสองเป็น table-fixed w-full → กว้างตามสัดส่วนของค่าเหล่านี้
 *
 * discount/tax เป็นคอลัมน์ combo เดียว (rate+amount override) — product row โชว์
 * ยอดรวม, location row โชว์ combo แก้ได้ (ไม่ซ้ำ rate/amount แยกคอลัมน์)
 */
export const PO_COL = {
  product: 200,
  order: 96,
  rec: 80,
  price: 92,
  sub: 96,
  discount: 176, // combo: [override] rate% | amount
  net: 96,
  tax: 196, // combo: [override] tax-profile | amount
  amt: 100,
  action: 48,
} as const;

/** ผลรวมความกว้างของ data columns (product → amt) — ไม่รวม action */
export const PO_COL_DATA_TOTAL =
  PO_COL.product +
  PO_COL.order +
  PO_COL.rec +
  PO_COL.price +
  PO_COL.sub +
  PO_COL.discount +
  PO_COL.net +
  PO_COL.tax +
  PO_COL.amt;
