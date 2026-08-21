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
  useVendor,
  useDeleteVendor,
  useExportVendor,
} from "@/hooks/use-vendor";
import { useBusinessType } from "@/hooks/use-business-type";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGridPagination } from "@/hooks/use-grid-pagination";
import type { Vendor, VendorDetail } from "@/types/vendor";
import SearchInput from "@/components/search-input";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ErrorState } from "@/components/ui/error-state";
import EmptyComponent from "@/components/empty-component";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { DocumentListHeader } from "@/components/share/document-list-header";
import { DocumentListActions } from "@/components/share/document-list-actions";
import { ActiveFilterBar } from "@/components/ui/active-filter-bar";
import { DataGridColumnVisibility } from "@/components/ui/data-grid/data-grid-column-visibility";
import { CardSkeletonGrid } from "@/components/loader/card-skeleton";
import { useVendorTable } from "./use-vendor-table";
import VendorCard from "./vendor-card";
import { useListFilters } from "@/hooks/use-list-filters";
import { ViewSelector } from "@/components/list-filter/view-selector";
import { ListFilter } from "@/components/list-filter/list-filter";
import { SaveViewDialog } from "@/components/list-filter/save-view-dialog";
import { LIST_PAGE_KEYS } from "@/constant/list-page-keys";
import type { FilterFieldDef } from "@/types/list-filter";
import { useExportErrorToast } from "@/hooks/use-export-error-toast";

export default function VendorComponent() {
  const navigate = useNavigate();
  const t = useTranslations("vendorManagement.vendor");
  const tc = useTranslations("common");
  const exportErrorToast = useExportErrorToast();
  const tfl = useTranslations("field");
  const ts = useTranslations("status");
  const tt = useTranslations("toast");
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);
  const [displayMode, setDisplayMode] = useState<"list" | "grid">("list");
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const isMobile = useIsMobile();
  const deleteVendor = useDeleteVendor();
  const { exportVendor, isExporting } = useExportVendor();
  const { params, search, setSearch, tableConfig } = useDataGridState();

  const isGridMode = isMobile || displayMode === "grid";

  const { data: btData } = useBusinessType({ perpage: -1 });
  // ชื่อ business type เป็น literal string จริง (ไม่ใช่ i18n key) — memo กันไม่ให้
  // array reference เปลี่ยนทุก render จน vendorFilterFields memo ข้างล่างไม่เคย hit
  const btFilterOptions = useMemo(
    () =>
      (btData?.data ?? [])
        .filter((bt) => bt.is_active)
        .map((bt) => ({
          label: bt.name,
          value: `business_type_id|string:${bt.id}`,
        })),
    [btData],
  );

  // filter (status) ไม่ส่ง options เลย — ใช้ default is_active|bool:true/false
  // ของ StatusFilter ตรงตัวเหมือนโค้ดเดิมทุกประการ (ts("active")/ts("inactive"))
  // business_type เป็น literal string จริงจึงต้องใช้ control: "custom" ห่อ
  // MultiSelectFilter ตรง ๆ แทน control: "multi-select" (ตัวนั้นเรียก
  // t(option.labelKey) ซึ่งจะ error ถ้า label ไม่ใช่ i18n key — เหมือน pattern
  // PO_TYPE/CN_TYPE ใน Task 19). ไม่มี `region` filter ในโค้ดเดิม (survey brief
  // เก่า/ไม่ตรง — grep ทั้งไฟล์ไม่พบ URL param หรือ control นี้เลย)
  const vendorFilterFields = useMemo<FilterFieldDef[]>(
    () => [
      { key: "filter", control: "status", labelKey: "common.status", section: "listView.sectionDocument" },
      {
        key: "business_type",
        section: "listView.sectionDocument",
        control: "custom",
        labelKey: "field.businessType",
        render: (value, onChange) => (
          <MultiSelectFilter
            value={value}
            onChange={onChange}
            options={btFilterOptions}
            className="w-full"
          />
        ),
      },
    ],
    [btFilterOptions],
  );

  const lf = useListFilters({
    pageKey: LIST_PAGE_KEYS.VENDOR,
    fields: vendorFilterFields,
  });

  const combinedParams = { ...params, filter: lf.filterParam };

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
      exportErrorToast(err);
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

  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  return (
    <div className="pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="sticky top-0 z-20 space-y-3 pb-3 sm:static sm:pb-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <DocumentListHeader title={t("title")} description={t("desc")} />
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
            <ViewSelector
              view={lf.view}
              snapshot={{ filters: lf.values, sort: lf.sortParam || undefined }}
            />
            <ListFilter
              fields={vendorFilterFields}
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
        {isGridMode && !grid.isLoading && vendors.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {vendors.map((item) => (
                <VendorCard
                  key={item.id}
                  item={item}
                  onEdit={(v) => navigate(`/vendor-management/vendor/${v.id}`)}
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
