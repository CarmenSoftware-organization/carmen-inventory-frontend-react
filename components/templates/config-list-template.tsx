
import { useState } from "react";
import { useRouter } from "@/lib/compat/navigation";
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
  RefreshCw,
} from "lucide-react";
import { DataGridColumnVisibility } from "@/components/ui/data-grid/data-grid-column-visibility";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGridPagination } from "@/hooks/use-grid-pagination";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { ModuleTileIcon } from "@/components/ui/module-tile";
import SearchInput from "@/components/search-input";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import EmptyComponent from "@/components/empty-component";
import { ErrorState } from "@/components/ui/error-state";
import { StatusFilter } from "@/components/ui/status-filter";
import {
  ActiveFilterBar,
  type ActiveFilter,
} from "@/components/ui/active-filter-bar";
import { CardSkeletonGrid } from "@/components/loader/card-skeleton";
import { cn } from "@/lib/utils";
import { downloadXlsx, buildXlsxFileName } from "@/lib/xlsx-utils";
import { useCan } from "@/hooks/use-can";
import { usePermissionPrefix } from "@/hooks/use-permission-prefix";
import { dispatchPermissionDenied } from "@/components/permission-denied-dialog";
import { buildPermissionKey } from "@/constant/permissions";
import type { CardRenderProps, ConfigListTemplateProps } from "./types";

interface GridContentArgs<TEntity extends { id: string }> {
  readonly isLoading: boolean;
  readonly entities: TEntity[];
  readonly renderCard?: (props: CardRenderProps<TEntity>) => React.ReactNode;
  readonly handleEdit: (entity: TEntity) => void;
  readonly handleDelete: (entity: TEntity) => void;
  readonly useInfiniteScroll: boolean;
  readonly grid: {
    readonly hasMore: boolean;
    readonly isLoadingMore: boolean;
    readonly sentinelRef: (node: HTMLDivElement | null) => void;
  };
}

/**
 * Render การ์ดกริด + infinite-scroll sentinel สำหรับโหมด grid/mobile
 *
 * แยกออกจาก ConfigListTemplate เพื่อหลีกเลี่ยง nested ternaries (S3358)
 */
function renderGridContent<TEntity extends { id: string }>({
  isLoading,
  entities,
  renderCard,
  handleEdit,
  handleDelete,
  useInfiniteScroll,
  grid,
}: GridContentArgs<TEntity>) {
  if (isLoading) return <CardSkeletonGrid />;
  if (entities.length === 0) return <EmptyComponent />;
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {entities.map((item, index) => (
          <div key={item.id}>
            {renderCard?.({
              item,
              onEdit: handleEdit,
              onDelete: handleDelete,
              index,
            })}
          </div>
        ))}
      </div>
      {useInfiniteScroll && grid.hasMore && (
        <div ref={grid.sentinelRef} className="flex justify-center py-4">
          {grid.isLoadingMore && (
            <Loader2 className="text-muted-foreground size-5 animate-spin" />
          )}
        </div>
      )}
    </>
  );
}

