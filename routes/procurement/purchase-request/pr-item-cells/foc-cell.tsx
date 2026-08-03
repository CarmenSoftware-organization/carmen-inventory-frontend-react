import { useWatch, type UseFormReturn, type Control } from "react-hook-form";
import { memo } from "react";
import { useTranslations } from "use-intl";
import {
  InputSuffixAddon,
  InputSuffixField,
  InputSuffixQty,
} from "@/components/ui/input/input-suffix";
import { useQuantityFormatter } from "@/hooks/use-number-formatter";
import { useUnitDecimals } from "@/hooks/use-product-units";
import type { PrFormValues } from "../pr-form-schema";
import { useIsRowLocked, WatchedProductUnit, QtyUnitPlain } from "./helpers";

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
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";
  const unitId =
    useWatch({ control, name: `items.${index}.foc_unit_id` }) ?? "";
  // ทศนิยมที่กรอกได้มาจาก decimal_place ของหน่วยที่เลือก (master data)
  const decimals = useUnitDecimals(productId, unitId);

  if (qtyDisabled && unitDisabled) {
    return (
      <QtyUnitPlain
        control={control}
        index={index}
        unitField="foc_unit_id"
        value={
          qty === null ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            formatQty(qty)
          )
        }
      />
    );
  }

  return (
    <InputSuffixField className="w-full" disabled={qtyDisabled}>
      <InputSuffixQty
        decimals={decimals}
        placeholder={tfl("qty")}
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
      <InputSuffixAddon>
        <WatchedProductUnit
          control={control}
          index={index}
          unitField="foc_unit_id"
          isDisabled={unitDisabled}
        />
      </InputSuffixAddon>
    </InputSuffixField>
  );
});
