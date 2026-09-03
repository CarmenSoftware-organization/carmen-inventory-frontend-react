import { useWatch, type Control } from "react-hook-form";
import { formatCurrency } from "@/lib/currency-utils";
import type { CnFormValues } from "../cn-form-schema";

/** Net — subtotal − discount (read-only) */
export function NetCell({
  control,
  index,
}: {
  control: Control<CnFormValues>;
  index: number;
}) {
  "use no memo";
  const net = useWatch({ control, name: `items.${index}.net_amount` });
  return (
    <span className="text-foreground text-xs font-semibold tabular-nums">
      {formatCurrency(Number(net) || 0)}
    </span>
  );
}
