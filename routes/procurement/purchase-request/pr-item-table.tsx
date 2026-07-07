import { type UseFormReturn, type FieldArrayWithId } from "react-hook-form";
import { STAGE_ROLE } from "@/types/stage-role";
import { PR_STATUS, PR_ITEM_STAGE_STATUS } from "@/types/purchase-request";
import { useTranslations } from "use-intl";
import {
  type ColumnDef,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { PrFormValues } from "./pr-form-schema";
import { PrItemExpand } from "./pr-item-expand";
import { PrItemHistorySheet } from "./workflow/pr-item-history";
import {
  SelectCell,
  StatusCell,
  AmountCell,
  LocationCell,
  ProductCell,
  CurrencyCell,
  DeliveryPointCell,
  RequestedCell,
  ApprovedCell,
  FocCell,
  DeliveryDateCell,
  CommentFooterRow,
  DeleteCell,
} from "./pr-item-cells";

export type ItemField = FieldArrayWithId<PrFormValues, "items", "id">;

/**
 * ความกว้างเท่ากันของคอลัมน์แคบ 3 ตัว (select / expand / index)
 *
 * ต้องใช้ค่าเดียวกันทั้งสาม + `enableResizing: false` เพราะ table นี้เปิด
 * `columnsResizable` → th ได้ `width: getSize()` ตรงตาม `size` (px). ถ้าใส่ค่า
 * ต่างกัน (เดิม 80/60/40) UI จึงกว้างไม่เท่ากัน
 */
const NARROW_COL_SIZE = 35;
const QTY_SIZE = 125;

interface UsePrItemTableOptions {
  form: UseFormReturn<PrFormValues>;
  itemFields: ItemField[];
  isDisabled: boolean;
  prStatus?: string;
  role?: string;
  dateFormat: string;
  buCode?: string;
  baseCurrencyCode?: string;
  onDelete: (index: number) => void;
}

export function usePrItemTable({
  form,
  itemFields,
  isDisabled,
  prStatus,
  role,
  buCode,
  baseCurrencyCode,
  dateFormat,
  onDelete,
}: UsePrItemTableOptions) {
  "use no memo";
  const tfl = useTranslations("field");
  const tc = useTranslations("common");
  const [selectDialogOpen, setSelectDialogOpen] = useState(false);

  const allCount = itemFields.length;
  const pendingCount = itemFields.filter((item) => {
    const status = item.current_stage_status ?? "";
    return !status || status === PR_ITEM_STAGE_STATUS.PENDING;
  }).length;

  const today = useMemo(() => new Date(), []);

  const isLockedAfterCreate =
    isDisabled || (!!role && role !== STAGE_ROLE.CREATE);

  const allColumns = useMemo<ColumnDef<ItemField>[]>(() => {
    const prSelectColumn: ColumnDef<ItemField> = {
      id: "select",
      header: ({ table: t }) => {
        if (isDisabled) return null;
        const isAllSelected = t.getIsAllPageRowsSelected();
        const isSomeSelected = t.getIsSomePageRowsSelected();
        return (
          <Checkbox
            checked={
              isSomeSelected && !isAllSelected ? "indeterminate" : isAllSelected
            }
            onCheckedChange={(checked) => {
              if (checked) {
                setSelectDialogOpen(true);
              } else {
                t.toggleAllPageRowsSelected(false);
              }
            }}
            aria-label={tc("aria.selectAll")}
            className="align-[inherit]"
          />
        );
      },
      cell: ({ row }) => (
        <SelectCell
          control={form.control}
          index={row.index}
          row={row}
          isHidden={isDisabled}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
      size: NARROW_COL_SIZE,
      meta: {
        headerClassName: "text-center",
        cellClassName: "text-center",
      },
    };

    const expandColumn: ColumnDef<ItemField> = {
      id: "expand",
      header: "",
      cell: ({ row }) => (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={
            row.getIsExpanded() ? tc("aria.collapseRow") : tc("aria.expandRow")
          }
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
      size: NARROW_COL_SIZE,
      meta: {
        headerClassName: "text-center",
        cellClassName: "text-center",
        // เริ่ม content ของ expand ที่คอลัมน์ Location — เว้นคอลัมน์ซ้าย
        // (expand + #, และ select ในโหมด edit) ด้วย colSpan ว่าง
        expandedColStart: isDisabled ? 2 : 3,
        expandedContent: (item: ItemField) => (
          <PrItemExpand
            item={item}
            form={form}
            isDisabled={isDisabled || role !== STAGE_ROLE.PURCHASE}
            itemFields={itemFields}
            buCode={buCode}
            baseCurrencyCode={baseCurrencyCode}
            role={role}
          />
        ),
      },
    };

    const indexColumn: ColumnDef<ItemField> = {
      id: "index",
      header: "#",
      cell: ({ row }) => row.index + 1,
      enableSorting: false,
      enableResizing: false,
      size: NARROW_COL_SIZE,
      meta: {
        headerClassName: "text-center",
        cellClassName: "text-center text-muted-foreground",
      },
    };

    const dataColumns: ColumnDef<ItemField>[] = [
      {
        accessorKey: "location_id",
        header: tfl("location"),
        cell: ({ row }) => (
          <LocationCell
            control={form.control}
            form={form}
            index={row.index}
            isDisabled={isLockedAfterCreate}
            statusSlot={
              <StatusCell
                control={form.control}
                form={form}
                index={row.index}
                role={role}
              />
            }
          />
        ),
        size: 200,
        meta: {
          footerContent: (item: ItemField) => (
            <CommentFooterRow
              form={form}
              itemFields={itemFields}
              item={item}
              isDisabled={isDisabled}
              placeholder={tfl("comment")}
            />
          ),
          footerColSpan: 1,
        },
      },
      {
        accessorKey: "product_id",
        header: tfl("product"),
        cell: ({ row }) => (
          <ProductCell
            control={form.control}
            form={form}
            index={row.index}
            isDisabled={isLockedAfterCreate}
            buCode={buCode}
          />
        ),
        size: 220,
      },
      {
        id: "requested",
        header: tfl("requestedShort"),
        cell: ({ row }) => (
          <RequestedCell
            control={form.control}
            form={form}
            index={row.index}
            isDisabled={isLockedAfterCreate}
          />
        ),
        size: QTY_SIZE,
        meta: {
          headerClassName: "text-right",
        },
      },
      {
        id: "approved",
        header: tfl("approvedShort"),
        cell: ({ row }) => (
          <ApprovedCell
            control={form.control}
            form={form}
            index={row.index}
            isQtyDisabled={isDisabled}
            isUnitDisabled={isLockedAfterCreate}
          />
        ),
        size: QTY_SIZE,
        meta: {
          headerClassName: "text-right",
        },
      },
      {
        id: "foc",
        header: tfl("foc"),
        cell: ({ row }) => (
          <FocCell
            control={form.control}
            form={form}
            index={row.index}
            isQtyDisabled={isDisabled}
            isUnitDisabled={isLockedAfterCreate}
          />
        ),
        size: QTY_SIZE,
        meta: {
          headerClassName: "text-right",
        },
      },
      {
        id: "amount",
        header: tfl("amountCurShort"),
        cell: ({ row }) => (
          <AmountCell
            control={form.control}
            index={row.index}
            baseCurrencyCode={baseCurrencyCode}
            isDisabled={isDisabled}
            currencySlot={
              <CurrencyCell
                control={form.control}
                form={form}
                index={row.index}
                isDisabled={isDisabled}
              />
            }
          />
        ),
        size: 160,
        meta: {
          headerClassName: "text-right",
          cellClassName: "text-right",
        },
      },
      {
        accessorKey: "delivery_point_id",
        header: tfl("deliveryPoint"),
        cell: ({ row }) => (
          <DeliveryPointCell
            control={form.control}
            form={form}
            index={row.index}
            isDisabled={isDisabled}
          />
        ),
        size: 110,
      },
      {
        accessorKey: "delivery_date",
        header: tfl("deliveryDate"),
        cell: ({ row }) => (
          <DeliveryDateCell
            control={form.control}
            index={row.index}
            isDisabled={isDisabled}
            today={today}
            dateFormat={dateFormat}
          />
        ),
        size: 150,
        meta: {
          headerClassName: "text-center",
          cellClassName: "text-center",
        },
      },
    ];

    const actionColumn: ColumnDef<ItemField> = {
      id: "action",
      header: () => "",
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-2">
          {(row.original.history?.length ?? 0) > 0 && (
            <PrItemHistorySheet
              history={row.original.history ?? []}
              productName={row.original.product_name}
            />
          )}
          {!isDisabled && (
            <DeleteCell
              control={form.control}
              index={row.index}
              onDelete={onDelete}
            />
          )}
        </div>
      ),
      enableSorting: false,
      enableResizing: false,
      size: 80,
      meta: {
        headerClassName: "text-right",
        cellClassName: "text-right",
      },
    };

    const isDraft = !prStatus || prStatus === PR_STATUS.DRAFT;
    const isCreateRole = role === STAGE_ROLE.CREATE;
    const hiddenInDraft = new Set(["foc", "approved"]);
    // ในโหมด view (isDisabled) ยังต้องโชว์คอลัมน์ action ถ้ามีรายการที่มีประวัติ
    // เพื่อให้ปุ่ม history แสดงได้ (ปุ่ม delete จะถูกซ่อนเองภายใน cell)
    const hasAnyHistory = itemFields.some(
      (item) => (item.history?.length ?? 0) > 0,
    );

    const visibleDataColumns =
      isDraft || isCreateRole
        ? dataColumns.filter((col) => !hiddenInDraft.has(col.id ?? ""))
        : dataColumns;

    const baseCols = [
      ...(isDraft || isCreateRole || isDisabled ? [] : [prSelectColumn]),
      ...(isDraft || isCreateRole ? [] : [expandColumn]),
      indexColumn,
      ...visibleDataColumns,
      ...(isDisabled && !hasAnyHistory ? [] : [actionColumn]),
    ];

    // Comment footer starts at location_id and spans through the delivery_point
    // column so the comment input matches the Delivery Point column's right edge
    // (delivery_date + action keep their own footer cells).
    const locationColIdx = baseCols.findIndex(
      (c) => "accessorKey" in c && c.accessorKey === "location_id",
    );
    const deliveryPointColIdx = baseCols.findIndex(
      (c) => "accessorKey" in c && c.accessorKey === "delivery_point_id",
    );
    const footerSpan =
      locationColIdx >= 0 && deliveryPointColIdx >= locationColIdx
        ? deliveryPointColIdx - locationColIdx + 1
        : 1;

    const locationCol = visibleDataColumns.find(
      (c) => "accessorKey" in c && c.accessorKey === "location_id",
    );
    if (locationCol?.meta) {
      locationCol.meta.footerColSpan = footerSpan;
    }

    const allCols = baseCols.map((col) => ({
      ...col,
      meta: {
        ...col.meta,
        cellClassName: cn("py-2 align-middle", col.meta?.cellClassName),
      },
    }));

    return allCols;
  }, [
    form,
    isDisabled,
    prStatus,
    role,
    buCode,
    baseCurrencyCode,
    dateFormat,
    itemFields,
    onDelete,
    setSelectDialogOpen,
    today,
    isLockedAfterCreate,
    tfl,
    tc,
  ]);

  const table = useReactTable({
    data: itemFields,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    enableRowSelection: true,
  });

  // Auto-expand แถวที่มี validation error เมื่อ submit fail
  // เพื่อให้ user มองเห็น field ที่ผิด (อยู่ในส่วน expand) + ทำงานคู่กับ scrollToFirstInvalidField
  const submitCount = form.formState.submitCount;
  useEffect(() => {
    if (!submitCount) return;
    const itemErrors = form.formState.errors.items;
    if (!itemErrors) return;
    const next: Record<string, boolean> = {};
    if (Array.isArray(itemErrors)) {
      itemErrors.forEach((err, i) => {
        if (err) next[String(i)] = true;
      });
    } else {
      for (const k of Object.keys(itemErrors)) {
        const i = Number(k);
        if (!Number.isNaN(i)) next[String(i)] = true;
      }
    }
    if (Object.keys(next).length === 0) return;
    table.setExpanded((prev) => ({
      ...(typeof prev === "object" ? prev : {}),
      ...next,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitCount]);

  const handleSelectAll = () => {
    table.toggleAllPageRowsSelected(true);
    setSelectDialogOpen(false);
  };

  const handleSelectPending = () => {
    const selection: Record<string, boolean> = {};
    for (let i = 0; i < itemFields.length; i++) {
      const status = itemFields[i].current_stage_status ?? "";
      if (!status || status === PR_ITEM_STAGE_STATUS.PENDING) {
        selection[i] = true;
      }
    }
    table.setRowSelection(selection);
    setSelectDialogOpen(false);
  };

  return {
    table,
    selectDialogOpen,
    setSelectDialogOpen,
    allCount,
    pendingCount,
    handleSelectAll,
    handleSelectPending,
  };
}
