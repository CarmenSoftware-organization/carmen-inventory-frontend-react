import { useEffect, useRef } from "react";
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
import { InventoryDialog } from "@/components/share/inventory-dialog";
import { NameWithSubtext } from "@/components/share/name-with-sub-text";
import { useProfile } from "@/hooks/use-profile";
import { useProductCostByLocationQty } from "@/hooks/use-product-cost";
import { cn } from "@/lib/utils";
import type { InventoryAdjustmentType } from "@/types/inventory-adjustment";
import type { AdjFormValues } from "./ia-form-schema";

const ProductInventoryDialog = memo(function ProductInventoryDialog({
  control,
  index,
}: {
  control: Control<AdjFormValues>;
  index: number;
}) {
  "use no memo";
  const { buCode } = useProfile();
  const locationId = useWatch({ control, name: "location_id" }) ?? "";
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";
  return (
    <InventoryDialog
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
  "use no memo";
  const total = useWatch({ control, name: `items.${index}.total_cost` });
  return (
    <span className="block text-right text-xs tabular-nums">
      {(total ?? 0).toFixed(2)}
    </span>
  );
});

/** ชุดค่าที่ราคาจาก API ผูกอยู่ด้วย — ต่างจากเดิมเมื่อไหร่ถึงจะเขียนราคาทับ */
const costKey = (productId: string, locationId: string, qty: number) =>
  `${productId}|${locationId}|${qty}`;

const CostProbe = memo(function CostProbe({
  form,
  index,
}: {
  form: UseFormReturn<AdjFormValues>;
  index: number;
}) {
  "use no memo";
  const { buCode } = useProfile();
  const { control } = form;
  const locationId = useWatch({ control, name: "location_id" }) ?? "";
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";
  const qty = useWatch({ control, name: `items.${index}.qty` });
  const probeQty = typeof qty === "number" ? qty : 0;
  const { data } = useProductCostByLocationQty(
    buCode,
    productId || undefined,
    locationId || undefined,
    probeQty,
  );
  // ชุดค่าที่ราคาผูกอยู่ด้วยของรอบที่เขียนไปล่าสุด — ref อยู่กับ component instance
  // ซึ่งติดไปกับแถวเดิมเพราะตาราง getRowId ด้วย id ของ field array (ไม่ใช่ index)
  //
  // แถวที่มีราคาอยู่แล้วตอน mount ถือว่า "เขียนแล้ว" ตั้งแต่ต้น ไม่งั้น probe จะทับ
  // ราคาที่เซฟไว้ทันทีที่ตัวเองเกิดใหม่ — ซึ่งเกิดทุกครั้งที่ฟอร์มปลดล็อก เพราะ
  // CostProbe ถูก render เฉพาะตอน `disabled` เป็น false: เปิดใบเก่าอยู่โหมด view
  // (ไม่มี probe) กด Edit ทีเดียว probe เกิดใหม่แล้วดูดราคาจาก cache มาทับ ราคาที่
  // ส่งตอนกด Commit จึงเป็นราคาที่ fetch มา ไม่ใช่ราคาที่พิมพ์ไว้
  const mountedItem = form.getValues(`items.${index}`);
  const appliedKey = useRef<string | null>(
    mountedItem?.id || mountedItem?.cost_per_unit
      ? costKey(productId, locationId, probeQty)
      : null,
  );
  useEffect(() => {
    if (!data) return;
    const key = costKey(productId, locationId, probeQty);
    // เขียนทับเฉพาะตอน สินค้า/คลัง/จำนวน เปลี่ยนจริง — effect ตัวนี้ยิงซ้ำได้จาก
    // หลายทางที่ไม่ใช่การแก้ข้อมูล (กดเพิ่มแถวซึ่ง prepend ดัน index ของทุกแถว +1,
    // ลบแถว, refetch ตาม staleTime: 0) ทุกครั้งมันเคยลบราคาที่ผู้ใช้พิมพ์เองทิ้ง
    if (appliedKey.current === key) return;
    appliedKey.current = key;
    form.setValue(`items.${index}.cost_per_unit`, data.average_cost_per_unit, {
      shouldDirty: true,
    });
    form.setValue(`items.${index}.total_cost`, data.total_cost, {
      shouldDirty: true,
    });
    if (
      typeof data.requested_qty === "number" &&
      data.requested_qty !== form.getValues(`items.${index}.qty`)
    ) {
      form.setValue(`items.${index}.qty`, data.requested_qty, {
        shouldDirty: true,
      });
    }
    const unitName = data.inventory_unit_name ?? data.unit_name;
    if (unitName && !form.getValues(`items.${index}.unit_name`)) {
      form.setValue(`items.${index}.unit_name`, unitName);
    }
  }, [data, form, index, productId, locationId, probeQty]);
  return null;
});

const ProductCell = memo(function ProductCell({
  control,
  form,
  index,
  disabled,
  errorMessage,
  excludeIds,
  autoOpen,
  onPicked,
}: {
  control: Control<AdjFormValues>;
  form: UseFormReturn<AdjFormValues>;
  index: number;
  disabled: boolean;
  errorMessage?: string;
  excludeIds?: string[];
  autoOpen?: boolean;
  onPicked?: () => void;
}) {
  "use no memo";
  const locationId = useWatch({ control, name: "location_id" }) ?? "";
  const productName =
    useWatch({ control, name: `items.${index}.product_name` }) ?? "";
  const productLocalName =
    useWatch({ control, name: `items.${index}.product_local_name` }) ?? "";
  if (disabled) {
    return (
      <div className="flex items-center justify-between gap-1.5 text-xs">
        <div className="min-w-0 flex-1">
          {/* ชื่อสินค้า + ชื่อท้องถิ่นบรรทัดล่าง ใช้ primitive ตัวเดียวกับ PO/SR */}
          <NameWithSubtext
            primary={productName || "—"}
            secondary={productLocalName}
          />
        </div>
        <ProductInventoryDialog control={control} index={index} />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-1.5 pr-4">
      <div className="min-w-0 flex-1">
        <Controller
          control={control}
          name={`items.${index}.product_id`}
          render={({ field }) => (
            <LookupProductInLocation
              locationId={locationId}
              value={field.value ?? ""}
              defaultOpen={autoOpen}
              onValueChange={(value, product) => {
                field.onChange(value);
                onPicked?.();
                if (product) {
                  form.setValue(`items.${index}.product_name`, product.name);
                  form.setValue(
                    `items.${index}.product_local_name`,
                    product.local_name ?? "",
                  );
                  form.setValue(
                    `items.${index}.unit_name`,
                    product.inventory_unit?.name ??
                      product.inventory_unit_name ??
                      "",
                  );
                }
              }}
              disabled={!locationId}
              excludeIds={excludeIds}
              defaultLabel={productName}
              className="w-full text-xs"
              error={errorMessage}
            />
          )}
        />
      </div>
      <ProductInventoryDialog control={control} index={index} />
      <CostProbe form={form} index={index} />
    </div>
  );
});

const UnitCell = memo(function UnitCell({
  control,
  index,
}: {
  control: Control<AdjFormValues>;
  index: number;
}) {
  "use no memo";
  const unitName = useWatch({ control, name: `items.${index}.unit_name` });
  return (
    <span className="text-muted-foreground text-xs">{unitName || "—"}</span>
  );
});

export type AdjItemField = FieldArrayWithId<AdjFormValues, "items", "id">;

interface UseAdjItemTableOptions {
  form: UseFormReturn<AdjFormValues>;
  itemFields: AdjItemField[];
  disabled: boolean;
  onDelete: (index: number) => void;
  adjustmentType: InventoryAdjustmentType;
  autoOpenFirst?: boolean;
  onProductPicked?: () => void;
}

export function useAdjItemTable({
  form,
  itemFields,
  disabled,
  onDelete,
  adjustmentType,
  autoOpenFirst,
  onProductPicked,
}: UseAdjItemTableOptions) {
  "use no memo";
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
              autoOpen={autoOpenFirst && row.index === 0}
              onPicked={onProductPicked}
            />
          );
        },
        size: 240,
      },
      {
        accessorKey: "unit_name",
        header: tfl("unit"),
        cell: ({ row }) => (
          <UnitCell control={form.control} index={row.index} />
        ),
        size: 40,
        meta: {
          cellClassName: "text-center",
          headerClassName: "text-center",
        },
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
              min={0}
              step="any"
              placeholder={tfl("qty")}
              className={cn(
                "text-right text-xs md:text-xs",
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
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
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
                "text-right text-xs md:text-xs",
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
  }, [
    form,
    disabled,
    onDelete,
    tfl,
    adjustmentType,
    autoOpenFirst,
    onProductPicked,
  ]);

  const table = useReactTable({
    data: itemFields,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return { table };
}
