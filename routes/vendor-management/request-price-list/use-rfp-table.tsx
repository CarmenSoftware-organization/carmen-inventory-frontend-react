import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { useConfigTable } from "@/components/ui/data-grid/use-config-table";
import { columnSkeletons } from "@/components/ui/data-grid/columns";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { AuditCell } from "@/components/share/audit-cell";
import type { RequestPriceList } from "@/types/request-price-list";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";

interface UseRequestPriceListTableOptions {
  items: RequestPriceList[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (item: RequestPriceList) => void;
  onDelete: (item: RequestPriceList) => void;
}

/**
 * Hook สร้างตาราง RFP list พร้อมคอลัมน์ชื่อ ช่วงวันที่ และสถานะ
 * @param props - items, total, params, tableConfig และ callbacks สำหรับ edit/delete
 * @returns react-table instance ที่ใช้กับ DataGrid
 * @example
 * const { table } = useRequestPriceListTable({ items, totalRecords, params, tableConfig, onEdit, onDelete });
 */
export function useRequestPriceListTable({
  items,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UseRequestPriceListTableOptions) {
  "use no memo";
  const { dateFormat, dateTimeFormat } = useProfile();
  const tfl = useTranslations("field");

  const formatPeriod = (startDate: string, endDate: string): string => {
    const from = formatDate(startDate, dateFormat);
    const to = formatDate(endDate, dateFormat);
    if (!from && !to) return "—";
    return `${from} - ${to}`;
  };

  const columns: ColumnDef<RequestPriceList>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("name")} />
      ),
      cell: ({ row }) => (
        <CellAction onClick={() => onEdit(row.original)}>
          {row.original.name || "..."}
        </CellAction>
      ),
      meta: { headerTitle: tfl("name"), skeleton: columnSkeletons.text },
    },
    {
      id: "template_name",
      accessorFn: (row) => row.pricelist_template?.name ?? "",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("template")} />
      ),
      enableSorting: false,
      meta: { headerTitle: tfl("template"), skeleton: columnSkeletons.text },
    },
    {
      id: "period",
      accessorFn: (row) => formatPeriod(row.start_date, row.end_date),
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("effectivePeriod")} />
      ),
      enableSorting: false,
      meta: { headerTitle: tfl("effectivePeriod"), skeleton: columnSkeletons.text },
    },
    {
      accessorKey: "vendor_count",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("vendorCount")} className="justify-center" />
      ),
      enableSorting: false,
      meta: {
        headerTitle: tfl("vendorCount"),
        skeleton: columnSkeletons.textShort,
        cellClassName: "text-center",
      },
      size: 70,
    },
    {
      // id = ชื่อคอลัมน์จริงของ backend เพื่อให้ sort ส่ง field ถูกต้อง
      id: "created_at",
      accessorFn: (row) => row.audit?.created?.at ?? "",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("created")} />
      ),
      cell: ({ row }) => (
        <AuditCell
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
        <AuditCell
          entry={row.original.audit?.updated}
          dateTimeFormat={dateTimeFormat}
        />
      ),
      size: 160,
      meta: { headerTitle: tfl("updated"), skeleton: columnSkeletons.text },
    },
  ];

  return useConfigTable<RequestPriceList>({
    data: items,
    columns,
    totalRecords,
    params,
    tableConfig,
    onDelete,
    hideStatus: true,
  });
}
