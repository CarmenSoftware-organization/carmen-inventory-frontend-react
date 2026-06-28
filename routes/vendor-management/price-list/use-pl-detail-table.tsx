import {
  Controller,
  useWatch,
  type UseFormReturn,
} from "react-hook-form";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { memo, useEffect, useMemo } from "react";
import { Trash2 } from "lucide-react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldInput } from "@/components/ui/field";
import { LookupProduct } from "@/components/lookup/lookup-product";
import { LookupProductUnit } from "@/components/lookup/lookup-product-unit";
import { LookupTaxProfile } from "@/components/lookup/lookup-tax-profile";
import { round2 } from "@/lib/currency-utils";
import type { PriceListFormValues, PriceListDetailField } from "./pl-form-schema";

interface UsePriceListDetailTableOptions {
  form: UseFormReturn<PriceListFormValues>;
  detailFields: PriceListDetailField[];
  onDelete: (index: number) => void;
}

const ProductCell = memo(function ProductCell({
  form,
  index,
  error,
}: {
  form: UseFormReturn<PriceListFormValues>;
  index: number;
  error?: string;
}) {
  "use no memo";
  return (
    <Controller
      control={form.control}
      name={`pricelist_detail.${index}.product_id`}
      render={({ field }) => (
        <LookupProduct
          value={field.value}
          onValueChange={field.onChange}
          className="w-full text-xs"
          error={error}
        />
      )}
    />
  );
});

const UnitCell = memo(function UnitCell({
  form,
  index,
  error,
}: {
  form: UseFormReturn<PriceListFormValues>;
  index: number;
  error?: string;
}) {
  "use no memo";
  const productId =
    useWatch({
      control: form.control,
      name: `pricelist_detail.${index}.product_id`,
    }) ?? "";
  return (
    <Controller
      control={form.control}
      name={`pricelist_detail.${index}.unit_id`}
      render={({ field }) => (
        <LookupProductUnit
          productId={productId}
          value={field.value}
          onValueChange={field.onChange}
          className="w-full text-xs"
          error={error}
        />
      )}
    />
  );
});

const TaxProfileCell = memo(function TaxProfileCell({
  form,
  index,
  error,
}: {
  form: UseFormReturn<PriceListFormValues>;
  index: number;
  error?: string;
}) {
  "use no memo";
  return (
    <Controller
      control={form.control}
      name={`pricelist_detail.${index}.tax_profile_id`}
      render={({ field }) => (
        <LookupTaxProfile
          value={field.value}
          onValueChange={(value, taxRate) => {
            field.onChange(value);
            form.setValue(`pricelist_detail.${index}.tax_rate`, taxRate);
          }}
          className="w-full text-xs"
          error={error}
        />
      )}
    />
  );
});

const PriceCell = memo(function PriceCell({
  form,
  index,
}: {
  form: UseFormReturn<PriceListFormValues>;
  index: number;
}) {
  "use no memo";
  const raw = useWatch({
    control: form.control,
    name: `pricelist_detail.${index}.price`,
  });
  const price = Number(raw) || 0;
  return (
    <span className="block text-right tabular-nums text-[0.6875rem] font-semibold text-emerald-600">
      {price.toFixed(2)}
    </span>
  );
});

const TaxCalcCell = memo(function TaxCalcCell({
  form,
  index,
}: {
  form: UseFormReturn<PriceListFormValues>;
  index: number;
}) {
  "use no memo";
  const rawPrice = useWatch({
    control: form.control,
    name: `pricelist_detail.${index}.price_without_tax`,
  });
  const rawTaxRate = useWatch({
    control: form.control,
    name: `pricelist_detail.${index}.tax_rate`,
  });
  const priceWithoutTax = Number(rawPrice) || 0;
  const taxRate = Number(rawTaxRate) || 0;

  const taxAmt = useMemo(
    () => round2((priceWithoutTax * taxRate) / 100),
    [priceWithoutTax, taxRate],
  );
  const price = useMemo(
    () => round2(priceWithoutTax + taxAmt),
    [priceWithoutTax, taxAmt],
  );

  useEffect(() => {
    form.setValue(`pricelist_detail.${index}.tax_amt`, taxAmt);
  }, [taxAmt, form, index]);

  useEffect(() => {
    form.setValue(`pricelist_detail.${index}.price`, price);
  }, [price, form, index]);

  return (
    <span className="block text-right tabular-nums text-[0.6875rem]">
      {taxAmt.toFixed(2)}
    </span>
  );
});

