import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import {
  indexColumn,
  columnSkeletons,
} from "@/components/ui/data-grid/columns";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/currency-utils";
import type { WastageItem } from "@/types/wastage-reporting";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";
import { WASTAGE_STATUS_TONE } from "@/constant/wastage-reporting";

interface UseWastageReportTableOptions {
  items: WastageItem[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onOpenGrn: (item: WastageItem) => void;
}

/**
 * Hook สร้างตารางรายการ lot สินค้าหมดอายุ/ใกล้หมดอายุ (wastage reporting)
 * คอลัมน์: GRN no (กดไปหน้า GRN), สินค้า, คลัง, lot, วันหมดอายุ, เหลือ (วัน),
 * สถานะ, จำนวนคงเหลือ, ต้นทุน/หน่วย, มูลค่าคงเหลือ — read-only ไม่มี action
 *
 * @param options - items, totalRecords, params, tableConfig, onOpenGrn
 * @returns react-table instance
 * @example
 * const table = useWastageReportTable({ items, totalRecords, params, tableConfig, onOpenGrn });
 */
export function useWastageReportTable({
  items,
  totalRecords,
  params,
  tableConfig,
  onOpenGrn,
}: UseWastageReportTableOptions) {
  "use no memo";
  const { dateFormat } = useProfile();
  const tfl = useTranslations("field");
  const ts = useTranslations("status");

  const dataColumns: ColumnDef<WastageItem>[] = [
    {
      accessorKey: "grn_no",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("grnNo")} />
      ),
      cell: ({ row }) => (
        <CellAction onClick={() => onOpenGrn(row.original)}>
          {row.getValue("grn_no")}
        </CellAction>
      ),
      meta: { skeleton: columnSkeletons.text },
      size: 130,
    },
    {
      id: "product",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("product")} />
      ),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate" title={row.original.product_name}>
            {row.original.product_name}
          </p>
          {row.original.product_local_name && (
            <p
              className="text-muted-foreground text-micro truncate"
              title={row.original.product_local_name}
            >
              {row.original.product_local_name}
            </p>
          )}
        </div>
      ),
      enableSorting: false,
      meta: { skeleton: columnSkeletons.text },
      size: 200,
    },
    {
      id: "location",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("location")} />
      ),
      cell: ({ row }) => (
        <span className="truncate">
          <span className="text-muted-foreground mr-1.5">
            {row.original.location_code}
          </span>
          {row.original.location_name}
        </span>
      ),
      enableSorting: false,
      meta: { skeleton: columnSkeletons.text },
      size: 160,
    },
    {
      accessorKey: "lot_no",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("lotNo")} />
      ),
      enableSorting: false,
      meta: { skeleton: columnSkeletons.text },
      size: 150,
    },
    {
      accessorKey: "expired_at",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("expiryDate")} />
      ),
      cell: ({ row }) => formatDate(row.getValue("expired_at"), dateFormat),
      meta: { skeleton: columnSkeletons.text },
      size: 110,
    },
    {
      accessorKey: "days_to_expiry",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("daysToExpiry")}
          className="justify-end"
        />
      ),
      enableSorting: false,
      size: 90,
      meta: {
        cellClassName: "text-right tabular-nums",
        skeleton: columnSkeletons.text,
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("status")}
          className="justify-center"
        />
      ),
      enableSorting: false,
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <StatusDotBadge tone={WASTAGE_STATUS_TONE[status]} size="xs">
            {ts(status)}
          </StatusDotBadge>
        );
      },
      meta: { skeleton: columnSkeletons.badge, cellClassName: "text-center" },
      size: 100,
    },
    {
      accessorKey: "remaining_qty",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("remainingQty")}
          className="justify-end"
        />
      ),
      cell: ({ row }) => (
        <>
          {row.original.remaining_qty}{" "}
          <span className="text-muted-foreground">
            {row.original.inventory_unit.name}
          </span>
        </>
      ),
      enableSorting: false,
      size: 100,
      meta: {
        cellClassName: "text-right tabular-nums",
        skeleton: columnSkeletons.text,
      },
    },
    {
      accessorKey: "cost_per_unit",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("costPerUnit")}
          className="justify-end"
        />
      ),
      cell: ({ row }) => formatCurrency(row.getValue<number>("cost_per_unit")),
      enableSorting: false,
      size: 100,
      meta: {
        cellClassName: "text-right tabular-nums",
        skeleton: columnSkeletons.text,
      },
    },
    {
      accessorKey: "remaining_value",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("remainingValue")}
          className="justify-end"
        />
      ),
      cell: ({ row }) =>
        formatCurrency(row.getValue<number>("remaining_value")),
      enableSorting: false,
      size: 110,
      meta: {
        cellClassName: "text-right tabular-nums",
        skeleton: columnSkeletons.text,
      },
    },
  ];

  const allColumns: ColumnDef<WastageItem>[] = [
    indexColumn<WastageItem>(params),
    ...dataColumns,
  ];

  return useReactTable({
    data: items,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.grn_detail_item_id,
    ...tableConfig,
    pageCount: Math.ceil(totalRecords / (Number(params.perpage) || 10)),
  });
}
