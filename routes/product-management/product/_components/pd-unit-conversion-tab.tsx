"use no memo";

import { memo, useState, useMemo } from "react";
import { useTranslations } from "use-intl";
import {
  Controller,
  useFieldArray,
  useWatch,
  type FieldArrayWithId,
} from "react-hook-form";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldInput } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useUnit } from "@/hooks/use-unit";
import EmptyComponent from "@/components/empty-component";
import type { ProductFormInstance, ProductFormValues } from "@/types/product";
import { FromUnitCell, ToUnitCell, ConversionPreview } from "./pd-unit-cells";

type UnitField = FieldArrayWithId<
  ProductFormValues,
  "order_units" | "ingredient_units",
  "_fieldKey"
>;

interface UnitConversionTabProps {
  form: ProductFormInstance;
  name: "order_units" | "ingredient_units";
  label: string;
  isDisabled: boolean;
}

function UnitConversionTab({
  form,
  name,
  label,
  isDisabled,
}: UnitConversionTabProps) {
  const t = useTranslations("productManagement.product");
  const tfl = useTranslations("field");
  const { fields, prepend, remove } = useFieldArray({
    control: form.control,
    name,
    keyName: "_fieldKey",
  });

  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const isOrder = name === "order_units";
  const inventoryUnitId = useWatch({
    control: form.control,
    name: "inventory_unit_id",
  });
  const isUsedInRecipe = useWatch({
    control: form.control,
    name: "is_used_in_recipe",
  });

  /* ---- Resolve unit names ---- */
  const { data: unitData } = useUnit({ perpage: -1 });
  const unitMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of unitData?.data ?? []) {
      m.set(u.id, u.name);
    }
    return m;
  }, [unitData?.data]);

  const inventoryUnitName = unitMap.get(inventoryUnitId) ?? "";

  /* ---- Collect used unit IDs for exclude filtering ---- */
  // Stable string-key so `usedSelectableIds` reference is preserved when
  // only qty/desc fields change. Keeps `columns` reference stable so cells
  // aren't remounted and inputs keep their focus.
  const watchedUnits = useWatch({ control: form.control, name });
  const usedIdsKey = (watchedUnits ?? [])
    .map((u) => (isOrder ? u.from_unit_id : u.to_unit_id) ?? "")
    .join("|");
  const usedSelectableIds = useMemo(
    () => (usedIdsKey ? usedIdsKey.split("|").filter(Boolean) : []),
    [usedIdsKey],
  );

  /* ---- Add disabled conditions ---- */
  const addDisabled =
    isDisabled || !inventoryUnitId || (!isOrder && !isUsedInRecipe);

  /* ---- Handle add ---- */
  const handleAdd = () => {
    prepend({
      from_unit_id: isOrder ? "" : inventoryUnitId,
      from_unit_qty: 1,
      to_unit_id: isOrder ? inventoryUnitId : "",
      to_unit_qty: 1,
      description: "",
      is_default: fields.length === 0,
      is_active: true,
    });
  };

  const confirmDelete = () => {
    if (deleteIndex !== null) {
      remove(deleteIndex);
      setDeleteIndex(null);
    }
  };

  /* ---- Column definitions ---- */
  const columns = useMemo<ColumnDef<UnitField>[]>(() => {
    // Handlers live inside useMemo so cells always see the latest closure
    // without forcing `columns` to rebuild every render. `form` and `name`
    // are stable, and `handleDefaultChange` reads via form.getValues to
    // avoid depending on the unstable `fields` reference.
    const handleDefaultChange = (index: number) => {
      const allFields = form.getValues(name);
      allFields.forEach((f, i) => {
        if (i !== index && f.is_default) {
          form.setValue(`${name}.${i}.is_default`, false, {
            shouldDirty: true,
          });
        }
      });
      form.setValue(`${name}.${index}.is_default`, true, { shouldDirty: true });
    };

    const handleFromUnitChange = (index: number, unitId: string) => {
      form.setValue(`${name}.${index}.from_unit_id`, unitId);
      const toUnit = form.getValues(`${name}.${index}.to_unit_id`);
      if (unitId && unitId === toUnit) {
        const fromQty = form.getValues(`${name}.${index}.from_unit_qty`);
        form.setValue(`${name}.${index}.to_unit_qty`, fromQty);
      }
    };

    const handleToUnitChange = (index: number, unitId: string) => {
      form.setValue(`${name}.${index}.to_unit_id`, unitId);
      const fromUnit = form.getValues(`${name}.${index}.from_unit_id`);
      if (unitId && unitId === fromUnit) {
        const fromQty = form.getValues(`${name}.${index}.from_unit_qty`);
        form.setValue(`${name}.${index}.to_unit_qty`, fromQty);
      }
    };

    const indexCol: ColumnDef<UnitField> = {
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

    const dataCols: ColumnDef<UnitField>[] = [
      {
        accessorKey: "from_unit_id",
        header: tfl("fromUnit"),
        cell: ({ row }) => (
          <FromUnitCell
            control={form.control}
            name={name}
            index={row.index}
            isOrder={isOrder}
            inventoryUnitName={inventoryUnitName}
            disabled={isDisabled}
            onUnitChange={handleFromUnitChange}
            usedIds={usedSelectableIds}
            unitMap={unitMap}
            error={
              form.formState.errors[name]?.[row.index]?.from_unit_id?.message
            }
          />
        ),
        size: 160,
      },
      {
        accessorKey: "from_unit_qty",
        header: tfl("fromQty"),
        cell: ({ row }) => (
          <div className="text-muted-foreground flex items-center justify-end px-2 text-xs tabular-nums">
            <input
              type="hidden"
              {...form.register(`${name}.${row.index}.from_unit_qty`)}
            />
            {row.original.from_unit_qty}
          </div>
        ),
        size: 90,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        accessorKey: "to_unit_id",
        header: tfl("toUnit"),
        cell: ({ row }) => (
          <ToUnitCell
            control={form.control}
            name={name}
            index={row.index}
            isOrder={isOrder}
            inventoryUnitName={inventoryUnitName}
            disabled={isDisabled}
            onUnitChange={handleToUnitChange}
            usedIds={usedSelectableIds}
            unitMap={unitMap}
            error={
              form.formState.errors[name]?.[row.index]?.to_unit_id?.message
            }
          />
        ),
        size: 160,
      },
      {
        accessorKey: "to_unit_qty",
        header: tfl("toQty"),
        cell: ({ row }) => {
          if (isDisabled) {
            return (
              <div className="flex items-center justify-end px-2 text-xs tabular-nums">
                {row.original.to_unit_qty}
              </div>
            );
          }
          const errorMessage =
            form.formState.errors[name]?.[row.index]?.to_unit_qty?.message;
          return (
            <div className="flex items-center">
              <FieldInput
                type="number"
                inputMode="decimal"
                step="any"
                min={1}
                className="h-8 text-right text-xs tabular-nums md:text-xs"
                error={errorMessage}
                errorIconAlign="left"
                {...form.register(`${name}.${row.index}.to_unit_qty`)}
              />
            </div>
          );
        },
        size: 90,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        id: "conversion",
        header: tfl("conversion"),
        cell: ({ row }) => (
          <ConversionPreview
            control={form.control}
            name={name}
            index={row.index}
            unitMap={unitMap}
          />
        ),
        enableSorting: false,
        size: 160,
      },
      {
        accessorKey: "is_default",
        header: tfl("isDefault"),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Controller
              control={form.control}
              name={`${name}.${row.index}.is_default`}
              render={({ field: f }) => (
                <input
                  type="radio"
                  name={`${name}-default`}
                  aria-label={tfl("isDefault")}
                  checked={f.value}
                  onChange={() => handleDefaultChange(row.index)}
                  disabled={isDisabled}
                  className="accent-primary h-3.5 w-3.5"
                />
              )}
            />
          </div>
        ),
        enableSorting: false,
        size: 60,
        meta: {
          headerClassName: "text-center",
          cellClassName: "text-center",
        },
      },
      {
        accessorKey: "is_active",
        header: tfl("active"),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Controller
              control={form.control}
              name={`${name}.${row.index}.is_active`}
              render={({ field: f }) => (
                <Checkbox
                  checked={f.value}
                  onCheckedChange={f.onChange}
                  disabled={isDisabled}
                  aria-label={tfl("active")}
                  className="size-3.5"
                />
              )}
            />
          </div>
        ),
        enableSorting: false,
        size: 60,
        meta: {
          headerClassName: "text-center",
          cellClassName: "text-center",
        },
      },
    ];

    const actionCol: ColumnDef<UnitField> = {
      id: "action",
      header: () => "",
      cell: ({ row }) => (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          aria-label="Remove"
          onClick={() => setDeleteIndex(row.index)}
        >
          <X />
        </Button>
      ),
      enableSorting: false,
      size: 40,
      meta: {
        headerClassName: "text-right",
        cellClassName: "text-right",
      },
    };

    return [indexCol, ...dataCols, ...(isDisabled ? [] : [actionCol])];
  }, [
    tfl,
    isDisabled,
    form,
    name,
    isOrder,
    inventoryUnitName,
    unitMap,
    usedSelectableIds,
  ]);

  const table = useReactTable({
    data: fields,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row._fieldKey,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          {label}{" "}
          <span className="text-muted-foreground text-xs font-normal">
            ({fields.length})
          </span>
        </h2>
        {!isDisabled && (
          <Button
            type="button"
            size="sm"
            disabled={addDisabled}
            onClick={handleAdd}
          >
            <Plus />
            {t("addUnit", { label })}
          </Button>
        )}
      </div>

      {!isOrder && !isUsedInRecipe && (
        <p className="text-muted-foreground text-sm">{t("enableRecipe")}</p>
      )}

      <DataGrid
        table={table}
        recordCount={fields.length}
        tableLayout={{ rowRounded: true }}
        tableClassNames={{ bodyRow: "[&>td]:py-3", headerRow: "[&>th]:py-3" }}
        emptyMessage={
          <EmptyComponent
            title={t("noUnits", { label })}
            description={t("addFirstConversionHint")}
            content={
              !isDisabled &&
              !addDisabled && (
                <Button type="button" size="xs" onClick={handleAdd}>
                  <Plus aria-hidden="true" />
                  {t("addFirstConversion")}
                </Button>
              )
            }
          />
        }
      >
        <DataGridContainer>
          <ScrollArea className="w-full pb-2">
            <DataGridTable />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </DataGridContainer>
      </DataGrid>

      <DeleteDialog
        open={deleteIndex !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteIndex(null);
        }}
        title={t("removeUnit", { label })}
        description={t("removeUnitConfirm", { label })}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

export default memo(UnitConversionTab);
