import { useWatch, type Control } from "react-hook-form";
import { memo } from "react";
import { formatCurrency, round2 } from "@/lib/currency-utils";
import type { PrFormValues } from "../pr-form-schema";

export const AmountCell = memo(function AmountCell({
  control,
  index,
  baseCurrencyCode,
}: {
  control: Control<PrFormValues>;
  index: number;
  baseCurrencyCode?: string;
}) {
  "use no memo";
  const totalPrice =
    useWatch({ control, name: `items.${index}.total_price` }) ?? 0;
  const exchangeRate =
    useWatch({ control, name: `items.${index}.exchange_rate` }) ?? 1;
  const currencyCode =
    useWatch({ control, name: `items.${index}.currency_code` }) ?? "";
  const isForeignCurrency =
    !!currencyCode && !!baseCurrencyCode && currencyCode !== baseCurrencyCode;
  const baseAmount = round2(Number(totalPrice) * Number(exchangeRate));
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="font-semibold tabular-nums">
        {formatCurrency(Number(totalPrice))}
      </span>
      {isForeignCurrency && (
        <span className="text-muted-foreground text-[0.6875rem] tabular-nums">
          {formatCurrency(baseAmount)} {baseCurrencyCode}
        </span>
      )}
    </div>
  );
});
