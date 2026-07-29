/**
 * ความกว้าง (px) ของคอลัมน์ item table ของ GRN — ใช้ร่วมกันระหว่าง group row
 * (product summary, main DataGrid) และ location rows (GrnGroupLocations) เพื่อให้
 * คอลัมน์ align กัน ทั้งสองเป็น table-fixed w-full → กว้างตามสัดส่วนของค่าเหล่านี้
 *
 * discount/tax เป็นคอลัมน์ combo เดียว (rate/amount + override) — group row โชว์
 * ยอดรวม, location row โชว์ combo แก้ได้ (mirror PO)
 *
 * order เป็นคอลัมน์เงื่อนไข (isPo เท่านั้น) → ใช้ grnColDataTotal(isPo) คำนวณ
 * ผลรวมความกว้างให้ group row (DataGrid col size) กับ location table (colgroup %)
 * ตรงกันทั้งโหมด manual และ PO
 */
export const GRN_COL = {
  product: 220,
  order: 128, // isPo เท่านั้น
  received: 128,
  foc: 128,
  price: 100,
  sub: 92,
  discount: 176, // combo: [override] rate% | amount
  net: 92,
  tax: 196, // combo: [override] tax-profile | amount
  amt: 104,
  action: 64, // group row = add-location + delete (2 ปุ่ม); location row = delete
} as const;

/**
 * ผลรวมความกว้างของ data columns (product → amt) — ไม่รวม action
 * order นับเฉพาะเมื่อ isPo (คอลัมน์เงื่อนไข)
 */
export function grnColDataTotal(isPo: boolean): number {
  return (
    GRN_COL.product +
    (isPo ? GRN_COL.order : 0) +
    GRN_COL.received +
    GRN_COL.foc +
    GRN_COL.price +
    GRN_COL.sub +
    GRN_COL.discount +
    GRN_COL.net +
    GRN_COL.tax +
    GRN_COL.amt
  );
}
