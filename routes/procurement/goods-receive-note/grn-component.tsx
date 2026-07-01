import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import {
  Columns3,
  Filter as FilterIcon,
  LayoutGrid,
  LayoutList,
  Loader2,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGridPagination } from "@/hooks/use-grid-pagination";
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
  useGoodsReceiveNote,
  useDeleteGoodsReceiveNote,
  useExportGoodsReceiveNote,
} from "@/hooks/use-goods-receive-note";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useURL } from "@/hooks/use-url";
import { GRN_STATUS_CONFIG } from "@/constant/goods-receive-note";
import type { GoodsReceiveNote } from "@/types/goods-receive-note";
import SearchInput from "@/components/search-input";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ErrorState } from "@/components/ui/error-state";
import { StatusFilter } from "@/components/ui/status-filter";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { ActiveFilterBar } from "@/components/ui/active-filter-bar";
import { cn } from "@/lib/utils";
import { setSessionItem } from "@/lib/safe-storage";
import { DocumentListHeader } from "@/components/share/document-list-header";
import { DataGridColumnVisibility } from "@/components/ui/data-grid/data-grid-column-visibility";
import { useGrnTable } from "./use-grn-table";
import GrnCardList from "./grn-card-list";
import EmptyComponent from "@/components/empty-component";
import { DocumentListActions } from "@/components/share/document-list-actions";
import { useGrnActiveFilters } from "./grn-active-filters";
import { GrnPoWizardDialog } from "./grn-po-wizard-dialog";
import { GrnCreateDialog } from "./grn-create-dialog";
import { mapPoDetailToItems } from "./grn-product-cards";
import type { PoForGrn } from "@/types/purchase-order";

