import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Columns3, LayoutGrid, LayoutList, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import {
  DataGrid,
  DataGridContainer,
  DataGridScrollArea,
} from "@/components/ui/data-grid/data-grid";
import { cn } from "@/lib/utils";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination";
import { Button } from "@/components/ui/button";
import {
  usePriceList,
  useDeletePriceList,
  useExportPriceList,
} from "@/hooks/use-price-list";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGridPagination } from "@/hooks/use-grid-pagination";
import { useVendor } from "@/hooks/use-vendor";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import type { PriceList } from "@/types/price-list";
import SearchInput from "@/components/search-input";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ErrorState } from "@/components/ui/error-state";
import EmptyComponent from "@/components/empty-component";
import { DocumentListHeader } from "@/components/share/document-list-header";
import { DocumentListActions } from "@/components/share/document-list-actions";
import { ActiveFilterBar } from "@/components/ui/active-filter-bar";
import { DataGridColumnVisibility } from "@/components/ui/data-grid/data-grid-column-visibility";
import { CardSkeletonGrid } from "@/components/loader/card-skeleton";
import { usePriceListTable } from "./use-pl-table";
import PriceListCard from "./pl-card";
import { useListFilters } from "@/hooks/use-list-filters";
import { ViewSelector } from "@/components/list-filter/view-selector";
import { ListFilterSheet } from "@/components/list-filter/list-filter-sheet";
import { SaveViewDialog } from "@/components/list-filter/save-view-dialog";
import { LIST_PAGE_KEYS } from "@/constant/list-page-keys";
import type { FilterFieldDef } from "@/types/list-filter";
import { useExportErrorToast } from "@/hooks/use-export-error-toast";

export default function PriceListComponent() {
  const navigate = useNavigate();
  const t = useTranslations("vendorManagement.priceList");
  const tc = useTranslations("common");
  const exportErrorToast = useExportErrorToast();
  const ts = useTranslations("status");
  const tfl = useTranslations("field");
  const tt = useTranslations("toast");
  const [deleteTarget, setDeleteTarget] = useState<PriceList | null>(null);
  const [displayMode, setDisplayMode] = useState<"list" | "grid">("list");
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const isMobile = useIsMobile();
  const deletePriceList = useDeletePriceList();
  const { exportPriceList, isExporting } = useExportPriceList();
  const { params, search, setSearch, tableConfig } = useDataGridState({
    defaultSort: "pricelist_no:asc",
  });

  const { data: vendorData } = useVendor({ perpage: -1 });
  // ชื่อ vendor เป็น literal string จริง (ไม่ใช่ i18n key) — memo กันไม่ให้ array
  // reference เปลี่ยนทุก render จน priceListFilterFields memo ข้างล่างไม่เคย hit
  const vendorOptions = useMemo(
    () =>
      (vendorData?.data ?? [])
        .filter((v) => v.is_active)
        .map((v) => ({
          label: v.name,
          value: `vendor_id|string:${v.id}`,
        })),
    [vendorData],
  );

  // vendor เป็น literal string จริง จึงต้องใช้ control: "custom" ห่อ
  // MultiSelectFilter ตรง ๆ แทน control: "multi-select" (ตัวนั้นเรียก
  // t(option.labelKey) ซึ่งจะ error ถ้า label ไม่ใช่ i18n key — เหมือน pattern
  // PO_TYPE/CN_TYPE ใน Task 19). filter (status) ใช้ labelKey จริง (status.draft
  // ฯลฯ) จึงใช้ control: "status" ทั่วไปได้ตรง ๆ
  const priceListFilterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        key: "filter",
        control: "status",
        labelKey: "common.status",
        options: [
          { labelKey: "status.draft", value: "status|string:draft" },
          { labelKey: "status.submitted", value: "status|string:submitted" },
          { labelKey: "status.active", value: "status|string:active" },
          { labelKey: "status.inactive", value: "status|string:inactive" },
        ],
      },
      {
        key: "vendor",
        control: "custom",
        labelKey: "field.vendor",
        render: (value, onChange) => (
          <MultiSelectFilter
            value={value}
            onChange={onChange}
            options={vendorOptions}
            searchable
            className="w-full"
          />
        ),
      },
    ],
    [vendorOptions],
  );

  const lf = useListFilters({
    pageKey: LIST_PAGE_KEYS.PRICE_LIST,
    fields: priceListFilterFields,
    defaultSort: "pricelist_no:asc",
  });

  const queryParams = { ...params, filter: lf.filterParam };

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
            value: (r) =>
              ts(r.status as "draft" | "submitted" | "active" | "inactive"),
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
      exportErrorToast(err);
    }
  };

  const table = usePriceListTable({
    priceLists,
    totalRecords,
    params,
    tableConfig,
    onEdit: (priceList) =>
      navigate(`/vendor-management/price-list/${priceList.id}`),
    onDelete: setDeleteTarget,
  });

  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  return (
    <div className="pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="sticky top-0 z-20 space-y-3 pb-3 sm:static sm:pb-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <DocumentListHeader title={t("title")} description={t("desc")} />
          <DocumentListActions
            onExport={handleExport}
            isExporting={isExporting}
            onAdd={() => navigate("/vendor-management/price-list/new")}
            addLabel={t("add")}
          />
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
              fields={priceListFilterFields}
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
        {isGridMode && !grid.isLoading && priceLists.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {priceLists.map((item) => (
                <PriceListCard
                  key={item.id}
                  item={item}
                  onEdit={(pl) =>
                    navigate(`/vendor-management/price-list/${pl.id}`)
                  }
                  onDelete={setDeleteTarget}
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
                lf.activeFilters.length > 0
                  ? "max-h-[calc(100vh-13rem-3rem)]"
                  : "max-h-[calc(100vh-10rem-3rem)]",
              )}
            >
              <DataGridScrollArea>
                <DataGridTable />
              </DataGridScrollArea>
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
          });
        }}
      />

      <SaveViewDialog
        open={saveViewDialogOpen}
        onOpenChange={setSaveViewDialogOpen}
        canManageBu={lf.view.canManageBu}
        existingNames={lf.view.existingNames}
        onSave={lf.view.saveOrUpdate}
      />
    </div>
  );
}
