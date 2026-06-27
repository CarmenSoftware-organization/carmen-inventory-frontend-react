"use no memo";

import { useTranslations } from "use-intl";
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
import { memo, useMemo, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LookupProduct } from "@/components/lookup/lookup-product";
import { LookupProductUnit } from "@/components/lookup/lookup-product-unit";
import { formatCurrency, round2 } from "@/lib/currency-utils";
import type { WrFormValues } from "./wr-form-schema";

/**
 * เซลล์ lookup สินค้าในตารางรายการของเสีย พร้อมอัปเดตชื่อ/โค้ด/หน่วยอัตโนมัติ
 * ใช้ memo เพื่อลด re-render ของ row อื่น
 *
 * @param props - control, form, index, สถานะ disabled/error
 * @param props.control - control จาก react-hook-form
 * @param props.form - form instance (สำหรับ setValue)
 * @param props.index - index ของแถว
 * @param props.disabled - สถานะ disabled
 * @param props.hasError - true ถ้า field นี้ invalid
 * @returns คอมโพเนนต์เซลล์ lookup สินค้า
 * @example
 * <ProductCell control={form.control} form={form} index={0} disabled={false} hasError={false} />
 */
const ProductCell = memo(function ProductCell({
  control,
  form,
  index,
  disabled,
  hasError,
}: {
  control: Control<WrFormValues>;
  form: UseFormReturn<WrFormValues>;
  index: number;
  disabled: boolean;
  hasError: boolean;
}) {
  return (
    <Controller
      control={control}
      name={`items.${index}.product_id`}
      render={({ field }) => (
        <LookupProduct
          value={field.value ?? ""}
          onValueChange={(value, product) => {
            field.onChange(value);
            if (product) {
              form.setValue(`items.${index}.product_name`, product.name);
              form.setValue(`items.${index}.product_code`, product.code);
              form.setValue(
                `items.${index}.unit_id`,
                product.inventory_unit?.id ?? "",
              );
              form.setValue(
                `items.${index}.unit_name`,
                product.inventory_unit?.name ?? "",
              );
            }
          }}
          disabled={disabled}
          className={`w-full h-6 text-xs${hasError ? " ring-1 ring-destructive rounded-md" : ""}`}
        />
      )}
    />
  );
});

/**
 * เซลล์เลือกหน่วยสินค้าแบบ watch product id เพื่อกรองรายการหน่วย
 * Disabled อัตโนมัติเมื่อยังไม่เลือก product
 *
 * @param props - control, index, สถานะ disabled/error
 * @param props.control - control จาก react-hook-form
 * @param props.index - index ของแถว
 * @param props.disabled - สถานะ disabled
 * @param props.hasError - true ถ้า field นี้ invalid
 * @returns คอมโพเนนต์ lookup หน่วยสินค้า
 * @example
 * <WatchedProductUnit control={form.control} index={0} disabled={false} hasError={false} />
 */
const WatchedProductUnit = memo(function WatchedProductUnit({
  control,
  index,
  disabled,
  hasError,
}: {
  control: Control<WrFormValues>;
  index: number;
  disabled: boolean;
  hasError: boolean;
}) {
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";

  return (
    <Controller
      control={control}
      name={`items.${index}.unit_id`}
      render={({ field }) => (
        <LookupProductUnit
          productId={productId}
          value={field.value ?? ""}
          onValueChange={field.onChange}
          disabled={disabled || !productId}
          className={`w-full text-xs${hasError ? " ring-1 ring-destructive rounded-md" : ""}`}
        />
      )}
    />
  );
});

/**
 * เซลล์คำนวณและแสดงมูลค่าความสูญเสีย (qty * unit_cost) แบบอัตโนมัติ
 * Watch qty + unit_cost และ memo loss value ด้วย round2
 *
 * @param props - control, form, index
 * @param props.control - control จาก react-hook-form
 * @param props.form - form instance
 * @param props.index - index ของแถว
 * @returns คอมโพเนนต์เซลล์แสดง loss value
 * @example
 * <LossValueCell control={form.control} form={form} index={0} />
 */
