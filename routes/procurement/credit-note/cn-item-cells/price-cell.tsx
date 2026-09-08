import { useWatch, type Control } from "react-hook-form";
import { InputSuffixPlain } from "@/components/ui/input/input-suffix";
import { formatCurrency } from "@/lib/currency-utils";
import type { CnFormValues } from "../cn-form-schema";

/** Price — plain text เสมอ (ล็อกจาก GRN) */
export function PriceCell({
  control,
  index,
}: {
  control: Control<CnFormValues>;
  index: number;
}) {
  "use no memo";
  const price = useWatch({ control, name: `items.${index}.unit_price` });
  return (
    <InputSuffixPlain
      className="w-full"
      value={formatCurrency(Number(price) || 0)}
    />
  );
}
