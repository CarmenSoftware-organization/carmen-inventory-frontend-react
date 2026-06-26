
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
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  usePurchaseOrder,
  useMyPendingPurchaseOrder,
  useDeletePurchaseOrder,
  useExportPurchaseOrder,
} from "@/hooks/use-purchase-order";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useURL } from "@/hooks/use-url";
import { PO_TYPE_CONFIG } from "@/constant/purchase-order";
import type { PurchaseOrder } from "@/types/purchase-order";
import SearchInput from "@/components/search-input";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ErrorState } from "@/components/ui/error-state";
import EmptyComponent from "@/components/empty-component";
import { StatusFilter } from "@/components/ui/status-filter";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { ActiveFilterBar } from "@/components/ui/active-filter-bar";
import { cn } from "@/lib/utils";
import { ModuleTileIcon } from "@/components/ui/module-tile";
import { DataGridColumnVisibility } from "@/components/ui/data-grid/data-grid-column-visibility";
import { usePoTable } from "./use-po-table";
import PoCardList from "./po-card-list";
import { usePoActiveFilters } from "./po-active-filters";
import { lazy, Suspense } from "react";

// next/dynamic → lazy+Suspense (Batch D hand-fix)
const CreatePODialog = lazy(() =>
  import("./po-create-dialog").then((mod) => ({ default: mod.CreatePODialog })),
);

export default function PoComponent() {
  const t = useTranslations("procurement.purchaseOrder");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");
  const tt = useTranslations("toast");
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrder | null>(null);
  const [viewMode, setViewMode] = useState<"my-pending" | "all-document">(
    "my-pending",
  );
  const [displayMode, setDisplayMode] = useState<"list" | "grid">("list");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const isMobile = useIsMobile();
  const isGridMode = isMobile || displayMode === "grid";
  const useInfiniteScroll = !!isMobile;
  const deletePo = useDeletePurchaseOrder();
  const { exportPurchaseOrder, isExporting } = useExportPurchaseOrder();
  const { params, search, setSearch, filter, setFilter, tableConfig } =
    useDataGridState({ defaultSort: "po_no:desc" });
  const [poType, setPoType] = useURL("po_type");

  const poTypeOptions = Object.entries(PO_TYPE_CONFIG).map(([key, cfg]) => ({
    label: cfg.label,
    value: `po_type|string:${key}`,
  }));

  // empty string → undefined (ต้องใช้ || ไม่ใช่ ?? เพราะ "" ต้องตกเป็น undefined)
  const combinedFilter =
    [params.filter, poType].filter(Boolean).join(",") || undefined;
  const queryParams = { ...params, filter: combinedFilter };

  const myPendingQuery = useMyPendingPurchaseOrder(queryParams, {
    enabled: !useInfiniteScroll,
  });
  const allDocumentQuery = usePurchaseOrder(queryParams, {
    enabled: !useInfiniteScroll,
  });

  const { data, isLoading, error, refetch } =
    viewMode === "my-pending" ? myPendingQuery : allDocumentQuery;

  const activeListHook =
    viewMode === "my-pending" ? useMyPendingPurchaseOrder : usePurchaseOrder;

  const grid = useGridPagination<PurchaseOrder>({
    useListHook: activeListHook,
    params: queryParams,
    enabled: useInfiniteScroll,
  });

  const purchaseOrders = useInfiniteScroll ? grid.items : (data?.data ?? []);
  const totalRecords = useInfiniteScroll
    ? grid.totalRecords
    : (data?.paginate?.total ?? 0);

  const { activeFilters, clearAllFilters } = usePoActiveFilters({
    filter,
    setFilter,
    poType,
    setPoType,
    search,
    setSearch,
    typeOptions: poTypeOptions,
  });

  const handleExport = async () => {
    try {
      const count = await exportPurchaseOrder({
        params: queryParams,
        viewMode,
        columns: [
          { header: tfl("poNo"), value: (r) => r.po_no, width: 18 },
          { header: tfl("vendor"), value: (r) => r.vendor_name, width: 26 },
          { header: tfl("poType"), value: (r) => r.po_type, width: 12 },
          { header: tfl("orderDate"), value: (r) => r.order_date, width: 12 },
          {
            header: tfl("deliveryDate"),
            value: (r) => r.delivery_date,
            width: 12,
          },
          { header: tfl("status"), value: (r) => r.po_status, width: 14 },
          {
            header: tfl("totalAmount"),
            value: (r) => r.total_amount,
            width: 16,
          },
          {
            header: tfl("currency"),
            value: (r) => r.currency_code ?? "",
            width: 10,
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

  const table = usePoTable({
    purchaseOrders,
    totalRecords,
    params,
    tableConfig,
    onEdit: (po) => router.push(`/procurement/purchase-order/${po.id}`),
    onDelete: setDeleteTarget,
  });

  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;

  return (
    <div className="pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="sticky top-0 z-20 space-y-3 pb-3 sm:static sm:pb-0">
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
            <Button size="sm" onClick={() => setCreateOpen(true)}>
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

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex w-full flex-1 items-center gap-2 sm:w-auto">
            <div className="flex-1 sm:flex-initial">
              <SearchInput defaultValue={search} onSearch={setSearch} />
            </div>
            <span className="bg-border hidden h-4 w-px sm:block" />
            <div className="hidden sm:flex sm:items-center sm:gap-2">
              <StatusFilter value={filter} onChange={setFilter} />
              <MultiSelectFilter
                value={poType}
                onChange={setPoType}
                placeholder={t("type")}
                options={poTypeOptions}
              />
              <span className="bg-border hidden h-4 w-px sm:block" />
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
                  <StatusFilter value={filter} onChange={setFilter} />
                  <MultiSelectFilter
                    value={poType}
                    onChange={setPoType}
                    placeholder={t("type")}
                    options={poTypeOptions}
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
            <PoCardList
              items={purchaseOrders}
              isLoading={useInfiniteScroll ? grid.isLoading : isLoading}
              onEdit={(po) =>
                router.push(`/procurement/purchase-order/${po.id}`)
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

      <Suspense fallback={null}>
        <CreatePODialog open={createOpen} onOpenChange={setCreateOpen} />
      </Suspense>

      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) =>
          !open && !deletePo.isPending && setDeleteTarget(null)
        }
        title={t("deleteTitle")}
        description={t("deleteConfirm", { poNo: deleteTarget?.po_no ?? "" })}
        isPending={deletePo.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deletePo.mutate(deleteTarget.id, {
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
