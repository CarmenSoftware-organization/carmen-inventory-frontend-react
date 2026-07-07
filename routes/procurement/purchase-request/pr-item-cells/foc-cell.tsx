import { useWatch, type UseFormReturn, type Control } from "react-hook-form";
import { memo } from "react";
import { useTranslations } from "use-intl";
import { InputGroupQty } from "@/components/ui/input/input-group-qty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
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
  "use no memo";
  const tfl = useTranslations("field");
  const qty = useWatch({ control, name: `items.${index}.foc_qty` });
  const isRowLocked = useIsRowLocked(control, index);
  const qtyDisabled = isQtyDisabled || isRowLocked;
  const unitDisabled = isUnitDisabled || isRowLocked;
  const formatQty = useQuantityFormatter();

  const qtyText =
    qty === null ? (
      <span className="text-muted-foreground">—</span>
    ) : (
      formatQty(qty)
    );

  if (qtyDisabled && unitDisabled) {
    return (
      <div className="flex h-7 items-center justify-end gap-1.5">
        <span className="text-xs font-semibold tabular-nums">{qtyText}</span>
        <WatchedProductUnit
          control={control}
          index={index}
          unitField="foc_unit_id"
          isDisabled
        />
      </div>
    );
  }

  return (
    <InputGroup className="h-7 w-full">
      {qtyDisabled ? (
        <InputGroupInput
          readOnly
          tabIndex={-1}
          value={qty === null ? "—" : formatQty(qty)}
          className="h-7 cursor-default text-right font-semibold tabular-nums"
        />
      ) : (
        <InputGroupQty
          min={0}
          placeholder={tfl("qty")}
          className="h-7 text-right"
          defaultValue={qty ?? undefined}
          {...form.register(`items.${index}.foc_qty`)}
          onChange={(e) => {
            const n = e.target.valueAsNumber;
            form.setValue(`items.${index}.foc_qty`, Number.isNaN(n) ? 0 : n, {
              shouldDirty: true,
              shouldValidate: true,
            });
          }}
        />
      )}
      <InputGroupAddon align="inline-end">
        <WatchedProductUnit
          control={control}
          index={index}
          unitField="foc_unit_id"
          isDisabled={unitDisabled}
        />
      </InputGroupAddon>
    </InputGroup>
  );
});
