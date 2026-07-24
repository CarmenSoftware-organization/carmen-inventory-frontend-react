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
  OrderSummaryCell,
  RecSummaryCell,
  ComputedPricingCell,
} from "./po-item-table";
import { PriceCell, ProductHeaderCell } from "./po-items-grid-cells";
import { PoItemExpanded, type PoItemField } from "./po-item-expanded";
import { useAddLocationRegistry } from "./po-locations-add-context";
import { PO_COL, PO_COL_DATA_TOTAL } from "./po-item-columns";
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
    preProductSize + PO_COL_DATA_TOTAL + (showAction ? PO_COL.action : 0);
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
            disabled={disabled}
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

    // product row = summary รวมทุก location (read-only) ยกเว้น price (input)
    // Discount/Tax = คอลัมน์ combo เดียว (product row โชว์ยอดรวม, location โชว์
    // rate/amount override) — ไม่มี rate/amount แยกซ้ำ
    const rightMeta = {
      headerClassName: "text-right",
      cellClassName: "text-right",
    };
    const dataColumns: ColumnDef<PoItemField>[] = [
      {
        accessorKey: "product_id",
        header: tfl("product"),
        size: PO_COL.product,
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
        id: "order",
        header: tfl("orderAbbr"),
        size: PO_COL.order,
        meta: rightMeta,
        cell: ({ row }) => (
          <OrderSummaryCell control={form.control} index={row.index} />
        ),
      },
      {
        id: "received",
        header: tfl("receivedAbbr"),
        size: PO_COL.rec,
        meta: rightMeta,
        cell: ({ row }) => (
          <RecSummaryCell control={form.control} index={row.index} />
        ),
      },
      {
        accessorKey: "price",
        header: tfl("unitPrice"),
        size: PO_COL.price,
        meta: rightMeta,
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
        id: "subtotal",
        header: tfl("subtotalAbbr"),
        size: PO_COL.sub,
        meta: rightMeta,
        cell: ({ row }) => (
          <ComputedPricingCell
            control={form.control}
            index={row.index}
            field="sub_total_price"
          />
        ),
      },
      {
        id: "discount",
        header: tfl("discount"),
        size: PO_COL.discount,
        meta: rightMeta,
        cell: ({ row }) => (
          <ComputedPricingCell
            control={form.control}
            index={row.index}
            field="discount_amount"
          />
        ),
      },
      {
        id: "net",
        header: tfl("netAbbr"),
        size: PO_COL.net,
        meta: rightMeta,
        cell: ({ row }) => (
          <ComputedPricingCell
            control={form.control}
            index={row.index}
            field="net_amount"
          />
        ),
      },
      {
        id: "tax",
        header: tfl("tax"),
        size: PO_COL.tax,
        meta: rightMeta,
        cell: ({ row }) => (
          <ComputedPricingCell
            control={form.control}
            index={row.index}
            field="tax_amount"
          />
        ),
      },
      {
        id: "amount",
        header: tfl("amountAbbr"),
        size: PO_COL.amt,
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
      size: PO_COL.action,
      meta: {
        headerClassName: "text-center",
        cellClassName: "text-center",
      },
    };

    const baseCols = [
      // ใส่ select เฉพาะตอนมี checkbox — ไม่งั้น getTotalSize() นับ 50px ผี
      // ทำให้ product row กว้างไม่ตรงกับ location table (expand)
      ...(showApproveCheckbox ? [selectColumn<PoItemField>()] : []),
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
