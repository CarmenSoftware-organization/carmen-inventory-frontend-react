import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { useConfigTable } from "@/components/ui/data-grid/use-config-table";
import type { PhysicalCount } from "@/types/physical-count";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";

interface UsePhysicalCountTableOptions {
  physicalCounts: PhysicalCount[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (physicalCount: PhysicalCount) => void;
  onDelete: (physicalCount: PhysicalCount) => void;
}

/**
 * Hook สร้างตาราง Physical Count พร้อมคอลัมน์และการจัดการแถว
 * Auto-append columns: select, index, status, action ผ่าน useConfigTable
 *
 * @param options - ตัวเลือกของ ConfigTableHook
 * @param options.physicalCounts - รายการ PhysicalCount entity
 * @param options.totalRecords - จำนวนรวมทั้งหมด
 * @param options.params - ParamsDto ปัจจุบัน
 * @param options.tableConfig - tableConfig จาก useDataGridState
 * @param options.onEdit - callback กด row/edit
 * @param options.onDelete - callback กด delete
 * @returns instance ของ React Table
 * @example
 * const table = usePhysicalCountTable({ physicalCounts, totalRecords, params, tableConfig, onEdit, onDelete });
 */
export function usePhysicalCountTable({
  physicalCounts,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UsePhysicalCountTableOptions) {
  const tfl = useTranslations("field");
  const columns: ColumnDef<PhysicalCount>[] = [
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

  return useConfigTable<PhysicalCount>({
    data: physicalCounts,
    columns,
    totalRecords,
    params,
    tableConfig,
    onDelete,
  });
}
