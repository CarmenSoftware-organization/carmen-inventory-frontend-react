import {
  Controller,
  useWatch,
  type UseFormReturn,
  type Control,
} from "react-hook-form";
import { memo } from "react";
import { LookupDeliveryPoint } from "@/components/lookup/lookup-delivery-point";
import type { PrFormValues } from "../pr-form-schema";
import { useIsRowLocked } from "./helpers";

export const DeliveryPointCell = memo(function DeliveryPointCell({
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
  const dpName =
    useWatch({ control, name: `items.${index}.delivery_point_name` }) ?? "";
  const isRowLocked = useIsRowLocked(control, index);
  if (isDisabled || isRowLocked) {
    return (
      <p className="text-xs font-semibold">
        {dpName || <span className="text-muted-foreground">—</span>}
      </p>
    );
  }

  return (
    <Controller
      control={control}
      name={`items.${index}.delivery_point_id`}
      render={({ field }) => (
        <LookupDeliveryPoint
          value={field.value ?? ""}
          onValueChange={field.onChange}
          onItemChange={(item) => {
            form.setValue(`items.${index}.delivery_point_name`, item.name);
          }}
          className="h-8 w-full text-xs"
        />
      )}
    />
  );
});
