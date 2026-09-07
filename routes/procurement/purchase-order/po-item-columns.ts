import { comboColWidth } from "../shared/combo-col-width";
const MONEY_COL = 96;

export function poItemCols(editable: boolean) {
  const col = {
    product: 200,
    unit: 100,
    order: 100,
    rec: 100,
    price: 100,
    sub: MONEY_COL,
    discount: comboColWidth("discount", editable),
    net: MONEY_COL,
    tax: comboColWidth("tax", editable),
    amt: 100,
    action: 48,
  } as const;
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
