"use no memo";

import { useWatch, type UseFormReturn, type Control } from "react-hook-form";
import { memo } from "react";
import { useTranslations } from "use-intl";
import { InputQty } from "@/components/ui/input/input-qty";
import { useQuantityFormatter } from "@/hooks/use-number-formatter";
import type { PrFormValues } from "../pr-form-schema";
import { useIsRowLocked, WatchedProductUnit } from "./helpers";

export const FocCell = memo(function FocCell({
  control,
  form,
  index,
  isQtyDisabled,
  isUnitDisabled,
}: {
  control: Control<PrFormValues>;
  form: UseFormReturn<PrFormValues>;
  index: number;
  isQtyDisabled: boolean;
  isUnitDisabled: boolean;
}) {
  const tfl = useTranslations("field");
  const qty = useWatch({ control, name: `items.${index}.foc_qty` });
  const isRowLocked = useIsRowLocked(control, index);
  const qtyDisabled = isQtyDisabled || isRowLocked;
  const unitDisabled = isUnitDisabled || isRowLocked;
  const formatQty = useQuantityFormatter();

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex h-7 items-center justify-end">
        {qtyDisabled ? (
          <p className="text-xs font-medium tabular-nums">
            {qty === null ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              formatQty(qty)
            )}
          </p>
        ) : (
          <InputQty
            min={0}
            placeholder={tfl("qty")}
            className="h-7 w-full text-right text-xs"
            defaultValue={qty ?? undefined}
            {...form.register(`items.${index}.foc_qty`)}
            onChange={(e) => {
              const n = e.target.valueAsNumber;
              form.setValue(
                `items.${index}.foc_qty`,
                Number.isNaN(n) ? 0 : n,
                { shouldDirty: true, shouldValidate: true },
              );
            }}
          />
        )}
      </div>
      <WatchedProductUnit
        control={control}
        index={index}
        unitField="foc_unit_id"
        isDisabled={unitDisabled}
      />
    </div>
  );
});
