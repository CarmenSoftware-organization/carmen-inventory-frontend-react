import {
  Controller,
  useWatch,
  type UseFormReturn,
  type Control,
} from "react-hook-form";
import { memo, type ReactNode } from "react";
import { useTranslations } from "use-intl";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { LookupUserLocation } from "@/components/lookup/lookup-user-location";
import { useUserLocation } from "@/hooks/use-user-location";
import { inventoryTypeLabelKey } from "@/constant/location";
import type { PrFormValues } from "../pr-form-schema";
import { LOCATION_TYPE_VARIANT, useIsRowLocked } from "./helpers";

export const LocationCell = memo(function LocationCell({
  control,
  form,
  index,
  isDisabled,
  statusSlot,
}: {
  control: Control<PrFormValues>;
  form: UseFormReturn<PrFormValues>;
  index: number;
  isDisabled: boolean;
  /** badge สถานะ (StatusCell) — วางบรรทัดล่างคู่กับ location code */
  statusSlot?: ReactNode;
}) {
  "use no memo";
  const tl = useTranslations("config.location");
  const locationId =
    useWatch({ control, name: `items.${index}.location_id` }) ?? "";
  const locationCode =
    useWatch({ control, name: `items.${index}.location_code` }) ?? "";
  const locationName =
    useWatch({ control, name: `items.${index}.location_name` }) ?? "";
  const storedType =
    useWatch({ control, name: `items.${index}.location_type` }) ?? "";
  const deliveryPointName =
    useWatch({ control, name: `items.${index}.delivery_point_name` }) ?? "";
  const isRowLocked = useIsRowLocked(control, index);

  // Resolve location_type from cached user locations when API doesn't provide it
  const { data: locationsData } = useUserLocation({ perpage: -1 });

  const locationType = (() => {
    if (storedType) return storedType;
    if (!locationId || !locationsData?.data) return "";
    const found = locationsData.data.find((l) => l.id === locationId);
    return found?.location_type ?? "";
  })();

  const hasLocation = !!(locationCode || locationName);

  if (isDisabled || isRowLocked) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex min-w-0 items-center justify-between gap-1.5">
          <p className="min-w-0 truncate text-xs font-semibold">
            {locationName || <span className="text-muted-foreground">—</span>}
          </p>
          {statusSlot}
        </div>
        <span className="text-muted-foreground truncate text-[0.625rem]">
          {locationCode}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-1.5">
      <div className="min-w-0 flex-1">
        <Controller
          control={control}
          name={`items.${index}.location_id`}
          render={({ field }) => (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <LookupUserLocation
                    value={field.value ?? ""}
                    disableTooltip
                    error={
                      form.formState.errors.items?.[index]?.location_id?.message
                    }
                    onValueChange={(value) => {
                      field.onChange(value);
                    }}
                    onItemChange={(location) => {
                      form.setValue(
                        `items.${index}.location_code`,
                        location.code,
                      );
                      form.setValue(
                        `items.${index}.location_name`,
                        location.name,
                      );
                      form.setValue(
                        `items.${index}.location_type`,
                        location.location_type,
                      );
                      if (location.delivery_point) {
                        form.setValue(
                          `items.${index}.delivery_point_id`,
                          location.delivery_point.id,
                        );
                        form.setValue(
                          `items.${index}.delivery_point_name`,
                          location.delivery_point.name,
                        );
                      }
                    }}
                    className="h-7 w-full text-xs"
                    popoverWidth="w-[26.25rem]"
                    defaultLabel={locationName}
                  />
                </TooltipTrigger>
                {hasLocation && (
                  <TooltipContent
                    side="top"
                    className="bg-popover text-popover-foreground [&>svg]:fill-popover [&>svg]:text-border max-w-[20rem] rounded-lg border px-3 py-2 shadow-md"
                  >
                    <div className="space-y-1">
                      <p className="text-foreground/60 text-[0.6875rem] font-semibold">
                        {locationCode}
                      </p>
                      <p className="text-xs leading-snug font-semibold">
                        {locationName}
                      </p>
                    </div>
                    {(locationType || deliveryPointName) && (
                      <div className="mt-2 flex items-center gap-2 border-t pt-2 text-[0.6875rem]">
                        {locationType && (
                          <Badge
                            size="xs"
                            variant={
                              LOCATION_TYPE_VARIANT[locationType] ?? "secondary"
                            }
                            className="h-4 px-1.5 text-[0.625rem]"
                          >
                            {(() => {
                              const k = inventoryTypeLabelKey(locationType);
                              return k ? tl(k) : locationType.toUpperCase();
                            })()}
                          </Badge>
                        )}
                      </div>
                    )}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
        />
      </div>
      {statusSlot}
    </div>
  );
});
