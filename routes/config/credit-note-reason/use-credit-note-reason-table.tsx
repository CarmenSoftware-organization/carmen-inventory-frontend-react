import type { ColumnDef } from "@tanstack/react-table";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { useConfigTable } from "@/components/ui/data-grid/use-config-table";
import { columnSkeletons } from "@/components/ui/data-grid/columns";
import type { CnReason } from "@/types/cn-reason";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";

interface UseCreditNoteReasonTableOptions {
  data: CnReason[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (reason: CnReason) => void;
  onDelete: (reason: CnReason) => void;
}

/**
 * Hook สำหรับสร้าง TanStack Table สำหรับ Credit Note Reason (ซ่อนคอลัมน์ status)
 * @param options - data, totalRecords, params, tableConfig, onEdit, onDelete
 * @returns TanStack table instance
 * @example
 * // route: /config/credit-note-reason
 * const { table } = useCreditNoteReasonTable({ data, totalRecords, params, tableConfig, onEdit, onDelete });
 */
export function useCreditNoteReasonTable({
  data,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UseCreditNoteReasonTableOptions) {
  const columns: ColumnDef<CnReason>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <CellAction onClick={() => onEdit(row.original)}>
          {row.getValue("name") || "..."}
        </CellAction>
      ),
      meta: { headerTitle: "Name", skeleton: columnSkeletons.text },
    },
    {
      accessorKey: "description",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Description" />
      ),
      meta: { headerTitle: "Description", skeleton: columnSkeletons.text },
    },
  ];

  return useConfigTable<CnReason>({
    data,
    columns,
    totalRecords,
    params,
    tableConfig,
    onDelete,
    hideStatus: true,
  });
}
