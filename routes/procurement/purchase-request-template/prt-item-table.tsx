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
import {
  InputSuffixAddon,
  InputSuffixField,
  InputSuffixInput,
  InputSuffixPlain,
} from "@/components/ui/input/input-suffix";
import { LookupLocation } from "@/components/lookup/lookup-location";
import { LookupProductInLocation } from "@/components/lookup/lookup-product-in-location";
import { NameWithSubtext } from "@/components/share/name-with-sub-text";
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
  "use no memo";
  const locationId =
    useWatch({ control, name: `items.${index}.location_id` }) ?? "";
  const productName =
    useWatch({ control, name: `items.${index}.product_name` }) ?? "";
  const productLocalName =
    useWatch({ control, name: `items.${index}.product_local_name` }) ?? "";
  const productError =
    form.formState.errors.items?.[index]?.product_id?.message;
  if (readOnly) {
    return (
      <NameWithSubtext primary={productName} secondary={productLocalName} />
    );
  }
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
  "use no memo";
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
          className="w-20 shrink-0 rounded-none border-0 bg-transparent px-2 text-xs shadow-none hover:bg-transparent focus-visible:ring-0"
          error={unitError}
        />
      )}
    />
  );
};

// รวม qty + unit เป็น InputSuffix เดียว (เหมือน GRN): input จำนวน + addon เลือกหน่วย
const QtyUnitCell = ({
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
  "use no memo";
  const tfl = useTranslations("field");
  const qty = useWatch({ control, name: `items.${index}.requested_qty` });
  const unitName =
    useWatch({ control, name: `items.${index}.requested_unit_name` }) ?? "";
  const qtyError = form.formState.errors.items?.[index]?.requested_qty?.message;

  if (readOnly) {
    return (
      <InputSuffixPlain
        value={
          qty == null || qty === 0 ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            qty
          )
        }
        suffix={unitName}
      />
    );
  }

  return (
    <InputSuffixField error={!!qtyError} disabled={disabled}>
      <InputSuffixInput
        type="number"
        inputMode="decimal"
        min={1}
        placeholder={tfl("qty")}
        {...form.register(`items.${index}.requested_qty`, {
          valueAsNumber: true,
        })}
      />
      <InputSuffixAddon>
        <WatchedProductUnit
          control={control}
          form={form}
          index={index}
          disabled={disabled}
          readOnly={readOnly}
        />
      </InputSuffixAddon>
    </InputSuffixField>
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
  "use no memo";
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
          if (readOnly) {
            return (
              <NameWithSubtext
                primary={form.getValues(`items.${row.index}.location_name`)}
                secondary={form.getValues(`items.${row.index}.location_code`)}
              />
            );
          }
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
        header: tfl("requestedAbbr"),
        cell: ({ row }) => (
          <QtyUnitCell
            control={form.control}
            form={form}
            index={row.index}
            disabled={disabled}
            readOnly={readOnly}
          />
        ),
        size: 150,
        meta: {
          headerClassName: "text-right",
          cellClassName: "text-right",
        },
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
                  size="sm"
                />
              )}
            />
          );
        },
        size: 80,
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
