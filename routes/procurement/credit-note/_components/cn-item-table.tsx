"use no memo";

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
import { memo, useEffect, useMemo } from "react";
import { useTranslations } from "use-intl";
import { ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldInput } from "@/components/ui/field";
import { InputQty } from "@/components/ui/input/input-qty";
import { LookupGrnProduct } from "@/components/lookup/lookup-grn-product";
import { LookupGrnProductLocation } from "@/components/lookup/lookup-grn-product-location";
import { LookupProductUnit } from "@/components/lookup/lookup-product-unit";
import type { GrnProductItem } from "@/types/goods-receive-note";
import { formatCurrency, round2 } from "@/lib/currency-utils";
import { cn } from "@/lib/utils";
import type { CnFormValues } from "./cn-form-schema";

const setProductToItem = (
  form: UseFormReturn<CnFormValues>,
  index: number,
  value: string,
  product?: GrnProductItem,
) => {
  // shouldValidate: re-validate item_id ทันที → border แดงหายเมื่อเลือกค่า
  form.setValue(`items.${index}.item_id`, value, {
    shouldDirty: true,
    shouldValidate: true,
  });
  form.setValue(`items.${index}.item_name`, product?.product_name ?? "", {
    shouldDirty: true,
  });
};

const ProductCell = memo(function ProductCell({
  control,
  form,
  index,
  disabled,
  error,
}: {
  control: Control<CnFormValues>;
  form: UseFormReturn<CnFormValues>;
  index: number;
  disabled: boolean;
  error?: string;
}) {
  const grnId = useWatch({ control, name: "grn_id" }) || undefined;
  const itemName = useWatch({ control, name: `items.${index}.item_name` });
  const allItems = useWatch({ control, name: "items" });
  const excludeIds = useMemo(
    () =>
      (allItems ?? [])
        .map((it, i) => (i === index ? null : it?.item_id))
        .filter((id): id is string => !!id),
    [allItems, index],
  );
  if (disabled) {
    return <span className="text-xs">{itemName || "—"}</span>;
  }
  return (
    <Controller
      control={control}
      name={`items.${index}.item_id`}
      render={({ field }) => (
        <LookupGrnProduct
          grnId={grnId}
          value={field.value ?? ""}
          onValueChange={(value, product) => {
            setProductToItem(form, index, value, product);
            form.setValue(`items.${index}.location_id`, null, {
              shouldDirty: true,
            });
            form.setValue(`items.${index}.location_name`, "", {
              shouldDirty: true,
            });
          }}
          disabled={disabled}
          excludeIds={excludeIds}
          className="w-full text-xs"
          error={error}
        />
      )}
    />
  );
});

const UnitCell = memo(function UnitCell({
  control,
  form,
  index,
  disabled,
  error,
}: {
  control: Control<CnFormValues>;
  form: UseFormReturn<CnFormValues>;
  index: number;
  disabled: boolean;
  error?: string;
}) {
  const productId = useWatch({ control, name: `items.${index}.item_id` }) ?? "";
  const unitName = useWatch({ control, name: `items.${index}.unit_name` });
  if (disabled) {
    return (
      <span className="text-muted-foreground text-xs">{unitName || "—"}</span>
    );
  }
  return (
    <Controller
      control={control}
      name={`items.${index}.unit_id`}
      render={({ field }) => (
        <LookupProductUnit
          productId={productId}
          value={field.value ?? ""}
          onValueChange={field.onChange}
          onItemChange={(unit) => {
            form.setValue(`items.${index}.unit_name`, unit?.name ?? "");
          }}
          disabled={disabled || !productId}
          className="w-full text-xs"
          error={error}
        />
      )}
    />
  );
});

/** Plain-text display ของ quantity สำหรับโหมดดูอย่างเดียว */
const QuantityDisplayCell = memo(function QuantityDisplayCell({
  control,
  index,
}: {
  control: Control<CnFormValues>;
  index: number;
}) {
  const qty = useWatch({ control, name: `items.${index}.quantity` });
  return (
    <span className="text-xs tabular-nums">
      {formatCurrency(Number(qty) || 0)}
    </span>
  );
});

