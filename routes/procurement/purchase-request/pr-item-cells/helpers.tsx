import { Controller, useWatch, type Control } from "react-hook-form";
import { memo, useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LookupProductUnit } from "@/components/lookup/lookup-product-unit";
import { useProductUnits } from "@/hooks/use-product-units";
import { InventoryTooltip } from "@/components/ui/inventory-tooltip";
import { PR_ITEM_STAGE_STATUS } from "@/types/purchase-request";
import type { PrFormValues } from "../pr-form-schema";

export const STATUS_NORMALIZE: Record<string, string> = {
  approve: "approved",
  submit: "pending",
  reject: "rejected",
};

export const LOCATION_TYPE_VARIANT: Record<
  string,
  "info" | "warning" | "secondary"
> = {
  inventory: "info",
  direct: "warning",
  consignment: "secondary",
};

export function useIsRowLocked(
  control: Control<PrFormValues>,
  index: number,
): boolean {
  "use no memo";
  const currentStageStatus =
    useWatch({ control, name: `items.${index}.current_stage_status` }) ?? "";
  const initialStageStatus =
    useWatch({ control, name: `items.${index}._initial_stage_status` }) ?? "";
  const normalized = STATUS_NORMALIZE[currentStageStatus] ?? currentStageStatus;
  if (
    normalized !== PR_ITEM_STAGE_STATUS.APPROVED &&
    normalized !== PR_ITEM_STAGE_STATUS.REJECTED
  )
    return false;
  // Lock only if the status was already approve/reject on initial load (from server)
  const initialNormalized =
    STATUS_NORMALIZE[initialStageStatus] ?? initialStageStatus;
  return (
    initialNormalized === PR_ITEM_STAGE_STATUS.APPROVED ||
    initialNormalized === PR_ITEM_STAGE_STATUS.REJECTED
  );
}

export const InventoryTooltipCell = memo(function InventoryTooltipCell({
  control,
  index,
  buCode,
}: {
  control: Control<PrFormValues>;
  index: number;
  buCode?: string;
}) {
  "use no memo";
  const locationId =
    useWatch({ control, name: `items.${index}.location_id` }) ?? "";
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";
  const unitName =
    useWatch({ control, name: `items.${index}.requested_unit_name` }) ?? "";

  return (
    <InventoryTooltip
      buCode={buCode}
      locationId={locationId}
      productId={productId}
      unitName={unitName}
      icon="package"
      className={productId ? "text-primary" : "text-muted-foreground"}
    />
  );
});

export const WatchedProductUnit = memo(function WatchedProductUnit({
  control,
  index,
  unitField,
  isDisabled,
  onExtraChange,
}: {
  control: Control<PrFormValues>;
  index: number;
  unitField: "requested_unit_id" | "approved_unit_id" | "foc_unit_id";
  isDisabled: boolean;
  onExtraChange?: (value: string) => void;
}) {
  "use no memo";
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";
  const unitId =
    useWatch({ control, name: `items.${index}.${unitField}` }) ?? "";
  const { data: units = [] } = useProductUnits(productId || undefined);
  const selectedUnit = useMemo(
    () => units.find((u) => u.id === unitId),
    [units, unitId],
  );

  if (isDisabled) {
    return (
      <p className="text-muted-foreground text-right text-xs">
        {selectedUnit?.name || "—"}
      </p>
    );
  }

  return (
    <Controller
      control={control}
      name={`items.${index}.${unitField}`}
      render={({ field }) => (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <LookupProductUnit
                  productId={productId}
                  value={field.value ?? ""}
                  disableTooltip
                  onValueChange={(value) => {
                    field.onChange(value);
                    onExtraChange?.(value);
                  }}
                  className="h-7 w-full text-xs"
                />
              </div>
            </TooltipTrigger>
            {selectedUnit && (
              <TooltipContent
                side="top"
                className="bg-popover text-popover-foreground [&>svg]:fill-popover [&>svg]:text-border rounded-lg border px-3 py-2 shadow-md"
              >
                <p className="text-xs font-semibold">{selectedUnit.name}</p>
                {selectedUnit.conversion !== 1 && (
                  <p className="text-foreground/60 text-[0.6875rem]">
                    1 = {selectedUnit.conversion} base
                  </p>
                )}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      )}
    />
  );
});
