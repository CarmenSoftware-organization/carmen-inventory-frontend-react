
import { useState } from "react";
import { useRouter } from "@/lib/compat/navigation";
import { useTranslations } from "use-intl";
import {
  Columns3,
  Download,
  Filter as FilterIcon,
  LayoutGrid,
  LayoutList,
  Loader2,
  MoreHorizontal,
  Printer,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGridPagination } from "@/hooks/use-grid-pagination";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useInventoryAdjustment,
  useDeleteInventoryAdjustment,
  useExportInventoryAdjustment,
} from "@/hooks/use-inventory-adjustment";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import {
  INVENTORY_ADJUSTMENT_BASE_PATH,
  getAdjustmentType,
  type InventoryAdjustment,
} from "@/types/inventory-adjustment";
import { IA_TYPE_ICON } from "@/constant/inventory-adjustment";
import SearchInput from "@/components/search-input";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ErrorState } from "@/components/ui/error-state";
import EmptyComponent from "@/components/empty-component";
import { StatusFilter } from "@/components/ui/status-filter";
import { ModuleTileIcon } from "@/components/ui/module-tile";
import {
  ActiveFilterBar,
  type ActiveFilter,
} from "@/components/ui/active-filter-bar";
import { DataGridColumnVisibility } from "@/components/ui/data-grid/data-grid-column-visibility";
import { useErrorToast } from "@/hooks/use-error-toast";
import { useInventoryAdjustmentTable } from "./use-ia-table";
import IaCardList from "./ia-card-list";

