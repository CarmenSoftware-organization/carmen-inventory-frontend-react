import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import {
  Columns3,
  Download,
  LayoutGrid,
  LayoutList,
  Loader2,
  MoreHorizontal,
  Plus,
  Printer,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  DataGrid,
  DataGridContainer,
  DataGridScrollArea,
} from "@/components/ui/data-grid/data-grid";
import { cn } from "@/lib/utils";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination";
import { Button } from "@/components/ui/button";
import { useRecipe, useDeleteRecipe } from "./use-recipe";
import { useCuisine } from "@/hooks/use-cuisine";
import { useRecipeCategory } from "@/hooks/use-recipe-category";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGridPagination } from "@/hooks/use-grid-pagination";
import type { Recipe } from "@/types/recipe";
import { CardSkeletonGrid } from "@/components/loader/card-skeleton";
import { RECIPE_DIFFICULTY_OPTIONS } from "@/constant/recipe";
import SearchInput from "@/components/search-input";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ErrorState } from "@/components/ui/error-state";
import EmptyComponent from "@/components/empty-component";
import { StatusFilter } from "@/components/ui/status-filter";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { DocumentListHeader } from "@/components/share/document-list-header";
import { ActiveFilterBar } from "@/components/ui/active-filter-bar";
import { DataGridColumnVisibility } from "@/components/ui/data-grid/data-grid-column-visibility";
import { DataGridSortMenu } from "@/components/ui/data-grid/data-grid-sort-menu";
import { useRecipeTable } from "./use-recipe-table";
import RecipeCard from "./recipe-card";
import { useListFilters } from "@/hooks/use-list-filters";
import { ViewSelector } from "@/components/list-filter/view-selector";
import { ListFilter } from "@/components/list-filter/list-filter";
import { SaveViewDialog } from "@/components/list-filter/save-view-dialog";
import { LIST_PAGE_KEYS } from "@/constant/list-page-keys";
import type { FilterFieldDef } from "@/types/list-filter";

/**
 * คอมโพเนนต์หลักของหน้ารายการสูตรอาหาร รองรับ list/grid view และ filter หลายระดับ
 * @returns React element ของรายการสูตรอาหาร
 * @example
 * // ใช้ภายใน page.tsx ของโมดูลสูตรอาหาร
 * export default function RecipePage() {
 *   return <RecipeComponent />;
 * }
 */
