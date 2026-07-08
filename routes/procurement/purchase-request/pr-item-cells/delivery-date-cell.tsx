import { Controller, useWatch, type Control } from "react-hook-form";
import { memo } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { formatDate } from "@/lib/date-utils";
import type { PrFormValues } from "../pr-form-schema";
import { useIsRowLocked } from "./helpers";

export const DeliveryDateCell = memo(function DeliveryDateCell({
  control,
  index,
  isDisabled,
  today,
  dateFormat,
}: {
  control: Control<PrFormValues>;
  index: number;
  isDisabled: boolean;
  today: Date;
  dateFormat: string;
}) {
  "use no memo";
  const value = useWatch({ control, name: `items.${index}.delivery_date` });
  const isRowLocked = useIsRowLocked(control, index);

  if (isDisabled || isRowLocked) {
    return (
      <p className="text-xs font-semibold">
        {value ? (
          formatDate(value, dateFormat)
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </p>
    );
  }

  return (
    <Controller
      control={control}
      name={`items.${index}.delivery_date`}
      render={({ field }) => (
        <DatePicker
          value={field.value}
          onValueChange={field.onChange}
          fromDate={today}
          className="w-full text-xs"
        />
      )}
    />
  );
});
