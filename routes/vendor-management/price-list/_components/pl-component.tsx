
import { useState } from "react";
import { useRouter } from "@/lib/compat/navigation";
import {
  Columns3,
  Filter as FilterIcon,
  LayoutGrid,
  LayoutList,
  Loader2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
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
  usePriceList,
  useDeletePriceList,
  useExportPriceList,
} from "@/hooks/use-price-list";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useURL } from "@/hooks/use-url";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGridPagination } from "@/hooks/use-grid-pagination";
import { useVendor } from "@/hooks/use-vendor";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import type { PriceList } from "@/types/price-list";
import SearchInput from "@/components/search-input";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ErrorState } from "@/components/ui/error-state";
import EmptyComponent from "@/components/empty-component";
import { StatusFilter } from "@/components/ui/status-filter";
import { DocumentListHeader } from "@/components/share/document-list-header";
import { DocumentListActions } from "@/components/share/document-list-actions";
import {
  ActiveFilterBar,
  type ActiveFilter,
} from "@/components/ui/active-filter-bar";
import { DataGridColumnVisibility } from "@/components/ui/data-grid/data-grid-column-visibility";
import { CardSkeletonGrid } from "@/components/loader/card-skeleton";
import { usePriceListTable } from "./use-pl-table";
import PriceListCard from "./pl-card";

export default function PriceListComponent() {
  const router = useRouter();
  const t = useTranslations("vendorManagement.priceList");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const tfl = useTranslations("field");
  const tt = useTranslations("toast");
  const [deleteTarget, setDeleteTarget] = useState<PriceList | null>(null);
  const [displayMode, setDisplayMode] = useState<"list" | "grid">("list");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const isMobile = useIsMobile();
  const deletePriceList = useDeletePriceList();
  const { exportPriceList, isExporting } = useExportPriceList();
  const { params, search, setSearch, filter, setFilter, tableConfig } =
    useDataGridState();
  const [vendorFilter, setVendorFilter] = useURL("vendor");

  const { data: vendorData } = useVendor({ perpage: -1 });
  const vendorOptions = (vendorData?.data ?? [])
    .filter((v) => v.is_active)
    .map((v) => ({
      label: v.name,
      value: `vendor_id|string:${v.id}`,
    }));

  const combinedFilter =
    [params.filter, vendorFilter].filter(Boolean).join(",") || undefined;

  const queryParams = { ...params, filter: combinedFilter };

  const isGridMode = isMobile || displayMode === "grid";

  const { data, isLoading, error, refetch } = usePriceList(queryParams, {
    enabled: !isGridMode,
  });

  const grid = useGridPagination<PriceList>({
    useListHook: usePriceList,
    params: queryParams,
    enabled: isGridMode,
  });

  const priceLists = isGridMode ? grid.items : (data?.data ?? []);
  const totalRecords = isGridMode
    ? grid.totalRecords
    : (data?.paginate?.total ?? 0);

  const statusOptions = [
    { label: ts("draft"), value: "status|string:draft" },
    { label: ts("active"), value: "status|string:active" },
    { label: ts("inactive"), value: "status|string:inactive" },
  ];

  const activeFilters: ActiveFilter[] = [];

  if (filter) {
    const match = statusOptions.find((o) => o.value === filter);
    if (match) {
      activeFilters.push({
        key: "filter",
        label: match.label,
        onRemove: () => setFilter(""),
      });
    }
  }

  if (vendorFilter) {
    for (const v of vendorFilter.split(",")) {
      const opt = vendorOptions.find((o) => o.value === v);
      if (opt) {
        activeFilters.push({
          key: `vendor-${v}`,
          label: `${tfl("vendor")}: ${opt.label}`,
          onRemove: () => {
            const next = vendorFilter
              .split(",")
              .filter((x) => x !== v)
              .join(",");
            setVendorFilter(next);
          },
        });
      }
    }
  }

  const handleExport = async () => {
    try {
      const count = await exportPriceList({
        params: queryParams,
        columns: [
          { header: "No.", value: (r) => r.no, width: 18 },
          { header: tfl("name"), value: (r) => r.name, width: 28 },
          {
            header: tfl("vendor"),
            value: (r) => r.vendor?.name ?? "",
            width: 24,
          },
          {
            header: tfl("effectivePeriod"),
            value: (r) => r.effectivePeriod ?? "",
            width: 28,
          },
          {
            header: tfl("status"),
            value: (r) => ts(r.status as "draft" | "active" | "inactive"),
            width: 12,
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

  const clearAllFilters = () => {
    setFilter("");
    setVendorFilter("");
  };

  const table = usePriceListTable({
    priceLists,
    totalRecords,
    params,
    tableConfig,
    onEdit: (priceList) =>
      router.push(`/vendor-management/price-list/${priceList.id}`),
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
          <DocumentListActions
            onExport={handleExport}
            isExporting={isExporting}
            onAdd={() => router.push("/vendor-management/price-list/new")}
            addLabel={t("add")}
          />
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
                options={statusOptions}
              />
              <MultiSelectFilter
                value={vendorFilter}
                onChange={setVendorFilter}
                placeholder={tfl("vendor")}
                options={vendorOptions}
                searchable
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
                    options={statusOptions}
                  />
                  <MultiSelectFilter
                    value={vendorFilter}
                    onChange={setVendorFilter}
                    placeholder={tfl("vendor")}
                    options={vendorOptions}
                    searchable
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
        {isGridMode && !grid.isLoading && priceLists.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {priceLists.map((item, i) => (
                <PriceListCard
                  key={item.id}
                  item={item}
                  index={i}
                  onEdit={(pl) =>
                    router.push(`/vendor-management/price-list/${pl.id}`)
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
        {isGridMode && !grid.isLoading && priceLists.length === 0 && (
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
          !open && !deletePriceList.isPending && setDeleteTarget(null)
        }
        title={t("deleteTitle")}
        description={t("deleteConfirm", { name: deleteTarget?.name ?? "" })}
        isPending={deletePriceList.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deletePriceList.mutate(deleteTarget.id, {
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