export function usePriceListDetailTable({
  form,
  detailFields,
  onDelete,
}: UsePriceListDetailTableOptions) {
  "use no memo";
  const t = useTranslations("vendorManagement.priceList");
  const tfl = useTranslations("field");

  const allColumns = useMemo<ColumnDef<PriceListDetailField>[]>(() => {
    const indexColumn: ColumnDef<PriceListDetailField> = {
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

    const dataColumns: ColumnDef<PriceListDetailField>[] = [
      {
        accessorKey: "product_id",
        header: tfl("product"),
        cell: ({ row }) => (
          <ProductCell
            form={form}
            index={row.index}
            error={form.formState.errors.pricelist_detail?.[row.index]?.product_id?.message}
          />
        ),
        size: 280,
      },
      {
        accessorKey: "unit_id",
        header: tfl("unit"),
        cell: ({ row }) => (
          <UnitCell
            form={form}
            index={row.index}
            error={form.formState.errors.pricelist_detail?.[row.index]?.unit_id?.message}
          />
        ),
        size: 110,
      },
      {
        accessorKey: "moq_qty",
        header: tfl("moq"),
        cell: ({ row }) => (
          <FieldInput
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="0"
            className="h-7 text-right text-[0.6875rem]"
            error={form.formState.errors.pricelist_detail?.[row.index]?.moq_qty?.message}
            {...form.register(`pricelist_detail.${row.index}.moq_qty`, {
              valueAsNumber: true,
            })}
          />
        ),
        size: 72,
        meta: { headerClassName: "text-right" },
      },
      {
        accessorKey: "price_without_tax",
        header: tfl("unitPrice"),
        cell: ({ row }) => (
          <FieldInput
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder="0.00"
            className="h-7 text-right text-[0.6875rem]"
            error={form.formState.errors.pricelist_detail?.[row.index]?.price_without_tax?.message}
            {...form.register(
              `pricelist_detail.${row.index}.price_without_tax`,
              { valueAsNumber: true },
            )}
          />
        ),
        size: 100,
        meta: { headerClassName: "text-right" },
      },
      {
        accessorKey: "tax_profile_id",
        header: tfl("taxProfile"),
        cell: ({ row }) => (
          <TaxProfileCell
            form={form}
            index={row.index}
            error={form.formState.errors.pricelist_detail?.[row.index]?.tax_profile_id?.message}
          />
        ),
        size: 120,
      },
      {
        accessorKey: "tax_rate",
        header: tfl("taxPercent"),
        cell: ({ row }) => (
          <Input
            type="number" inputMode="decimal"
            placeholder="0"
            className="h-7 text-right text-[0.6875rem]"
            disabled
            {...form.register(`pricelist_detail.${row.index}.tax_rate`, {
              valueAsNumber: true,
            })}
          />
        ),
        size: 64,
        meta: { headerClassName: "text-right" },
      },
      {
        accessorKey: "tax_amt",
        header: tfl("taxAmt"),
        cell: ({ row }) => <TaxCalcCell form={form} index={row.index} />,
        size: 80,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        accessorKey: "price",
        header: tfl("total"),
        cell: ({ row }) => <PriceCell form={form} index={row.index} />,
        size: 90,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        accessorKey: "lead_time_days",
        header: tfl("leadTime"),
        cell: ({ row }) => (
          <FieldInput
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="0"
            className="h-7 text-right text-[0.6875rem]"
            error={form.formState.errors.pricelist_detail?.[row.index]?.lead_time_days?.message}
            {...form.register(`pricelist_detail.${row.index}.lead_time_days`, {
              valueAsNumber: true,
            })}
          />
        ),
        size: 72,
        meta: { headerClassName: "text-right" },
      },
    ];

    const actionColumn: ColumnDef<PriceListDetailField> = {
      id: "action",
      header: () => "",
      cell: ({ row }) => (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          aria-label={t("detail.removeItem")}
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

    return [indexColumn, ...dataColumns, actionColumn];
  }, [form, onDelete, t, tfl]);

  const table = useReactTable({
    data: detailFields,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return { table };
}
