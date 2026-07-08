
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
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useRequestPriceList,
  useDeleteRequestPriceList,
  useExportRequestPriceList,
} from "@/hooks/use-request-price-list";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useURL } from "@/hooks/use-url";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGridPagination } from "@/hooks/use-grid-pagination";
import { usePriceListTemplate } from "@/hooks/use-price-list-template";
import type { RequestPriceList } from "@/types/request-price-list";
import SearchInput from "@/components/search-input";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ErrorState } from "@/components/ui/error-state";
import EmptyComponent from "@/components/empty-component";
import { DocumentListHeader } from "@/components/share/document-list-header";
import { DocumentListActions } from "@/components/share/document-list-actions";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import {
  ActiveFilterBar,
  type ActiveFilter,
} from "@/components/ui/active-filter-bar";
import { cn } from "@/lib/utils";
import { DataGridColumnVisibility } from "@/components/ui/data-grid/data-grid-column-visibility";
import { CardSkeletonGrid } from "@/components/loader/card-skeleton";
import { useRequestPriceListTable } from "./use-rfp-table";
import RfpCard from "./rfp-card";

export default function RequestPriceListComponent() {
  const navigate = useNavigate();
  const t = useTranslations("vendorManagement.requestPriceList");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");
  const tt = useTranslations("toast");
  const [deleteTarget, setDeleteTarget] = useState<RequestPriceList | null>(
    null,
  );
  const [displayMode, setDisplayMode] = useState<"list" | "grid">("list");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const isMobile = useIsMobile();
  const deleteRequestPriceList = useDeleteRequestPriceList();
  const { exportRequestPriceList, isExporting } = useExportRequestPriceList();
  const { params, search, setSearch, tableConfig } = useDataGridState();
  const [templateFilter, setTemplateFilter] = useURL("template");

  const { data: templateData } = usePriceListTemplate({ perpage: -1 });
  const templateOptions = (templateData?.data ?? []).map((tmpl) => ({
    label: tmpl.name,
    value: `pricelist_template_id|string:${tmpl.id}`,
  }));

  const combinedFilter =
    [params.filter, templateFilter].filter(Boolean).join(",") || undefined;
  const queryParams = { ...params, filter: combinedFilter };

  const isGridMode = isMobile || displayMode === "grid";

  const { data, isLoading, error, refetch } = useRequestPriceList(queryParams, {
    enabled: !isGridMode,
  });

  const grid = useGridPagination<RequestPriceList>({
    useListHook: useRequestPriceList,
    params: queryParams,
    enabled: isGridMode,
  });

  const clearAllFilters = () => {
    setTemplateFilter("");
    setSearch("");
  };

  const handleExport = async () => {
    try {
      const count = await exportRequestPriceList({
        params: queryParams,
        columns: [
          { header: tfl("name"), value: (r) => r.name, width: 28 },
          {
            header: tfl("template"),
            value: (r) => r.pricelist_template?.name ?? "",
            width: 24,
          },
          { header: tfl("startDate"), value: (r) => r.start_date, width: 12 },
          { header: tfl("endDate"), value: (r) => r.end_date, width: 12 },
          {
            header: tfl("vendorCount"),
            value: (r) => r.vendor_count ?? 0,
            width: 12,
          },
          {
            header: tfl("currency"),
            value: (r) => r.pricelist_template?.currency?.code ?? "",
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

  const activeFilters: ActiveFilter[] = [];
  if (templateFilter) {
    for (const v of templateFilter.split(",")) {
      const opt = templateOptions.find((o) => o.value === v);
      if (opt) {
        activeFilters.push({
          key: `template-${v}`,
          label: `${tfl("template")}: ${opt.label}`,
          onRemove: () => {
            const next = templateFilter
              .split(",")
              .filter((x) => x !== v)
              .join(",");
            setTemplateFilter(next);
          },
        });
      }
    }
  }
  if (search) {
    activeFilters.push({
      key: `search-${search}`,
      label: `"${search}"`,
      onRemove: () => setSearch(""),
    });
  }

  const items = isGridMode ? grid.items : (data?.data ?? []);
  const totalRecords = isGridMode
    ? grid.totalRecords
    : (data?.paginate?.total ?? 0);

  const table = useRequestPriceListTable({
    items,
    totalRecords,
    params,
    tableConfig,
    onEdit: (item) =>
      navigate(`/vendor-management/request-price-list/${item.id}`),
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
          <DocumentListActions
            onExport={handleExport}
            isExporting={isExporting}
            onAdd={() =>
              navigate("/vendor-management/request-price-list/new")
            }
            addLabel={t("add")}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex w-full flex-1 items-center gap-2 sm:w-auto">
            <div className="flex-1 sm:flex-initial">
              <SearchInput defaultValue={search} onSearch={setSearch} />
            </div>
            <span className="bg-border hidden h-4 w-px sm:block" />
            <div className="hidden sm:block">
              <MultiSelectFilter
                value={templateFilter}
                onChange={setTemplateFilter}
                placeholder={tfl("template")}
                options={templateOptions}
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
                  <MultiSelectFilter
                    value={templateFilter}
                    onChange={setTemplateFilter}
                    placeholder={tfl("template")}
                    options={templateOptions}
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
        {isGridMode && !grid.isLoading && items.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((item, i) => (
                <RfpCard
                  key={item.id}
                  item={item}
                  index={i}
                  onEdit={(rfp) =>
                    navigate(
                      `/vendor-management/request-price-list/${rfp.id}`,
                    )
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
        {isGridMode && !grid.isLoading && items.length === 0 && (
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
          !open && !deleteRequestPriceList.isPending && setDeleteTarget(null)
        }
        title={t("deleteTitle")}
        description={t("deleteConfirm", { name: deleteTarget?.name ?? "" })}
        isPending={deleteRequestPriceList.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteRequestPriceList.mutate(deleteTarget.id, {
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
