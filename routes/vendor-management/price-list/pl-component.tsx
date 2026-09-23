import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { listReturnState } from "@/hooks/use-list-return";
import { Loader2 } from "lucide-react";
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
import {
  usePriceList,
  useDeletePriceList,
  useExportPriceList,
} from "@/hooks/use-price-list";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGridPagination } from "@/hooks/use-grid-pagination";
import { useCurrency } from "@/hooks/use-currency";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import type { PriceList } from "@/types/price-list";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ErrorState } from "@/components/ui/error-state";
import EmptyComponent from "@/components/empty-component";
import { DocumentListHeader } from "@/components/share/document-list-header";
import { DocumentListActions } from "@/components/share/document-list-actions";
import { CardSkeletonGrid } from "@/components/loader/card-skeleton";
import { usePriceListTable } from "./use-pl-table";
import PriceListCard from "./pl-card";
import { useListFilters } from "@/hooks/use-list-filters";
import { ListToolbar } from "@/components/list-filter/list-toolbar";
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

  // code ของสกุลเงินเป็น literal string จริง จึงต้องใช้ control: "custom" ห่อ
  // MultiSelectFilter ตรง ๆ แทน control: "multi-select" (ตัวนั้นเรียก
  // t(option.labelKey) ซึ่งจะ error ถ้า label ไม่ใช่ i18n key — เหมือน pattern
  // PO_TYPE/CN_TYPE ใน Task 19). filter (status) ใช้ labelKey จริง (status.draft
  // ฯลฯ) จึงใช้ control: "status" ทั่วไปได้ตรง ๆ
  const { data: currencyData } = useCurrency({ perpage: -1 });
  // code เป็น literal string จริง — memo กัน reference เปลี่ยนทุก render
  const currencyOptions = useMemo(
    () =>
      (currencyData?.data ?? [])
        .filter((c) => c.is_active)
        .map((c) => ({
          label: c.code,
          value: `currency_code|string:${c.code}`,
        })),
    [currencyData],
  );

  // ป้ายเป็น i18n (ไม่ใช่ createStatusFilterOptions ที่เป็นอังกฤษล้วน) ให้ตรงกับ
  // ป้ายในตาราง — ค่าเป็น clause เต็มต่อตัว MultiSelectFilter join เองเมื่อเลือกหลายตัว
  const statusOptions = useMemo(
    () =>
      (["draft", "submitted", "active", "inactive"] as const).map((status) => ({
        label: ts(status),
        value: `status|string:${status}`,
      })),
    [ts],
  );

  const priceListFilterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        // MultiSelectFilter แทน control: "status" (Select ข้อความเปล่า) เพื่อให้
        // เมนูมีไอคอนสถานะชุดเดียวกับคอลัมน์ในตาราง — ไอคอนมาจากค่าท้าย value
        // (`status|string:draft` → draft) ผ่าน lookupIcon ไม่ต้องประกาศซ้ำ
        // ผลพลอยได้คือเลือกได้หลายสถานะเหมือนรายการเอกสารอื่น (PR/PO)
        key: "filter",
        section: "listView.sectionDocument",
        control: "custom",
        labelKey: "common.status",
        // custom control ไม่มี `options` ให้ chip ไปหา label เอง — ไม่ใส่ตัวนี้
        // chip จะกลายเป็นค่าดิบ ("draft") แทนป้ายภาษาไทย
        valueText: (value) => {
          const selected = new Set(value.split(","));
          const labels = statusOptions
            .filter((o) => selected.has(o.value))
            .map((o) => o.label);
          return labels.length > 1
            ? `${labels[0]} +${labels.length - 1}`
            : labels[0];
        },
        render: (value, onChange) => (
          <MultiSelectFilter
            value={value}
            onChange={onChange}
            options={statusOptions}
            className="w-full"
          />
        ),
      },
      {
        key: "currency",
        control: "custom",
        labelKey: "field.currency",
        section: "listView.sectionDocument",
        render: (value, onChange) => (
          <MultiSelectFilter
            value={value}
            onChange={onChange}
            options={currencyOptions}
            searchable
            className="w-full"
          />
        ),
      },
      {
        // ทะเบียน vendor ใหญ่หลักร้อย KB (T02: 858 แถว ≈ 435 KB) — control "vendor"
        // ยิงเองตอนเปิด popover ส่วนชื่อบน chip มาจาก useListFilters ที่ยิงเฉพาะ
        // เมื่อมีค่ากรองค้างจริง หน้านี้จึงไม่จ่ายค่านั้นตอน mount
        key: "vendor",
        section: "listView.sectionPeople",
        control: "vendor",
        labelKey: "field.vendor",
      },
      {
        // กรองที่วันเริ่มมีผล (effective_from_date) — ความหมายเดียวกับคอลัมน์
        // ช่วงวันที่มีผลบน list ที่เรียงด้วยวันเริ่มเช่นกัน
        key: "effective_from",
        control: "date-range",
        labelKey: "field.effectivePeriod",
        fieldKey: "effective_from_date",
        section: "listView.sectionDate",
      },
    ],
    [currencyOptions, statusOptions],
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
      navigate(
        `/vendor-management/price-list/${priceList.id}`,
        listReturnState(),
      ),
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
            onAdd={() =>
              navigate("/vendor-management/price-list/new", listReturnState())
            }
            addLabel={t("add")}
          />
        </div>

        <ListToolbar
          search={search}
          onSearch={setSearch}
          lf={lf}
          fields={priceListFilterFields}
          onSaveViewClick={() => setSaveViewDialogOpen(true)}
          table={table}
          displayMode={displayMode}
          onDisplayModeChange={setDisplayMode}
        />
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
                    navigate(
                      `/vendor-management/price-list/${pl.id}`,
                      listReturnState(),
                    )
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