export function ConfigListTemplate<TEntity extends { id: string }>({
  translationNamespace,
  entityNameField,
  useList,
  useDelete,
  useTable,
  renderDialog,
  renderDeleteDialog,
  renderCard,
  extraToolbar,
  extraActions,
  statusOptions: statusOptionsProp,
  hideStatusFilter,
  hideExportPrint,
  exportColumns,
  exportFileNamePrefix,
  exportSheetName,
  defaultSort,
  addPath,
  getEditPath,
  extraFilter,
  extraActiveFilters,
  onClearExtraFilters,
  permissionPrefix,
}: Readonly<ConfigListTemplateProps<TEntity>>) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<TEntity | null>(null);
  const deleteMutation = useDelete();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEntity, setEditEntity] = useState<TEntity | null>(null);
  const [displayMode, setDisplayMode] = useState<"list" | "grid">("list");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const isMobile = useIsMobile();
  const { params, search, setSearch, filter, setFilter, tableConfig } =
    useDataGridState({ defaultSort });

  const mergedParams = (() => {
    if (!extraFilter) return params;
    const combined = [params.filter, extraFilter].filter(Boolean).join(",");
    return { ...params, filter: combined || undefined };
  })();

  // grid/card view (mobile หรือ desktop grid mode) → infinite scroll
  // (โหลดเพิ่มเมื่อ scroll ถึง sentinel ล่างสุด แทน pagination ของ table)
  const isGridMode = !!renderCard && (!!isMobile || displayMode === "grid");
  const useInfiniteScroll = isGridMode;

  const directQuery = useList(mergedParams, { enabled: !useInfiniteScroll });
  const grid = useGridPagination<TEntity>({
    useListHook: useList as Parameters<
      typeof useGridPagination<TEntity>
    >[0]["useListHook"],
    params: mergedParams,
    enabled: !!useInfiniteScroll,
  });

  const t = useTranslations(translationNamespace);
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const tt = useTranslations("toast");

  const entities = useInfiniteScroll
    ? grid.items
    : (directQuery.data?.data ?? []);

  const totalRecords = useInfiniteScroll
    ? grid.totalRecords
    : (directQuery.data?.paginate?.total ?? 0);

  const isLoading = useInfiniteScroll ? grid.isLoading : directQuery.isLoading;
  const error = directQuery.error;
  const refetch = directQuery.refetch;

  const STATUS_OPTIONS = statusOptionsProp ?? [
    { label: ts("active"), value: "is_active|bool:true" },
    { label: ts("inactive"), value: "is_active|bool:false" },
  ];

  const activeFilterTag = filter
    ? STATUS_OPTIONS.find((o) => o.value === filter)
    : null;

  const clearAllFilters = () => {
    setFilter("");
    onClearExtraFilters?.();
  };

  const activeFiltersBase: ActiveFilter[] = activeFilterTag
    ? [
        {
          key: "filter",
          label: activeFilterTag.label,
          onRemove: () => setFilter(""),
        },
      ]
    : [];
  const activeFilters: ActiveFilter[] = extraActiveFilters
    ? [...activeFiltersBase, ...extraActiveFilters]
    : activeFiltersBase;

  const handleEdit = (entity: TEntity) => {
    if (getEditPath) {
      router.push(getEditPath(entity));
      return;
    }
    setEditEntity(entity);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    if (addPath) {
      router.push(addPath);
      return;
    }
    setEditEntity(null);
    setDialogOpen(true);
  };

  const handleExport = () => {
    if (!exportColumns) return;
    if (entities.length === 0) {
      toast.warning(tc("exportNoData"));
      return;
    }
    setIsExporting(true);
    try {
      const prefix =
        exportFileNamePrefix ??
        translationNamespace.split(".").pop() ??
        "export";
      downloadXlsx({
        rows: entities,
        columns: exportColumns,
        sheetName: exportSheetName ?? t("title"),
        fileName: buildXlsxFileName(prefix),
      });
      toast.success(tc("exportSuccess", { count: entities.length }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tc("exportFailed"));
    } finally {
      setIsExporting(false);
    }
  };

  const { can, isAdmin } = useCan();
  const autoPrefix = usePermissionPrefix();
  const prefix = permissionPrefix ?? autoPrefix;
  const createPermission = prefix
    ? buildPermissionKey(prefix, "create")
    : undefined;
  const createDenied = !!createPermission && !isAdmin && !can(createPermission);
  const updatePermission = prefix
    ? buildPermissionKey(prefix, "update")
    : undefined;
  const updateDenied = !!updatePermission && !isAdmin && !can(updatePermission);

  const table = useTable({
    data: entities,
    totalRecords,
    params,
    tableConfig,
    onEdit: handleEdit,
    onDelete: setDeleteTarget,
    permissionPrefix: prefix,
  });

  const pullRefresh = usePullToRefresh({
    onRefresh: refetch,
    disabled: !isMobile,
  });

  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;

  const filterCount = activeFilters.length;
  const hasInlineFilters = !hideStatusFilter || !!extraToolbar;

  return (
    <div
      ref={pullRefresh.containerRef}
      className="pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      {isMobile && (pullRefresh.distance > 0 || pullRefresh.isRefreshing) && (
        <div
          className="text-muted-foreground flex items-center justify-center overflow-hidden transition-all"
          style={{
            height: pullRefresh.isRefreshing ? 48 : pullRefresh.distance,
          }}
          aria-hidden={!pullRefresh.isRefreshing}
        >
          <RefreshCw
            className={cn("size-4", pullRefresh.isRefreshing && "animate-spin")}
            style={{
              transform: pullRefresh.isRefreshing
                ? undefined
                : `rotate(${pullRefresh.progress * 360}deg)`,
            }}
          />
        </div>
      )}
      {/* Sticky top section on mobile */}
      <div className="sticky top-0 z-20 space-y-3 pb-3 sm:static sm:pb-0">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ModuleTileIcon />
              <h1 className="text-lg font-semibold">{t("title")}</h1>
              {totalRecords > 0 && (
                <Badge variant="secondary" size="sm" className="tabular-nums">
                  {totalRecords.toLocaleString()}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm">
              {t("desc")}
            </p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            {/* Desktop: inline export/print */}
            {!hideExportPrint && (
              <div className="hidden items-center gap-2 sm:flex">
                {exportColumns && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExport}
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <Loader2 className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Download aria-hidden="true" />
                    )}
                    {isExporting ? tc("exporting") : tc("export")}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => globalThis.print()}
                >
                  <Printer aria-hidden="true" />
                  {tc("print")}
                </Button>
              </div>
            )}
            {extraActions}
            <Button
              size="sm"
              onClick={
                createDenied
                  ? () => dispatchPermissionDenied(createPermission)
                  : handleAdd
              }
              aria-disabled={createDenied || undefined}
              className={cn(createDenied && "opacity-50")}
            >
              <Plus aria-hidden="true" />
              {t("add")}
            </Button>
            {/* Mobile: overflow menu for export/print */}
            {!hideExportPrint && (
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
                  {exportColumns && (
                    <DropdownMenuItem
                      onClick={handleExport}
                      disabled={isExporting}
                    >
                      {isExporting ? (
                        <Loader2 className="animate-spin" aria-hidden="true" />
                      ) : (
                        <Download aria-hidden="true" />
                      )}
                      {isExporting ? tc("exporting") : tc("export")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => globalThis.print()}>
                    <Printer aria-hidden="true" />
                    {tc("print")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex w-full flex-1 items-center gap-2 sm:w-auto">
            <div className="flex-1 sm:flex-initial">
              <SearchInput defaultValue={search} onSearch={setSearch} />
            </div>
            <span className="bg-border hidden h-4 w-px sm:block" />
            {/* Desktop inline filters */}
            {!hideStatusFilter && (
              <div className="hidden sm:block">
                <StatusFilter
                  value={filter}
                  onChange={setFilter}
                  options={STATUS_OPTIONS}
                />
              </div>
            )}
            <div className="hidden sm:contents">{extraToolbar}</div>
            {/* Mobile filter sheet trigger */}
            {hasInlineFilters && (
              <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
                <SheetTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    className="relative h-11 w-11 shrink-0 sm:hidden"
                    aria-label={tc("aria.openFilters")}
                  >
                    <FilterIcon aria-hidden="true" />
                    {filterCount > 0 && (
                      <Badge
                        variant="secondary"
                        size="xs"
                        className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[0.625rem] tabular-nums"
                      >
                        {filterCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="max-h-[80vh]">
                  <SheetHeader>
                    <SheetTitle>{tc("filter")}</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-3 p-4">
                    {!hideStatusFilter && (
                      <StatusFilter
                        value={filter}
                        onChange={setFilter}
                        options={STATUS_OPTIONS}
                      />
                    )}
                    {extraToolbar}
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
            )}
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
            {renderCard && (
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
            )}
          </div>
        </div>

        {/* Active filter badges */}
        <ActiveFilterBar filters={activeFilters} onClearAll={clearAllFilters} />
      </div>

      {/* Content */}
      <div className="mt-3 space-y-3">
        {isGridMode ? (
          renderGridContent({
            isLoading,
            entities,
            renderCard,
            handleEdit,
            handleDelete: setDeleteTarget,
            useInfiniteScroll,
            grid,
          })
        ) : (
          <DataGrid
            table={table}
            recordCount={totalRecords}
            isLoading={isLoading}
            tableLayout={{ headerSticky: true }}
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

      {renderDialog?.({
        open: dialogOpen,
        onOpenChange: setDialogOpen,
        entity: editEntity,
        readOnly: !!editEntity && updateDenied,
      })}

      {(() => {
        const onOpenChange = (open: boolean) => {
          if (!open && !deleteMutation.isPending) setDeleteTarget(null);
        };
        const onConfirm = () => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget.id, {
            onSuccess: () => {
              toast.success(tt("deleteSuccess", { entity: t("entity") }));
              setDeleteTarget(null);
            },
            onError: (err) => toast.error(err.message),
          });
        };

        if (renderDeleteDialog) {
          return renderDeleteDialog({
            target: deleteTarget,
            open: !!deleteTarget,
            onOpenChange,
            isPending: deleteMutation.isPending,
            onConfirm,
          });
        }

        return (
          <DeleteDialog
            open={!!deleteTarget}
            onOpenChange={onOpenChange}
            title={t("deleteTitle")}
            description={t("deleteConfirm", {
              name: deleteTarget
                ? String(deleteTarget[entityNameField] ?? "")
                : "",
            })}
            isPending={deleteMutation.isPending}
            onConfirm={onConfirm}
          />
        );
      })()}
    </div>
  );
}
