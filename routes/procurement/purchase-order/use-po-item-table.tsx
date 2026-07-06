import { memo, useMemo } from "react";
import { useTranslations } from "use-intl";
import { useWatch, type UseFormReturn } from "react-hook-form";
import {
  type ColumnDef,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronRight, MapPinPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { selectColumn } from "@/components/ui/data-grid/columns";
import {
  QtyUnitCell,
  TaxProfileCell,
  ComputedPricingCell,
} from "./po-item-table";
import {
  DiscountRateCell,
  PriceCell,
  ProductHeaderCell,
} from "./po-items-grid-cells";
import { PoItemExpanded, type PoItemField } from "./po-item-expanded";
import { useAddLocationRegistry } from "./po-locations-add-context";
import type { PoFormValues } from "./po-form-schema";

export type { PoItemField };

/** Product cell — watch is_foc + คุม status badge แล้ว render ProductHeaderCell */
const ProductCol = memo(function ProductCol({
  form,
  index,
  disabled,
  readOnly,
  showApproveCheckbox,
}: {
  form: UseFormReturn<PoFormValues>;
  index: number;
  disabled: boolean;
  readOnly: boolean;
  showApproveCheckbox: boolean;
}) {
  "use no memo";
  const isFoc = useWatch({
    control: form.control,
    name: `items.${index}.is_foc`,
  });
  // edit mode (!disabled && !readOnly) → ซ่อน status badge; else อิง showApproveCheckbox
  const showStatusBadge = !disabled && !readOnly ? false : showApproveCheckbox;
  return (
    <ProductHeaderCell
      form={form}
      index={index}
      disabled={disabled}
      readOnly={readOnly}
      isFoc={!!isFoc}
      showStatusBadge={showStatusBadge}
    />
  );
});

/**
 * Action column ของ product row — ปุ่มลบ item + (เมื่อ expand) ปุ่ม "+" เพิ่ม
 * location ที่ prepend เข้า items.N.locations (ใช้ field array ชื่อเดียวกับ
 * LocationsEditor จึง sync กัน)
 */
const PoItemActionCell = memo(function PoItemActionCell({
  index,
  expanded,
  canAddLocation,
  onDelete,
}: {
  index: number;
  expanded: boolean;
  canAddLocation: boolean;
  onDelete: (index: number) => void;
}) {
  "use no memo";
  const t = useTranslations("procurement.purchaseOrder");
  const registry = useAddLocationRegistry();
  return (
    <div className="flex items-center justify-center">
      {expanded && canAddLocation && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={t("addLocation")}
          className="text-primary hover:bg-primary/10 hover:text-primary"
          onClick={() => registry?.get(index)?.()}
        >
          <MapPinPlus className="size-3.5" aria-hidden="true" />
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        aria-label="Remove"
        onClick={() => onDelete(index)}
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
      </Button>
    </div>
  );
});

interface UsePoItemTableOptions {
  form: UseFormReturn<PoFormValues>;
  itemFields: PoItemField[];
  disabled: boolean;
  locationsDisabled: boolean;
  readOnly: boolean;
  showApproveCheckbox: boolean;
  onDelete: (index: number) => void;
}

export function usePoItemTable({
  form,
  itemFields,
  disabled,
  locationsDisabled,
  readOnly,
  showApproveCheckbox,
  onDelete,
}: UsePoItemTableOptions) {
  "use no memo";
  const tfl = useTranslations("field");

  // indent ของ expanded content ให้ตรงขอบซ้าย column Product — คิดเป็น % ของผลรวม
  // column size เพราะ table เป็น table-fixed w-full (column scale ตามสัดส่วน)
  const preProductSize =
    36 /* expand */ + 36 /* index */ + (showApproveCheckbox ? 50 : 0);
  const showAction = !disabled && !readOnly; // action column (ลบ item)
  const totalSize =
    preProductSize +
    260 +
    180 /* merged qty + unit */ +
    110 +
    90 +
    120 +
    110 +
    (showAction ? 40 : 0);
  const leftInsetPct = (preProductSize / totalSize) * 100;

  const columns = useMemo<ColumnDef<PoItemField>[]>(() => {
    const expandColumn: ColumnDef<PoItemField> = {
      id: "expand",
      header: "",
      cell: ({ row }) => (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={row.getIsExpanded() ? "Collapse" : "Expand"}
          onClick={() => row.toggleExpanded()}
        >
          {row.getIsExpanded() ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </Button>
      ),
      enableSorting: false,
      enableResizing: false,
      size: 36,
      meta: {
        headerClassName: "text-center",
        cellClassName: "text-center",
        expandedContent: (item: PoItemField) => (
          <PoItemExpanded
            item={item}
            form={form}
            itemFields={itemFields}
            locationsDisabled={locationsDisabled}
            readOnly={readOnly}
            leftInsetPct={leftInsetPct}
          />
        ),
      },
    };

    const indexColumn: ColumnDef<PoItemField> = {
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

    const dataColumns: ColumnDef<PoItemField>[] = [
      {
        accessorKey: "product_id",
        header: tfl("product"),
        size: 260,
        cell: ({ row }) => (
          <ProductCol
            form={form}
            index={row.index}
            disabled={disabled}
            readOnly={readOnly}
            showApproveCheckbox={showApproveCheckbox}
          />
        ),
      },
      {
        id: "qty_unit",
        header: tfl("receivedAbbr"),
        size: 180,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
        cell: ({ row }) => (
          <QtyUnitCell
            control={form.control}
            form={form}
            index={row.index}
            disabled={disabled}
            readOnly={readOnly}
          />
        ),
      },
      {
        accessorKey: "price",
        header: tfl("unitPrice"),
        size: 110,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
        cell: ({ row }) => (
          <PriceCell
            form={form}
            index={row.index}
            disabled={disabled}
            readOnly={readOnly}
          />
        ),
      },
      {
        accessorKey: "discount_rate",
        header: tfl("discPercent"),
        size: 90,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
        cell: ({ row }) => (
          <DiscountRateCell
            form={form}
            index={row.index}
            disabled={disabled}
            readOnly={readOnly}
          />
        ),
      },
      {
        accessorKey: "tax_profile_id",
        header: tfl("tax"),
        size: 120,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
        cell: ({ row }) => (
          <TaxProfileCell
            control={form.control}
            form={form}
            index={row.index}
            disabled={disabled}
            readOnly={readOnly}
          />
        ),
      },
      {
        id: "total",
        header: tfl("total"),
        size: 110,
        meta: {
          headerClassName: "text-right",
          cellClassName: "text-right font-semibold tabular-nums",
        },
        cell: ({ row }) => (
          <ComputedPricingCell
            control={form.control}
            index={row.index}
            field="total_price"
          />
        ),
      },
    ];

    const actionColumn: ColumnDef<PoItemField> = {
      id: "action",
      header: () => "",
      cell: ({ row }) => (
        <PoItemActionCell
          index={row.index}
          expanded={row.getIsExpanded()}
          canAddLocation={!locationsDisabled}
          onDelete={onDelete}
        />
      ),
      enableSorting: false,
      enableResizing: false,
      size: 56,
      meta: {
        headerClassName: "text-center",
        cellClassName: "text-center",
      },
    };

    const baseCols = [
      selectColumn<PoItemField>(),
      expandColumn,
      indexColumn,
      ...dataColumns,
      ...(showAction ? [actionColumn] : []),
    ];

    return baseCols.map((col) => ({
      ...col,
      meta: {
        ...col.meta,
        cellClassName: cn("py-2 align-middle", col.meta?.cellClassName),
      },
    }));
  }, [
    form,
    itemFields,
    disabled,
    locationsDisabled,
    readOnly,
    showApproveCheckbox,
    onDelete,
    tfl,
    leftInsetPct,
    showAction,
  ]);

  return useReactTable({
    data: itemFields,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowId: (row) => row.id,
    enableRowSelection: showApproveCheckbox,
  });
}
