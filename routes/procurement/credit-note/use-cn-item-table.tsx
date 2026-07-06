import { memo, useEffect, useMemo } from "react";
import {
  Controller,
  useWatch,
  type Control,
  type FieldArrayWithId,
  type UseFormReturn,
} from "react-hook-form";
import { useTranslations } from "use-intl";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  InputSuffixAddon,
  InputSuffixField,
  InputSuffixInput,
  InputSuffixPlain,
} from "@/components/ui/input/input-suffix";
import { cn } from "@/lib/utils";
import { LookupGrnProduct } from "@/components/lookup/lookup-grn-product";
import { LookupGrnProductLocation } from "@/components/lookup/lookup-grn-product-location";
import { LookupProductUnit } from "@/components/lookup/lookup-product-unit";
import { NameWithSubtext } from "@/components/share/name-with-sub-text";
import { formatCurrency, round2 } from "@/lib/currency-utils";
import type { GrnProductItem } from "@/types/goods-receive-note";
import type { CnFormValues } from "./cn-form-schema";

export type CnItemField = FieldArrayWithId<CnFormValues, "items", "id">;

/**
 * คำนวณ + set net/tax/total ของ item — mount ตลอด (ทุก row) เพื่อให้ยอด
 * recompute เสมอ (price/tax/subtotal/amt แสดงเป็นคอลัมน์ในแถว)
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
          className="h-full w-20 shrink-0 rounded-none border-0 bg-transparent px-2 text-xs shadow-none hover:bg-transparent focus-visible:ring-0"
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
  const productLocalName =
    useWatch({
      control: form.control,
      name: `items.${index}.item_local_name`,
    }) ?? "";
  if (disabled) {
    return <NameWithSubtext primary={itemName} secondary={productLocalName} />;
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
  const unitName =
    useWatch({ control: form.control, name: `items.${index}.unit_name` }) ?? "";
  const error = form.formState.errors.items?.[index]?.quantity?.message;
  if (disabled) {
    return (
      <InputSuffixPlain
        className="w-full"
        value={quantity != null ? String(quantity) : "—"}
        suffix={unitName}
      />
    );
  }
  return (
    <InputSuffixField className="w-full" error={!!error}>
      <InputSuffixInput
        id={`items-${index}-quantity`}
        type="number"
        inputMode="decimal"
        min={1}
        placeholder="0"
        {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
      />
      <InputSuffixAddon>
        <WatchedProductUnit
          control={form.control}
          form={form}
          index={index}
          disabled={disabled}
        />
      </InputSuffixAddon>
    </InputSuffixField>
  );
}

function PriceCell({
  form,
  index,
  disabled,
}: {
  form: UseFormReturn<CnFormValues>;
  index: number;
  disabled: boolean;
}) {
  "use no memo";
  const price = useWatch({
    control: form.control,
    name: `items.${index}.unit_price`,
  });
  if (disabled) {
    return (
      <InputSuffixPlain
        className="w-full"
        value={formatCurrency(Number(price) || 0)}
      />
    );
  }
  return (
    <InputSuffixField className="w-full">
      <InputSuffixInput
        id={`items-${index}-unit-price`}
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        placeholder="0.00"
        {...form.register(`items.${index}.unit_price`, { valueAsNumber: true })}
      />
    </InputSuffixField>
  );
}

function TaxRateCell({
  form,
  index,
  disabled,
}: {
  form: UseFormReturn<CnFormValues>;
  index: number;
  disabled: boolean;
}) {
  "use no memo";
  const taxRate = useWatch({
    control: form.control,
    name: `items.${index}.tax_rate`,
  });
  if (disabled) {
    return (
      <InputSuffixPlain
        className="w-full"
        value={Number(taxRate) || 0}
        suffix="%"
      />
    );
  }
  return (
    <InputSuffixField className="w-full">
      <InputSuffixInput
        id={`items-${index}-tax-rate`}
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        placeholder="0"
        {...form.register(`items.${index}.tax_rate`, { valueAsNumber: true })}
      />
      <InputSuffixAddon>
        <span className="text-muted-foreground px-2 text-xs">%</span>
      </InputSuffixAddon>
    </InputSuffixField>
  );
}

function AmountCell({
  control,
  index,
  field,
}: {
  control: Control<CnFormValues>;
  index: number;
  field: "net_amount" | "tax_amount" | "total_amount";
}) {
  "use no memo";
  const v = useWatch({ control, name: `items.${index}.${field}` });
  return (
    <span className="text-foreground text-xs font-semibold tabular-nums">
      {formatCurrency(Number(v) || 0)}
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
        header: tfl("receivedAbbr"),
        size: 180,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
        cell: ({ row }) => (
          <QtyCell form={form} index={row.index} disabled={disabled} />
        ),
      },
      {
        id: "unit_price",
        header: tfl("price"),
        size: 120,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
        cell: ({ row }) => (
          <PriceCell form={form} index={row.index} disabled={disabled} />
        ),
      },
      {
        id: "net_amount",
        header: tfl("subtotalAbbr"),
        size: 110,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
        cell: ({ row }) => (
          <AmountCell
            control={form.control}
            index={row.index}
            field="net_amount"
          />
        ),
      },
      {
        id: "tax_rate",
        header: tfl("taxAbbr"),
        size: 100,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
        cell: ({ row }) => (
          <TaxRateCell form={form} index={row.index} disabled={disabled} />
        ),
      },
      {
        id: "tax_amount",
        header: tfl("taxAmt"),
        size: 110,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
        cell: ({ row }) => (
          <AmountCell
            control={form.control}
            index={row.index}
            field="tax_amount"
          />
        ),
      },
      {
        id: "total_amount",
        header: tfl("amountAbbr"),
        size: 120,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
        cell: ({ row }) => (
          <AmountCell
            control={form.control}
            index={row.index}
            field="total_amount"
          />
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
  }, [form, disabled, grnId, autoOpenIndex, onDelete, tfl]);

  const table = useReactTable({
    data: itemFields,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return table;
}
