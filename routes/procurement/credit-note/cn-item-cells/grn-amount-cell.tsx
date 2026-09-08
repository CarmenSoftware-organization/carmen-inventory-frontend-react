import { useWatch, type Control } from "react-hook-form";
import { formatCurrency } from "@/lib/currency-utils";
import type { CnFormValues } from "../cn-form-schema";

/** ยอดฝั่ง GRN ช่องหนึ่ง — อ่านอย่างเดียว (ไม่เข้า payload) */
export function GrnAmountCell({
  control,
  index,
  field,
}: {
  control: Control<CnFormValues>;
  index: number;
  field:
    | "_grn_price"
    | "_grn_sub_total"
    | "_grn_discount_amount"
    | "_grn_net_amount"
    | "_grn_tax_amount"
    | "_grn_total_amount";
}) {
  "use no memo";
  const value = useWatch({ control, name: `items.${index}.${field}` });
  return (
    <span className="text-muted-foreground text-xs tabular-nums">
      {formatCurrency(Number(value) || 0)}
    </span>
  );
}
