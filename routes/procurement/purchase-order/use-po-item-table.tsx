import { memo, useMemo } from "react";
import { useTranslations } from "use-intl";
import { useWatch, type UseFormReturn } from "react-hook-form";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { selectColumn } from "@/components/ui/data-grid/columns";
import {
  CommentFooterRow,
  FocQtyCell,
  ItemDiscountCell,
  ItemTaxCell,
  LocationCell,
  QtyUnitCell,
  RecSummaryCell,
  ComputedPricingCell,
} from "./po-item-cells";
import { PriceCell, ProductHeaderCell, StatusCell } from "./po-item-cells";
import { ItemHistorySheet } from "@/components/share/item-history-sheet";
import { ITEM_HISTORY_STATUS_CONFIG } from "@/constant/item-history";
import type { PoItemHistoryEntry } from "@/types/purchase-order";
import type { PoFormValues } from "./po-form-schema";
import type { FieldArrayWithId } from "react-hook-form";

/** แถวหนึ่งของตารางสินค้า — เดิม type นี้อยู่ใน po-item-expanded ที่ถูกลบไปแล้ว */
export type PoItemField = FieldArrayWithId<PoFormValues, "items", "id">;

/** Product cell — watch is_foc + คุม status badge แล้ว render ProductHeaderCell */
const ProductCol = memo(function ProductCol({
  form,
  index,
  disabled,
  readOnly,
}: {
  form: UseFormReturn<PoFormValues>;
  index: number;
  disabled: boolean;
  readOnly: boolean;
}) {
  "use no memo";
  const isFoc = useWatch({
    control: form.control,
    name: `items.${index}.is_foc`,
  });
  return (
    <ProductHeaderCell
      form={form}
      index={index}
      disabled={disabled}
      readOnly={readOnly}
      isFoc={!!isFoc}
    />
  );
});

const PoItemActionCell = memo(function PoItemActionCell({
  index,
  canDelete,
  history,
  productName,
  onDelete,
}: {
  index: number;
  /** โหมดอ่านยังเห็นคอลัมน์นี้ได้ถ้ามีประวัติ — แต่ห้ามมีปุ่มลบ */
  canDelete: boolean;
  history?: PoItemHistoryEntry[];
  productName?: string;
  onDelete: (index: number) => void;
}) {
  "use no memo";
  const t = useTranslations("procurement.purchaseOrder");
  return (
    <div className="flex items-center justify-center">
      {(history?.length ?? 0) > 0 && (
        <ItemHistorySheet
          history={history ?? []}
          productName={productName}
          statusConfig={ITEM_HISTORY_STATUS_CONFIG}
          label={t("tabWorkflowHistory")}
        />
      )}
      {canDelete && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label={t("deleteProductLine")}
              onClick={() => onDelete(index)}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("deleteProductLine")}</TooltipContent>
        </Tooltip>
      )}
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
  showStatusBadge: boolean;
  canResetStatus: boolean;
  onDelete: (index: number) => void;
}

/** ความกว้างของช่องเล็กหัวแถว (expand · # · checkbox) — ต้องเท่ากันทั้งสาม */
const PO_LEADING_COL = 33;

