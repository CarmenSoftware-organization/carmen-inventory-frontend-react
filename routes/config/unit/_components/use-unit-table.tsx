import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { useConfigTable } from "@/components/ui/data-grid/use-config-table";
import { columnSkeletons } from "@/components/ui/data-grid/columns";
import type { Unit } from "@/types/unit";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";

interface UseUnitTableOptions {
  data: Unit[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (unit: Unit) => void;
  onDelete: (unit: Unit) => void;
}

/**
 * Hook สำหรับสร้าง TanStack Table สำหรับ Unit พร้อมคอลัมน์ name
 *
 * ใช้ภายใน `UnitComponent` โดยส่งผ่าน prop `useTable` ของ
 * `ConfigListTemplate`
 *
 * @param options - data, totalRecords, params, tableConfig, onEdit, onDelete
 * @returns TanStack table instance
 * @example
 * ```tsx
 * <ConfigListTemplate useTable={useUnitTable} ... />
 * ```
 */
export function useUnitTable({
  data,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UseUnitTableOptions) {
  const tfl = useTranslations("field");
  const columns: ColumnDef<Unit>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("name")} />
      ),
      cell: ({ row }) => (
        <CellAction onClick={() => onEdit(row.original)}>
          {row.getValue("name")}
        </CellAction>
      ),
      meta: { headerTitle: tfl("name"), skeleton: columnSkeletons.text },
    },
  ];

  return useConfigTable<Unit>({
    data,
    columns,
    totalRecords,
    params,
    tableConfig,
    onDelete,
  });
}