/** Plain-text display ของ unit_price สำหรับโหมดดูอย่างเดียว */
const UnitPriceDisplayCell = memo(function UnitPriceDisplayCell({
  control,
  index,
}: {
  control: Control<CnFormValues>;
  index: number;
}) {
  const price = useWatch({ control, name: `items.${index}.unit_price` });
  return (
    <span className="text-xs tabular-nums">
      {formatCurrency(Number(price) || 0)}
    </span>
  );
});

function useRowAmounts(control: Control<CnFormValues>, index: number) {
  const [rawQty, rawPrice, rawTaxRate] = useWatch({
    control,
    name: [
      `items.${index}.quantity`,
      `items.${index}.unit_price`,
      `items.${index}.tax_rate`,
    ],
  });
  const qty = Number(rawQty) || 0;
  const price = Number(rawPrice) || 0;
  const taxRate = Number(rawTaxRate) || 0;
  return useMemo(() => {
    const net = round2(qty * price);
    const tax = round2((net * taxRate) / 100);
    const total = round2(net + tax);
    return { net, tax, total };
  }, [qty, price, taxRate]);
}

const NetAmountCell = memo(function NetAmountCell({
  control,
  form,
  index,
}: {
  control: Control<CnFormValues>;
  form: UseFormReturn<CnFormValues>;
  index: number;
}) {
  const { net, tax, total } = useRowAmounts(control, index);
  useEffect(() => {
    form.setValue(`items.${index}.net_amount`, net);
    form.setValue(`items.${index}.tax_amount`, tax);
    form.setValue(`items.${index}.total_amount`, total);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form is stable (useForm ref)
  }, [index, net, tax, total]);
  return <span className="text-xs tabular-nums">{formatCurrency(net)}</span>;
});

/** เซลล์ Total Amount — แสดงเฉย ๆ */
const TotalAmountCell = memo(function TotalAmountCell({
  control,
  index,
}: {
  control: Control<CnFormValues>;
  index: number;
}) {
  const { total } = useRowAmounts(control, index);
  return (
    <span className="text-xs font-medium tabular-nums">
      {formatCurrency(total)}
    </span>
  );
});

const LocationCell = memo(function LocationCell({
  control,
  form,
  index,
  disabled,
  error,
}: {
  control: Control<CnFormValues>;
  form: UseFormReturn<CnFormValues>;
  index: number;
  disabled: boolean;
  error?: string;
}) {
  const grnId = useWatch({ control, name: "grn_id" }) || undefined;
  const productId =
    useWatch({ control, name: `items.${index}.item_id` }) || undefined;
  const locationName = useWatch({
    control,
    name: `items.${index}.location_name`,
  });
  const allItems = useWatch({ control, name: "items" });
  const excludeIds = useMemo(
    () =>
      (allItems ?? [])
        .map((it, i) =>
          i === index || it?.item_id !== productId ? null : it?.location_id,
        )
        .filter((id): id is string => !!id),
    [allItems, index, productId],
  );
  if (disabled) {
    return <span className="text-xs">{locationName || "—"}</span>;
  }
  return (
    <Controller
      control={control}
      name={`items.${index}.location_id`}
      render={({ field }) => (
        <LookupGrnProductLocation
          grnId={grnId}
          productId={productId}
          value={field.value ?? ""}
          onValueChange={(value, location) => {
            field.onChange(value);
            form.setValue(
              `items.${index}.location_name`,
              location?.location_name ?? "",
            );
          }}
          disabled={disabled}
          excludeIds={excludeIds}
          className="w-full text-xs"
          error={error}
        />
      )}
    />
  );
});

export type CnItemField = FieldArrayWithId<CnFormValues, "items", "id">;

interface UseCnItemTableOptions {
  readonly form: UseFormReturn<CnFormValues>;
  readonly itemFields: CnItemField[];
  readonly disabled: boolean;
  readonly onDelete: (index: number) => void;
  readonly onShowDetail: (index: number) => void;
}

