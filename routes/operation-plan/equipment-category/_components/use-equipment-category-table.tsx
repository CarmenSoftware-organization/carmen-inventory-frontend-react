import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { useConfigTable } from "@/components/ui/data-grid/use-config-table";
import type { EquipmentCategory } from "@/types/equipment-category";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";

interface UseEquipmentCategoryTableOptions {
  equipmentCategories: EquipmentCategory[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (ec: EquipmentCategory) => void;
  onDelete: (ec: EquipmentCategory) => void;
}

/**
 * Hook สร้างคอลัมน์และ instance ของตารางหมวดหมู่อุปกรณ์สำหรับ DataGrid
 * @param options - ข้อมูลหมวดหมู่, params และ callbacks
 * @returns table instance พร้อมใช้งานกับ DataGrid
 * @example
 * const table = useEquipmentCategoryTable({ equipmentCategories, totalRecords, params, tableConfig, onEdit, onDelete });
 * return <DataGrid table={table} />;
 */
export function useEquipmentCategoryTable({
  equipmentCategories,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UseEquipmentCategoryTableOptions) {
  const tfl = useTranslations("field");

  const columns: ColumnDef<EquipmentCategory>[] = [
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
      meta: { headerTitle: tfl("name") },
    },
  ];

  return useConfigTable<EquipmentCategory>({
    data: equipmentCategories,
    columns,
    totalRecords,
    params,
    tableConfig,
    onDelete,
  });
}
