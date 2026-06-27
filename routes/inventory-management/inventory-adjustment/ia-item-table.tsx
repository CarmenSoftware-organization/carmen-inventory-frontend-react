"use no memo";

import { useEffect } from "react";
import {
  Controller,
  useWatch,
  type UseFormReturn,
  type Control,
  type FieldArrayWithId,
} from "react-hook-form";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { memo, useMemo } from "react";
import { useTranslations } from "use-intl";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldInput } from "@/components/ui/field";
import { LookupProductInLocation } from "@/components/lookup/lookup-product-in-location";
import { InventoryTooltip } from "@/components/ui/inventory-tooltip";
import { useProfile } from "@/hooks/use-profile";
import {
  useProductCostByLocationQty,
  useProductLastReceiving,
} from "@/hooks/use-product-cost";
import { cn } from "@/lib/utils";
import type { InventoryAdjustmentType } from "@/types/inventory-adjustment";
import type { AdjFormValues } from "./ia-form-schema";

const ProductInventoryTooltip = memo(function ProductInventoryTooltip({
  control,
  index,
}: {
  control: Control<AdjFormValues>;
  index: number;
}) {
  const { buCode } = useProfile();
  const locationId = useWatch({ control, name: "location_id" }) ?? "";
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";
  return (
    <InventoryTooltip
      buCode={buCode}
      locationId={locationId}
      productId={productId}
    />
  );
});

const TotalCostCell = memo(function TotalCostCell({
  control,
  index,
}: {
  control: Control<AdjFormValues>;
  index: number;
}) {
  const total = useWatch({ control, name: `items.${index}.total_cost` });
  return (
    <span className="block text-right text-xs tabular-nums">
      {(total ?? 0).toFixed(2)}
    </span>
  );
});

const StockInCostProbe = memo(function StockInCostProbe({
  form,
  index,
}: {
  form: UseFormReturn<AdjFormValues>;
  index: number;
}) {
  const { buCode } = useProfile();
  const { control } = form;
  const locationId = useWatch({ control, name: "location_id" }) ?? "";
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";
  const qty = useWatch({ control, name: `items.${index}.qty` });
  const { data } = useProductCostByLocationQty(
    buCode,
    productId || undefined,
    locationId || undefined,
    typeof qty === "number" && qty > 0 ? qty : undefined,
  );
  useEffect(() => {
    if (!data) return;
    form.setValue(
      `items.${index}.cost_per_unit`,
      data.average_cost_per_unit,
      { shouldDirty: true },
    );
    form.setValue(`items.${index}.total_cost`, data.total_cost, {
      shouldDirty: true,
    });
  }, [data, form, index]);
  return null;
});

const StockOutCostProbe = memo(function StockOutCostProbe({
  form,
  index,
}: {
  form: UseFormReturn<AdjFormValues>;
  index: number;
}) {
  const { buCode } = useProfile();
  const { control } = form;
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";
  const { data } = useProductLastReceiving(buCode, productId || undefined);
  useEffect(() => {
    if (!data) return;
    form.setValue(`items.${index}.total_cost`, data.total_cost, {
      shouldDirty: true,
    });
  }, [data, form, index]);
  return null;
});

