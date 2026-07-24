import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { AuditCell } from "@/components/share/audit-cell";
import { useConfigTable } from "@/components/ui/data-grid/use-config-table";
import { columnSkeletons } from "@/components/ui/data-grid/columns";
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
  IA_TYPE_CONFIG,
  IA_TYPE_ICON,
  IA_TYPE_ICON_COLOR,
} from "@/constant/inventory-adjustment";

interface UseInventoryAdjustmentTableOptions {
  items: InventoryAdjustment[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (item: InventoryAdjustment) => void;
  onDelete: (item: InventoryAdjustment) => void;
}

/**
 * Hook สร้างตาราง Inventory Adjustment
 * Auto-append columns: select, index, action ผ่าน useConfigTable
 * (`hideStatus` เพราะ IA มี doc_status เอง ไม่ใช่ is_active)
 */
export function useInventoryAdjustmentTable({
  items,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UseInventoryAdjustmentTableOptions) {
  const { dateFormat, amountFormat, dateTimeFormat } = useProfile();
  const tfl = useTranslations("field");

  const columns: ColumnDef<InventoryAdjustment>[] = [
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
          <Badge size="sm" className={config?.className}>
            {Icon && (
              <Icon className={IA_TYPE_ICON_COLOR[type]} aria-hidden="true" />
            )}
            {config?.label ?? type}
          </Badge>
        );
      },
      meta: {
        headerTitle: tfl("type"),
        skeleton: columnSkeletons.badge,
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
        const status = row.getValue("doc_status") as InventoryAdjustmentStatus;
        const config = IA_STATUS_CONFIG[status];
        return (
          <Badge size="sm" className={config?.className}>
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
    {
      // id = ชื่อคอลัมน์ backend เพื่อให้ sort ส่ง sort=created_at:asc|desc
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

  return useConfigTable<InventoryAdjustment>({
    data: items,
    columns,
    totalRecords,
    params,
    tableConfig,
    onDelete,
    hideStatus: true,
    initialState: { columnVisibility: { created_at: false, updated_at: false } },
  });
}
