import {
  Controller,
  useWatch,
  type UseFormReturn,
  type Control,
} from "react-hook-form";
import { memo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LookupProductInLocation } from "@/components/lookup/lookup-product-in-location";
import type { PrFormValues } from "../pr-form-schema";
import { InventoryTooltipCell, useIsRowLocked } from "./helpers";

export const ProductCell = memo(function ProductCell({
  control,
  form,
  index,
  isDisabled,
  buCode,
}: {
  control: Control<PrFormValues>;
  form: UseFormReturn<PrFormValues>;
  index: number;
  isDisabled: boolean;
  buCode?: string;
}) {
  "use no memo";
  const locationId =
    useWatch({ control, name: `items.${index}.location_id` }) ?? "";
  const productCode =
    useWatch({ control, name: `items.${index}.product_code` }) ?? "";
  const productName =
    useWatch({ control, name: `items.${index}.product_name` }) ?? "";
  const productLocalName =
    useWatch({ control, name: `items.${index}.product_local_name` }) ?? "";
  const unitName =
    useWatch({ control, name: `items.${index}.requested_unit_name` }) ?? "";
  const isRowLocked = useIsRowLocked(control, index);
  if (isDisabled || isRowLocked) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-0.5">
          <p className="min-w-0 flex-1 truncate text-left text-xs font-semibold">
            {productName || <span className="text-muted-foreground">—</span>}
          </p>
          <InventoryTooltipCell control={control} index={index} buCode={buCode} />
        </div>
        <p className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
          {productLocalName || <span className="text-muted-foreground">—</span>}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      <Controller
        control={control}
        name={`items.${index}.product_id`}
        render={({ field }) => (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="min-w-0 flex-1">
                  <LookupProductInLocation
                    locationId={locationId}
                    value={field.value ?? ""}
                    disableTooltip
                    error={
                      form.formState.errors.items?.[index]?.product_id?.message
                    }
                    onValueChange={(value, product) => {
                      field.onChange(value);
                      if (product) {
                        form.setValue(
                          `items.${index}.product_code`,
                          product.code,
                        );
                        form.setValue(
                          `items.${index}.product_name`,
                          product.name,
                        );
                        form.setValue(
                          `items.${index}.product_local_name`,
                          product.local_name ?? "",
                        );
                      }
                      form.setValue(`items.${index}.requested_unit_id`, "");
                      form.setValue(`items.${index}.foc_unit_id`, "");
                      form.setValue(`items.${index}.approved_unit_id`, "");
                    }}
                    className="h-7 w-full text-xs"
                    defaultLabel={productName}
                  />
                </div>
              </TooltipTrigger>
              {(productCode || productName) && (
                <TooltipContent
                  side="top"
                  className="bg-popover text-popover-foreground [&>svg]:fill-popover [&>svg]:text-border max-w-[20rem] rounded-lg border px-3 py-2 shadow-md"
                >
                  <div className="space-y-1">
                    <p className="text-foreground/60 text-[0.6875rem] font-semibold">
                      {productCode}
                    </p>
                    <p className="text-xs leading-snug font-semibold">
                      {productName}
                    </p>
                  </div>
                  {(productLocalName || unitName) && (
                    <div className="text-foreground/60 mt-2 flex items-center gap-2 border-t pt-2 text-[0.6875rem]">
                      {productLocalName && <span>{productLocalName}</span>}
                      {productLocalName && unitName && (
                        <span aria-hidden="true">·</span>
                      )}
                      {unitName && (
                        <span className="font-semibold">{unitName}</span>
                      )}
                    </div>
                  )}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )}
      />
      <InventoryTooltipCell control={control} index={index} buCode={buCode} />
    </div>
  );
});
