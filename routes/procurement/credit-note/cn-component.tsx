
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
  useCreditNote,
  useDeleteCreditNote,
  useExportCreditNote,
} from "@/hooks/use-credit-note";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useURL } from "@/hooks/use-url";
import { CN_STATUS_CONFIG, CN_TYPE_CONFIG } from "@/constant/credit-note";
import type { CreditNote } from "@/types/credit-note";
import SearchInput from "@/components/search-input";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ErrorState } from "@/components/ui/error-state";
import { StatusFilter } from "@/components/ui/status-filter";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { ActiveFilterBar } from "@/components/ui/active-filter-bar";
import { cn } from "@/lib/utils";
import { DocumentListHeader } from "@/components/share/document-list-header";
import { DataGridColumnVisibility } from "@/components/ui/data-grid/data-grid-column-visibility";
import { useCnTable } from "./use-cn-table";
import CnCardList from "./cn-card-list";
import EmptyComponent from "@/components/empty-component";
import { DocumentListActions } from "@/components/share/document-list-actions";
import { useCnActiveFilters } from "./cn-active-filters";

export default function CnComponent() {
  const t = useTranslations("procurement.creditNote");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");
  const tt = useTranslations("toast");
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<CreditNote | null>(null);
  const [displayMode, setDisplayMode] = useState<"list" | "grid">("list");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const isMobile = useIsMobile();
  const isGridMode = isMobile || displayMode === "grid";
  const useInfiniteScroll = !!isMobile;
  const deleteCn = useDeleteCreditNote();
  const { exportCreditNote, isExporting } = useExportCreditNote();
  const { params, search, setSearch, filter, setFilter, tableConfig } =
    useDataGridState();
  const [cnType, setCnType] = useURL("cn_type");
  const [cnStatus, setCnStatus] = useURL("cn_status");

  const cnTypeOptions = Object.entries(CN_TYPE_CONFIG).map(([key, cfg]) => ({
    label: cfg.label,
    value: `credit_note_type|string:${key}`,
  }));

  const cnStatusOptions = Object.entries(CN_STATUS_CONFIG).map(
    ([key, cfg]) => ({
      label: cfg.label,
      value: `cn_status|string:${key}`,
    }),
  );

  const combinedFilter =
    [params.filter, cnType, cnStatus].filter(Boolean).join(",") || undefined;
  const queryParams = { ...params, filter: combinedFilter };

  const { data, isLoading, error, refetch } = useCreditNote(queryParams, {
    enabled: !useInfiniteScroll,
  });

  const grid = useGridPagination<CreditNote>({
    useListHook: useCreditNote,
    params: queryParams,
    enabled: useInfiniteScroll,
  });

  const creditNotes = useInfiniteScroll ? grid.items : (data?.data ?? []);
  const totalRecords = useInfiniteScroll
    ? grid.totalRecords
    : (data?.paginate?.total ?? 0);

  const { activeFilters, clearAllFilters } = useCnActiveFilters({
    filter,
    setFilter,
    cnType,
    setCnType,
    cnStatus,
    setCnStatus,
    search,
    setSearch,
    typeOptions: cnTypeOptions,
    statusOptions: cnStatusOptions,
  });

  const handleExport = async () => {
    try {
      const count = await exportCreditNote({
        params: queryParams,
        columns: [
          { header: tfl("cnNo"), value: (r) => r.cn_no, width: 22 },
          {
            header: tfl("vendor"),
            value: (r) => r.vendor_name ?? "",
            width: 26,
          },
          {
            header: tfl("type"),
            value: (r) => r.credit_note_type,
            width: 16,
          },
          { header: tfl("docDate"), value: (r) => r.cn_date, width: 12 },
          { header: tfl("status"), value: (r) => r.doc_status, width: 14 },
          {
            header: tfl("netAmount"),
            value: (r) => r.base_total_amount ?? 0,
            width: 16,
          },
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

  const table = useCnTable({
    creditNotes,
    totalRecords,
    params,
    tableConfig,
    onEdit: (cn) => navigate(`/procurement/credit-note/${cn.id}`),
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
            onAdd={() => navigate("/procurement/credit-note/new")}
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
                value={cnType}
                onChange={setCnType}
                placeholder={t("type")}
                options={cnTypeOptions}
              />
              <MultiSelectFilter
                value={cnStatus}
                onChange={setCnStatus}
                placeholder={t("status")}
                options={cnStatusOptions}
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
                    value={cnType}
                    onChange={setCnType}
                    placeholder={t("type")}
                    options={cnTypeOptions}
                  />
                  <MultiSelectFilter
                    value={cnStatus}
                    onChange={setCnStatus}
                    placeholder={t("status")}
                    options={cnStatusOptions}
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
                <div className="min-w-300">
                  <DataGridTable />
                </div>
              </div>
              <DataGridPagination />
            </DataGridContainer>
          </DataGrid>
        )}

        {isGridMode && useInfiniteScroll && (
          <>
            <CnCardList
              items={creditNotes}
              isLoading={grid.isLoading}
              onEdit={(cn) => navigate(`/procurement/credit-note/${cn.id}`)}
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
                  : "max-h-[calc(100vh-10rem-3rem)]",
              )}
            >
              <div className="flex-1 overflow-auto p-3">
                <CnCardList
                  items={creditNotes}
                  isLoading={isLoading}
                  onEdit={(cn) =>
                    navigate(`/procurement/credit-note/${cn.id}`)
                  }
                />
              </div>
              <DataGridPagination />
            </DataGridContainer>
          </DataGrid>
        )}
      </div>

      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) =>
          !open && !deleteCn.isPending && setDeleteTarget(null)
        }
        title={t("deleteTitle")}
        description={t("deleteConfirm", { cnNo: deleteTarget?.cn_no ?? "" })}
        isPending={deleteCn.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteCn.mutate(deleteTarget.id, {
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