export default function InventoryAdjustmentComponent() {
  const router = useRouter();
  const t = useTranslations("inventoryManagement.inventoryAdjustment");
  const tc = useTranslations("common");
  const tt = useTranslations("toast");
  const ts = useTranslations("status");
  const tfl = useTranslations("field");
  const [deleteTarget, setDeleteTarget] = useState<InventoryAdjustment | null>(
    null,
  );
  const [displayMode, setDisplayMode] = useState<"list" | "grid">("list");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const isMobile = useIsMobile();
  const errorToast = useErrorToast();
  const isGridMode = isMobile || displayMode === "grid";
  // Infinite scroll สำหรับทุกโหมด grid (mobile auto + desktop card view)
  // โหมด list (desktop table) ยังคงใช้ pagination ปกติ
  const useInfiniteScroll = isGridMode;
  const deleteInventoryAdjustment = useDeleteInventoryAdjustment();
  const { exportInventoryAdjustment, isExporting } =
    useExportInventoryAdjustment();
  const { params, search, setSearch, filter, setFilter, tableConfig } =
    useDataGridState();

  const filterParts = filter ? filter.split(",") : [];
  const statusValue =
    filterParts.find((f) => f.startsWith("doc_status|")) ?? "";
  const typeValue = filterParts.find((f) => f.startsWith("type|")) ?? "";

  const handleStatusChange = (value: string) => {
    setFilter([value, typeValue].filter(Boolean).join(","));
  };

  const handleTypeChange = (value: string) => {
    setFilter([statusValue, value].filter(Boolean).join(","));
  };

  const STATUS_OPTIONS = [
    { label: ts("in_progress"), value: "doc_status|string:in_progress" },
    { label: ts("completed"), value: "doc_status|string:completed" },
    { label: ts("draft"), value: "doc_status|string:draft" },
    { label: ts("voided"), value: "doc_status|string:voided" },
  ];

  const TYPE_OPTIONS = [
    { label: ts("stockIn"), value: "type|string:stock-in" },
    { label: ts("stockOut"), value: "type|string:stock-out" },
  ];

  const activeFilters: ActiveFilter[] = (() => {
    const filters: ActiveFilter[] = [];

    if (typeValue) {
      const match = TYPE_OPTIONS.find((o) => o.value === typeValue);
      if (match) {
        filters.push({
          key: "type",
          label: match.label,
          onRemove: () => handleTypeChange(""),
        });
      }
    }

    if (statusValue) {
      const match = STATUS_OPTIONS.find((o) => o.value === statusValue);
      if (match) {
        filters.push({
          key: "status",
          label: match.label,
          onRemove: () => handleStatusChange(""),
        });
      }
    }

    return filters;
  })();

  const clearAllFilters = () => {
    setFilter("");
  };

  const handleExport = async () => {
    try {
      const count = await exportInventoryAdjustment({
        params,
        columns: [
          {
            header: tfl("adjustment"),
            value: (r) => r.si_no ?? r.so_no ?? "",
            width: 22,
          },
          {
            header: tfl("date"),
            value: (r) => r.si_date ?? r.so_date ?? "",
            width: 12,
          },
          {
            header: tfl("type"),
            value: (r) =>
              ts(getAdjustmentType(r) === "stock-in" ? "stockIn" : "stockOut"),
            width: 12,
          },
          {
            header: tfl("location"),
            value: (r) => r.location_name ?? "",
            width: 22,
          },
          {
            header: tfl("reason"),
            value: (r) => r.adjustment_type_name ?? "",
            width: 22,
          },
          {
            header: tfl("items"),
            value: (r) => r.item_count ?? 0,
            width: 8,
          },
          {
            header: tfl("total"),
            value: (r) => r.base_total_cost ?? 0,
            width: 14,
          },
          {
            header: tfl("status"),
            value: (r) => r.doc_status,
            width: 14,
          },
          {
            header: tfl("description"),
            value: (r) => r.description ?? "",
            width: 40,
          },
        ],
      });
      if (count === 0) {
        toast.warning(tc("exportNoData"));
        return;
      }
      toast.success(tc("exportSuccess", { count }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tc("exportFailed"));
    }
  };

  const { data, isLoading, error, refetch } = useInventoryAdjustment(params, {
    enabled: !useInfiniteScroll,
  });

  const grid = useGridPagination<InventoryAdjustment>({
    useListHook: useInventoryAdjustment,
    params,
    enabled: useInfiniteScroll,
  });

  const items = useInfiniteScroll ? grid.items : (data?.data ?? []);
  const totalRecords = useInfiniteScroll
    ? grid.totalRecords
    : (data?.paginate?.total ?? 0);

  const navigateToItem = (item: InventoryAdjustment) =>
    router.push(
      `${INVENTORY_ADJUSTMENT_BASE_PATH}/${item.id}?type=${getAdjustmentType(item)}`,
    );

  const table = useInventoryAdjustmentTable({
    items,
    totalRecords,
    params,
    tableConfig,
    onEdit: navigateToItem,
    onDelete: setDeleteTarget,
  });

  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;

  return (
    <div className="pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="sticky top-0 z-20 space-y-3 pb-3 sm:static sm:pb-0">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ModuleTileIcon />
              <h1 className="text-lg font-semibold">{t("title")}</h1>
              {totalRecords > 0 && (
                <Badge
                  variant="secondary"
                  size="sm"
                  className="text-xs tabular-nums"
                >
                  {totalRecords.toLocaleString()}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm">
              {t("desc")}
            </p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExport}
              disabled={isExporting}
              className="hidden sm:inline-flex"
            >
              {isExporting ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Download aria-hidden="true" />
              )}
              {isExporting ? tc("exporting") : tc("export")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => globalThis.print()}
              className="hidden sm:inline-flex"
            >
              <Printer aria-hidden="true" />
              {tc("print")}
            </Button>
            {(() => {
              const StockInIcon = IA_TYPE_ICON["stock-in"];
              const StockOutIcon = IA_TYPE_ICON["stock-out"];
              return (
                <>
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() =>
                      router.push(
                        `${INVENTORY_ADJUSTMENT_BASE_PATH}/new?type=stock-in`,
                      )
                    }
                  >
                    <StockInIcon aria-hidden="true" />
                    {t("addStockIn")}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      router.push(
                        `${INVENTORY_ADJUSTMENT_BASE_PATH}/new?type=stock-out`,
                      )
                    }
                  >
                    <StockOutIcon aria-hidden="true" />
                    {t("addStockOut")}
                  </Button>
                </>
              );
            })()}
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
                <DropdownMenuItem onClick={handleExport} disabled={isExporting}>
                  {isExporting ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Download aria-hidden="true" />
                  )}
                  {isExporting ? tc("exporting") : tc("export")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => globalThis.print()}>
                  <Printer aria-hidden="true" />
                  {tc("print")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex w-full flex-1 items-center gap-2 sm:w-auto">
            <div className="flex-1 sm:flex-initial">
              <SearchInput defaultValue={search} onSearch={setSearch} />
            </div>
            <span className="bg-border hidden h-4 w-px sm:block" />
            <div className="hidden sm:flex sm:items-center sm:gap-2">
              <StatusFilter
                value={typeValue}
                onChange={handleTypeChange}
                options={TYPE_OPTIONS}
                placeholder={tfl("type")}
                defaultLabel={ts("allType")}
              />
              <StatusFilter
                value={statusValue}
                onChange={handleStatusChange}
                options={STATUS_OPTIONS}
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
                    value={typeValue}
                    onChange={handleTypeChange}
                    options={TYPE_OPTIONS}
                    placeholder={tfl("type")}
                    defaultLabel={ts("allType")}
                  />
                  <StatusFilter
                    value={statusValue}
                    onChange={handleStatusChange}
                    options={STATUS_OPTIONS}
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
            {displayMode === "list" && (
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

        {/* Active filter badges */}
        <ActiveFilterBar filters={activeFilters} onClearAll={clearAllFilters} />
      </div>

      <div className="mt-3 space-y-3">
        {/* Content */}
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

        {isGridMode && (
          <>
            <IaCardList
              items={items}
              isLoading={useInfiniteScroll ? grid.isLoading : isLoading}
              onEdit={navigateToItem}
            />
            {useInfiniteScroll && grid.hasMore && (
              <div ref={grid.sentinelRef} className="flex justify-center py-4">
                {grid.isLoadingMore && (
                  <Loader2 className="text-muted-foreground size-5 animate-spin" />
                )}
              </div>
            )}
          </>
        )}
      </div>

      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) =>
          !open && !deleteInventoryAdjustment.isPending && setDeleteTarget(null)
        }
        title={t("deleteTitle")}
        description={t("deleteConfirm", {
          documentNo: deleteTarget?.si_no ?? deleteTarget?.so_no ?? "",
        })}
        isPending={deleteInventoryAdjustment.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteInventoryAdjustment.mutate(
            {
              id: deleteTarget.id,
              type: getAdjustmentType(deleteTarget),
            },
            {
              onSuccess: () => {
                toast.success(tt("deleteSuccess", { entity: t("entity") }));
                setDeleteTarget(null);
              },
              onError: errorToast,
            },
          );
        }}
      />
    </div>
  );
}
