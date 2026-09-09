import { comboColWidth } from "../shared/combo-col-width";
const MONEY_COL = 120;

export function poItemCols(editable: boolean) {
  const col = {
    // แถวหนึ่ง = คลังเดียว — คลังเลยขึ้นมาเป็นคอลัมน์ของแถว ไม่ได้อยู่ในตารางย่อย
    location: 180,
    product: 200,
    unit: 60,
    order: 140,
    rec: 140,
    price: MONEY_COL,
    sub: MONEY_COL,
    discount: comboColWidth("discount", editable),
    net: MONEY_COL,
    tax: comboColWidth("tax", editable),
    amt: MONEY_COL,
    action: 48,
  } as const;
  const dataTotal =
    col.location +
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
