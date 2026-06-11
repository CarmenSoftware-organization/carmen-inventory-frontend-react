import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { useConfigTable } from "@/components/ui/data-grid/use-config-table";
import type { SpotCheck } from "@/types/spot-check";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";

interface UseSpotCheckTableOptions {
  spotChecks: SpotCheck[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (spotCheck: SpotCheck) => void;
  onDelete: (spotCheck: SpotCheck) => void;
}

/**
 * Hook สร้างตาราง Spot Check พร้อมคอลัมน์และการจัดการแถว
 * Auto-append columns: select, index, status, action ผ่าน useConfigTable
 *
 * @param options - ตัวเลือกสำหรับ ConfigTableHook
 * @param options.spotChecks - รายการ SpotCheck entity
 * @param options.totalRecords - จำนวนรวมทั้งหมด
 * @param options.params - ParamsDto ปัจจุบัน
 * @param options.tableConfig - tableConfig จาก useDataGridState
 * @param options.onEdit - callback กด row/edit
 * @param options.onDelete - callback กด delete
 * @returns instance ของ React Table
 * @example
 * const table = useSpotCheckTable({ spotChecks, totalRecords, params, tableConfig, onEdit, onDelete });
 */
export function useSpotCheckTable({
  spotChecks,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UseSpotCheckTableOptions) {
  const tfl = useTranslations("field");
  const columns: ColumnDef<SpotCheck>[] = [
    {
      accessorKey: "department_name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("department")} />
      ),
      cell: ({ row }) => (
        <CellAction onClick={() => onEdit(row.original)}>
          {row.getValue("department_name")}
        </CellAction>
      ),
    },
  ];

  return useConfigTable<SpotCheck>({
    data: spotChecks,
    columns,
    totalRecords,
    params,
    tableConfig,
    onDelete,
  });
}
