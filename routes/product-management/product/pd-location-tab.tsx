import { memo, useState } from "react";
import { useTranslations } from "use-intl";
import { Controller, useFieldArray, useWatch } from "react-hook-form";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Plus, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { LookupLocation } from "@/components/lookup/lookup-location";
import EmptyComponent from "@/components/empty-component";
import type { ProductFormInstance, ProductFormValues } from "@/types/product";

interface LocationRow {
  fieldId: string;
  fieldIndex: number;
  location_id: string;
  location_code: string;
  location_name: string;
  location_type: string;
  is_active: boolean | null | undefined;
  delivery_point: string;
  min_qty: number | null;
  max_qty: number | null;
  re_order_qty: number | null;
  par_qty: number | null;
}

const EMPTY_LOCATIONS: ProductFormValues["locations"] = [];

const TYPE_VARIANT: Record<string, "info" | "warning" | "secondary"> = {
  inventory: "info",
  direct: "warning",
  consignment: "secondary",
};

interface LocationsTabProps {
  readonly form: ProductFormInstance;
  readonly isDisabled: boolean;
}

function LocationsTab({ form, isDisabled }: LocationsTabProps) {
  "use no memo";
  const t = useTranslations("productManagement.product");
  const tfl = useTranslations("field");
  const ts = useTranslations("status");

  const { fields, prepend, remove } = useFieldArray({
    control: form.control,
    name: "locations",
    keyName: "_fieldKey",
  });

  const rawWatched = useWatch({ control: form.control, name: "locations" });
  const watchedLocations = rawWatched ?? EMPTY_LOCATIONS;

  const [search, setSearch] = useState("");
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);

  const assignedIds = watchedLocations.map((l) => l.location_id ?? "");

  const allRows: LocationRow[] = fields
    .map((field, index) => {
      const watched = watchedLocations[index];
      return {
        fieldId: field._fieldKey,
        fieldIndex: index,
        location_id: watched?.location_id ?? "",
        location_code: watched?.location_code ?? "",
        location_name: watched?.location_name ?? "",
        location_type: watched?.location_type ?? "",
        is_active: watched?.is_active,
        delivery_point: watched?.delivery_point ?? "",
        min_qty: watched?.min_qty ?? null,
        max_qty: watched?.max_qty ?? null,
        re_order_qty: watched?.re_order_qty ?? null,
        par_qty: watched?.par_qty ?? null,
      };
    })
    .sort(
      (a, b) =>
        a.location_code.localeCompare(b.location_code) ||
        a.location_name.localeCompare(b.location_name),
    );

  const q = search.toLowerCase();
  const tableData = !search
    ? allRows
    : allRows.filter((row) => {
        if (!row.location_id) return true;
        return (
          row.location_name.toLowerCase().includes(q) ||
          row.location_type.toLowerCase().includes(q) ||
          row.delivery_point.toLowerCase().includes(q)
        );
      });

  const handleAdd = () => {
    prepend({
      location_id: "",
      location_code: "",
      location_name: "",
      min_qty: null,
      max_qty: null,
      re_order_qty: null,
      par_qty: null,
    });
  };

  const confirmDelete = () => {
    if (deleteIdx !== null) {
      remove(deleteIdx);
      setDeleteIdx(null);
    }
  };

  const columns: ColumnDef<LocationRow>[] = (() => {
    const indexCol: ColumnDef<LocationRow> = {
      id: "index",
      header: "#",
      // row.index = position in current (sorted/filtered) row model → sequential
      // even after the data is re-ordered. fieldIndex is the form-array index
      // used for setValue/remove and must NOT be shown as the row number.
      cell: ({ row }) => row.index + 1,
      enableSorting: false,
      size: 32,
      meta: {
        headerClassName: "text-center",
        cellClassName: "text-center text-muted-foreground",
      },
    };

    const dataCols: ColumnDef<LocationRow>[] = [
      {
        id: "location",
        header: tfl("location"),
        cell: ({ row }) => {
          const { location_code, location_name, location_type, fieldIndex } =
            row.original;
          const typeBadge = location_type ? (
            <Badge
              variant={TYPE_VARIANT[location_type] ?? "secondary"}
              size="xs"
            >
              {location_type.toUpperCase()}
            </Badge>
          ) : null;

          if (isDisabled) {
            return (
              <span className="flex items-center gap-1.5 px-2 text-xs">
                {location_code && (
                  <span className="text-muted-foreground">{location_code}</span>
                )}
                {location_name}
                {typeBadge}
              </span>
            );
          }

          const errorMessage =
            form.formState.errors.locations?.[fieldIndex]?.location_id?.message;
          return (
            <Controller
              control={form.control}
              name={`locations.${fieldIndex}.location_id`}
              render={({ field }) => (
                <LookupLocation
                  value={field.value}
                  onValueChange={field.onChange}
                  onItemChange={(loc) => {
                    form.setValue(
                      `locations.${fieldIndex}.location_code`,
                      loc.code,
                    );
                    form.setValue(
                      `locations.${fieldIndex}.location_name`,
                      loc.name,
                    );
                    form.setValue(
                      `locations.${fieldIndex}.location_type`,
                      loc.location_type,
                    );
                    form.setValue(
                      `locations.${fieldIndex}.is_active`,
                      loc.is_active,
                    );
                    form.setValue(
                      `locations.${fieldIndex}.delivery_point`,
                      loc.delivery_point?.name ?? "",
                    );
                    form.setValue(
                      `locations.${fieldIndex}.delivery_point_id`,
                      loc.delivery_point?.id ?? "",
                    );
                  }}
                  excludeIds={assignedIds.filter((id) => id !== field.value)}
                  defaultLabel={location_name}
                  className="w-full"
                  size="xs"
                  popoverWidth="w-[26.25rem]"
                  error={errorMessage}
                />
              )}
            />
          );
        },
        size: 300,
      },
      {
        id: "min_qty",
        header: t("minQty"),
        cell: ({ row }) =>
          isDisabled ? (
            <span className="text-xs tabular-nums">
              {row.original.min_qty ?? ""}
            </span>
          ) : (
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              placeholder=""
              className="h-6 w-24 text-right text-xs tabular-nums"
              {...form.register(
                `locations.${row.original.fieldIndex}.min_qty`,
                { valueAsNumber: true },
              )}
            />
          ),
        size: 110,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        id: "max_qty",
        header: t("maxQty"),
        cell: ({ row }) =>
          isDisabled ? (
            <span className="text-xs tabular-nums">
              {row.original.max_qty ?? ""}
            </span>
          ) : (
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              placeholder=""
              className="h-6 w-24 text-right text-xs tabular-nums"
              {...form.register(
                `locations.${row.original.fieldIndex}.max_qty`,
                { valueAsNumber: true },
              )}
            />
          ),
        size: 110,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        id: "re_order_qty",
        header: t("reorderQty"),
        cell: ({ row }) =>
          isDisabled ? (
            <span className="text-xs tabular-nums">
              {row.original.re_order_qty ?? ""}
            </span>
          ) : (
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              placeholder=""
              className="h-6 w-24 text-right text-xs tabular-nums"
              {...form.register(
                `locations.${row.original.fieldIndex}.re_order_qty`,
                { valueAsNumber: true },
              )}
            />
          ),
        size: 120,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        id: "par_qty",
        header: t("parQty"),
        cell: ({ row }) =>
          isDisabled ? (
            <span className="text-xs tabular-nums">
              {row.original.par_qty ?? ""}
            </span>
          ) : (
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              placeholder=""
              className="h-6 w-24 text-right text-xs tabular-nums"
              {...form.register(
                `locations.${row.original.fieldIndex}.par_qty`,
                { valueAsNumber: true },
              )}
            />
          ),
        size: 110,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        id: "status",
        header: tfl("status"),
        cell: ({ row }) => {
          const isActive = row.original.is_active;
          if (isActive === undefined || isActive === null) return "";
          return (
            <Badge variant={isActive ? "success" : "secondary"}>
              {isActive ? ts("active") : ts("inactive")}
            </Badge>
          );
        },
        enableSorting: false,
        size: 80,
        meta: {
          headerClassName: "text-center",
          cellClassName: "text-center",
        },
      },
    ];

    const actionCol: ColumnDef<LocationRow> = {
      id: "action",
      header: () => "",
      cell: ({ row }) => (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          aria-label="Remove"
          onClick={() => setDeleteIdx(row.original.fieldIndex)}
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
  })();

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.fieldId,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          {t("sectionLocations")}{" "}
          <span className="text-muted-foreground text-xs font-normal">
            ({fields.length})
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              placeholder={t("searchLocations")}
              className="h-8 w-64 pl-7 text-xs placeholder:text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {!isDisabled && (
            <Button type="button" size="sm" onClick={handleAdd}>
              <Plus />
              {t("addLocation")}
            </Button>
          )}
        </div>
      </div>

      <DataGrid
        table={table}
        recordCount={fields.length}
        tableLayout={{ headerSticky: true }}
        emptyMessage={
          <EmptyComponent
            title={t("noLocations")}
            description={t("addFirstLocationHint")}
            content={
              !isDisabled && (
                <Button type="button" size="xs" onClick={handleAdd}>
                  <Plus aria-hidden="true" />
                  {t("addFirstLocation")}
                </Button>
              )
            }
          />
        }
      >
        <DataGridContainer>
          <DataGridTable />
        </DataGridContainer>
      </DataGrid>

      <DeleteDialog
        open={deleteIdx !== null}
        onOpenChange={(open) => !open && setDeleteIdx(null)}
        title={t("removeLocation")}
        description={t("removeLocationConfirm")}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

export default memo(LocationsTab);