export function usePoItemTable({
  form,
  itemFields,
  disabled,
  locationsDisabled,
  readOnly,
  showApproveCheckbox,
  showStatusBadge,
  canResetStatus,
  onDelete,
}: UsePoItemTableOptions) {
  "use no memo";
  const tfl = useTranslations("field");
  const showAction = !disabled && !readOnly;

  const hasAnyHistory = itemFields.some(
    (item) => (item.history?.length ?? 0) > 0,
  );
  const showActionCol = showAction || hasAnyHistory;
  // แถวแก้ไม่ได้ = ทุกเซลล์เป็นตัวหนังสือ ไม่มี control ให้เผื่อที่
  const viewMode = !showAction;

  const columns = useMemo<ColumnDef<PoItemField>[]>(() => {
    const indexColumn: ColumnDef<PoItemField> = {
      id: "index",
      header: "#",
      cell: ({ row }) => row.index + 1,
      enableSorting: false,
      enableResizing: false,
      size: PO_LEADING_COL,
      meta: {
        headerClassName: "text-center",
        cellClassName: "text-center text-muted-foreground",
      },
    };

    const rightMeta = {
      headerClassName: "text-right",
      cellClassName: "text-right",
    };

    const dataColumns: ColumnDef<PoItemField>[] = [
      {
        accessorKey: "location_id",
        header: tfl("location"),
        size: 200,
        cell: ({ row }) => (
          <LocationCell
            form={form}
            index={row.index}
            disabled={locationsDisabled}
            statusSlot={
              showStatusBadge ? (
                <StatusCell
                  control={form.control}
                  form={form}
                  index={row.index}
                  canReset={canResetStatus}
                />
              ) : undefined
            }
          />
        ),
        meta: {
          footerContent: (item: PoItemField) => (
            <CommentFooterRow
              form={form}
              itemFields={itemFields}
              item={item}
              isDisabled={viewMode}
              placeholder={tfl("comment")}
            />
          ),
          footerColSpan: 3,
        },
      },
      {
        accessorKey: "product_id",
        header: tfl("product"),
        size: 200,
        cell: ({ row }) => (
          <ProductCol
            form={form}
            index={row.index}
            disabled={disabled}
            readOnly={readOnly}
          />
        ),
      },
      {
        id: "order",
        header: tfl("order"),
        size: viewMode ? 104 : 140,
        meta: rightMeta,
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
        id: "foc",
        header: tfl("foc"),
        size: viewMode ? 104 : 140,
        meta: rightMeta,
        cell: ({ row }) => (
          <FocQtyCell
            control={form.control}
            form={form}
            index={row.index}
            disabled={disabled}
            readOnly={readOnly}
          />
        ),
      },
      {
        id: "received",
        header: tfl("received"),
        size: viewMode ? 104 : 140,
        meta: rightMeta,
        cell: ({ row }) => (
          <RecSummaryCell control={form.control} index={row.index} />
        ),
      },
      {
        accessorKey: "price",
        header: tfl("unitPrice"),
        size: viewMode ? 104 : 140,
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
        header: tfl("subtotal"),
        size: 100,
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
        size: viewMode ? 80 : 200,
        meta: rightMeta,
        cell: ({ row }) => (
          <ItemDiscountCell
            form={form}
            itemIndex={row.index}
            editable={!disabled && !readOnly}
          />
        ),
      },
      {
        id: "net",
        header: tfl("net"),
        size: 105,
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
        size: viewMode ? 80 : 200,
        meta: rightMeta,
        cell: ({ row }) => (
          <ItemTaxCell
            form={form}
            itemIndex={row.index}
            editable={!disabled && !readOnly}
          />
        ),
      },
      {
        id: "amount",
        header: tfl("total"),
        size: 105,
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
          canDelete={showAction}
          history={row.original.history}
          productName={row.original.product_name}
          onDelete={onDelete}
        />
      ),
      enableSorting: false,
      enableResizing: false,
      size: 100,
      meta: {
        headerClassName: "text-center",
        cellClassName: "text-center",
      },
    };

    const baseCols = [
      ...(showApproveCheckbox
        ? [
            {
              ...selectColumn<PoItemField>(),
              size: PO_LEADING_COL,
            } as ColumnDef<PoItemField>,
          ]
        : []),
      indexColumn,
      ...dataColumns,
      ...(showActionCol ? [actionColumn] : []),
    ];

    return baseCols.map((col) => ({
      ...col,
      meta: {
        ...col.meta,
        cellClassName: cn(
          "py-2.5",
          !viewMode && "min-h-11",
          col.meta?.cellClassName,
        ),
      },
    }));
  }, [
    form,
    itemFields,
    viewMode,
    disabled,
    locationsDisabled,
    readOnly,
    showApproveCheckbox,
    showStatusBadge,
    canResetStatus,
    onDelete,
    tfl,
    showAction,
    showActionCol,
  ]);

  return useReactTable({
    data: itemFields,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    enableRowSelection: showApproveCheckbox,
  });
}