export default function GrnComponent() {
  const t = useTranslations("procurement.goodsReceiveNote");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");
  const tt = useTranslations("toast");
  const navigate = useNavigate();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GoodsReceiveNote | null>(
    null,
  );
  const [displayMode, setDisplayMode] = useState<"list" | "grid">("list");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const isMobile = useIsMobile();
  const isGridMode = isMobile || displayMode === "grid";
  const useInfiniteScroll = !!isMobile;
  const deleteGrn = useDeleteGoodsReceiveNote();
  const { exportGoodsReceiveNote, isExporting } = useExportGoodsReceiveNote();
  const { params, search, setSearch, filter, setFilter, tableConfig } =
    useDataGridState({ defaultSort: "grn_date:desc" });
  const [grnStatus, setGrnStatus] = useURL("grn_status");

  const grnStatusOptions = Object.entries(GRN_STATUS_CONFIG).map(
    ([key, cfg]) => ({
      label: cfg.label,
      value: `grn_status|string:${key}`,
    }),
  );

  // empty string → undefined (ต้องใช้ || ไม่ใช่ ?? เพราะ "" ต้องตกเป็น undefined)
  const combinedFilter =
    [params.filter, grnStatus].filter(Boolean).join(",") || undefined;
  const queryParams = { ...params, filter: combinedFilter };

  const { data, isLoading, error, refetch } = useGoodsReceiveNote(queryParams, {
    enabled: !useInfiniteScroll,
  });

  const grid = useGridPagination<GoodsReceiveNote>({
    useListHook: useGoodsReceiveNote,
    params: queryParams,
    enabled: useInfiniteScroll,
  });

  const goodsReceiveNotes = useInfiniteScroll ? grid.items : (data?.data ?? []);
  const totalRecords = useInfiniteScroll
    ? grid.totalRecords
    : (data?.paginate?.total ?? 0);

  const { activeFilters, clearAllFilters } = useGrnActiveFilters({
    filter,
    setFilter,
    grnStatus,
    setGrnStatus,
    search,
    setSearch,
    statusOptions: grnStatusOptions,
  });

  const handleExport = async () => {
    try {
      const count = await exportGoodsReceiveNote({
        params: queryParams,
        columns: [
          { header: tfl("grnNo"), value: (r) => r.grn_no, width: 22 },
          {
            header: tfl("vendor"),
            value: (r) => r.vendor_name ?? "",
            width: 26,
          },
          {
            header: tfl("grnDate"),
            value: (r) => r.grn_date ?? "",
            width: 12,
          },
          {
            header: tfl("invoiceNo"),
            value: (r) => r.invoice_no ?? "",
            width: 16,
          },
          { header: tfl("status"), value: (r) => r.doc_status, width: 14 },
          { header: tfl("type"), value: (r) => r.doc_type, width: 16 },
          {
            header: tfl("totalAmount"),
            value: (r) => r.total_amount ?? 0,
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

  const handleSelectDocType = (docType: string) => {
    setShowCreateDialog(false);
    if (docType === "purchase_order") {
      setShowWizard(true);
    } else {
      navigate(`/procurement/goods-receive-note/new?doc_type=${docType}`);
    }
  };

  const handleWizardComplete = (data: {
    vendorId: string;
    vendorName: string;
    currencyId: string;
    currencyCode: string;
    exchangeRate: number;
    poList: PoForGrn[];
  }) => {
    const items = data.poList.flatMap(
      (po) =>
        po.po_detail?.flatMap((d) => mapPoDetailToItems(d, po.id, po.po_no)) ??
        [],
    );
    setSessionItem("grn-wizard-data", {
      vendorId: data.vendorId,
      vendorName: data.vendorName,
      currencyId: data.currencyId,
      currencyCode: data.currencyCode,
      exchangeRate: data.exchangeRate,
      items,
    });
    setShowWizard(false);
    navigate("/procurement/goods-receive-note/new?doc_type=purchase_order");
  };

  const table = useGrnTable({
    goodsReceiveNotes,
    totalRecords,
    params,
    tableConfig,
    onEdit: (grn) => navigate(`/procurement/goods-receive-note/${grn.id}`),
    onDelete: setDeleteTarget,
  });

  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;

  return (
    <div className="pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="sticky top-0 z-20 space-y-3 pb-3 sm:static sm:pb-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <DocumentListHeader title={t("title")} description={t("desc")} />
          <DocumentListActions
            onExport={handleExport}
            isExporting={isExporting}
            onAdd={() => setShowCreateDialog(true)}
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
              <StatusFilter value={filter} onChange={setFilter} />
              <MultiSelectFilter
                value={grnStatus}
                onChange={setGrnStatus}
                placeholder={t("status")}
                options={grnStatusOptions}
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
                  <StatusFilter value={filter} onChange={setFilter} />
                  <MultiSelectFilter
                    value={grnStatus}
                    onChange={setGrnStatus}
                    placeholder={t("status")}
                    options={grnStatusOptions}
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
                  : "max-h-[calc(100vh-11rem-3rem)]",
              )}
            >
              <div className="flex-1 overflow-auto">
                <DataGridTable />
              </div>
              <DataGridPagination />
            </DataGridContainer>
          </DataGrid>
        )}

        {isGridMode && useInfiniteScroll && (
          <>
            <GrnCardList
              items={goodsReceiveNotes}
              isLoading={grid.isLoading}
              onEdit={(grn) =>
                navigate(`/procurement/goods-receive-note/${grn.id}`)
              }
            />
            {grid.hasMore && (
              <div ref={grid.sentinelRef} className="flex justify-center py-4">
                {grid.isLoadingMore && (
                  <Loader2 className="text-muted-foreground size-5 animate-spin" />
                )}
              </div>
            )}
          </>
        )}

        {isGridMode && !useInfiniteScroll && (
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
                  : "max-h-[calc(100vh-11rem-3rem)]",
              )}
            >
              <div className="flex-1 overflow-auto p-3">
                <GrnCardList
                  items={goodsReceiveNotes}
                  isLoading={isLoading}
                  onEdit={(grn) =>
                    navigate(`/procurement/goods-receive-note/${grn.id}`)
                  }
                />
              </div>
              <DataGridPagination />
            </DataGridContainer>
          </DataGrid>
        )}
      </div>

      <GrnCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSelect={handleSelectDocType}
      />

      {showWizard && (
        <GrnPoWizardDialog
          open={showWizard}
          onOpenChange={setShowWizard}
          onComplete={handleWizardComplete}
        />
      )}

      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) =>
          !open && !deleteGrn.isPending && setDeleteTarget(null)
        }
        title={t("deleteTitle")}
        description={t("deleteConfirm", { grnNo: deleteTarget?.grn_no ?? "" })}
        isPending={deleteGrn.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteGrn.mutate(deleteTarget.id, {
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
