
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
  Plus,
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
  useStoreRequisition,
  useMyPendingStoreRequisition,
  useDeleteStoreRequisition,
  useExportStoreRequisition,
} from "@/hooks/use-store-requisition";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import type { StoreRequisition } from "@/types/store-requisition";
import SearchInput from "@/components/search-input";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ErrorState } from "@/components/ui/error-state";
import EmptyComponent from "@/components/empty-component";
import { ModuleTileIcon } from "@/components/ui/module-tile";
import {
  ActiveFilterBar,
  type ActiveFilter,
} from "@/components/ui/active-filter-bar";
import { STORE_REQUISITION_STATUS_OPTIONS } from "@/constant/store-requisition";
import { DataGridColumnVisibility } from "@/components/ui/data-grid/data-grid-column-visibility";
import { useURL } from "@/hooks/use-url";
import { useLocation } from "@/hooks/use-location";
import { SrFilterStatus } from "./sr-filter-status";
import { SrFilterFromLocation } from "./sr-filter-from-location";
import { SrFilterToLocation } from "./sr-filter-to-location";
import { SrFilterType } from "./sr-filter-type";
import { useStoreRequisitionTable } from "./use-sr-table";
import SrCardList from "./sr-card-list";

const FROM_LOCATION_PREFIX = "from_location_id|string:";
const TO_LOCATION_PREFIX = "to_location_id|string:";
const SR_TYPE_PREFIX = "sr_type|string:";

/**
 * คอมโพเนนต์หลักของหน้ารายการใบเบิกสินค้า
 * รองรับโหมด list/grid, my-pending/all-document, filter status, delete dialog
 * และ infinite scroll บนมือถือ
 *
 * @returns คอมโพเนนต์หน้ารายการ SR
 * @example
 * // ใช้ใน app/(root)/store-operation/store-requisition/page.tsx
 * import SrComponent from "./_components/sr-component";
 * export default function Page() { return <SrComponent />; }
 */
