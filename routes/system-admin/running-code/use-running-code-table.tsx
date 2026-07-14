import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { useConfigTable } from "@/components/ui/data-grid/use-config-table";
import { columnSkeletons } from "@/components/ui/data-grid/columns";
import type { RunningCode } from "@/types/running-code";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";

interface UseRunningCodeTableOptions {
  runningCodes: RunningCode[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (runningCode: RunningCode) => void;
  onDelete: (runningCode: RunningCode) => void;
}

/**
 * Hook กำหนดคอลัมน์และ config ของตาราง Running Code
 * @param options - อาร์เรย์ runningCodes, totalRecords, params, tableConfig, onEdit และ onDelete
 * @returns TanStack Table instance สำหรับ Running Code
 * @example
 * const table = useRunningCodeTable({ runningCodes, totalRecords, params, tableConfig, onEdit, onDelete });
 */
export function useRunningCodeTable({
  runningCodes,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UseRunningCodeTableOptions) {
  const tfl = useTranslations("field");

  const columns: ColumnDef<RunningCode>[] = [
    {
      accessorKey: "type",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("type")} />
      ),
      cell: ({ row }) => (
        <CellAction onClick={() => onEdit(row.original)}>
          {row.getValue("type")}
        </CellAction>
      ),
    },
    {
      accessorKey: "note",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("note")} />
      ),
      cell: ({ row }) => {
        const note = row.getValue<string>("note");
        return note ? (
          <span className="block max-w-[24rem] truncate" title={note}>
            {note}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
      meta: { headerTitle: tfl("note"), skeleton: columnSkeletons.text },
    },
  ];

  return useConfigTable<RunningCode>({
    data: runningCodes,
    columns,
    totalRecords,
    params,
    tableConfig,
    onDelete,
    hideStatus: true,
  });
}
