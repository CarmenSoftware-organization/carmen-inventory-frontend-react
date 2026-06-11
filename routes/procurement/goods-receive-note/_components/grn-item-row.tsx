"use no memo";

import { memo, useState } from "react";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Eye, MapPin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldInput, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { LookupProductLocation } from "@/components/lookup/lookup-product-location";
import { LookupProductUnit } from "@/components/lookup/lookup-product-unit";
import type { GrnFormValues } from "./grn-form-schema";
import { GrnItemDetailSheet } from "./grn-item-detail-sheet";
import { Badge } from "@/components/ui/badge";

interface GrnItemRowProps {
  readonly index: number;
  readonly form: UseFormReturn<GrnFormValues>;
  readonly disabled: boolean;
  readonly isManual: boolean;
  readonly showDelete: boolean;
  readonly onDelete: () => void;
  readonly locationName: string;
  readonly locationCode: string;
  readonly locationType: string;
  readonly groupIndices: number[];
}

export const GrnItemRow = memo(function GrnItemRow({
  index,
  form,
  disabled,
  isManual,
  showDelete,
  onDelete,
  locationName,
  locationCode,
  locationType,
  groupIndices,
}: GrnItemRowProps) {
  const tfl = useTranslations("field");
  const [open, setOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const productId =
    useWatch({ control: form.control, name: `items.${index}.product_id` }) ??
    "";

  const itemErrors = form.formState.errors.items?.[index];
  const locationError = itemErrors?.location_id?.message;
  const receivedQtyError = itemErrors?.received_qty?.message;
  const receivedUnitError = itemErrors?.received_unit_id?.message;

  // Sibling location IDs to exclude — reactive ผ่าน useWatch (recompute เมื่อ
  // row อื่นใน group เปลี่ยน location → กันเลือกซ้ำได้จริง)
  const siblingLocationIds = useWatch({
    control: form.control,
    name: groupIndices
      .filter((i) => i !== index)
      .map((i) => `items.${i}.location_id` as const),
  });
  const excludeLocationIds = (siblingLocationIds ?? []).filter(
    (v): v is string => !!v,
  );

  return (
    <div className="hover:bg-muted/20 ml-6 space-y-2 px-3 py-2 transition-colors">
      {/* Location + Details + Delete */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <MapPin className="text-primary/60 size-3.5 shrink-0" />
          {isManual && !disabled ? (
            <Controller
              control={form.control}
              name={`items.${index}.location_id`}
              render={({ field }) => (
                <LookupProductLocation
                  productId={productId}
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  onItemChange={(location) => {
                    form.setValue(
                      `items.${index}.location_name`,
                      location.name,
                    );
                    form.setValue(
                      `items.${index}.location_code`,
                      location.code,
                    );
                    form.setValue(
                      `items.${index}.location_type`,
                      location.location_type,
                    );
                  }}
                  excludeIds={excludeLocationIds}
                  disabled={disabled || !productId}
                  className="w-full text-xs"
                  defaultLabel={
                    locationCode
                      ? `${locationCode} — ${locationName}`
                      : locationName || undefined
                  }
                  error={locationError}
                />
              )}
            />
          ) : (
            <div className="flex min-w-0 items-center gap-1.5">
              {locationCode && (
                <Badge
                  size="xs"
                  variant="secondary"
                  className="shrink-0 text-[0.6875rem]"
                >
                  {locationCode}
                </Badge>
              )}
              <span
                className={cn(
                  "truncate text-[0.6875rem] font-medium",
                  locationError && "text-destructive",
                )}
              >
                {locationName || (locationError ? locationError : "—")}
              </span>
              {locationType && (
                <Badge size="xs" className="text-[0.6875rem]">
                  {locationType.toUpperCase()}
                </Badge>
              )}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            size="xs"
            variant="ghost"
            className="text-primary"
            aria-label={tfl("details")}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(true);
            }}
          >
            <Eye className="size-3.5" />
            {tfl("details")}
          </Button>
          {showDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label={tfl("deleteLocation")}
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* PO reference */}
      {!isManual && (
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground text-[0.6875rem]">
            {tfl("poNo")}:
          </span>
          <Badge size="xs" variant="secondary" className="text-[0.6875rem]">
            {form.getValues(`items.${index}.purchase_order_no`) || "—"}
          </Badge>
        </div>
      )}

      {/* Inputs grid */}
      <div className="bg-muted/30 grid grid-cols-2 gap-2 rounded-md p-2 sm:grid-cols-[1fr_1fr_1fr_1fr]">
        {/* Received Qty */}
        <Field className="gap-0.5">
          <FieldLabel
            htmlFor={`items-${index}-received-qty`}
            className="text-muted-foreground text-[0.6875rem]"
          >
            {tfl("receivedQty")}
          </FieldLabel>
          <FieldInput
            id={`items-${index}-received-qty`}
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="0"
            className={`h-7 text-right text-xs ${receivedQtyError ? "pl-7" : ""}`}
            disabled={disabled}
            error={receivedQtyError}
            errorIconAlign="left"
            {...form.register(`items.${index}.received_qty`, {
              valueAsNumber: true,
            })}
          />
        </Field>

        {/* Received Unit */}
        <Field className="gap-0.5">
          <FieldLabel className="text-muted-foreground text-[0.6875rem]">
            <span className="sr-only">{tfl("receivedQty")} </span>
            {tfl("unit")}
          </FieldLabel>
          <Controller
            control={form.control}
            name={`items.${index}.received_unit_id`}
            render={({ field }) => (
              <LookupProductUnit
                productId={productId}
                value={field.value ?? ""}
                onValueChange={field.onChange}
                disabled={disabled}
                className="h-7 w-full text-xs"
                error={receivedUnitError}
              />
            )}
          />
        </Field>

        {/* FOC Qty */}
        <Field className="gap-0.5">
          <FieldLabel
            htmlFor={`items-${index}-foc-qty`}
            className="text-muted-foreground text-[0.6875rem]"
          >
            {tfl("focQty")}
          </FieldLabel>
          <FieldInput
            id={`items-${index}-foc-qty`}
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="0"
            className="h-7 text-right text-xs"
            disabled={disabled}
            {...form.register(`items.${index}.foc_qty`, {
              valueAsNumber: true,
            })}
          />
        </Field>

        {/* FOC Unit */}
        <Field className="gap-0.5">
          <FieldLabel className="text-muted-foreground text-[0.6875rem]">
            <span className="sr-only">{tfl("focQty")} </span>
            {tfl("unit")}
          </FieldLabel>
          <Controller
            control={form.control}
            name={`items.${index}.foc_unit_id`}
            render={({ field }) => (
              <LookupProductUnit
                productId={productId}
                value={field.value ?? ""}
                onValueChange={field.onChange}
                disabled={disabled}
                className="h-7 w-full text-xs"
              />
            )}
          />
        </Field>
      </div>

      {/* Dialogs (rendered outside visible layout) */}
      <GrnItemDetailSheet
        open={open}
        onOpenChange={setOpen}
        index={index}
        form={form}
        disabled={disabled}
        groupIndices={groupIndices}
      />
      <DeleteDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={tfl("deleteLocation")}
        description={locationName || undefined}
        onConfirm={() => {
          onDelete();
          setShowDeleteConfirm(false);
        }}
      />
    </div>
  );
});
