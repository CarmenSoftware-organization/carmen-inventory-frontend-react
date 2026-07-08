import { useWatch, type UseFormReturn, type Control } from "react-hook-form";
import { memo } from "react";
import { LookupCurrency } from "@/components/lookup/lookup-currency";
import type { PrFormValues } from "../pr-form-schema";
import { useIsRowLocked } from "./helpers";

export const CurrencyCell = memo(function CurrencyCell({
  control,
  form,
  index,
  isDisabled,
}: {
  control: Control<PrFormValues>;
  form: UseFormReturn<PrFormValues>;
  index: number;
  isDisabled: boolean;
}) {
  "use no memo";
  const currencyId =
    useWatch({ control, name: `items.${index}.currency_id` }) ?? "";
  const currencyCode =
    useWatch({ control, name: `items.${index}.currency_code` }) ?? "";
  const isRowLocked = useIsRowLocked(control, index);

  if (isDisabled || isRowLocked) {
    return (
      <p className="text-xs font-semibold">
        {currencyCode || <span className="text-muted-foreground">—</span>}
      </p>
    );
  }

  return (
    <LookupCurrency
      value={currencyId}
      onValueChange={(id) =>
        // shouldValidate: ล้างกรอบแดง currency ทันทีที่เลือก
        form.setValue(`items.${index}.currency_id`, id, {
          shouldDirty: true,
          shouldValidate: true,
        })
      }
      onItemChange={(currency) => {
        form.setValue(`items.${index}.currency_code`, currency.code);
        form.setValue(
          `items.${index}.currency_decimal_places`,
          currency.decimal_places ?? 2,
        );
      }}
      disableTooltip
      size="sm"
      className="h-full rounded-none border-0 bg-transparent px-2 text-xs shadow-none hover:bg-transparent focus-visible:ring-0"
    />
  );
});
