import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Columns3, LayoutGrid, LayoutList, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import {
  DataGrid,
  DataGridContainer,
  DataGridScrollArea,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination";
import { Button } from "@/components/ui/button";
import {
  useRequestPriceList,
  useDeleteRequestPriceList,
  useExportRequestPriceList,
} from "./use-rfp";
import { useDataGridState } from "@/hooks/use-data-grid-state";
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
import { ActiveFilterBar } from "@/components/ui/active-filter-bar";
import { cn } from "@/lib/utils";
import { DataGridColumnVisibility } from "@/components/ui/data-grid/data-grid-column-visibility";
import { DataGridSortMenu } from "@/components/ui/data-grid/data-grid-sort-menu";
import { CardSkeletonGrid } from "@/components/loader/card-skeleton";
import { useRequestPriceListTable } from "./use-rfp-table";
import RfpCard from "./rfp-card";
import { useListFilters } from "@/hooks/use-list-filters";
import { ViewSelector } from "@/components/list-filter/view-selector";
import { ListFilter } from "@/components/list-filter/list-filter";
import { SaveViewDialog } from "@/components/list-filter/save-view-dialog";
import { LIST_PAGE_KEYS } from "@/constant/list-page-keys";
import type { FilterFieldDef } from "@/types/list-filter";
import { useExportErrorToast } from "@/hooks/use-export-error-toast";

export default function RequestPriceListComponent() {
  const navigate = useNavigate();
  const t = useTranslations("vendorManagement.requestPriceList");
  const tc = useTranslations("common");
  const exportErrorToast = useExportErrorToast();
  const tfl = useTranslations("field");
  const tt = useTranslations("toast");
  const { dateTimeFormat } = useProfile();
  const [deleteTarget, setDeleteTarget] = useState<RequestPriceList | null>(
    null,
  );
  const [displayMode, setDisplayMode] = useState<"list" | "grid">("list");
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const isMobile = useIsMobile();
  const deleteRequestPriceList = useDeleteRequestPriceList();
  const { exportRequestPriceList, isExporting } = useExportRequestPriceList();
  const { params, search, setSearch, tableConfig } = useDataGridState();

  const { data: templateData } = usePriceListTemplate({ perpage: -1 });
  // ชื่อ template เป็น literal string จริง (ไม่ใช่ i18n key) — memo กันไม่ให้
  // array reference เปลี่ยนทุก render จน rfpFilterFields memo ข้างล่างไม่เคย hit
  const templateOptions = useMemo(
    () =>
      (templateData?.data ?? []).map((tmpl) => ({
        label: tmpl.name,
        value: `pricelist_template_id|string:${tmpl.id}`,
      })),
    [templateData],
  );

  // ไม่มี status/vendor filter ในโค้ดเดิม (grep ทั้งไฟล์ยืนยันแล้ว — brief เก่า/
  // ไม่ตรง) มีแค่ template เดียว literal string จริง จึงต้องใช้ control: "custom"
  // ห่อ MultiSelectFilter ตรง ๆ แทน control: "multi-select" (ตัวนั้นเรียก
  // t(option.labelKey) ซึ่งจะ error ถ้า label ไม่ใช่ i18n key)
  const rfpFilterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        key: "template",
        section: "listView.sectionDocument",
        control: "custom",
        labelKey: "field.template",
        render: (value, onChange) => (
          <MultiSelectFilter
            value={value}
            onChange={onChange}
            options={templateOptions}
            searchable
            className="w-full"
          />
        ),
      },
      {
        // กรองที่วันเริ่มเปิดรับราคา (start_date) — คอลัมน์เดียวกับที่ list เรียง
        key: "start_from",
        control: "date-range",
        labelKey: "field.effectivePeriod",
        fieldKey: "start_date",
        section: "listView.sectionDate",
      },
    ],
    [templateOptions],
  );

  const lf = useListFilters({
    pageKey: LIST_PAGE_KEYS.REQUEST_PRICE_LIST,
    fields: rfpFilterFields,
  });

  const queryParams = { ...params, filter: lf.filterParam };

  const isGridMode = isMobile || displayMode === "grid";

  const { data, isLoading, error, refetch } = useRequestPriceList(queryParams, {
    enabled: !isGridMode,
  });

  const grid = useGridPagination<RequestPriceList>({
    useListHook: useRequestPriceList,
    params: queryParams,
    enabled: isGridMode,
  });

  // เดิมมี "Clear All" ที่ล้าง search ด้วย (ไม่ใช่แค่ template) — lf.clearAll ไม่รู้
  // จัก search (อยู่นอก field registry) จึงยังต้องเรียก setSearch("") ต่อเอง เพื่อ
  // รักษาพฤติกรรมเดิมทุกประการ
  const clearAllFilters = () => {
    lf.clearAll();
    setSearch("");
  };

  // เดิมมี chip แสดงคำค้นหา (search) แยกจาก template — ไม่ใช่ FilterFieldDef
  // (search เป็นกลไกแยกทุกหน้า ไม่ใช่ "filter" ใน registry) จึงต่อ chip นี้เข้ากับ
  // lf.activeFilters เอง เพื่อรักษาพฤติกรรมเดิม (คลิก chip ลบแค่คำค้นหา)
  const activeFilters = search
    ? [
        ...lf.activeFilters,
        {
          key: `search-${search}`,
          label: `"${search}"`,
          onRemove: () => setSearch(""),
        },
      ]
    : lf.activeFilters;

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
          {
            header: tfl("created"),
            value: (r) =>
              r.audit?.created?.at
                ? formatDate(r.audit.created.at, dateTimeFormat)
                : "",
            width: 18,
          },
          {
            header: tfl("updated"),
            value: (r) =>
              r.audit?.updated?.at
                ? formatDate(r.audit.updated.at, dateTimeFormat)
                : "",
            width: 18,
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

  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

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
            onAdd={() => navigate("/vendor-management/request-price-list/new")}
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
            <ListFilter
              fields={rfpFilterFields}
              values={lf.values}
              setValue={lf.setValue}
              onClearAll={clearAllFilters}
              onSaveClick={() => setSaveViewDialogOpen(true)}
              activeCount={lf.activeFilters.length}
            />
          </div>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <DataGridSortMenu table={table} />
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <RfpCard
                  key={item.id}
                  item={item}
                  onEdit={(rfp) =>
                    navigate(`/vendor-management/request-price-list/${rfp.id}`)
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
