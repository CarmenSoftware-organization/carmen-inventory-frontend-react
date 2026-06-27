"use no memo";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import {
  selectColumn,
  indexColumn,
  actionColumn,
  columnSkeletons,
} from "@/components/ui/data-grid/columns";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import {
  getAdjustmentType,
  type InventoryAdjustment,
  type InventoryAdjustmentStatus,
} from "@/types/inventory-adjustment";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";
import { formatAmount } from "@/lib/currency-utils";
import {
  IA_STATUS_CONFIG,
  IA_STATUS_VARIANT,
  IA_TYPE_CONFIG,
  IA_TYPE_ICON,
  IA_TYPE_VARIANT,
} from "@/constant/inventory-adjustment";

interface UseInventoryAdjustmentTableOptions {
  items: InventoryAdjustment[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (item: InventoryAdjustment) => void;
  onDelete: (item: InventoryAdjustment) => void;
}

export function useInventoryAdjustmentTable({
  items,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UseInventoryAdjustmentTableOptions) {
  const { dateFormat, amountFormat } = useProfile();

  const tfl = useTranslations("field");

  const allColumns = useMemo<ColumnDef<InventoryAdjustment>[]>(
    () => [
      selectColumn<InventoryAdjustment>(),
      indexColumn<InventoryAdjustment>(params),
      {
        id: "document_no",
        accessorFn: (row) => row.si_no ?? row.so_no ?? "",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={tfl("adjustment")} />
        ),
        cell: ({ row }) => (
          <CellAction onClick={() => onEdit(row.original)}>
            {row.original.si_no ?? row.original.so_no}
          </CellAction>
        ),
        meta: {
          headerTitle: tfl("adjustment"),
          skeleton: columnSkeletons.text,
        },
      },
      {
        id: "date",
        accessorFn: (row) => row.si_date ?? row.so_date ?? "",
        header: ({ column }) => (
          <DataGridColumnHeader
            column={column}
            title={tfl("date")}
            className="justify-center"
          />
        ),
        cell: ({ row }) =>
          formatDate(
            row.original.si_date ?? row.original.so_date ?? "",
            dateFormat,
          ),
        meta: {
          headerTitle: tfl("date"),
          skeleton: columnSkeletons.text,
          cellClassName: "text-center",
        },
      },
      {
        id: "type",
        header: tfl("type"),
        cell: ({ row }) => {
          const type = getAdjustmentType(row.original);
          const config = IA_TYPE_CONFIG[type];
          const Icon = IA_TYPE_ICON[type];
          return (
            <Badge variant={IA_TYPE_VARIANT[type]}>
              {Icon && <Icon aria-hidden="true" />}
              {config?.label ?? type}
            </Badge>
          );
        },
        meta: {
          headerTitle: tfl("type"),
          skeleton: columnSkeletons.badge,
          cellClassName: "text-center",
          headerClassName: "text-center",
        },
      },
      {
        accessorKey: "location_name",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={tfl("location")} />
        ),
        enableSorting: false,
        meta: { headerTitle: tfl("location"), skeleton: columnSkeletons.text },
      },
      {
        accessorKey: "adjustment_type_name",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={tfl("reason")} />
        ),
        enableSorting: false,
        meta: { headerTitle: tfl("reason"), skeleton: columnSkeletons.text },
      },
      {
        accessorKey: "item_count",
        header: tfl("items"),
        meta: {
          headerTitle: tfl("items"),
          skeleton: columnSkeletons.text,
          cellClassName: "text-center",
          headerClassName: "text-center",
        },
      },
      {
        accessorKey: "base_total_cost",
        header: tfl("total"),
        cell: ({ row }) =>
          formatAmount(row.original.base_total_cost, amountFormat),
        meta: {
          headerTitle: tfl("total"),
          skeleton: columnSkeletons.text,
          cellClassName: "text-right",
          headerClassName: "text-right",
        },
      },
      {
        accessorKey: "doc_status",
        header: tfl("status"),
        enableSorting: false,
        cell: ({ row }) => {
          const status = row.getValue(
            "doc_status",
          ) as InventoryAdjustmentStatus;
          const config = IA_STATUS_CONFIG[status];
          return (
            <Badge variant={IA_STATUS_VARIANT[status]}>
              {config?.label ?? status}
            </Badge>
          );
        },
        meta: {
          headerTitle: tfl("status"),
          skeleton: columnSkeletons.badge,
          cellClassName: "text-center",
          headerClassName: "text-center",
        },
      },
      actionColumn<InventoryAdjustment>(onDelete),
    ],
    [params, tfl, onEdit, dateFormat, amountFormat, onDelete],
  );

  return useReactTable({
    data: items,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    ...tableConfig,
    pageCount: Math.ceil(totalRecords / (Number(params.perpage) || 10)),
  });
}
