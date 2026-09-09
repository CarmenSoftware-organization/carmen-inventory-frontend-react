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
import { NameWithSubtext } from "@/components/share/name-with-sub-text";
import { fieldFocusRef } from "@/lib/field-focus";
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
      // จุดสถานะอยู่ **นอก** stack สองบรรทัด จัดกลางเทียบทั้งก้อน — โครงเดียวกับ
      // คอลัมน์ Product ข้าง ๆ เป๊ะ ระยะชื่อ→code จึงมาจาก NameWithSubtext ตัวเดียว
      // ไม่ต้องตรึง min-h ให้เท่ากันด้วยมืออีกต่อไป
      <div className="flex items-center gap-1.5">
        <div className="min-w-0 flex-1">
          <NameWithSubtext
            primary={locationName || "—"}
            secondary={locationCode}
          />
        </div>
        {statusSlot}
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
                      // คลังที่ไม่มี delivery point ต้องล้างของเดิมทิ้ง ไม่ใช่
                      // ปล่อยค้าง — ไม่งั้นแถวนี้แบก delivery point ของคลังก่อน
                      // หน้าไปกับใบโดยไม่มีใครเห็น
                      form.setValue(
                        `items.${index}.delivery_point_id`,
                        location.delivery_point?.id ?? null,
                      );
                      form.setValue(
                        `items.${index}.delivery_point_name`,
                        location.delivery_point?.name ?? "",
                      );
                    }}
                    nextFocusRef={fieldFocusRef(`items.${index}.requested_qty`)}
                    className="h-8 w-full text-xs"
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
                      <p className="text-foreground/60 text-micro font-semibold">
                        {locationCode}
                      </p>
                      <p className="text-xs leading-snug font-semibold">
                        {locationName}
                      </p>
                    </div>
                    {(locationType || deliveryPointName) && (
                      <div className="text-micro mt-2 flex items-center gap-2 border-t pt-2">
                        {locationType && (
                          <Badge
                            size="xs"
                            variant={
                              LOCATION_TYPE_VARIANT[locationType] ?? "secondary"
                            }
                            className="text-micro-legal h-4 px-1.5"
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
