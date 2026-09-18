import { type UseFormReturn } from "react-hook-form";
import { formatCurrency } from "@/lib/currency-utils";
import type { CnFormValues } from "../cn-form-schema";
import type { CnCreditNoteType } from "../cn-item-compute";
import { useCnItemLine } from "./helpers";

export function LineSubtotalText({
  form,
  index,
  type,
}: {
  form: UseFormReturn<CnFormValues>;
  index: number;
  type: CnCreditNoteType;
}) {
  "use no memo";
  const line = useCnItemLine(form, index, type);
  return (
    <span className="text-foreground text-xs font-semibold tabular-nums">
      {formatCurrency(line.sub_total)}
    </span>
  );
}
