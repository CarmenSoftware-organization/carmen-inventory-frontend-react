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
import { useMemo } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldInput } from "@/components/ui/field";
import { LookupLocation } from "@/components/lookup/lookup-location";
import { LookupProductInLocation } from "@/components/lookup/lookup-product-in-location";
import { LookupProductUnit } from "@/components/lookup/lookup-product-unit";
import { LookupCurrency } from "@/components/lookup/lookup-currency";
import { LookupDeliveryPoint } from "@/components/lookup/lookup-delivery-point";
import type { Product } from "@/types/product";
import type { PrtFormValues } from "./prt-form-schema";

/**
 * กำหนดข้อมูลสินค้าลงในรายการ PRT พร้อม sync unit
 * @param form - form instance ของ PRT
 * @param index - ตำแหน่งรายการ
 * @param value - product id
 * @param product - object สินค้า (optional)
 */
const setProductToItem = (
  form: UseFormReturn<PrtFormValues>,
  index: number,
  value: string,
  product?: Product,
) => {
  const current = form.getValues(`items.${index}`);
  // shouldDirty: true จำเป็น — setValue ทั้ง object เลี่ยง field.onChange ของ
  // Controller ทำให้ dirtyFields ไม่อัปเดต buildItemChanges (ที่ใช้ dirtyFields)
  // จะมองข้ามแถวนี้ตอน submit
  form.setValue(
    `items.${index}`,
    {
      ...current,
      product_id: value,
      ...(product
        ? {
            product_name: product.name,
            inventory_unit_id: product.inventory_unit.id,
            inventory_unit_name: product.inventory_unit.name,
            requested_unit_id: product.inventory_unit.id,
            requested_unit_name: product.inventory_unit.name,
          }
        : {
            product_name: "",
            inventory_unit_id: null,
            inventory_unit_name: "",
            requested_unit_id: null,
            requested_unit_name: "",
          }),
    },
    { shouldDirty: true },
  );
};

const ProductCell = ({
  control,
  form,
  index,
  disabled,
  readOnly,
}: {
  control: Control<PrtFormValues>;
  form: UseFormReturn<PrtFormValues>;
  index: number;
  disabled: boolean;
  readOnly: boolean;
}) => {
  const locationId =
    useWatch({ control, name: `items.${index}.location_id` }) ?? "";
  const productError =
    form.formState.errors.items?.[index]?.product_id?.message;
  return (
    <Controller
      control={control}
      name={`items.${index}.product_id`}
      render={({ field }) => (
        <LookupProductInLocation
          locationId={locationId}
          value={field.value ?? ""}
          onValueChange={(value, product) =>
            setProductToItem(form, index, value, product)
          }
          disabled={disabled}
          readOnly={readOnly}
          className="w-full text-xs"
          error={productError}
        />
      )}
    />
  );
};

const WatchedProductUnit = ({
  control,
  form,
  index,
  disabled,
  readOnly,
}: {
  control: Control<PrtFormValues>;
  form: UseFormReturn<PrtFormValues>;
  index: number;
  disabled: boolean;
  readOnly: boolean;
}) => {
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";
  const unitError =
    form.formState.errors.items?.[index]?.requested_unit_id?.message;
  return (
    <Controller
      control={control}
      name={`items.${index}.requested_unit_id`}
      render={({ field }) => (
        <LookupProductUnit
          productId={productId}
          value={field.value ?? ""}
          onValueChange={field.onChange}
          disabled={disabled}
          readOnly={readOnly}
          className="w-full text-xs"
          error={unitError}
        />
      )}
    />
  );
};

const QtyCell = ({
  control,
  form,
  index,
  disabled,
  readOnly,
}: {
  control: Control<PrtFormValues>;
  form: UseFormReturn<PrtFormValues>;
  index: number;
  disabled: boolean;
  readOnly: boolean;
}) => {
  const tfl = useTranslations("field");
  const qty = useWatch({ control, name: `items.${index}.requested_qty` });
  const qtyError = form.formState.errors.items?.[index]?.requested_qty?.message;

  if (readOnly) {
    return (
      <span className="text-xs">
        {qty == null || qty === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          qty
        )}
      </span>
    );
  }

  return (
    <FieldInput
      type="number"
      inputMode="decimal"
      min={1}
      placeholder={tfl("qty")}
      className={`h-6 text-right text-xs md:text-xs ${qtyError ? "pl-7" : ""}`}
      disabled={disabled}
      error={qtyError}
      errorIconAlign="left"
      {...form.register(`items.${index}.requested_qty`, {
        valueAsNumber: true,
      })}
    />
  );
};

