import { type UseFormReturn } from "react-hook-form";
import { formatCurrency } from "@/lib/currency-utils";
import type { GrnFormValues } from "../grn-form-schema";
import { useGrnItemLine } from "./use-grn-item-line";

/** ยอดเงินของแถว (plain text) — honor override */
export function GrnAmountCell({
  form,
  index,
  field,
  bold,
}: {
  form: UseFormReturn<GrnFormValues>;
  index: number;
  field: "subtotal" | "netAmount" | "totalPrice";
  bold?: boolean;
}) {
  "use no memo";
  const line = useGrnItemLine(form, index);
  return (
    <span
      className={
        bold
          ? "text-foreground block text-right text-xs font-semibold tabular-nums"
          : "text-foreground block text-right text-xs font-medium tabular-nums"
      }
    >
      {formatCurrency(line[field])}
    </span>
  );
}
