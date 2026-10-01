import { lazy, Suspense, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import {
  DataGrid,
  DataGridContainer,
  DataGridScrollArea,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination";
import {
  useRecipeEquipmentCategory,
  useDeleteRecipeEquipmentCategory,
} from "./use-recipe-equipment-category";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import type { RecipeEquipmentCategory } from "@/types/recipe-equipment-category";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ErrorState } from "@/components/ui/error-state";
import EmptyComponent from "@/components/empty-component";
import { cn } from "@/lib/utils";
import { ListPageShell } from "@/components/share/list-page-shell";
import { DocumentListActions } from "@/components/share/document-list-actions";
import { listGridMaxH } from "@/components/share/list-grid-max-h";
import { useRecipeEquipmentCategoryTable } from "./use-recipe-equipment-category-table";
import { useListFilters } from "@/hooks/use-list-filters";
import { ListToolbar } from "@/components/list-filter/list-toolbar";
import { SaveViewDialog } from "@/components/list-filter/save-view-dialog";
import { LIST_PAGE_KEYS } from "@/constant/list-page-keys";
import type { FilterFieldDef } from "@/types/list-filter";

// แทน next/dynamic ด้วย React.lazy (code-split dialog chunk เหมือนเดิม)
const RecipeEquipmentCategoryDialog = lazy(() =>
  import("./recipe-equipment-category-dialog").then((mod) => ({
    default: mod.RecipeEquipmentCategoryDialog,
  })),
);

export default function RecipeEquipmentCategoryComponent() {
  const [deleteTarget, setDeleteTarget] =
    useState<RecipeEquipmentCategory | null>(null);
  const deleteCategory = useDeleteRecipeEquipmentCategory();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCategory, setEditCategory] =
    useState<RecipeEquipmentCategory | null>(null);
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const { params, search, setSearch, tableConfig } = useDataGridState();
  const t = useTranslations("operationPlan.recipeEquipmentCategory");
  const tt = useTranslations("toast");

  // filter (status) ไม่ส่ง options เลย — ใช้ default is_active|bool:true/false
  // ของ StatusFilter ตรงตัวเหมือนโค้ดเดิมทุกประการ
  const recipeEquipmentCategoryFilterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        key: "filter",
        section: "listView.sectionDocument",
        control: "status",
        labelKey: "common.status",
      },
    ],
    [],
  );

  const lf = useListFilters({
    pageKey: LIST_PAGE_KEYS.RECIPE_EQUIPMENT_CATEGORY,
    fields: recipeEquipmentCategoryFilterFields,
  });

  const combinedParams = { ...params, filter: lf.filterParam };

  const { data, isLoading, error, refetch } =
    useRecipeEquipmentCategory(combinedParams);

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

  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  return (
    <ListPageShell
      title={t("title")}
      description={t("desc")}
      toolbar={
        <ListToolbar
          search={search}
          onSearch={setSearch}
          lf={lf}
          fields={recipeEquipmentCategoryFilterFields}
          onSaveViewClick={() => setSaveViewDialogOpen(true)}
        />
      }
      actions={
        <DocumentListActions
          onAdd={() => {
            setEditCategory(null);
            setDialogOpen(true);
          }}
          addLabel={t("add")}
          hideExportPrint
        />
      }
    >
      <DataGrid
        table={table}
        recordCount={totalRecords}
        isLoading={isLoading}
        tableLayout={{ headerSticky: true }}
        emptyMessage={<EmptyComponent />}
      >
        <DataGridContainer
          className={cn(
            "flex flex-col",
            listGridMaxH(lf.activeFilters.length > 0),
          )}
        >
          <DataGridScrollArea>
            <DataGridTable />
          </DataGridScrollArea>
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
          });
        }}
      />

      <SaveViewDialog
        open={saveViewDialogOpen}
        onOpenChange={setSaveViewDialogOpen}
        canManageBu={lf.view.canManageBu}
        existingNames={lf.view.existingNames}
        onSave={lf.view.saveOrUpdate}
      />
    </ListPageShell>
  );
}