export type PrtItemField = FieldArrayWithId<PrtFormValues, "items", "id">;

interface UsePrtItemTableOptions {
  form: UseFormReturn<PrtFormValues>;
  itemFields: PrtItemField[];
  disabled: boolean;
  readOnly?: boolean;
  onDelete: (index: number) => void;
}

/**
 * Hook สร้างตารางรายการสินค้าในเทมเพลต PR พร้อมคอลัมน์และ action ลบ
 * @param options - form, itemFields, disabled, readOnly และ callback ลบ
 * @returns table instance ของ react-table
 */
export function usePrtItemTable({
  form,
  itemFields,
  disabled,
  readOnly = false,
  onDelete,
}: UsePrtItemTableOptions) {
  const tfl = useTranslations("field");
  const allColumns = useMemo<ColumnDef<PrtItemField>[]>(() => {
    const indexColumn: ColumnDef<PrtItemField> = {
      id: "index",
      header: "#",
      cell: ({ row }) => row.index + 1,
      enableSorting: false,
      size: 50,
      meta: {
        headerClassName: "text-center",
        cellClassName: "text-center text-muted-foreground",
      },
    };

    const dataColumns: ColumnDef<PrtItemField>[] = [
      {
        accessorKey: "location_id",
        header: tfl("location"),
        cell: ({ row }) => {
          const locationError =
            form.formState.errors.items?.[row.index]?.location_id?.message;
          return (
            <Controller
              control={form.control}
              name={`items.${row.index}.location_id`}
              render={({ field }) => (
                <LookupLocation
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  onItemChange={(location) => {
                    if (location.delivery_point?.id) {
                      form.setValue(
                        `items.${row.index}.delivery_point_id`,
                        location.delivery_point.id,
                      );
                    }
                  }}
                  disabled={disabled}
                  readOnly={readOnly}
                  className="w-full text-xs"
                  popoverWidth="w-[30rem]"
                  error={locationError}
                />
              )}
            />
          );
        },
        size: 160,
      },

      {
        accessorKey: "product_id",
        header: tfl("product"),
        cell: ({ row }) => (
          <ProductCell
            control={form.control}
            form={form}
            index={row.index}
            disabled={disabled}
            readOnly={readOnly}
          />
        ),
        size: 160,
      },
      {
        id: "requested_qty",
        header: tfl("qty"),
        cell: ({ row }) => (
          <QtyCell
            control={form.control}
            form={form}
            index={row.index}
            disabled={disabled}
            readOnly={readOnly}
          />
        ),
        size: 60,
        meta: {
          headerClassName: "text-right",
          cellClassName: "text-right",
        },
      },
      {
        id: "requested_unit",
        header: tfl("unit"),
        cell: ({ row }) => (
          <WatchedProductUnit
            control={form.control}
            form={form}
            index={row.index}
            disabled={disabled}
            readOnly={readOnly}
          />
        ),
        size: 60,
      },
      {
        accessorKey: "currency_id",
        header: tfl("currency"),
        cell: ({ row }) => {
          const currencyError =
            form.formState.errors.items?.[row.index]?.currency_id?.message;
          return (
            <Controller
              control={form.control}
              name={`items.${row.index}.currency_id`}
              render={({ field }) => (
                <LookupCurrency
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  disabled={disabled}
                  readOnly={readOnly}
                  className="flex w-full justify-center text-xs"
                  error={currencyError}
                />
              )}
            />
          );
        },
        size: 60,
        meta: {
          headerClassName: "text-center",
        },
      },
      {
        accessorKey: "delivery_point_id",
        header: tfl("deliveryPoint"),
        cell: ({ row }) => {
          const deliveryPointError =
            form.formState.errors.items?.[row.index]?.delivery_point_id
              ?.message;
          return (
            <Controller
              control={form.control}
              name={`items.${row.index}.delivery_point_id`}
              render={({ field }) => (
                <LookupDeliveryPoint
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  disabled={disabled}
                  readOnly={readOnly}
                  className="w-full text-xs"
                  error={deliveryPointError}
                />
              )}
            />
          );
        },
        size: 100,
      },
    ];

    const actionColumn: ColumnDef<PrtItemField> = {
      id: "action",
      header: () => "",
      cell: ({ row }: { row: { index: number } }) => (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          aria-label="Remove"
          disabled={disabled}
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

    return [indexColumn, ...dataColumns, ...(readOnly ? [] : [actionColumn])];
  }, [tfl, readOnly, form, disabled, onDelete]);

  const table = useReactTable({
    data: itemFields,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return { table };
}
