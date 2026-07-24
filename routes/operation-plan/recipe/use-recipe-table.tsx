import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { AuditCell } from "@/components/share/audit-cell";
import { Badge } from "@/components/ui/badge";
import { useConfigTable } from "@/components/ui/data-grid/use-config-table";
import { statusColumn } from "@/components/ui/data-grid/columns";
import { useProfile } from "@/hooks/use-profile";
import type { Recipe } from "@/types/recipe";
import type { Cuisine } from "@/types/cuisine";
import type { RecipeCategory } from "@/types/recipe-category";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";
import { RECIPE_DIFFICULTY } from "@/constant/recipe";
import type { BadgeProps } from "@/components/ui/badge";

interface UseRecipeTableOptions {
  recipes: Recipe[];
  cuisines: Cuisine[];
  categories: RecipeCategory[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (recipe: Recipe) => void;
  onDelete: (recipe: Recipe) => void;
}

/**
 * Hook สร้างคอลัมน์และ instance ของตารางสูตรอาหารสำหรับ DataGrid
 * @param options - ข้อมูล recipes, cuisines, categories, params และ callbacks
 * @returns table instance พร้อมใช้งานกับ DataGrid
 * @example
 * const { table } = useRecipeTable({
 *   recipes, cuisines, categories,
 *   totalRecords, params, tableConfig,
 *   onEdit: (r) => navigate(`/operation-plan/recipe/${r.id}`),
 *   onDelete: (r) => setDeleteTarget(r),
 * });
 */
export function useRecipeTable({
  recipes,
  cuisines,
  categories,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UseRecipeTableOptions) {
  const tfl = useTranslations("field");
  const ts = useTranslations("status");
  const { dateTimeFormat } = useProfile();
  const cuisineMap = new Map(cuisines.map((c) => [c.id, c.name]));
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const columns: ColumnDef<Recipe>[] = [
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
      size: 80,
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
      size: 200,
      meta: { headerTitle: tfl("name") },
    },
    {
      accessorKey: "cuisine_id",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("cuisine")} />
      ),
      cell: ({ row }) => {
        const name = cuisineMap.get(row.original.cuisine_id);
        return name ?? <span className="text-muted-foreground">—</span>;
      },
      size: 150,
      meta: { headerTitle: tfl("cuisine") },
    },
    {
      accessorKey: "category_id",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("category")} />
      ),
      cell: ({ row }) => {
        const name = categoryMap.get(row.original.category_id);
        return name ?? <span className="text-muted-foreground">—</span>;
      },
      size: 150,
      meta: { headerTitle: tfl("category") },
    },
    {
      accessorKey: "difficulty",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("difficulty")}
          className="justify-center"
        />
      ),
      cell: ({ row }) => {
        const d = row.getValue<string>("difficulty");
        let variant: BadgeProps["variant"] = "success-light";
        if (d === RECIPE_DIFFICULTY.HARD) variant = "destructive-light";
        else if (d === RECIPE_DIFFICULTY.MEDIUM) variant = "warning-light";
        return (
          <Badge size="lg" variant={variant}>
            {ts(d.toLowerCase() as "easy" | "medium" | "hard")}
          </Badge>
        );
      },
      size: 100,
      meta: {
        headerTitle: tfl("difficulty"),
        cellClassName: "text-center",
      },
    },
    // Status ก่อน created/updated (hideStatus:true กัน useConfigTable inject ซ้ำ)
    statusColumn<Recipe>(),
    {
      // id = ชื่อคอลัมน์ backend เพื่อให้ sort ส่ง sort=created_at:asc|desc
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

  return useConfigTable<Recipe>({
    data: recipes,
    columns,
    totalRecords,
    params,
    tableConfig,
    onDelete,
    hideStatus: true,
    initialState: { columnVisibility: { created_at: false, updated_at: false } },
  });
}
