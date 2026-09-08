/** 1 product group = 1 แถวใน DataGrid (product + N location indices) */
export interface GrnGroup {
  key: string;
  productName: string;
  isManual: boolean;
  indices: number[];
}

export type GrnQtyField = "approved_qty" | "received_qty" | "foc_qty";
export type GrnUnitField =
  "approved_unit_id" | "received_unit_id" | "foc_unit_id";
export type GrnAmountField =
  "net_amount" | "discount_amount" | "tax_amount" | "total_price";
