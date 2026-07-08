
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
import {
  useRecipeCategory,
  useDeleteRecipeCategory,
} from "@/hooks/use-recipe-category";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGridPagination } from "@/hooks/use-grid-pagination";
import { useURL } from "@/hooks/use-url";
import type { RecipeCategory } from "@/types/recipe-category";
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
import { CardSkeletonGrid } from "@/components/loader/card-skeleton";
import { useRecipeCategoryTable } from "./use-recipe-category-table";
import RecipeCategoryCard from "./recipe-category-card";

/**
 * คอมโพเนนต์หลักของหน้ารายการหมวดหมู่สูตรอาหาร รองรับ list/grid view และ filter
 * @returns React element ของรายการหมวดหมู่สูตรอาหาร
 * @example
 * // ใช้ภายใน page.tsx ของโมดูล category
 * <RecipeCategoryComponent />
 */
export default function RecipeCategoryComponent() {
  const t = useTranslations("operationPlan.recipeCategory");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const tt = useTranslations("toast");
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<RecipeCategory | null>(null);
  const [displayMode, setDisplayMode] = useState<"list" | "grid">("list");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const isMobile = useIsMobile();
  const deleteCategory = useDeleteRecipeCategory();
  const tfl = useTranslations("field");
  const { params, search, setSearch, filter, setFilter, tableConfig } =
    useDataGridState();
  const [parentFilter, setParentFilter] = useURL("parent");
  const isGridMode = isMobile || displayMode === "grid";

  const { data: allData } = useRecipeCategory({ perpage: -1 });
  const allCategories = allData?.data ?? [];

  const parentMap = new Map(allCategories.map((c) => [c.id, c.name]));

  const parentFilterOptions = allCategories
    .filter((c) => c.is_active)
    .map((c) => ({ label: c.name, value: `parent_id|string:${c.id}` }));

  const combinedFilters = [params.filter, parentFilter].filter(Boolean).join(",");
  const combinedParams = { ...params, filter: combinedFilters || undefined };

  const { data, isLoading, error, refetch } = useRecipeCategory(
    combinedParams,
    {
      enabled: !isGridMode,
    },
  );

  const grid = useGridPagination<RecipeCategory>({
    useListHook: useRecipeCategory,
    params: combinedParams,
    enabled: isGridMode,
  });

  const categories = isGridMode ? grid.items : (data?.data ?? []);
  const totalRecords = isGridMode
    ? grid.totalRecords
    : (data?.paginate?.total ?? 0);

  const STATUS_OPTIONS = [
    { label: ts("active"), value: "is_active|bool:true" },
    { label: ts("inactive"), value: "is_active|bool:false" },
  ];

  const activeFilters: ActiveFilter[] = [];

  if (filter) {
    const match = STATUS_OPTIONS.find((o) => o.value === filter);
    if (match) {
      activeFilters.push({
        key: `status-${filter}`,
        label: match.label,
        onRemove: () => setFilter(""),
      });
    }
  }

  if (parentFilter) {
    for (const v of parentFilter.split(",")) {
      const match = parentFilterOptions.find((o) => o.value === v);
      if (match) {
        activeFilters.push({
          key: `parent-${v}`,
          label: match.label,
          onRemove: () => {
            const next = parentFilter
              .split(",")
              .filter((val) => val !== v)
              .join(",");
            setParentFilter(next);
          },
        });
      }
    }
  }

  const clearAllFilters = () => {
    setFilter("");
    setParentFilter("");
  };

  const table = useRecipeCategoryTable({
    categories,
    allCategories,
    totalRecords,
    params,
    tableConfig,
    onEdit: (category) =>
      navigate(`/operation-plan/category/${category.id}`),
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
              onClick={() => navigate("/operation-plan/category/new")}
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
                value={parentFilter}
                onChange={setParentFilter}
                placeholder={tfl("parent")}
                options={parentFilterOptions}
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
                    value={parentFilter}
                    onChange={setParentFilter}
                    placeholder={tfl("parent")}
                    options={parentFilterOptions}
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
        {isGridMode && !grid.isLoading && categories.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {categories.map((item, i) => (
                <RecipeCategoryCard
                  key={item.id}
                  item={item}
                  index={i}
                  parentName={
                    item.parent_id ? parentMap.get(item.parent_id) : undefined
                  }
                  onEdit={(c) =>
                    navigate(`/operation-plan/category/${c.id}`)
                  }
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
        {isGridMode && !grid.isLoading && categories.length === 0 && (
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
    </div>
  );
}
