
import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import {
  Columns3,
  Download,
  Filter as FilterIcon,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { cn } from "@/lib/utils";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRecipe, useDeleteRecipe } from "@/hooks/use-recipe";
import { useCuisine } from "@/hooks/use-cuisine";
import { useRecipeCategory } from "@/hooks/use-recipe-category";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGridPagination } from "@/hooks/use-grid-pagination";
import { useURL } from "@/hooks/use-url";
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
import {
  ActiveFilterBar,
  type ActiveFilter,
} from "@/components/ui/active-filter-bar";
import { DataGridColumnVisibility } from "@/components/ui/data-grid/data-grid-column-visibility";
import { useRecipeTable } from "./use-recipe-table";
import RecipeCard from "./recipe-card";

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
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const isMobile = useIsMobile();
  const deleteRecipe = useDeleteRecipe();
  const { params, search, setSearch, filter, setFilter, tableConfig } =
    useDataGridState();
  const [cuisineFilter, setCuisineFilter] = useURL("cuisine");
  const [categoryFilter, setCategoryFilter] = useURL("category");
  const [difficultyFilter, setDifficultyFilter] = useURL("difficulty");

  const isGridMode = isMobile || displayMode === "grid";

  const { data: cuisineData } = useCuisine({ perpage: -1 });
  const { data: categoryData } = useRecipeCategory({ perpage: -1 });

  const cuisineFilterOptions = (cuisineData?.data ?? [])
    .filter((c) => c.is_active)
    .map((c) => ({ label: c.name, value: `cuisine_id|string:${c.id}` }));

  const categoryFilterOptions = (categoryData?.data ?? [])
    .filter((c) => c.is_active)
    .map((c) => ({ label: c.name, value: `category_id|string:${c.id}` }));

  const difficultyFilterOptions = RECIPE_DIFFICULTY_OPTIONS.map((o) => ({
    label: o.label,
    value: `difficulty|string:${o.value}`,
  }));

  const combinedRecipeFilters = [
    params.filter,
    cuisineFilter,
    categoryFilter,
    difficultyFilter,
  ]
    .filter(Boolean)
    .join(",");
  const combinedParams = { ...params, filter: combinedRecipeFilters || undefined };

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

  const STATUS_OPTIONS = [
    { label: ts("active"), value: "is_active|bool:true" },
    { label: ts("inactive"), value: "is_active|bool:false" },
  ];

  const activeFilters: ActiveFilter[] = (() => {
    const filters: ActiveFilter[] = [];

    if (filter) {
      const match = STATUS_OPTIONS.find((o) => o.value === filter);
      if (match) {
        filters.push({
          key: `status-${filter}`,
          label: match.label,
          onRemove: () => setFilter(""),
        });
      }
    }

    const urlFilters: {
      value: string;
      options: { label: string; value: string }[];
      key: string;
      setter: (v: string) => void;
    }[] = [
      {
        value: cuisineFilter,
        options: cuisineFilterOptions,
        key: "cuisine",
        setter: setCuisineFilter,
      },
      {
        value: categoryFilter,
        options: categoryFilterOptions,
        key: "category",
        setter: setCategoryFilter,
      },
      {
        value: difficultyFilter,
        options: difficultyFilterOptions,
        key: "difficulty",
        setter: setDifficultyFilter,
      },
    ];

    for (const { value, options, key, setter } of urlFilters) {
      if (!value) continue;
      for (const v of value.split(",")) {
        const match = options.find((o) => o.value === v);
        if (match) {
          filters.push({
            key: `${key}-${v}`,
            label: match.label,
            onRemove: () => {
              const next = value
                .split(",")
                .filter((val) => val !== v)
                .join(",");
              setter(next);
            },
          });
        }
      }
    }

    return filters;
  })();

  const clearAllFilters = () => {
    setFilter("");
    setCuisineFilter("");
    setCategoryFilter("");
    setDifficultyFilter("");
  };

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

  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;

  return (
    <div className="pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="sticky top-0 z-20 space-y-3 pb-3 sm:static sm:pb-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <DocumentListHeader
            title={t("title")}
            description={t("desc")}
            count={totalRecords}
          />
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
            <div className="hidden sm:flex sm:items-center sm:gap-2">
              <StatusFilter
                value={filter}
                onChange={setFilter}
                options={STATUS_OPTIONS}
              />
              <MultiSelectFilter
                value={cuisineFilter}
                onChange={setCuisineFilter}
                placeholder={tfl("cuisine")}
                options={cuisineFilterOptions}
              />
              <MultiSelectFilter
                value={categoryFilter}
                onChange={setCategoryFilter}
                placeholder={tfl("category")}
                options={categoryFilterOptions}
              />
              <MultiSelectFilter
                value={difficultyFilter}
                onChange={setDifficultyFilter}
                placeholder={tfl("difficulty")}
                options={difficultyFilterOptions}
              />
            </div>
            <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className="relative h-11 w-11 shrink-0 sm:hidden"
                  aria-label={tc("aria.openFilters")}
                >
                  <FilterIcon aria-hidden="true" />
                  {activeFilters.length > 0 && (
                    <Badge
                      variant="secondary"
                      size="xs"
                      className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[0.625rem] tabular-nums"
                    >
                      {activeFilters.length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[80vh]">
                <SheetHeader>
                  <SheetTitle>{tc("filter")}</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-3 p-4">
                  <StatusFilter
                    value={filter}
                    onChange={setFilter}
                    options={STATUS_OPTIONS}
                  />
                  <MultiSelectFilter
                    value={cuisineFilter}
                    onChange={setCuisineFilter}
                    placeholder={tfl("cuisine")}
                    options={cuisineFilterOptions}
                  />
                  <MultiSelectFilter
                    value={categoryFilter}
                    onChange={setCategoryFilter}
                    placeholder={tfl("category")}
                    options={categoryFilterOptions}
                  />
                  <MultiSelectFilter
                    value={difficultyFilter}
                    onChange={setDifficultyFilter}
                    placeholder={tfl("difficulty")}
                    options={difficultyFilterOptions}
                  />
                  <Button
                    variant="outline"
                    className="h-11 w-full"
                    onClick={() => setFilterSheetOpen(false)}
                  >
                    {tc("done")}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
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

        <ActiveFilterBar filters={activeFilters} onClearAll={clearAllFilters} />
      </div>

      <div className="mt-3 space-y-3">
        {isGridMode && grid.isLoading && <CardSkeletonGrid />}
        {isGridMode && !grid.isLoading && recipes.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {recipes.map((item, i) => (
                <RecipeCard
                  key={item.id}
                  item={item}
                  index={i}
                  cuisines={cuisineData?.data ?? []}
                  categories={categoryData?.data ?? []}
                  onEdit={(r) => navigate(`/operation-plan/recipe/${r.id}`)}
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
                activeFilters.length > 0
                  ? "max-h-[calc(100vh-13rem-3rem)]"
                  : "max-h-[calc(100vh-10rem-3rem)]",
              )}
            >
              <div className="flex-1 overflow-auto">
                <DataGridTable />
              </div>
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
            onError: (err) => toast.error(err.message),
          });
        }}
      />
    </div>
  );
}
