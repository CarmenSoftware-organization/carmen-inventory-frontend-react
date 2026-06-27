import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { useConfigTable } from "@/components/ui/data-grid/use-config-table";
import type { RecipeCategory } from "@/types/recipe-category";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";

interface UseRecipeCategoryTableOptions {
  categories: RecipeCategory[];
  allCategories: RecipeCategory[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (category: RecipeCategory) => void;
  onDelete: (category: RecipeCategory) => void;
}

/**
 * Hook สร้างคอลัมน์และ instance ของตารางหมวดหมู่สูตรอาหารสำหรับ DataGrid
 * @param options - ข้อมูลหมวดหมู่, params และ callbacks
 * @returns table instance พร้อมใช้งานกับ DataGrid
 * @example
 * const table = useRecipeCategoryTable({ categories, allCategories, totalRecords, params, tableConfig, onEdit, onDelete });
 * return <DataGrid table={table} />;
 */
export function useRecipeCategoryTable({
  categories,
  allCategories,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UseRecipeCategoryTableOptions) {
  const tfl = useTranslations("field");
  const t = useTranslations("operationPlan.recipeCategory");

  const columns: ColumnDef<RecipeCategory>[] = [
    {
      accessorKey: "code",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("code")} />
      ),
      cell: ({ row }) => (
        <CellAction onClick={() => onEdit(row.original)}>
          {row.original.code}
        </CellAction>
      ),
      size: 60,
      meta: { headerTitle: tfl("code") },
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("name")} />
      ),
      cell: ({ row }) => (
        <CellAction onClick={() => onEdit(row.original)}>
          {row.original.name || "..."}
        </CellAction>
      ),
      meta: { headerTitle: tfl("name") },
    },
    {
      accessorKey: "parent_id",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={t("parent")} />
      ),
      meta: { headerTitle: t("parent") },
      cell: ({ row }) => {
        const parentId = row.original.parent_id;
        if (!parentId) return <span className="text-muted-foreground">—</span>;
        const parent = allCategories.find((c) => c.id === parentId);
        return parent?.name ?? parentId;
      },
    },
  ];

  return useConfigTable<RecipeCategory>({
    data: categories,
    columns,
    totalRecords,
    params,
    tableConfig,
    onDelete,
  });
}
