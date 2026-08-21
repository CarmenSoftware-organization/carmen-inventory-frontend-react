import { useCallback, useMemo, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import { Columns3, LayoutGrid, LayoutList, Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGridPagination } from "@/hooks/use-grid-pagination";
import { toast } from "sonner";
import {
  DataGrid,
  DataGridContainer,
  DataGridScrollArea,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination";
import { Button } from "@/components/ui/button";
import {
  usePurchaseOrder,
  useMyPendingPurchaseOrder,
  useDeletePurchaseOrder,
  useExportPurchaseOrder,
  usePurchaseOrderWorkflowStages,
} from "@/hooks/use-purchase-order";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { setURLParams, useURL } from "@/hooks/use-url";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { PURCHASE_ORDER_TYPE_OPTIONS } from "@/constant/purchase-order";
import type { PurchaseOrder } from "@/types/purchase-order";
import SearchInput from "@/components/search-input";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ErrorState } from "@/components/ui/error-state";
import EmptyComponent from "@/components/empty-component";
import { ActiveFilterBar } from "@/components/ui/active-filter-bar";
import { cn } from "@/lib/utils";
import { ViewModeToggle } from "@/components/share/view-mode-toggle";
import { DocumentListHeader } from "@/components/share/document-list-header";
import { DataGridColumnVisibility } from "@/components/ui/data-grid/data-grid-column-visibility";
import { usePoTable } from "./use-po-table";
import PoCardList from "./po-card-list";
import { DocumentListActions } from "@/components/share/document-list-actions";
import { useCreatableWorkflows } from "@/hooks/use-workflow";
import { WORKFLOW_TYPE } from "@/types/workflows";
import { dispatchPermissionDenied } from "@/components/permission-denied-dialog";
import { FieldLabel } from "@/components/ui/field";
import { useListFilters } from "@/hooks/use-list-filters";
import { ViewSelector } from "@/components/list-filter/view-selector";
import { ListFilterSheet } from "@/components/list-filter/list-filter-sheet";
import { SaveViewDialog } from "@/components/list-filter/save-view-dialog";
import { LIST_PAGE_KEYS } from "@/constant/list-page-keys";
import type { FilterFieldDef } from "@/types/list-filter";
import { SENDBACK_FILTER_CLAUSE } from "@/constant/last-action";
import { useExportErrorToast } from "@/hooks/use-export-error-toast";

// next/dynamic → lazy+Suspense (Batch D hand-fix)
const CreatePODialog = lazy(() =>
  import("./po-create-dialog").then((mod) => ({ default: mod.CreatePODialog })),
);

export default function PoComponent() {
  const t = useTranslations("procurement.purchaseOrder");
  const tc = useTranslations("common");
  const exportErrorToast = useExportErrorToast();
  const tfl = useTranslations("field");
  const tt = useTranslations("toast");
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  // ไม่มี workflow ให้เริ่มใบเลย = สร้างไม่ได้ ปุ่มจาง แต่กดแล้วยังบอกเหตุผล
  // (ซ่อนไปเลยพนักงานจะนึกว่าระบบเสีย)
  const { canCreate: canCreatePo } = useCreatableWorkflows(WORKFLOW_TYPE.PO);

  const handleAdd = () => {
    if (!canCreatePo) {
      dispatchPermissionDenied(undefined, t("noCreatableWorkflow"));
      return;
    }
    setCreateOpen(true);
  };
  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrder | null>(null);
  const [viewModeParam] = useURL("view", {
    defaultValue: "my-pending",
  });
  const viewMode = viewModeParam as "my-pending" | "all-document";
  /**
   * สลับกลุ่มเอกสาร — ล้างคำค้น ขั้นตอนที่กรองไว้ และกลับหน้า 1 เสมอ
   *
   * สองกลุ่มนี้เป็นคนละชุดข้อมูลกัน คำค้นที่เจอ 3 ใบใน "รอฉันดำเนินการ" อาจเจอ
   * 200 ใบใน "เอกสารทั้งหมด" (หรือกลับกันคือเจอ 0 แล้วดูเหมือนไม่มีอะไรเลย)
   * ขั้นตอนที่กรองไว้ก็อาจไม่มีอยู่ในอีกกลุ่ม และเลขหน้าที่ค้างอยู่ก็อาจไม่มีจริง
   * · เขียนทีเดียวทุกพารามิเตอร์ด้วย setURLParams จะได้ replaceState กับ
   * re-render รอบเดียว
   */
  const handleViewModeChange = useCallback(
    (next: string) =>
      setURLParams({
        view: next,
        search: "",
        page: "",
        workflow_current_stage: "",
      }),
    [],
  );
  const [displayMode, setDisplayMode] = useState<"list" | "grid">("list");
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const isMobile = useIsMobile();
  const isGridMode = isMobile || displayMode === "grid";
  const useInfiniteScroll = !!isMobile;
  const deletePo = useDeletePurchaseOrder();
  const { exportPurchaseOrder, isExporting } = useExportPurchaseOrder();
  const { params, search, setSearch, tableConfig } = useDataGridState({
    defaultSort: "po_no:desc",
  });

  const { data: stages } = usePurchaseOrderWorkflowStages();

  // field แรกเป็น custom control ล้วน ๆ — ไม่ใช่ filter จริง แค่ยืม slot ใน
  // ListFilterSheet เพื่อวาง toggle my-pending/all-document (มือถือเท่านั้น
  // เหมือน PR pilot) ไม่มี value จริงจึงไม่ถูกนับใน filterParam/activeFilters
  const poFilterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        key: "view_mode_toggle",
        control: "custom",
        labelKey: "",
        // ไม่มี value จริง (ปุ่ม toggle ไม่ผ่าน setValue) — ประกาศ toClause ว่างชัดเจน
        // ให้ตรงกับ pattern ของ field หลอกตัวอื่น (เช่น transaction's dateRange)
        toClause: () => "",
        render: () => (
          <div className="space-y-1.5 sm:hidden">
            <FieldLabel className="text-xs">{tc("view")}</FieldLabel>
            <ViewModeToggle
              value={viewMode}
              onChange={handleViewModeChange}
              myPendingLabel={t("myPending")}
              allDocumentsLabel={t("allDocuments")}
              className="grid grid-cols-2 gap-2"
            />
          </div>
        ),
      },
      {
        key: "filter",
        control: "status",
        labelKey: "common.status",
        section: "listView.sectionDocument",
      },
      {
        key: "po_type",
        control: "custom",
        labelKey: "procurement.purchaseOrder.type",
        section: "listView.sectionDocument",
        render: (value, onChange) => (
          <MultiSelectFilter
            value={value}
            onChange={onChange}
            options={PURCHASE_ORDER_TYPE_OPTIONS}
            className="w-full"
          />
        ),
      },
      {
        key: "workflow_current_stage",
        control: "stage",
        labelKey: "field.stage",
        section: "listView.sectionDocument",
        stages: stages ?? [],
      },
      {
        key: "workflow",
        control: "workflow",
        labelKey: "field.workflow",
        section: "listView.sectionDocument",
        workflowType: WORKFLOW_TYPE.PO,
      },
      {
        // ตัวกรอง "ใบที่ถูกตีกลับ" — dropdown สองตัวเลือก (ทั้งหมด / ส่งกลับ)
        // ค่าที่เก็บคือ clause เต็มอยู่แล้ว จึงไม่ต้องประกาศ toClause
        key: "sendback",
        control: "status",
        labelKey: "common.sendBack",
        section: "listView.sectionDocument",
        options: [
          { labelKey: "common.sendBack", value: SENDBACK_FILTER_CLAUSE },
        ],
      },
      {
        // ผู้จัดซื้อ = คนเปิดใบ (คอลัมน์ Buyer ใน list) — กรองที่ created_by_id
        key: "buyer",
        control: "requester",
        labelKey: "field.buyer",
        fieldKey: "created_by_id",
        section: "listView.sectionPeople",
      },
      {
        key: "order_date",
        control: "date-range",
        labelKey: "field.orderDate",
        fieldKey: "order_date",
        section: "listView.sectionDate",
      },
    ],
    [viewMode, stages, t, tc],
  );

  const lf = useListFilters({
    pageKey: LIST_PAGE_KEYS.PURCHASE_ORDER,
    fields: poFilterFields,
    defaultSort: "po_no:desc",
  });

  const queryParams = { ...params, filter: lf.filterParam };

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
            header: tfl("buyer"),
            value: (r) => r.audit?.created?.name ?? "",
            width: 22,
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

  const table = usePoTable({
    purchaseOrders,
    totalRecords,
    params,
    tableConfig,
    onEdit: (po) => navigate(`/procurement/purchase-order/${po.id}`),
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
            onAdd={handleAdd}
            addLabel={t("add")}
            addDisabled={!canCreatePo}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex w-full flex-1 flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
            <div className="w-full sm:w-auto sm:flex-initial">
              <SearchInput defaultValue={search} onSearch={setSearch} />
            </div>
            <span className="bg-border hidden h-4 w-px sm:block" />
            <ViewModeToggle
              value={viewMode}
              onChange={handleViewModeChange}
              myPendingLabel={t("myPending")}
              allDocumentsLabel={t("allDocuments")}
              className="hidden items-center gap-2 sm:flex"
            />
            <ViewSelector
              view={lf.view}
              snapshot={{ filters: lf.values, sort: lf.sortParam || undefined }}
            />
            <ListFilterSheet
              fields={poFilterFields}
              values={lf.values}
              setValue={lf.setValue}
              onClearAll={lf.clearAll}
              onSaveClick={() => setSaveViewDialogOpen(true)}
              activeCount={lf.activeFilters.length}
            />
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

        <ActiveFilterBar filters={lf.activeFilters} onClearAll={lf.clearAll} />
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

        {isGridMode && (
          <>
            <PoCardList
              items={purchaseOrders}
              isLoading={useInfiniteScroll ? grid.isLoading : isLoading}
              onEdit={(po) => navigate(`/procurement/purchase-order/${po.id}`)}
              onDelete={setDeleteTarget}
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
