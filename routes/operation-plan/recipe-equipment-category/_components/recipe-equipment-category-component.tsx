
import { lazy, Suspense, useState } from "react";
import { Download, Plus, Printer } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination";
import { Button } from "@/components/ui/button";
import {
  useRecipeEquipmentCategory,
  useDeleteRecipeEquipmentCategory,
} from "@/hooks/use-recipe-equipment-category";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import type { RecipeEquipmentCategory } from "@/types/recipe-equipment-category";
import SearchInput from "@/components/search-input";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ErrorState } from "@/components/ui/error-state";
import EmptyComponent from "@/components/empty-component";
import { StatusFilter } from "@/components/ui/status-filter";
import DisplayTemplate from "@/components/display-template";
import { useRecipeEquipmentCategoryTable } from "./use-recipe-equipment-category-table";

// แทน next/dynamic ด้วย React.lazy (code-split dialog chunk เหมือนเดิม)
const RecipeEquipmentCategoryDialog = lazy(() =>
  import("./recipe-equipment-category-dialog").then((mod) => ({
    default: mod.RecipeEquipmentCategoryDialog,
  })),
);

/**
 * คอมโพเนนต์หลักของหน้ารายการหมวดหมู่อุปกรณ์สูตรอาหาร แสดง DataGrid พร้อม dialog
 * @returns React element ของรายการหมวดหมู่อุปกรณ์สูตรอาหาร
 * @example
 * // ใช้ภายใน page.tsx ของโมดูล recipe-equipment-category
 * <RecipeEquipmentCategoryComponent />
 */
export default function RecipeEquipmentCategoryComponent() {
  const [deleteTarget, setDeleteTarget] =
    useState<RecipeEquipmentCategory | null>(null);
  const deleteCategory = useDeleteRecipeEquipmentCategory();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCategory, setEditCategory] =
    useState<RecipeEquipmentCategory | null>(null);
  const { params, search, setSearch, filter, setFilter, tableConfig } =
    useDataGridState();
  const { data, isLoading, error, refetch } =
    useRecipeEquipmentCategory(params);
  const t = useTranslations("operationPlan.recipeEquipmentCategory");
  const tc = useTranslations("common");
  const tt = useTranslations("toast");

  const categories = data?.data ?? [];
  const totalRecords = data?.paginate?.total ?? 0;

  const table = useRecipeEquipmentCategoryTable({
    categories,
    totalRecords,
    params,
    tableConfig,
    onEdit: (category) => {
      setEditCategory(category);
      setDialogOpen(true);
    },
    onDelete: setDeleteTarget,
  });

  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;

  return (
    <DisplayTemplate
      title={t("title")}
      description={t("desc")}
      toolbar={
        <>
          <SearchInput defaultValue={search} onSearch={setSearch} />
          <StatusFilter value={filter} onChange={setFilter} />
        </>
      }
      actions={
        <>
          <Button size="sm" variant="outline" disabled title={tc("comingSoon")}>
            <Download aria-hidden="true" />
            {tc("export")}
          </Button>
          <Button size="sm" variant="outline" disabled title={tc("comingSoon")}>
            <Printer aria-hidden="true" />
            {tc("print")}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditCategory(null);
              setDialogOpen(true);
            }}
          >
            <Plus aria-hidden="true" />
            {t("add")}
          </Button>
        </>
      }
    >
      <DataGrid
        table={table}
        recordCount={totalRecords}
        isLoading={isLoading}
        tableLayout={{ headerSticky: true }}
        emptyMessage={<EmptyComponent />}
      >
        <DataGridContainer className="flex max-h-[calc(100vh-13rem-3rem)] flex-col">
          <div className="flex-1 overflow-auto">
            <DataGridTable />
          </div>
          <DataGridPagination />
        </DataGridContainer>
      </DataGrid>

      <Suspense fallback={null}>
        <RecipeEquipmentCategoryDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          category={editCategory}
        />
      </Suspense>

      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) =>
          !open && !deleteCategory.isPending && setDeleteTarget(null)
        }
        title={t("deleteTitle")}
        description={t("deleteConfirm", { name: deleteTarget?.name ?? "" })}
        isPending={deleteCategory.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteCategory.mutate(deleteTarget.id, {
            onSuccess: () => {
              toast.success(tt("deleteSuccess", { entity: t("entity") }));
              setDeleteTarget(null);
            },
            onError: (err) => toast.error(err.message),
          });
        }}
      />
    </DisplayTemplate>
  );
}
