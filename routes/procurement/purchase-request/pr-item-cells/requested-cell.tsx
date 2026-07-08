import { useWatch, type UseFormReturn, type Control } from "react-hook-form";
import { memo } from "react";
import { useTranslations } from "use-intl";
import { InputGroupQty } from "@/components/ui/input/input-group-qty";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
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
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";
  const isRowLocked = useIsRowLocked(control, index);
  // ยังไม่เลือกสินค้า → ปิด qty (กรอกจำนวนก่อนเลือกสินค้าไม่มีความหมาย) แสดง default 0
  const isFieldDisabled = isDisabled || isRowLocked || !productId;
  const formatQty = useQuantityFormatter();

  if (isFieldDisabled) {
    return (
      <div className="flex h-7 items-center justify-end gap-1.5">
        <span className="text-xs font-semibold tabular-nums">
          {formatQty(productId ? (qty ?? 0) : 0)}
        </span>
        <WatchedProductUnit
          control={control}
          index={index}
          unitField="requested_unit_id"
          isDisabled
        />
      </div>
    );
  }

  return (
    <InputGroup className="h-7 w-full">
      <InputGroupQty
        min={1}
        placeholder={tfl("qty")}
        className="h-7 text-right"
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
      <InputGroupAddon align="inline-end">
        <WatchedProductUnit
          control={control}
          index={index}
          unitField="requested_unit_id"
          isDisabled={false}
          onExtraChange={(value) => {
            form.setValue(`items.${index}.foc_unit_id`, value);
            form.setValue(`items.${index}.approved_unit_id`, value);
          }}
        />
      </InputGroupAddon>
    </InputGroup>
  );
});
