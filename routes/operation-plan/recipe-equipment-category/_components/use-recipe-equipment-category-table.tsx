import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { useConfigTable } from "@/components/ui/data-grid/use-config-table";
import type { RecipeEquipmentCategory } from "@/types/recipe-equipment-category";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";

interface UseRecipeEquipmentCategoryTableOptions {
  categories: RecipeEquipmentCategory[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (category: RecipeEquipmentCategory) => void;
  onDelete: (category: RecipeEquipmentCategory) => void;
}

/**
 * Hook สร้างคอลัมน์และ instance ของตารางหมวดหมู่อุปกรณ์สูตรอาหารสำหรับ DataGrid
 * @param options - ข้อมูลหมวดหมู่, params และ callbacks
 * @returns table instance พร้อมใช้งานกับ DataGrid
 * @example
 * const table = useRecipeEquipmentCategoryTable({ categories, totalRecords, params, tableConfig, onEdit, onDelete });
 * return <DataGrid table={table} />;
 */
export function useRecipeEquipmentCategoryTable({
  categories,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UseRecipeEquipmentCategoryTableOptions) {
  const tfl = useTranslations("field");
  const columns: ColumnDef<RecipeEquipmentCategory>[] = [
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

  return useConfigTable<RecipeEquipmentCategory>({
    data: categories,
    columns,
    totalRecords,
    params,
    tableConfig,
    onDelete,
  });
}
