import { memo, useEffect, useMemo } from "react";
import {
  Controller,
  useWatch,
  type Control,
  type UseFormReturn,
} from "react-hook-form";
import { useTranslations } from "use-intl";
import {
  type ColumnDef,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldInput } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { LookupGrnProduct } from "@/components/lookup/lookup-grn-product";
import { LookupGrnProductLocation } from "@/components/lookup/lookup-grn-product-location";
import { LookupProductUnit } from "@/components/lookup/lookup-product-unit";
import { formatCurrency, round2 } from "@/lib/currency-utils";
import type { GrnProductItem } from "@/types/goods-receive-note";
import type { CnFormValues } from "./cn-form-schema";
import { CnItemExpanded, type CnItemField } from "./cn-item-expanded";

export type { CnItemField };

/**
 * คำนวณ + set net/tax/total ของ item — mount ตลอด (ทุก row) เพื่อให้ยอด
 * recompute แม้ตอน collapsed (CnTabPricing sync เฉพาะตอน expanded)
 */
export const CnItemComputedSync = memo(function CnItemComputedSync({
  control,
  form,
  index,
}: {
  control: Control<CnFormValues>;
  form: UseFormReturn<CnFormValues>;
  index: number;
}) {
  "use no memo";
  const [unitPrice, quantity, taxRate] = useWatch({
    control,
    name: [
      `items.${index}.unit_price`,
      `items.${index}.quantity`,
      `items.${index}.tax_rate`,
    ] as const,
  });

  const net = round2((Number(quantity) || 0) * (Number(unitPrice) || 0));
  const tax = round2((net * (Number(taxRate) || 0)) / 100);
  const total = round2(net + tax);

  useEffect(() => {
    if (form.getValues(`items.${index}.net_amount`) !== net) {
      form.setValue(`items.${index}.net_amount`, net);
    }
    if (form.getValues(`items.${index}.tax_amount`) !== tax) {
      form.setValue(`items.${index}.tax_amount`, tax);
    }
    if (form.getValues(`items.${index}.total_amount`) !== total) {
      form.setValue(`items.${index}.total_amount`, total);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form is stable (useForm ref)
  }, [index, net, tax, total]);

  return null;
});

/** unit lookup ที่ sync ตาม item_id ของ row */
const WatchedProductUnit = memo(function WatchedProductUnit({
  control,
  form,
  index,
  disabled,
}: {
  control: Control<CnFormValues>;
  form: UseFormReturn<CnFormValues>;
  index: number;
  disabled: boolean;
}) {
  "use no memo";
  const productId = useWatch({ control, name: `items.${index}.item_id` }) ?? "";
  return (
    <Controller
      control={control}
      name={`items.${index}.unit_id`}
      render={({ field, fieldState }) => (
        <LookupProductUnit
          productId={productId}
          value={field.value ?? ""}
          onValueChange={field.onChange}
          onItemChange={(unit) => {
            form.setValue(`items.${index}.unit_name`, unit?.name ?? "");
          }}
          disabled={disabled || !productId}
          readOnly={disabled}
          className="h-8 w-full text-xs"
          error={fieldState.error?.message}
        />
      )}
    />
  );
});

function ProductCell({
  form,
  index,
  disabled,
  grnId,
  autoOpen,
}: {
  form: UseFormReturn<CnFormValues>;
  index: number;
  disabled: boolean;
  grnId: string | undefined;
  autoOpen: boolean;
}) {
  "use no memo";
  const itemName =
    useWatch({ control: form.control, name: `items.${index}.item_name` }) ?? "";
  if (disabled) {
    return (
      <span className="text-foreground block truncate text-xs font-medium">
        {itemName || "—"}
      </span>
    );
  }
  return (
    <Controller
      control={form.control}
      name={`items.${index}.item_id`}
      render={({ field, fieldState }) => (
        <LookupGrnProduct
          grnId={grnId}
          value={field.value ?? ""}
          onValueChange={(value, product: GrnProductItem | undefined) => {
            field.onChange(value);
            form.setValue(
              `items.${index}.item_name`,
              product?.product_name ?? "",
              { shouldDirty: true },
            );
            // เปลี่ยน product → เคลียร์ location เดิม
            form.setValue(`items.${index}.location_id`, null, {
              shouldDirty: true,
            });
            form.setValue(`items.${index}.location_name`, "", {
              shouldDirty: true,
            });
          }}
          disabled={disabled}
          defaultOpen={autoOpen}
          className="h-8 w-full text-xs"
          error={fieldState.error?.message}
        />
      )}
    />
  );
}

function LocationCell({
  form,
  index,
  disabled,
  grnId,
}: {
  form: UseFormReturn<CnFormValues>;
  index: number;
  disabled: boolean;
  grnId: string | undefined;
}) {
  "use no memo";
  const productId =
    useWatch({ control: form.control, name: `items.${index}.item_id` }) ?? "";
  const locationName =
    useWatch({
      control: form.control,
      name: `items.${index}.location_name`,
    }) ?? "";
  if (disabled) {
    return (
      <span className="text-foreground block truncate text-xs font-medium">
        {locationName || "—"}
      </span>
    );
  }
  return (
    <Controller
      control={form.control}
      name={`items.${index}.location_id`}
      render={({ field, fieldState }) => (
        <LookupGrnProductLocation
          grnId={grnId}
          productId={productId || undefined}
          value={field.value ?? ""}
          onValueChange={(value, location) => {
            field.onChange(value);
            form.setValue(
              `items.${index}.location_name`,
              location?.location_name ?? "",
            );
          }}
          defaultLabel={locationName || undefined}
          disabled={!productId}
          className="h-8 w-full text-xs"
          modal
          error={fieldState.error?.message}
        />
      )}
    />
  );
}

function QtyCell({
  form,
  index,
  disabled,
}: {
  form: UseFormReturn<CnFormValues>;
  index: number;
  disabled: boolean;
}) {
  "use no memo";
  const quantity = useWatch({
    control: form.control,
    name: `items.${index}.quantity`,
  });
  const error = form.formState.errors.items?.[index]?.quantity?.message;
  if (disabled) {
    return (
      <span className="text-foreground block truncate text-xs font-medium">
        {quantity != null ? String(quantity) : "—"}
      </span>
    );
  }
  return (
    <FieldInput
      id={`items-${index}-quantity`}
      type="number"
      inputMode="decimal"
      min={1}
      placeholder="0"
      className={cn("h-8 w-full text-right text-xs", error && "pl-7")}
      error={error}
      errorIconAlign="left"
      {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
    />
  );
}

function NetCell({
  control,
  index,
}: {
  control: Control<CnFormValues>;
  index: number;
}) {
  "use no memo";
  const net = useWatch({ control, name: `items.${index}.net_amount` });
  return (
    <span className="text-foreground text-xs font-semibold tabular-nums">
      {formatCurrency(Number(net) || 0)}
    </span>
  );
}

interface UseCnItemTableOptions {
  form: UseFormReturn<CnFormValues>;
  itemFields: CnItemField[];
  disabled: boolean;
  grnId: string | undefined;
  /** index ของ row ที่เพิ่งเพิ่ม → auto-open product lookup */
  autoOpenIndex: number | null;
  onDelete: (index: number) => void;
}

export function useCnItemTable({
  form,
  itemFields,
  disabled,
  grnId,
  autoOpenIndex,
  onDelete,
}: UseCnItemTableOptions) {
  "use no memo";
  const tfl = useTranslations("field");

  const columns = useMemo<ColumnDef<CnItemField>[]>(() => {
    const expandColumn: ColumnDef<CnItemField> = {
      id: "expand",
      header: "",
      cell: ({ row }) => (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={row.getIsExpanded() ? "Collapse" : "Expand"}
          onClick={() => row.toggleExpanded()}
        >
          {row.getIsExpanded() ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </Button>
      ),
      enableSorting: false,
      enableResizing: false,
      size: 36,
      meta: {
        headerClassName: "text-center",
        cellClassName: "text-center",
        expandedContent: (item: CnItemField) => (
          <CnItemExpanded
            item={item}
            form={form}
            itemFields={itemFields}
            disabled={disabled}
          />
        ),
      },
    };

    const indexColumn: ColumnDef<CnItemField> = {
      id: "index",
      header: "#",
      cell: ({ row }) => row.index + 1,
      enableSorting: false,
      enableResizing: false,
      size: 36,
      meta: {
        headerClassName: "text-center",
        cellClassName: "text-center text-muted-foreground",
      },
    };

    const dataColumns: ColumnDef<CnItemField>[] = [
      {
        accessorKey: "item_id",
        header: tfl("product"),
        size: 240,
        cell: ({ row }) => (
          <ProductCell
            form={form}
            index={row.index}
            disabled={disabled}
            grnId={grnId}
            autoOpen={autoOpenIndex === row.index}
          />
        ),
      },
      {
        accessorKey: "location_id",
        header: tfl("location"),
        size: 200,
        cell: ({ row }) => (
          <LocationCell
            form={form}
            index={row.index}
            disabled={disabled}
            grnId={grnId}
          />
        ),
      },
      {
        id: "quantity",
        header: tfl("quantity"),
        size: 90,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
        cell: ({ row }) => (
          <QtyCell form={form} index={row.index} disabled={disabled} />
        ),
      },
      {
        accessorKey: "unit_id",
        header: tfl("unit"),
        size: 120,
        cell: ({ row }) => (
          <WatchedProductUnit
            control={form.control}
            form={form}
            index={row.index}
            disabled={disabled}
          />
        ),
      },
      {
        id: "amount",
        header: tfl("amount"),
        size: 110,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
        cell: ({ row }) => (
          <NetCell control={form.control} index={row.index} />
        ),
      },
    ];

    const actionColumn: ColumnDef<CnItemField> = {
      id: "action",
      header: () => "",
      cell: ({ row }) => (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          aria-label="Remove"
          onClick={() => onDelete(row.index)}
        >
          <Trash2 className="size-3.5" />
        </Button>
      ),
      enableSorting: false,
      enableResizing: false,
      size: 40,
      meta: {
        headerClassName: "text-center",
        cellClassName: "text-center",
      },
    };

    const baseCols = [
      expandColumn,
      indexColumn,
      ...dataColumns,
      ...(disabled ? [] : [actionColumn]),
    ];

    return baseCols.map((col) => ({
      ...col,
      meta: {
        ...col.meta,
        cellClassName: cn("py-2 align-middle", col.meta?.cellClassName),
      },
    }));
  }, [form, disabled, grnId, itemFields, autoOpenIndex, onDelete, tfl]);

  const table = useReactTable({
    data: itemFields,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowId: (row) => row.id,
  });

  // auto-expand แถวที่ validation ไม่ผ่านหลัง submit (field pricing/details อยู่ใน expand)
  const submitCount = form.formState.submitCount;
  useEffect(() => {
    if (!submitCount) return;
    const itemErrors = form.formState.errors.items;
    if (!itemErrors) return;
    const next: Record<string, boolean> = {};
    itemFields.forEach((f, i) => {
      if (itemErrors[i]) next[f.id] = true;
    });
    if (Object.keys(next).length === 0) return;
    table.setExpanded((prev) => ({
      ...(typeof prev === "object" ? prev : {}),
      ...next,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitCount]);

  return table;
}