export default function StoreRequisitionComponent() {
  const t = useTranslations("storeOperation.storeRequisition");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");
  const ts = useTranslations("status");
  const tt = useTranslations("toast");
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<StoreRequisition | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<"my-pending" | "all-document">(
    "my-pending",
  );
  const [displayMode, setDisplayMode] = useState<"list" | "grid">("list");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const isMobile = useIsMobile();
  const isGridMode = isMobile || displayMode === "grid";
  const useInfiniteScroll = !!isMobile;
  const deleteStoreRequisition = useDeleteStoreRequisition();
  const { exportStoreRequisition, isExporting } = useExportStoreRequisition();
  const { params, search, setSearch, filter, setFilter, tableConfig } =
    useDataGridState();
  const [fromLocation, setFromLocation] = useURL("from_location");
  const [toLocation, setToLocation] = useURL("to_location");
  const [srTypeFilter, setSrTypeFilter] = useURL("sr_type");

  const hasSelectedLocations =
    !!fromLocation?.startsWith(FROM_LOCATION_PREFIX) ||
    !!toLocation?.startsWith(TO_LOCATION_PREFIX);
  const { data: locationData } = useLocation(
    { perpage: -1 },
    { enabled: hasSelectedLocations },
  );

  const combinedFilter =
    [params.filter, fromLocation, toLocation, srTypeFilter]
      .filter(Boolean)
      .join(",") || undefined;
  const queryParams = {
    ...params,
    filter: combinedFilter,
    sort: params.sort ?? "sr_date:desc",
  };

  const myPendingQuery = useMyPendingStoreRequisition(queryParams, {
    enabled: !useInfiniteScroll,
  });
  const allDocumentQuery = useStoreRequisition(queryParams, {
    enabled: !useInfiniteScroll,
  });

  const { data, isLoading, error, refetch } =
    viewMode === "my-pending" ? myPendingQuery : allDocumentQuery;

  const activeListHook =
    viewMode === "my-pending"
      ? useMyPendingStoreRequisition
      : useStoreRequisition;

  const grid = useGridPagination<StoreRequisition>({
    useListHook: activeListHook,
    params: queryParams,
    enabled: useInfiniteScroll,
  });

  const items = useInfiniteScroll ? grid.items : (data?.data ?? []);
  const totalRecords = useInfiniteScroll
    ? grid.totalRecords
    : (data?.paginate?.total ?? 0);

  const handleExport = async () => {
    try {
      const count = await exportStoreRequisition({
        params: queryParams,
        viewMode,
        columns: [
          { header: tfl("srNo"), value: (r) => r.sr_no, width: 22 },
          { header: tfl("type"), value: (r) => r.sr_type, width: 12 },
          { header: tfl("date"), value: (r) => r.sr_date, width: 12 },
          {
            header: tfl("fromTo"),
            value: (r) =>
              `${r.from_location_name ?? ""} → ${r.to_location_name ?? ""}`,
            width: 32,
          },
          {
            header: tfl("requester"),
            value: (r) => r.requestor_name ?? "",
            width: 22,
          },
          {
            header: tfl("department"),
            value: (r) => r.department_name ?? "",
            width: 22,
          },
          {
            header: tfl("status"),
            value: (r) => ts(r.doc_status),
            width: 14,
          },
          {
            header: tfl("workflowStage"),
            value: (r) => r.workflow_name ?? "",
            width: 18,
          },
          {
            header: tfl("currentStage"),
            value: (r) => r.workflow_current_stage ?? "",
            width: 18,
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

  // Active filters
  const selectedStatuses = filter?.startsWith("doc_status|string:")
    ? filter.slice("doc_status|string:".length).split(",").filter(Boolean)
    : [];

  const selectedStatusLabels = selectedStatuses
    .map((key) => {
      const opt = STORE_REQUISITION_STATUS_OPTIONS.find(
        (o) => o.value === `doc_status|string:${key}`,
      );
      return opt?.label ?? null;
    })
    .filter(Boolean);

  const selectedFromLocationIds = !fromLocation?.startsWith(FROM_LOCATION_PREFIX)
    ? []
    : fromLocation.slice(FROM_LOCATION_PREFIX.length).split(",").filter(Boolean);

  const selectedToLocationIds = !toLocation?.startsWith(TO_LOCATION_PREFIX)
    ? []
    : toLocation.slice(TO_LOCATION_PREFIX.length).split(",").filter(Boolean);

  const locationLabelMap = (() => {
    const map = new Map<string, string>();
    for (const loc of locationData?.data ?? []) {
      map.set(loc.id, `${loc.code} — ${loc.name}`);
    }
    return map;
  })();

  const fromLocationLabelMap = locationLabelMap;

  const selectedSrTypes = !srTypeFilter?.startsWith(SR_TYPE_PREFIX)
    ? []
    : srTypeFilter.slice(SR_TYPE_PREFIX.length).split(",").filter(Boolean);

  const clearAllFilters = () => {
    setFilter("");
    setFromLocation("");
    setToLocation("");
    setSrTypeFilter("");
  };

  const removeSrTypeAt = (index: number) => {
    const next = selectedSrTypes.filter((_, j) => j !== index);
    setSrTypeFilter(
      next.length > 0 ? `${SR_TYPE_PREFIX}${next.join(",")}` : "",
    );
  };

  const removeStatusAt = (index: number) => {
    const next = selectedStatuses.filter((_, j) => j !== index);
    setFilter(next.length > 0 ? `doc_status|string:${next.join(",")}` : "");
  };

  const removeFromLocationAt = (index: number) => {
    const next = selectedFromLocationIds.filter((_, j) => j !== index);
    setFromLocation(
      next.length > 0 ? `${FROM_LOCATION_PREFIX}${next.join(",")}` : "",
    );
  };

  const removeToLocationAt = (index: number) => {
    const next = selectedToLocationIds.filter((_, j) => j !== index);
    setToLocation(
      next.length > 0 ? `${TO_LOCATION_PREFIX}${next.join(",")}` : "",
    );
  };

  const activeFilters: ActiveFilter[] = [];
  for (let i = 0; i < selectedStatusLabels.length; i++) {
    const label = selectedStatusLabels[i];
    if (!label) continue;
    activeFilters.push({
      key: `status-${selectedStatuses[i]}`,
      label,
      onRemove: () => removeStatusAt(i),
    });
  }
  for (let i = 0; i < selectedFromLocationIds.length; i++) {
    const id = selectedFromLocationIds[i];
    const label = fromLocationLabelMap.get(id) ?? id;
    activeFilters.push({
      key: `from-location-${id}`,
      label,
      onRemove: () => removeFromLocationAt(i),
    });
  }
  for (let i = 0; i < selectedToLocationIds.length; i++) {
    const id = selectedToLocationIds[i];
    const label = locationLabelMap.get(id) ?? id;
    activeFilters.push({
      key: `to-location-${id}`,
      label,
      onRemove: () => removeToLocationAt(i),
    });
  }
  for (let i = 0; i < selectedSrTypes.length; i++) {
    const type = selectedSrTypes[i];
    activeFilters.push({
      key: `sr-type-${type}`,
      label: tc(type),
      onRemove: () => removeSrTypeAt(i),
    });
  }

  const table = useStoreRequisitionTable({
    items,
    totalRecords,
    params,
    tableConfig,
    onEdit: (item) =>
      router.push(`/store-operation/store-requisition/${item.id}`),
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
            <Button
              size="sm"
              onClick={() =>
                router.push("/store-operation/store-requisition/new")
              }
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
              <Button
                size="sm"
                variant={viewMode === "my-pending" ? "default" : "outline"}
                onClick={() => setViewMode("my-pending")}
              >
                {t("myPending")}
              </Button>
              <Button
                size="sm"
                variant={viewMode === "all-document" ? "default" : "outline"}
                onClick={() => setViewMode("all-document")}
              >
                {t("allDocuments")}
              </Button>
              <SrFilterType value={srTypeFilter} onChange={setSrTypeFilter} />
              <SrFilterStatus value={filter} onChange={setFilter} />
              <SrFilterFromLocation
                value={fromLocation}
                onChange={setFromLocation}
              />
              <SrFilterToLocation value={toLocation} onChange={setToLocation} />
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
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant={
                        viewMode === "my-pending" ? "default" : "outline"
                      }
                      onClick={() => setViewMode("my-pending")}
                    >
                      {t("myPending")}
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        viewMode === "all-document" ? "default" : "outline"
                      }
                      onClick={() => setViewMode("all-document")}
                    >
                      {t("allDocuments")}
                    </Button>
                  </div>
                  <SrFilterType
                    value={srTypeFilter}
                    onChange={setSrTypeFilter}
                  />
                  <SrFilterStatus value={filter} onChange={setFilter} />
                  <SrFilterFromLocation
                    value={fromLocation}
                    onChange={setFromLocation}
                  />
                  <SrFilterToLocation
                    value={toLocation}
                    onChange={setToLocation}
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
            <SrCardList
              items={items}
              isLoading={useInfiniteScroll ? grid.isLoading : isLoading}
              onEdit={(item) =>
                router.push(`/store-operation/store-requisition/${item.id}`)
              }
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
          !open && !deleteStoreRequisition.isPending && setDeleteTarget(null)
        }
        title={t("deleteTitle")}
        description={t("deleteConfirm", { srNo: deleteTarget?.sr_no ?? "" })}
        isPending={deleteStoreRequisition.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteStoreRequisition.mutate(deleteTarget.id, {
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
