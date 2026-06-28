import {
  Controller,
  useWatch,
  type UseFormReturn,
  type FieldArrayWithId,
} from "react-hook-form";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { memo, useMemo } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldInput } from "@/components/ui/field";
import { LookupProduct } from "@/components/lookup/lookup-product";
import { LookupProductUnit } from "@/components/lookup/lookup-product-unit";
import type { PltFormValues } from "./plt-form-schema";

export type PltDetailField = FieldArrayWithId<PltFormValues, "details", "id">;

interface UsePltDetailTableOptions {
  form: UseFormReturn<PltFormValues>;
  detailFields: PltDetailField[];
  onDelete: (index: number) => void;
}

const ProductCell = memo(function ProductCell({
  form,
  index,
  error,
}: {
  form: UseFormReturn<PltFormValues>;
  index: number;
  error?: string;
}) {
  "use no memo";
  return (
    <Controller
      control={form.control}
      name={`details.${index}.product_id`}
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
  form: UseFormReturn<PltFormValues>;
  index: number;
  error?: string;
}) {
  "use no memo";
  const productId =
    useWatch({
      control: form.control,
      name: `details.${index}.product_id`,
    }) ?? "";
  return (
    <Controller
      control={form.control}
      name={`details.${index}.unit_id`}
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

export function usePltDetailTable({
  form,
  detailFields,
  onDelete,
}: UsePltDetailTableOptions) {
  "use no memo";
  const allColumns = useMemo<ColumnDef<PltDetailField>[]>(() => {
    const indexColumn: ColumnDef<PltDetailField> = {
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

    const dataColumns: ColumnDef<PltDetailField>[] = [
      {
        accessorKey: "product_id",
        header: "Product",
        cell: ({ row }) => (
          <ProductCell
            form={form}
            index={row.index}
            error={form.formState.errors.details?.[row.index]?.product_id?.message}
          />
        ),
        size: 240,
      },
      {
        accessorKey: "unit_id",
        header: "Unit",
        cell: ({ row }) => (
          <UnitCell
            form={form}
            index={row.index}
            error={form.formState.errors.details?.[row.index]?.unit_id?.message}
          />
        ),
        size: 140,
      },
      {
        accessorKey: "qty",
        header: "MOQ Qty",
        cell: ({ row }) => (
          <FieldInput
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="0"
            className="h-8 text-right text-xs"
            error={form.formState.errors.details?.[row.index]?.qty?.message}
            {...form.register(`details.${row.index}.qty`, {
              valueAsNumber: true,
            })}
          />
        ),
        size: 90,
        meta: { headerClassName: "text-right" },
      },
    ];

    const actionCol: ColumnDef<PltDetailField> = {
      id: "action",
      header: () => "",
      cell: ({ row }) => (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          aria-label="Remove item"
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

    return [indexColumn, ...dataColumns, actionCol];
  }, [form, onDelete]);

  const table = useReactTable({
    data: detailFields,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return { table };
}
