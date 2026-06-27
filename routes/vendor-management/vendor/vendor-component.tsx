
import { useState } from "react";
import { useNavigate } from "react-router";
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
  useVendor,
  useDeleteVendor,
  useExportVendor,
} from "@/hooks/use-vendor";
import { useBusinessType } from "@/hooks/use-business-type";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGridPagination } from "@/hooks/use-grid-pagination";
import { useURL } from "@/hooks/use-url";
import type { Vendor, VendorDetail } from "@/types/vendor";
import SearchInput from "@/components/search-input";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ErrorState } from "@/components/ui/error-state";
import EmptyComponent from "@/components/empty-component";
import { StatusFilter } from "@/components/ui/status-filter";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { DocumentListHeader } from "@/components/share/document-list-header";
import { DocumentListActions } from "@/components/share/document-list-actions";
import {
  ActiveFilterBar,
  type ActiveFilter,
} from "@/components/ui/active-filter-bar";
import { DataGridColumnVisibility } from "@/components/ui/data-grid/data-grid-column-visibility";
import { CardSkeletonGrid } from "@/components/loader/card-skeleton";
import { useVendorTable } from "./use-vendor-table";
import VendorCard from "./vendor-card";

export default function VendorComponent() {
  const navigate = useNavigate();
  const t = useTranslations("vendorManagement.vendor");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");
  const ts = useTranslations("status");
  const tt = useTranslations("toast");
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);
  const [displayMode, setDisplayMode] = useState<"list" | "grid">("list");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const isMobile = useIsMobile();
  const deleteVendor = useDeleteVendor();
  const { exportVendor, isExporting } = useExportVendor();
  const { params, search, setSearch, filter, setFilter, tableConfig } =
    useDataGridState();
  const [btFilter, setBtFilter] = useURL("business_type");

  const isGridMode = isMobile || displayMode === "grid";

  const { data: btData } = useBusinessType({ perpage: -1 });
  const btFilterOptions = (btData?.data ?? [])
    .filter((bt) => bt.is_active)
    .map((bt) => ({
      label: bt.name,
      value: `business_type_id|string:${bt.id}`,
    }));

  const combinedFilters = [params.filter, btFilter].filter(Boolean).join(",");
  const combinedParams = { ...params, filter: combinedFilters || undefined };

  const { data, isLoading, error, refetch } = useVendor(combinedParams, {
    enabled: !isGridMode,
  });

  const grid = useGridPagination<VendorDetail>({
    useListHook: useVendor,
    params: combinedParams,
    enabled: isGridMode,
  });

  const vendors = isGridMode ? grid.items : (data?.data ?? []);
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

  if (btFilter) {
    for (const v of btFilter.split(",")) {
      const match = btFilterOptions.find((o) => o.value === v);
      if (match) {
        activeFilters.push({
          key: `bt-${v}`,
          label: match.label,
          onRemove: () => {
            const next = btFilter
              .split(",")
              .filter((val) => val !== v)
              .join(",");
            setBtFilter(next);
          },
        });
      }
    }
  }

  const clearAllFilters = () => {
    setFilter("");
    setBtFilter("");
  };

  const handleExport = async () => {
    try {
      const count = await exportVendor({
        params: combinedParams,
        columns: [
          { header: tfl("code"), value: (r) => r.code, width: 14 },
          { header: tfl("name"), value: (r) => r.name, width: 32 },
          {
            header: tfl("businessType"),
            value: (r) =>
              r.business_type?.map((bt) => bt.name).join(", ") ?? "",
            width: 32,
          },
          {
            header: tfl("status"),
            value: (r) => (r.is_active ? ts("active") : ts("inactive")),
            width: 10,
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

  const table = useVendorTable({
    vendors,
    totalRecords,
    params,
    tableConfig,
    onEdit: (vendor) => navigate(`/vendor-management/vendor/${vendor.id}`),
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
            onAdd={() => navigate("/vendor-management/vendor/new")}
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
                options={STATUS_OPTIONS}
              />
              <MultiSelectFilter
                value={btFilter}
                onChange={setBtFilter}
                placeholder={tfl("businessType")}
                options={btFilterOptions}
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
                    value={btFilter}
                    onChange={setBtFilter}
                    placeholder={tfl("businessType")}
                    options={btFilterOptions}
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
        {isGridMode && !grid.isLoading && vendors.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {vendors.map((item, i) => (
                <VendorCard
                  key={item.id}
                  item={item}
                  index={i}
                  onEdit={(v) =>
                    navigate(`/vendor-management/vendor/${v.id}`)
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
        {isGridMode && !grid.isLoading && vendors.length === 0 && (
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
          !open && !deleteVendor.isPending && setDeleteTarget(null)
        }
        title={t("deleteTitle")}
        description={t("deleteConfirm", { name: deleteTarget?.name ?? "" })}
        isPending={deleteVendor.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteVendor.mutate(deleteTarget.id, {
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
