import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import { PL_STATUS_TONE } from "@/constant/price-list";
import {
  selectColumn,
  indexColumn,
  actionColumn,
  columnSkeletons,
} from "@/components/ui/data-grid/columns";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import type { PriceList } from "@/types/price-list";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";
import { PlAuditCell } from "./pl-audit-cell";

interface UsePriceListTableOptions {
  priceLists: PriceList[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (priceList: PriceList) => void;
  onDelete: (priceList: PriceList) => void;
}

/**
 * Hook สร้างตาราง price list list พร้อม column no/name/vendor/effective period/status
 * @param props - ข้อมูล price list, total, params, tableConfig และ callbacks สำหรับ edit/delete
 * @returns react-table instance ที่พร้อมใช้กับ DataGrid
 * @example
 * const { table } = usePriceListTable({ priceLists, totalRecords, params, tableConfig, onEdit, onDelete });
 */
export function usePriceListTable({
  priceLists,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UsePriceListTableOptions) {
  "use no memo";
  const { dateFormat, dateTimeFormat } = useProfile();
  const tfl = useTranslations("field");
  const ts = useTranslations("status");

  const formatPeriod = (period: string): string => {
    const parts = period.split(" - ");
    if (parts.length !== 2) return period;
    const from = formatDate(parts[0], dateFormat);
    const to = formatDate(parts[1], dateFormat);
    if (!from && !to) return "—";
    return `${from} - ${to}`;
  };

  const dataColumns: ColumnDef<PriceList>[] = [
    {
      // id = ชื่อ column จริงของ backend (`pricelist_no`) เพื่อให้ sort ส่ง field ถูกต้อง;
      // response ส่งค่ามาใน field `no` (backend alias) จึงอ่านค่าจาก row.no
      id: "pricelist_no",
      accessorFn: (row) => row.no,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("no")} />
      ),
      cell: ({ row }) => (
        <CellAction onClick={() => onEdit(row.original)}>
          {row.original.no}
        </CellAction>
      ),
      size: 160,
      meta: { headerTitle: tfl("no"), skeleton: columnSkeletons.textShort },
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("name")} />
      ),
      meta: { headerTitle: tfl("name"), skeleton: columnSkeletons.text },
      size: 240,
    },
    {
      id: "vendor_name",
      accessorFn: (row) => row.vendor?.name ?? "",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("vendor")} />
      ),
      enableSorting: false,
      meta: { headerTitle: tfl("vendor"), skeleton: columnSkeletons.text },
      size: 240,
    },
    {
      accessorKey: "effectivePeriod",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("effectivePeriod")} />
      ),
      enableSorting: false,
      cell: ({ row }) => formatPeriod(row.getValue("effectivePeriod")),
      meta: { headerTitle: tfl("effectivePeriod"), skeleton: columnSkeletons.text },
      size: 220,
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
      cell: ({ row }) => {
        const status = row.getValue<string>("status");
        return (
          <StatusDotBadge
            size="lg"
            tone={PL_STATUS_TONE[status] ?? "neutral"}
          >
            {ts(status as "draft" | "submitted" | "active" | "inactive")}
          </StatusDotBadge>
        );
      },
      size: 100,
      enableSorting: false,
      meta: {
        headerTitle: tfl("status"),
        cellClassName: "text-center",
        skeleton: columnSkeletons.badge,
      },
    },
    {
      id: "created_at",
      accessorFn: (row) => row.audit?.created?.at ?? "",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("created")} />
      ),
      cell: ({ row }) => (
        <PlAuditCell
          entry={row.original.audit?.created}
          dateTimeFormat={dateTimeFormat}
        />
      ),
      size: 160,
      meta: { headerTitle: tfl("created"), skeleton: columnSkeletons.text },
    },
    {
      id: "updated_at",
      accessorFn: (row) => row.audit?.updated?.at ?? "",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("updated")} />
      ),
      cell: ({ row }) => (
        <PlAuditCell
          entry={row.original.audit?.updated}
          dateTimeFormat={dateTimeFormat}
        />
      ),
      size: 160,
      meta: { headerTitle: tfl("updated"), skeleton: columnSkeletons.text },
    },
  ];

  const allColumns: ColumnDef<PriceList>[] = [
    selectColumn<PriceList>(),
    indexColumn<PriceList>(params),
    ...dataColumns,
    actionColumn<PriceList>(onDelete),
  ];

  return useReactTable({
    data: priceLists,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    ...tableConfig,
    pageCount: Math.ceil(totalRecords / (Number(params.perpage) || 10)),
  });
}
