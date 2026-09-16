import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { useConfigTable } from "@/components/ui/data-grid/use-config-table";
import type { InventoryPeriod, InventoryPeriodStatus } from "@/types/inventory-period";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";
import { formatDate } from "@/lib/date-utils";
import { useProfile } from "@/hooks/use-profile";
import { StatusIconLabel } from "@/components/ui/status-icon-label";
import { INVENTORY_PERIOD_STATUS_CONFIG } from "@/constant/inventory-period";

interface UseInventoryPeriodTableOptions {
  periods: InventoryPeriod[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (period: InventoryPeriod) => void;
}

export function useInventoryPeriodTable({
  periods,
  totalRecords,
  params,
  tableConfig,
  onEdit,
}: UseInventoryPeriodTableOptions) {
  const t = useTranslations("systemAdmin.inventoryPeriod");
  const { dateFormat } = useProfile();

  const columns: ColumnDef<InventoryPeriod>[] = [
    {
      accessorKey: "period",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={t("period")}
          className="justify-center"
        />
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
        <DataGridColumnHeader
          column={column}
          title={t("fiscalYear")}
          className="justify-center"
        />
      ),
      size: 120,
      meta: { cellClassName: "text-center" },
    },
    {
      accessorKey: "fiscal_month",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={t("fiscalMonth")}
          className="justify-center"
        />
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
        const status = row.getValue("status") as InventoryPeriodStatus;
        const config =
          INVENTORY_PERIOD_STATUS_CONFIG[status] ?? INVENTORY_PERIOD_STATUS_CONFIG.open;
        return (
          <StatusIconLabel
            status={status}
            label={config.label}
            // คอลัมน์นี้จัดกลาง — label เป็น inline-flex ซึ่ง `text-center`
            // ของเซลล์เอื้อมไม่ถึงเมื่ออยู่ในกล่อง clamp ของ DataGrid
            className="flex w-full justify-center"
          />
        );
      },
      size: 100,
      meta: {
        cellClassName: "text-center",
        headerClassName: "text-center",
      },
    },
  ];

  return useConfigTable<InventoryPeriod>({
    data: periods,
    columns,
    totalRecords,
    params,
    tableConfig,
    hideStatus: true,
  });
}
