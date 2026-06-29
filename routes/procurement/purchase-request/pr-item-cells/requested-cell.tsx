import { useWatch, type UseFormReturn, type Control } from "react-hook-form";
import { memo } from "react";
import { useTranslations } from "use-intl";
import { InputQty } from "@/components/ui/input/input-qty";
import { useQuantityFormatter } from "@/hooks/use-number-formatter";
import type { PrFormValues } from "../pr-form-schema";
import { useIsRowLocked, WatchedProductUnit } from "./helpers";

export const RequestedCell = memo(function RequestedCell({
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
  const tfl = useTranslations("field");
  const qty = useWatch({ control, name: `items.${index}.requested_qty` });
  const isRowLocked = useIsRowLocked(control, index);
  const isFieldDisabled = isDisabled || isRowLocked;
  const formatQty = useQuantityFormatter();

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex h-7 items-center justify-end">
        {isFieldDisabled ? (
          <p className="text-xs font-semibold tabular-nums">
            {qty === null ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              formatQty(qty)
            )}
          </p>
        ) : (
          <InputQty
            min={1}
            placeholder={tfl("qty")}
            className="h-7 w-full text-right text-xs"
            aria-invalid={!!form.formState.errors.items?.[index]?.requested_qty}
            defaultValue={qty ?? undefined}
            {...form.register(`items.${index}.requested_qty`)}
            onChange={(e) => {
              const n = e.target.valueAsNumber;
              form.setValue(
                `items.${index}.requested_qty`,
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
        unitField="requested_unit_id"
        isDisabled={isFieldDisabled}
        onExtraChange={
          isFieldDisabled
            ? undefined
            : (value) => {
                form.setValue(`items.${index}.foc_unit_id`, value);
                form.setValue(`items.${index}.approved_unit_id`, value);
              }
        }
      />
    </div>
  );
});