export default function RecipeComponent() {
  const t = useTranslations("operationPlan.recipe");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");
  const ts = useTranslations("status");
  const tt = useTranslations("toast");
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<Recipe | null>(null);
  const [displayMode, setDisplayMode] = useState<"list" | "grid">("list");
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const isMobile = useIsMobile();
  const deleteRecipe = useDeleteRecipe();
  const { params, search, setSearch, tableConfig } = useDataGridState();

  const isGridMode = isMobile || displayMode === "grid";

  const { data: cuisineData } = useCuisine({ perpage: -1 });
  const { data: categoryData } = useRecipeCategory({ perpage: -1 });

  const cuisineFilterOptions = useMemo(
    () =>
      (cuisineData?.data ?? [])
        .filter((c) => c.is_active)
        .map((c) => ({ label: c.name, value: `cuisine_id|string:${c.id}` })),
    [cuisineData],
  );

  const categoryFilterOptions = useMemo(
    () =>
      (categoryData?.data ?? [])
        .filter((c) => c.is_active)
        .map((c) => ({ label: c.name, value: `category_id|string:${c.id}` })),
    [categoryData],
  );

  const difficultyFilterOptions = useMemo(
    () =>
      RECIPE_DIFFICULTY_OPTIONS.map((o) => ({
        label: o.label,
        value: `difficulty|string:${o.value}`,
      })),
    [],
  );

  const STATUS_OPTIONS = useMemo(
    () => [
      { label: ts("active"), value: "is_active|bool:true" },
      { label: ts("inactive"), value: "is_active|bool:false" },
    ],
    [ts],
  );

  // cuisine/category/difficulty เป็นชื่อ/label literal จริง (ไม่ใช่ i18n key)
  // จึงต้องใช้ control: "custom" ห่อ MultiSelectFilter ตรง ๆ — เหมือน pattern
  // ของ PO_TYPE/CN_TYPE ใน Task 19 filter (status) ก็ literal เช่นกันเพราะมา
  // จาก ts() ที่ resolve เป็น string ธรรมดาแล้วก่อนถึง options
  const recipeFilterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        key: "filter",
        control: "custom",
        labelKey: "common.status",
        render: (value, onChange) => (
          <StatusFilter
            value={value}
            onChange={onChange}
            options={STATUS_OPTIONS}
            className="w-full"
          />
        ),
      },
      {
        key: "difficulty",
        control: "custom",
        labelKey: "field.difficulty",
        render: (value, onChange) => (
          <MultiSelectFilter
            value={value}
            onChange={onChange}
            placeholder={tfl("difficulty")}
            options={difficultyFilterOptions}
            className="w-full"
          />
        ),
      },
      {
        key: "cuisine",
        control: "custom",
        labelKey: "field.cuisine",
        section: "listView.sectionCategory",
        render: (value, onChange) => (
          <MultiSelectFilter
            value={value}
            onChange={onChange}
            placeholder={tfl("cuisine")}
            options={cuisineFilterOptions}
            className="w-full"
          />
        ),
      },
      {
        key: "category",
        control: "custom",
        labelKey: "field.category",
        section: "listView.sectionCategory",
        render: (value, onChange) => (
          <MultiSelectFilter
            value={value}
            onChange={onChange}
            placeholder={tfl("category")}
            options={categoryFilterOptions}
            className="w-full"
          />
        ),
      },
    ],
    [
      STATUS_OPTIONS,
      cuisineFilterOptions,
      categoryFilterOptions,
      difficultyFilterOptions,
      tfl,
    ],
  );

  const lf = useListFilters({
    pageKey: LIST_PAGE_KEYS.RECIPE,
    fields: recipeFilterFields,
  });

  const combinedParams = { ...params, filter: lf.filterParam };

  const { data, isLoading, error, refetch } = useRecipe(combinedParams, {
    enabled: !isGridMode,
  });

  const grid = useGridPagination<Recipe>({
    useListHook: useRecipe,
    params: combinedParams,
    enabled: isGridMode,
  });

  const recipes = isGridMode ? grid.items : (data?.data ?? []);
  const totalRecords = isGridMode
    ? grid.totalRecords
    : (data?.paginate?.total ?? 0);

  const table = useRecipeTable({
    recipes,
    cuisines: cuisineData?.data ?? [],
    categories: categoryData?.data ?? [],
    totalRecords,
    params,
    tableConfig,
    onEdit: (recipe) => navigate(`/operation-plan/recipe/${recipe.id}`),
    onDelete: setDeleteTarget,
  });

  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  return (
    <div className="pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="sticky top-0 z-20 space-y-3 pb-3 sm:static sm:pb-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <DocumentListHeader title={t("title")} description={t("desc")} />
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              size="sm"
              variant="outline"
              disabled
              title={tc("comingSoon")}
              className="hidden sm:inline-flex"
            >
              <Download aria-hidden="true" />
              {tc("export")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled
              title={tc("comingSoon")}
              className="hidden sm:inline-flex"
            >
              <Printer aria-hidden="true" />
              {tc("print")}
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/operation-plan/recipe/new")}
            >
              <Plus aria-hidden="true" />
              {t("add")}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-11 w-11 shrink-0 sm:hidden"
                  aria-label={tc("aria.moreActions")}
                >
                  <MoreHorizontal aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled>
                  <Download aria-hidden="true" />
                  {tc("export")}
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <Printer aria-hidden="true" />
                  {tc("print")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex w-full flex-1 items-center gap-2 sm:w-auto">
            <div className="flex-1 sm:flex-initial">
              <SearchInput defaultValue={search} onSearch={setSearch} />
            </div>
            <span className="bg-border hidden h-4 w-px sm:block" />
            <ViewSelector
              view={lf.view}
              snapshot={{ filters: lf.values, sort: lf.sortParam || undefined }}
            />
            <ListFilter
              fields={recipeFilterFields}
              values={lf.values}
              setValue={lf.setValue}
              onClearAll={lf.clearAll}
              onSaveClick={() => setSaveViewDialogOpen(true)}
              activeCount={lf.activeFilters.length}
            />
          </div>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <DataGridSortMenu table={table} />
            {!isGridMode && (
              <DataGridColumnVisibility
                table={table}
                trigger={
                  <Button
                    size="icon-sm"
                    variant="outline"
                    aria-label={tc("aria.toggleColumns")}
                  >
                    <Columns3 className="size-4" />
                  </Button>
                }
              />
            )}
            <div className="flex items-center rounded-md border">
              <Button
                size="icon-sm"
                variant={displayMode === "list" ? "secondary" : "ghost"}
                onClick={() => setDisplayMode("list")}
                aria-label={tc("aria.listView")}
              >
                <LayoutList className="size-4" />
              </Button>
              <Button
                size="icon-sm"
                variant={displayMode === "grid" ? "secondary" : "ghost"}
                onClick={() => setDisplayMode("grid")}
                aria-label={tc("aria.gridView")}
              >
                <LayoutGrid className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <ActiveFilterBar filters={lf.activeFilters} onClearAll={lf.clearAll} />
      </div>

      <div className="mt-3 space-y-3">
        {isGridMode && grid.isLoading && <CardSkeletonGrid />}
        {isGridMode && !grid.isLoading && recipes.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recipes.map((item) => (
                <RecipeCard
                  key={item.id}
                  item={item}
                  cuisines={cuisineData?.data ?? []}
                  categories={categoryData?.data ?? []}
                  onEdit={(r) => navigate(`/operation-plan/recipe/${r.id}`)}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
            {grid.hasMore && (
              <div ref={grid.sentinelRef} className="flex justify-center py-4">
                {grid.isLoadingMore && (
                  <Loader2 className="text-muted-foreground size-5 animate-spin" />
                )}
              </div>
            )}
          </>
        )}
        {isGridMode && !grid.isLoading && recipes.length === 0 && (
          <EmptyComponent />
        )}
        {!isGridMode && (
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
                lf.activeFilters.length > 0
                  ? "max-h-[calc(100vh-13rem-3rem)]"
                  : "max-h-[calc(100vh-10rem-3rem)]",
              )}
            >
              <DataGridScrollArea>
                <DataGridTable />
              </DataGridScrollArea>
              <DataGridPagination />
            </DataGridContainer>
          </DataGrid>
        )}
      </div>

      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) =>
          !open && !deleteRecipe.isPending && setDeleteTarget(null)
        }
        title={t("deleteTitle")}
        description={t("deleteConfirm", { name: deleteTarget?.name ?? "" })}
        isPending={deleteRecipe.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteRecipe.mutate(deleteTarget.id, {
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
    </div>
  );
}
