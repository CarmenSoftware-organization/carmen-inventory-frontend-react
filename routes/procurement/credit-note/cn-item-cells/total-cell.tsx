import { useWatch, type Control } from "react-hook-form";
import { formatCurrency } from "@/lib/currency-utils";
import type { CnFormValues } from "../cn-form-schema";

/** ยอดรวม (plain text) */
export function TotalCell({
  control,
  index,
}: {
  control: Control<CnFormValues>;
  index: number;
}) {
  "use no memo";
  const v = useWatch({ control, name: `items.${index}.total_amount` });
  return (
    <span className="text-foreground text-xs font-semibold tabular-nums">
      {formatCurrency(Number(v) || 0)}
    </span>
  );
}
