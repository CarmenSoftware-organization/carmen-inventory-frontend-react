"use no memo";

import {
  Controller,
  useWatch,
  type UseFormReturn,
  type Control,
} from "react-hook-form";
import { memo, useMemo } from "react";
import { LookupCurrency } from "@/components/lookup/lookup-currency";
import { useCurrency } from "@/hooks/use-currency";
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
  const currencyId =
    useWatch({ control, name: `items.${index}.currency_id` }) ?? "";
  const isRowLocked = useIsRowLocked(control, index);
  const { data } = useCurrency({ perpage: 30 });
  const selected = useMemo(
    () => data?.data?.find((c) => c.id === currencyId),
    [data?.data, currencyId],
  );
  if (isDisabled || isRowLocked) {
    return (
      <p className="text-xs font-medium">
        {selected ? (
          selected.code
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </p>
    );
  }

  return (
    <Controller
      control={control}
      name={`items.${index}.currency_id`}
      render={({ field }) => (
        <LookupCurrency
          value={field.value ?? ""}
          onValueChange={field.onChange}
          onItemChange={(currency) => {
            form.setValue(`items.${index}.currency_code`, currency.code);
            form.setValue(
              `items.${index}.currency_decimal_places`,
              currency.decimal_places ?? 2,
            );
          }}
          className="w-full text-xs"
        />
      )}
    />
  );
});
