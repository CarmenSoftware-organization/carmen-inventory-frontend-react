import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { useConfigTable } from "@/components/ui/data-grid/use-config-table";
import { columnSkeletons, statusColumn } from "@/components/ui/data-grid/columns";
import { AuditCell } from "@/components/share/audit-cell";
import { useProfile } from "@/hooks/use-profile";
import type { ExtraCost } from "@/types/extra-cost";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";

interface UseExtraCostTableOptions {
  data: ExtraCost[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (extraCost: ExtraCost) => void;
  onDelete: (extraCost: ExtraCost) => void;
}

/**
 * Hook สำหรับสร้าง TanStack Table สำหรับ Extra Cost พร้อมคอลัมน์ name
 * @param options - data, totalRecords, params, tableConfig, onEdit, onDelete
 * @returns TanStack table instance
 * @example
 * // route: /config/extra-cost
 * const { table } = useExtraCostTable({ data, totalRecords, params, tableConfig, onEdit, onDelete });
 */
export function useExtraCostTable({
  data,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UseExtraCostTableOptions) {
  const tfl = useTranslations("field");
  const { dateTimeFormat } = useProfile();
  const columns: ColumnDef<ExtraCost>[] = [
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
    statusColumn<ExtraCost>(),
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

  return useConfigTable<ExtraCost>({
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