export function useCnItemTable({
  form,
  itemFields,
  disabled,
  onDelete,
  onShowDetail,
}: UseCnItemTableOptions) {
  const tfl = useTranslations("field");

  const allColumns = useMemo<ColumnDef<CnItemField>[]>(() => {
    const indexColumn: ColumnDef<CnItemField> = {
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

    const dataColumns: ColumnDef<CnItemField>[] = [
      {
        accessorKey: "item_id",
        header: tfl("product"),
        cell: ({ row }) => (
          <ProductCell
            control={form.control}
            form={form}
            index={row.index}
            disabled={disabled}
            error={form.formState.errors.items?.[row.index]?.item_id?.message}
          />
        ),
        size: 220,
      },
      {
        accessorKey: "location_id",
        header: tfl("location"),
        cell: ({ row }) => (
          <LocationCell
            control={form.control}
            form={form}
            index={row.index}
            disabled={disabled}
            error={
              form.formState.errors.items?.[row.index]?.location_id?.message
            }
          />
        ),
        size: 160,
      },
      {
        accessorKey: "quantity",
        header: tfl("quantity"),
        cell: ({ row }) => {
          if (disabled) {
            return (
              <QuantityDisplayCell control={form.control} index={row.index} />
            );
          }
          const qtyError =
            form.formState.errors.items?.[row.index]?.quantity?.message;
          return (
            <InputQty
              min={1}
              className={cn(
                "text-right text-xs md:text-xs",
                qtyError && "pl-7",
              )}
              disabled={disabled}
              error={qtyError}
              errorIconAlign="left"
              {...form.register(`items.${row.index}.quantity`, {
                valueAsNumber: true,
              })}
            />
          );
        },
        size: 90,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        accessorKey: "unit_id",
        header: tfl("unit"),
        cell: ({ row }) => (
          <UnitCell
            control={form.control}
            form={form}
            index={row.index}
            disabled={disabled}
            error={form.formState.errors.items?.[row.index]?.unit_id?.message}
          />
        ),
        size: 120,
      },
      {
        accessorKey: "unit_price",
        header: tfl("price"),
        cell: ({ row }) => {
          if (disabled) {
            return (
              <UnitPriceDisplayCell control={form.control} index={row.index} />
            );
          }
          const priceError =
            form.formState.errors.items?.[row.index]?.unit_price?.message;
          return (
            <FieldInput
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="0.00"
              className={cn(
                "text-right text-xs md:text-xs",
                priceError && "pl-7",
              )}
              disabled={disabled}
              error={priceError}
              errorIconAlign="left"
              {...form.register(`items.${row.index}.unit_price`, {
                valueAsNumber: true,
              })}
            />
          );
        },
        size: 100,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        accessorKey: "net_amount",
        header: tfl("netAmount"),
        cell: ({ row }) => (
          <NetAmountCell control={form.control} form={form} index={row.index} />
        ),
        size: 100,
        meta: {
          headerClassName: "text-right",
          cellClassName: "text-right",
        },
      },
      {
        accessorKey: "total_amount",
        header: tfl("totalAmount"),
        cell: ({ row }) => (
          <TotalAmountCell control={form.control} index={row.index} />
        ),
        size: 110,
        meta: {
          headerClassName: "text-right",
          cellClassName: "text-right",
        },
      },
      {
        id: "details",
        header: tfl("details"),
        cell: ({ row }) => (
          <Button
            type="button"
            variant="link"
            size="xs"
            className="text-xs"
            onClick={() => onShowDetail(row.index)}
          >
            {tfl("details")}
            <ChevronRight aria-hidden="true" className="size-3" />
          </Button>
        ),
        enableSorting: false,
        size: 60,
        meta: {
          headerClassName: "text-center",
          cellClassName: "text-center",
        },
      },
    ];

    const actionColumn: ColumnDef<CnItemField> = {
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

    return [indexColumn, ...dataColumns, ...(disabled ? [] : [actionColumn])];
  }, [form, disabled, onDelete, onShowDetail, tfl]);

  const table = useReactTable({
    data: itemFields,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return { table };
}