const ProductCell = memo(function ProductCell({
  control,
  form,
  index,
  disabled,
  errorMessage,
  excludeIds,
  adjustmentType,
}: {
  control: Control<AdjFormValues>;
  form: UseFormReturn<AdjFormValues>;
  index: number;
  disabled: boolean;
  errorMessage?: string;
  excludeIds?: string[];
  adjustmentType: InventoryAdjustmentType;
}) {
  const locationId = useWatch({ control, name: "location_id" }) ?? "";
  const productName =
    useWatch({ control, name: `items.${index}.product_name` }) ?? "";
  const CostProbe =
    adjustmentType === "stock-out" ? StockOutCostProbe : StockInCostProbe;
  if (disabled) {
    // View mode: do NOT mount the cost probe. Its effect writes cost_per_unit /
    // total_cost with shouldDirty:true from the live cost API, which would
    // silently overwrite the saved costs of an existing adjustment (and mark
    // untouched rows dirty). The probe is only for auto-filling during add/edit.
    return (
      <div className="flex items-center justify-between gap-1.5 text-xs">
        <span className="truncate">{productName || "—"}</span>
        <ProductInventoryTooltip control={control} index={index} />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 pr-4">
      <Controller
        control={control}
        name={`items.${index}.product_id`}
        render={({ field }) => (
          <LookupProductInLocation
            locationId={locationId}
            value={field.value ?? ""}
            onValueChange={(value, product) => {
              field.onChange(value);
              if (product) {
                form.setValue(`items.${index}.product_name`, product.name);
                form.setValue(
                  `items.${index}.product_local_name`,
                  product.local_name ?? "",
                );
              }
            }}
            disabled={!locationId}
            excludeIds={excludeIds}
            defaultLabel={productName}
            className="h-6 w-full text-xs"
            error={errorMessage}
          />
        )}
      />
      <ProductInventoryTooltip control={control} index={index} />
      <CostProbe form={form} index={index} />
    </div>
  );
});

export type AdjItemField = FieldArrayWithId<AdjFormValues, "items", "id">;

interface UseAdjItemTableOptions {
  form: UseFormReturn<AdjFormValues>;
  itemFields: AdjItemField[];
  disabled: boolean;
  onDelete: (index: number) => void;
  adjustmentType: InventoryAdjustmentType;
}

export function useAdjItemTable({
  form,
  itemFields,
  disabled,
  onDelete,
  adjustmentType,
}: UseAdjItemTableOptions) {
  const tfl = useTranslations("field");
  const allColumns = useMemo<ColumnDef<AdjItemField>[]>(() => {
    const recalcTotal = (
      index: number,
      field: "qty" | "cost_per_unit",
      newValue: number,
    ) => {
      const qty =
        field === "qty" ? newValue : form.getValues(`items.${index}.qty`);
      const cost =
        field === "cost_per_unit"
          ? newValue
          : form.getValues(`items.${index}.cost_per_unit`);
      form.setValue(`items.${index}.total_cost`, qty * cost);
    };

    const indexColumn: ColumnDef<AdjItemField> = {
      id: "index",
      header: "#",
      cell: ({ row }) => row.index + 1,
      enableSorting: false,
      size: 32,
      meta: {
        headerClassName: "text-center",
        cellClassName: "text-center text-muted-foreground",
      },
    };

    const dataColumns: ColumnDef<AdjItemField>[] = [
      {
        accessorKey: "product_id",
        header: tfl("product"),
        cell: ({ row }) => {
          const errorMessage =
            form.formState.errors.items?.[row.index]?.product_id?.message;
          const selectedIds = form
            .getValues("items")
            .map((item, i) => (i === row.index ? "" : item.product_id))
            .filter(Boolean);
          return (
            <ProductCell
              control={form.control}
              form={form}
              index={row.index}
              disabled={disabled}
              errorMessage={errorMessage}
              excludeIds={selectedIds}
              adjustmentType={adjustmentType}
            />
          );
        },
        size: 200,
      },
      {
        accessorKey: "qty",
        header: tfl("qty"),
        cell: ({ row }) => {
          if (disabled) {
            const qty = form.getValues(`items.${row.index}.qty`);
            return <span className="block text-right text-xs">{qty}</span>;
          }
          const errorMessage =
            form.formState.errors.items?.[row.index]?.qty?.message;
          return (
            <FieldInput
              type="number"
              inputMode="decimal"
              min={1}
              placeholder={tfl("qty")}
              className={cn(
                "h-6 text-right text-xs md:text-xs",
                errorMessage && "pl-7",
              )}
              error={errorMessage}
              errorIconAlign="left"
              {...form.register(`items.${row.index}.qty`, {
                valueAsNumber: true,
                onChange: (e) =>
                  recalcTotal(row.index, "qty", Number(e.target.value) || 0),
              })}
            />
          );
        },
        size: 80,
        meta: { headerClassName: "text-right" },
      },
      {
        id: "cost_per_unit",
        accessorKey: "cost_per_unit",
        header: tfl("costPerUnit"),
        cell: ({ row }) => {
          if (disabled) {
            const cost = form.getValues(`items.${row.index}.cost_per_unit`);
            return (
              <span className="block text-right text-xs tabular-nums">
                {(cost ?? 0).toFixed(2)}
              </span>
            );
          }
          const errorMessage =
            form.formState.errors.items?.[row.index]?.cost_per_unit?.message;
          return (
            <FieldInput
              type="number"
              inputMode="decimal"
              step="any"
              min={0}
              placeholder={tfl("costPerUnit")}
              className={cn(
                "h-6 text-right text-xs md:text-xs",
                errorMessage && "pl-7",
              )}
              error={errorMessage}
              errorIconAlign="left"
              {...form.register(`items.${row.index}.cost_per_unit`, {
                valueAsNumber: true,
                onChange: (e) =>
                  recalcTotal(
                    row.index,
                    "cost_per_unit",
                    Number(e.target.value) || 0,
                  ),
              })}
            />
          );
        },
        size: 100,
        meta: { headerClassName: "text-right" },
      },
      {
        accessorKey: "total_cost",
        header: tfl("totalCost"),
        cell: ({ row }) => (
          <TotalCostCell control={form.control} index={row.index} />
        ),
        size: 100,
        meta: { headerClassName: "text-right" },
      },
    ];

    const actionColumn: ColumnDef<AdjItemField> = {
      id: "action",
      header: () => "",
      cell: ({ row }: { row: { index: number } }) => (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          aria-label="Remove"
          onClick={() => onDelete(row.index)}
        >
          <Trash2 />
        </Button>
      ),
      enableSorting: false,
      size: 40,
      meta: {
        headerClassName: "text-right",
        cellClassName: "text-right",
      },
    };

    const visibleDataColumns =
      adjustmentType === "stock-out"
        ? dataColumns.filter((c) => c.id !== "cost_per_unit")
        : dataColumns;

    return [
      indexColumn,
      ...visibleDataColumns,
      ...(disabled ? [] : [actionColumn]),
    ];
  }, [form, disabled, onDelete, tfl, adjustmentType]);

  const table = useReactTable({
    data: itemFields,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return { table };
}
