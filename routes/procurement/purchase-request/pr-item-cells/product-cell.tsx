import {
  Controller,
  useWatch,
  type UseFormReturn,
  type Control,
} from "react-hook-form";
import { memo, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LookupProductInLocation } from "@/components/lookup/lookup-product-in-location";
import { OnHandDialog } from "@/components/share/on-hand-dialog";
import { OnOrderDialog } from "@/components/share/on-order-dialog";
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
  const workflowId = useWatch({ control, name: "workflow_id" }) ?? "";
  const productCode =
    useWatch({ control, name: `items.${index}.product_code` }) ?? "";
  const productName =
    useWatch({ control, name: `items.${index}.product_name` }) ?? "";
  const productLocalName =
    useWatch({ control, name: `items.${index}.product_local_name` }) ?? "";
  const unitName =
    useWatch({ control, name: `items.${index}.requested_unit_name` }) ?? "";
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";
  const isRowLocked = useIsRowLocked(control, index);
  const [onHandOpen, setOnHandOpen] = useState(false);
  const [onOrderOpen, setOnOrderOpen] = useState(false);

  // กด "คงเหลือ"/"กำลังสั่ง" ใน tooltip สต็อก แล้วเปิด dialog รายละเอียดต่อ —
  // ทรงเดียวกับ SR (sr-item-table.tsx) และแถบ inventory ใต้แถว (pr-inventory-row)
  const inventoryTooltip = (
    <>
      <InventoryTooltipCell
        control={control}
        index={index}
        buCode={buCode}
        onOnHandClick={productId ? () => setOnHandOpen(true) : undefined}
        onOnOrderClick={productId ? () => setOnOrderOpen(true) : undefined}
      />
      {productId && (
        <>
          <OnHandDialog
            open={onHandOpen}
            onOpenChange={setOnHandOpen}
            productId={productId}
          />
          <OnOrderDialog
            open={onOrderOpen}
            onOpenChange={setOnOrderOpen}
            productId={productId}
          />
        </>
      )}
    </>
  );
  if (isDisabled || isRowLocked) {
    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center">
          {/* title = ชื่อเต็ม — เซลล์นี้ truncate ได้ที่ font scale ใหญ่ๆ */}
          <p
            className="min-w-0 flex-1 truncate text-left text-xs font-semibold"
            title={productName || undefined}
          >
            {productName || <span className="text-muted-foreground">—</span>}
          </p>
          {inventoryTooltip}
        </div>
        <p
          className="text-muted-foreground text-micro-legal truncate"
          title={productLocalName || undefined}
        >
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
                    workflowId={workflowId}
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
                    <p className="text-foreground/60 text-micro font-semibold">
                      {productCode}
                    </p>
                    <p className="text-xs leading-snug font-semibold">
                      {productName}
                    </p>
                  </div>
                  {(productLocalName || unitName) && (
                    <div className="text-foreground/60 text-micro mt-2 flex items-center gap-2 border-t pt-2">
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
      {inventoryTooltip}
    </div>
  );
});
