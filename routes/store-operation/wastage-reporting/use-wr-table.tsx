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
import { formatCurrency } from "@/lib/currency-utils";
import type {
  WastageReport,
  WastageReportStatus,
} from "@/types/wastage-reporting";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";
import { WR_STATUS_CONFIG } from "@/constant/wastage-reporting";

interface UseWastageReportTableOptions {
  items: WastageReport[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (item: WastageReport) => void;
  onDelete: (item: WastageReport) => void;
}

/**
 * Hook สร้างตารางหลักของรายการ Wastage Report
 * รวมคอลัมน์ wr_no, สถานที่, วันที่, จำนวน, มูลค่าเสียหาย, ผู้รายงาน และสถานะ
 *
 * @param options - items, totalRecords, params, tableConfig, onEdit, onDelete
 * @param options.items - รายการ WastageReport
 * @param options.totalRecords - จำนวนรวม
 * @param options.params - ParamsDto ปัจจุบัน
 * @param options.tableConfig - จาก useDataGridState
 * @param options.onEdit - callback เมื่อกดแถว
 * @param options.onDelete - callback เมื่อกดลบ
 * @returns react-table instance
 * @example
 * const table = useWastageReportTable({ items, totalRecords, params, tableConfig, onEdit, onDelete });
 */
export function useWastageReportTable({
  items,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UseWastageReportTableOptions) {
  "use no memo";
  const { dateFormat } = useProfile();
  const tfl = useTranslations("field");
  const ts = useTranslations("status");

  const dataColumns: ColumnDef<WastageReport>[] = [
    {
      accessorKey: "wr_no",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("wrNo")} />
      ),
      cell: ({ row }) => (
        <CellAction onClick={() => onEdit(row.original)}>
          {row.getValue("wr_no")}
        </CellAction>
      ),
      meta: { skeleton: columnSkeletons.text },
      size: 150,
    },
    {
      accessorKey: "location_name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("location")} />
      ),
      enableSorting: false,
      meta: { skeleton: columnSkeletons.text },
    },
    {
      accessorKey: "date",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("date")} />
      ),
      cell: ({ row }) => formatDate(row.getValue("date"), dateFormat),
      meta: { skeleton: columnSkeletons.text },
      size: 120,
    },
    {
      accessorKey: "qty_sum",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("totalQty")}
          className="justify-end"
        />
      ),
      cell: ({ row }) => row.getValue("qty_sum"),
      enableSorting: false,
      size: 80,
      meta: {
        cellClassName: "text-right tabular-nums",
        skeleton: columnSkeletons.text,
      },
    },
    {
      accessorKey: "loss_value",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("lossValue")}
          className="justify-end"
        />
      ),
      cell: ({ row }) =>
        formatCurrency(row.getValue<number>("loss_value")),
      enableSorting: false,
      size: 120,
      meta: {
        cellClassName: "text-right tabular-nums",
        skeleton: columnSkeletons.text,
      },
    },
    {
      accessorKey: "reportor_name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("reporter")} />
      ),
      enableSorting: false,
      meta: { skeleton: columnSkeletons.text },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("status")} className="justify-center" />
      ),
      enableSorting: false,
      cell: ({ row }) => {
        const status = row.getValue("status") as WastageReportStatus;
        return (
          <Badge className={WR_STATUS_CONFIG[status]?.className} size="sm">
            {ts(status)}
          </Badge>
        );
      },
      meta: { skeleton: columnSkeletons.badge, cellClassName: "text-center" },
      size: 120,
    },
  ];

  const allColumns: ColumnDef<WastageReport>[] = [
    selectColumn<WastageReport>(),
    indexColumn<WastageReport>(params),
    ...dataColumns,
    actionColumn<WastageReport>(onDelete),
  ];

  return useReactTable({
    data: items,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    ...tableConfig,
    pageCount: Math.ceil(totalRecords / (Number(params.perpage) || 10)),
  });
}
