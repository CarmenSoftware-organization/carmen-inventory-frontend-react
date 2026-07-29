
import { lazy, Suspense, useMemo, useState } from "react";
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
} from "@/components/ui/data-grid/data-grid";
import { cn } from "@/lib/utils";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination";
import { Button } from "@/components/ui/button";
import {
  useEquipmentCategory,
  useDeleteEquipmentCategory,
} from "@/hooks/use-equipment-category";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGridPagination } from "@/hooks/use-grid-pagination";
import type { EquipmentCategory } from "@/types/equipment-category";
import SearchInput from "@/components/search-input";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ErrorState } from "@/components/ui/error-state";
import EmptyComponent from "@/components/empty-component";
import { StatusFilter } from "@/components/ui/status-filter";
import { DocumentListHeader } from "@/components/share/document-list-header";
import { ActiveFilterBar } from "@/components/ui/active-filter-bar";
import { DataGridColumnVisibility } from "@/components/ui/data-grid/data-grid-column-visibility";
import { CardSkeletonGrid } from "@/components/loader/card-skeleton";
import { useEquipmentCategoryTable } from "./use-equipment-category-table";
import EquipmentCategoryCard from "./equipment-category-card";
import { useListFilters } from "@/hooks/use-list-filters";
import { ViewSelector } from "@/components/list-filter/view-selector";
import { ListFilterSheet } from "@/components/list-filter/list-filter-sheet";
import { SaveViewDialog } from "@/components/list-filter/save-view-dialog";
import { LIST_PAGE_KEYS } from "@/constant/list-page-keys";
import type { FilterFieldDef } from "@/types/list-filter";
import type { ViewScope } from "@/types/list-view";

// แทน next/dynamic ด้วย React.lazy (code-split dialog chunk เหมือนเดิม)
const EquipmentCategoryDialog = lazy(() =>
  import("./equipment-category-dialog").then((mod) => ({
    default: mod.EquipmentCategoryDialog,
  })),
);

/**
 * คอมโพเนนต์หลักของหน้ารายการหมวดหมู่อุปกรณ์ รองรับ list/grid view และ dialog
 * @returns React element ของรายการหมวดหมู่อุปกรณ์
 * @example
 * // ใช้ภายใน page.tsx ของโมดูล equipment-category
 * <EquipmentCategoryComponent />
 */
export default function EquipmentCategoryComponent() {
  const t = useTranslations("operationPlan.equipmentCategory");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const tt = useTranslations("toast");
  const [deleteTarget, setDeleteTarget] = useState<EquipmentCategory | null>(
    null,
  );
  const [displayMode, setDisplayMode] = useState<"list" | "grid">("list");
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const isMobile = useIsMobile();
  const deleteEquipmentCategory = useDeleteEquipmentCategory();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<EquipmentCategory | null>(
    null,
  );
  const { params, search, setSearch, tableConfig } = useDataGridState();

  const isGridMode = isMobile || displayMode === "grid";

  // STATUS_OPTIONS ใช้ ts() แปลเป็น string จริงแล้วก่อนถึง options (ไม่ใช่
  // i18n key) จึงต้องใช้ control: "custom" ห่อ StatusFilter ตรง ๆ — เหมือน
  // pattern ของ PO_TYPE/CN_TYPE ใน Task 19
  const STATUS_OPTIONS = useMemo(
    () => [
      { label: ts("active"), value: "is_active|bool:true" },
      { label: ts("inactive"), value: "is_active|bool:false" },
    ],
    [ts],
  );

  const equipmentCategoryFilterFields = useMemo<FilterFieldDef[]>(
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
    ],
    [STATUS_OPTIONS],
  );

  const lf = useListFilters({
    pageKey: LIST_PAGE_KEYS.EQUIPMENT_CATEGORY,
    fields: equipmentCategoryFilterFields,
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

  const { data, isLoading, error, refetch } = useEquipmentCategory(
    combinedParams,
    {
      enabled: !isGridMode,
    },
  );

  const grid = useGridPagination<EquipmentCategory>({
    useListHook: useEquipmentCategory,
    params: combinedParams,
    enabled: isGridMode,
  });

  const equipmentCategories = isGridMode ? grid.items : (data?.data ?? []);
  const totalRecords = isGridMode
    ? grid.totalRecords
    : (data?.paginate?.total ?? 0);

  const handleEdit = (ec: EquipmentCategory) => {
    setEditCategory(ec);
    setDialogOpen(true);
  };

  const table = useEquipmentCategoryTable({
    equipmentCategories,
    totalRecords,
    params,
    tableConfig,
    onEdit: handleEdit,
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
              onClick={() => {
                setEditCategory(null);
                setDialogOpen(true);
              }}
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
            <ListFilterSheet
              fields={equipmentCategoryFilterFields}
              values={lf.values}
              setValue={lf.setValue}
              onClearAll={lf.clearAll}
              onSaveClick={() => setSaveViewDialogOpen(true)}
              activeCount={lf.activeFilters.length}
            />
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

        <ActiveFilterBar filters={lf.activeFilters} onClearAll={lf.clearAll} />
      </div>

      <div className="mt-3 space-y-3">
        {isGridMode && grid.isLoading && <CardSkeletonGrid />}
        {isGridMode && !grid.isLoading && equipmentCategories.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {equipmentCategories.map((item, i) => (
                <EquipmentCategoryCard
                  key={item.id}
                  item={item}
                  index={i}
                  onEdit={handleEdit}
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
        {isGridMode && !grid.isLoading && equipmentCategories.length === 0 && (
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
              <div className="flex-1 overflow-auto">
                <DataGridTable />
              </div>
              <DataGridPagination />
            </DataGridContainer>
          </DataGrid>
        )}
      </div>

      <Suspense fallback={null}>
        <EquipmentCategoryDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          equipmentCategory={editCategory}
        />
      </Suspense>

      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) =>
          !open && !deleteEquipmentCategory.isPending && setDeleteTarget(null)
        }
        title={t("deleteTitle")}
        description={t("deleteConfirm", {
          name: deleteTarget?.name ?? "",
        })}
        isPending={deleteEquipmentCategory.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteEquipmentCategory.mutate(deleteTarget.id, {
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
    </div>
  );
}
