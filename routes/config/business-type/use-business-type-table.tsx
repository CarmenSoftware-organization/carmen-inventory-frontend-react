import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { AuditCell } from "@/components/share/audit-cell";
import { useConfigTable } from "@/components/ui/data-grid/use-config-table";
import { columnSkeletons, statusColumn } from "@/components/ui/data-grid/columns";
import type { BusinessType } from "@/types/business-type";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";
import { useProfile } from "@/hooks/use-profile";

interface UseBusinessTypeTableOptions {
  data: BusinessType[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (businessType: BusinessType) => void;
  onDelete: (businessType: BusinessType) => void;
}

/**
 * Hook สำหรับสร้าง TanStack Table สำหรับ Business Type พร้อมคอลัมน์ name
 * @param options - data, totalRecords, params, tableConfig, onEdit, onDelete
 * @returns TanStack table instance
 * @example
 * // route: /config/business-type
 * const { table } = useBusinessTypeTable({ data, totalRecords, params, tableConfig, onEdit, onDelete });
 */
export function useBusinessTypeTable({
  data,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UseBusinessTypeTableOptions) {
  const tfl = useTranslations("field");
  const { dateTimeFormat } = useProfile();
  const columns: ColumnDef<BusinessType>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("name")} />
      ),
      cell: ({ row }) => (
        <CellAction onClick={() => onEdit(row.original)}>
          {row.getValue("name") || "..."}
        </CellAction>
      ),
      meta: { headerTitle: tfl("name"), skeleton: columnSkeletons.text },
    },
    statusColumn<BusinessType>(),
    {
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
      meta: { headerTitle: tfl("created") },
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
      meta: { headerTitle: tfl("updated") },
    },
  ];

  return useConfigTable<BusinessType>({
    data,
    columns,
    totalRecords,
    params,
    tableConfig,
    onDelete,
    hideStatus: true,
    initialState: { columnVisibility: { created_at: false, updated_at: false } },
  });
}