const LossValueCell = memo(function LossValueCell({
  control,
  form,
  index,
}: {
  control: Control<WrFormValues>;
  form: UseFormReturn<WrFormValues>;
  index: number;
}) {
  const qty = useWatch({ control, name: `items.${index}.qty` }) ?? 0;
  const unitCost =
    useWatch({ control, name: `items.${index}.unit_cost` }) ?? 0;

  const lossValue = useMemo(() => round2(qty * unitCost), [qty, unitCost]);

  useEffect(() => {
    form.setValue(`items.${index}.unit_cost`, unitCost);
  }, [lossValue, form, index, unitCost]);

  return (
    <span className="text-xs tabular-nums">{formatCurrency(lossValue)}</span>
  );
});

export type WrItemField = FieldArrayWithId<WrFormValues, "items", "id">;

interface UseWrItemTableOptions {
  form: UseFormReturn<WrFormValues>;
  itemFields: WrItemField[];
  disabled: boolean;
  onDelete: (index: number) => void;
}

/**
 * Hook สร้าง react-table instance สำหรับตารางรายการสินค้าใน Wastage Report
 * รวมคอลัมน์ index, product, qty, unit, unit_cost, loss_value, action
 *
 * @param options - form, itemFields, สถานะ disabled, onDelete
 * @param options.form - react-hook-form instance
 * @param options.itemFields - fields array จาก useFieldArray
 * @param options.disabled - true ถ้าอยู่ในโหมด view
 * @param options.onDelete - callback เมื่อลบแถว
 * @returns object ที่มี react-table instance
 * @example
 * const { table } = useWrItemTable({ form, itemFields, disabled, onDelete });
 */
export function useWrItemTable({
  form,
  itemFields,
  disabled,
  onDelete,
}: UseWrItemTableOptions) {
  const tfl = useTranslations("field");
  const tc = useTranslations("common");
  const allColumns = useMemo<ColumnDef<WrItemField>[]>(() => {
    const indexColumn: ColumnDef<WrItemField> = {
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

    const dataColumns: ColumnDef<WrItemField>[] = [
      {
        accessorKey: "product_id",
        header: tfl("product"),
        cell: ({ row }) => {
          const hasError =
            !!form.formState.errors.items?.[row.index]?.product_id;
          return (
            <ProductCell
              control={form.control}
              form={form}
              index={row.index}
              disabled={disabled}
              hasError={hasError}
            />
          );
        },
        size: 240,
      },
      {
        accessorKey: "qty",
        header: tfl("qty"),
        cell: ({ row }) => {
          const hasError = !!form.formState.errors.items?.[row.index]?.qty;
          return (
            <Input
              type="number" inputMode="decimal"
              min={1}
              placeholder={tfl("qty")}
              className={`h-6 text-xs md:text-xs text-right${hasError ? " ring-1 ring-destructive" : ""}`}
              disabled={disabled}
              {...form.register(`items.${row.index}.qty`, {
                valueAsNumber: true,
              })}
            />
          );
        },
        size: 80,
        meta: { headerClassName: "text-right" },
      },
      {
        accessorKey: "unit_id",
        header: tfl("unit"),
        cell: ({ row }) => {
          const hasError = !!form.formState.errors.items?.[row.index]?.unit_id;
          return (
            <WatchedProductUnit
              control={form.control}
              index={row.index}
              disabled={disabled}
              hasError={hasError}
            />
          );
        },
        size: 120,
      },
      {
        accessorKey: "unit_cost",
        header: tfl("unitCost"),
        cell: ({ row }) => {
          const hasError =
            !!form.formState.errors.items?.[row.index]?.unit_cost;
          return (
            <Input
              type="number" inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="0.00"
              className={`h-6 text-xs md:text-xs text-right${hasError ? " ring-1 ring-destructive" : ""}`}
              disabled={disabled}
              {...form.register(`items.${row.index}.unit_cost`, {
                valueAsNumber: true,
              })}
            />
          );
        },
        size: 100,
        meta: { headerClassName: "text-right" },
      },
      {
        id: "loss_value",
        header: tfl("lossValue"),
        cell: ({ row }) => (
          <LossValueCell
            control={form.control}
            form={form}
            index={row.index}
          />
        ),
        size: 100,
        meta: {
          headerClassName: "text-right",
          cellClassName: "text-right",
        },
      },
    ];

    const actionColumn: ColumnDef<WrItemField> = {
      id: "action",
      header: () => "",
      cell: ({ row }: { row: { index: number } }) => (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          aria-label={tc("removeRow")}
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
  }, [form, disabled, onDelete, tfl, tc]);

  const table = useReactTable({
    data: itemFields,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return { table };
}
