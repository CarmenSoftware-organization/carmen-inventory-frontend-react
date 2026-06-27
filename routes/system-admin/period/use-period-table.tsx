import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { Badge } from "@/components/ui/badge";
import { useConfigTable } from "@/components/ui/data-grid/use-config-table";
import type { Period, PeriodStatus } from "@/types/period";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";
import { formatDate } from "@/lib/date-utils";
import { useProfile } from "@/hooks/use-profile";
import { PERIOD_STATUS_CONFIG } from "@/constant/period";

interface UsePeriodTableOptions {
  periods: Period[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (period: Period) => void;
}

/**
 * Hook กำหนดคอลัมน์และ config ของตารางงวดบัญชี (Period)
 * @param options - อาร์เรย์ periods, totalRecords, params, tableConfig และ callback onEdit
 * @returns TanStack Table instance สำหรับ Period
 * @example
 * const table = usePeriodTable({ periods, totalRecords, params, tableConfig, onEdit });
 */
export function usePeriodTable({
  periods,
  totalRecords,
  params,
  tableConfig,
  onEdit,
}: UsePeriodTableOptions) {
  const t = useTranslations("systemAdmin.period");
  const { dateFormat } = useProfile();

  const columns: ColumnDef<Period>[] = [
    {
      accessorKey: "period",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={t("period")} className="justify-center" />
      ),
      cell: ({ row }) => (
        <CellAction onClick={() => onEdit(row.original)}>
          {row.getValue("period")}
        </CellAction>
      ),
      size: 140,
      meta: { cellClassName: "text-center" },
    },
    {
      accessorKey: "fiscal_year",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={t("fiscalYear")} className="justify-center" />
      ),
      size: 120,
      meta: { cellClassName: "text-center" },
    },
    {
      accessorKey: "fiscal_month",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={t("fiscalMonth")} className="justify-center" />
      ),
      size: 120,
      meta: { cellClassName: "text-center" },
    },
    {
      accessorKey: "start_at",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={t("startAt")} />
      ),
      cell: ({ row }) => formatDate(row.getValue("start_at"), dateFormat),
      size: 140,
    },
    {
      accessorKey: "end_at",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={t("endAt")} />
      ),
      cell: ({ row }) => formatDate(row.getValue("end_at"), dateFormat),
      size: 140,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={t("status")}
          className="justify-center"
        />
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as PeriodStatus;
        const config = PERIOD_STATUS_CONFIG[status] ?? PERIOD_STATUS_CONFIG.open;
        return (
          <Badge size="sm" className={`${config.className} text-xs`}>
            {config.label}
          </Badge>
        );
      },
      size: 100,
      meta: {
        cellClassName: "text-center",
        headerClassName: "text-center",
      },
    },
  ];

  return useConfigTable<Period>({
    data: periods,
    columns,
    totalRecords,
    params,
    tableConfig,
    hideStatus: true,
  });
}
