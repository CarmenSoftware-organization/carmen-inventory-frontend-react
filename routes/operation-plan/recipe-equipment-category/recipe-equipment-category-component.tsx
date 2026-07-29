
import { lazy, Suspense, useMemo, useState } from "react";
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
import DisplayTemplate from "@/components/display-template";
import { ActiveFilterBar } from "@/components/ui/active-filter-bar";
import { useRecipeEquipmentCategoryTable } from "./use-recipe-equipment-category-table";
import { useListFilters } from "@/hooks/use-list-filters";
import { ViewSelector } from "@/components/list-filter/view-selector";
import { ListFilterSheet } from "@/components/list-filter/list-filter-sheet";
import { SaveViewDialog } from "@/components/list-filter/save-view-dialog";
import { LIST_PAGE_KEYS } from "@/constant/list-page-keys";
import type { FilterFieldDef } from "@/types/list-filter";
import type { ViewScope } from "@/types/list-view";

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
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const { params, search, setSearch, tableConfig } = useDataGridState();
  const t = useTranslations("operationPlan.recipeEquipmentCategory");
  const tc = useTranslations("common");
  const tt = useTranslations("toast");

  // filter (status) ไม่ส่ง options เลย — ใช้ default is_active|bool:true/false
  // ของ StatusFilter ตรงตัวเหมือนโค้ดเดิมทุกประการ
  const recipeEquipmentCategoryFilterFields = useMemo<FilterFieldDef[]>(
    () => [{ key: "filter", control: "status", labelKey: "common.status" }],
    [],
  );

  const lf = useListFilters({
    pageKey: LIST_PAGE_KEYS.RECIPE_EQUIPMENT_CATEGORY,
    fields: recipeEquipmentCategoryFilterFields,
  });

  const combinedParams = { ...params, filter: lf.filterParam };

  /** replace semantics: ชื่อซ้ำใน scope เดียวกัน → update ของเดิม, ไม่ซ้ำ → saveAs ใหม่
   *  (mirror ของ PR pilot's handleSaveViewDialogSave) */
  const handleSaveViewDialogSave = async (name: string, scope: ViewScope) => {
    const list = scope === "bu" ? lf.view.buViews : lf.view.userViews;
    const existing = list.find((v) => v.name === name);
    const snapshot = { filters: lf.values, sort: lf.sortParam || undefined };
    if (existing) {
      await lf.view.update(existing.id, scope, snapshot);
      if (existing.id !== lf.view.current?.id) {
        lf.view.apply({
          ...existing,
          filters: snapshot.filters,
          sort: snapshot.sort,
        });
      }
    } else {
      const saved = await lf.view.saveAs(name, scope, snapshot);
      lf.view.apply(saved);
    }
  };

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

  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;

  return (
    <DisplayTemplate
      title={t("title")}
      description={t("desc")}
      toolbar={
        <>
          <SearchInput defaultValue={search} onSearch={setSearch} />
          <ViewSelector
            view={lf.view}
            snapshot={{ filters: lf.values, sort: lf.sortParam || undefined }}
          />
          <ListFilterSheet
            fields={recipeEquipmentCategoryFilterFields}
            values={lf.values}
            setValue={lf.setValue}
            onClearAll={lf.clearAll}
            onSaveClick={() => setSaveViewDialogOpen(true)}
            activeCount={lf.activeFilters.length}
          />
        </>
      }
      filterBar={
        <ActiveFilterBar filters={lf.activeFilters} onClearAll={lf.clearAll} />
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
          });
        }}
      />

      <SaveViewDialog
        open={saveViewDialogOpen}
        onOpenChange={setSaveViewDialogOpen}
        canManageBu={lf.view.canManageBu}
        existingNames={(s) =>
          (s === "bu" ? lf.view.buViews : lf.view.userViews).map((v) => v.name)
        }
        onSave={handleSaveViewDialogSave}
      />
    </DisplayTemplate>
  );
}
