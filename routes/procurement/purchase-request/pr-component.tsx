import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import {
  CheckCircle2,
  Columns3,
  LayoutGrid,
  LayoutList,
  Trash2,
  XCircle,
  Loader2,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGridPagination } from "@/hooks/use-grid-pagination";
import { toast } from "sonner";
import {
  DataGrid,
  DataGridContainer,
  DataGridScrollArea,
} from "@/components/ui/data-grid/data-grid";
import { cn } from "@/lib/utils";
import { ViewModeToggle } from "@/components/share/view-mode-toggle";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination";
import { Button } from "@/components/ui/button";
import {
  usePurchaseRequest,
  useMyPendingPurchaseRequest,
  useExportPurchaseRequest,
} from "./use-purchase-request";
import { useCreatableWorkflows } from "@/hooks/use-workflow";
import { WORKFLOW_TYPE } from "@/types/workflows";
import { dispatchPermissionDenied } from "@/components/permission-denied-dialog";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useRecordDocSequence } from "@/hooks/use-doc-sequence";
import { setURLParams, useURL } from "@/hooks/use-url";
import type { PurchaseRequest } from "@/types/purchase-request";
import SearchInput from "@/components/search-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PrStatusSelectDialog } from "./pr-select-dialog";
import { PrListDialogs } from "./pr-list-dialogs";
import { ErrorState } from "@/components/ui/error-state";
import { usePurchaseRequestTable } from "./pr-table";
import PrCardList from "./pr-card-list";
import { DataGridColumnVisibility } from "@/components/ui/data-grid/data-grid-column-visibility";
import { DataGridSortMenu } from "@/components/ui/data-grid/data-grid-sort-menu";
import { ActiveFilterBar } from "@/components/ui/active-filter-bar";
import EmptyComponent from "@/components/empty-component";
import { lazy, Suspense } from "react";
import { useProfile } from "@/hooks/use-profile";
import { DocumentListActions } from "@/components/share/document-list-actions";
import { DocumentListHeader } from "@/components/share/document-list-header";
import { useListFilters } from "@/hooks/use-list-filters";
import { ViewSelector } from "@/components/list-filter/view-selector";
import { ListFilter } from "@/components/list-filter/list-filter";
import { SaveViewDialog } from "@/components/list-filter/save-view-dialog";
import { LIST_PAGE_KEYS } from "@/constant/list-page-keys";
import { useExportErrorToast } from "@/hooks/use-export-error-toast";
import { usePrFilterFields } from "./use-pr-filter-fields";
import { usePrSelection } from "./use-pr-selection";
import { buildPrExportColumns } from "./pr-export-columns";

// แทน next/dynamic ด้วย React.lazy (code-split เหมือนเดิม)
const CreatePRDialog = lazy(() =>
  import("./pr-create-dialog").then((mod) => ({ default: mod.CreatePRDialog })),
);

/**
 * คอมโพเนนต์หน้ารายการ PR หลัก รวม toolbar, filters, table/card view,
 * batch approve/reject, delete dialog และ create dialog เชื่อมกับ URL state ผ่าน `useDataGridState`
 * @returns React element ของหน้ารายการใบขอซื้อ
 * @example
 * // ใช้ใน app/(root)/procurement/purchase-request/page.tsx
 * <PurchaseRequestComponent />
 */
export default function PurchaseRequestComponent() {
  const t = useTranslations("procurement.purchaseRequest");
  const tc = useTranslations("common");
  const exportErrorToast = useExportErrorToast();
  const tfl = useTranslations("field");
  const navigate = useNavigate();
  const { defaultCurrencyCode, dateTimeFormat } = useProfile();
  const [deleteTarget, setDeleteTarget] = useState<PurchaseRequest | null>(
    null,
  );
  const [approveTarget, setApproveTarget] = useState<PurchaseRequest | null>(
    null,
  );
  const [rejectTarget, setRejectTarget] = useState<PurchaseRequest | null>(
    null,
  );
  const [batchApproveOpen, setBatchApproveOpen] = useState(false);
  const [batchRejectOpen, setBatchRejectOpen] = useState(false);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  // viewMode อยู่ใน URL (?view=) เพื่อให้ปุ่ม back จาก detail กลับมาเจอ tab เดิม
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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const [displayMode, setDisplayMode] = useState<"list" | "grid">("list");
  const isMobile = useIsMobile();
  const isGridMode = isMobile || displayMode === "grid";
  const { exportPurchaseRequest, isExporting } = useExportPurchaseRequest();

  const { params, search, setSearch, tableConfig } = useDataGridState({
    defaultSort: viewMode === "my-pending" ? "pr_date:desc" : "pr_no:desc",
  });

  const prFilterFields = usePrFilterFields({
    viewMode,
    onViewModeChange: handleViewModeChange,
  });

  const lf = useListFilters({
    pageKey: LIST_PAGE_KEYS.PURCHASE_REQUEST,
    fields: prFilterFields,
    defaultSort: viewMode === "my-pending" ? "pr_date:desc" : "pr_no:desc",
  });

  const queryParams = { ...params, filter: lf.filterParam };

  const handleExport = async () => {
    try {
      const count = await exportPurchaseRequest({
        params: queryParams,
        viewMode,
        columns: buildPrExportColumns({
          tfl,
          defaultCurrencyCode,
          dateTimeFormat,
        }),
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

  const useInfiniteScroll = !!isMobile;

  // ยิงเฉพาะ endpoint ของ tab ที่เปิดอยู่ — อีก tab รอจนกดถึงค่อย fetch
  // (ข้อมูลที่เคยโหลดยังอยู่ใน cache สลับกลับมาจึงไม่ยิงซ้ำ)
  const myPendingQuery = useMyPendingPurchaseRequest(queryParams, {
    enabled: !useInfiniteScroll && viewMode === "my-pending",
  });
  const allDocumentQuery = usePurchaseRequest(queryParams, {
    enabled: !useInfiniteScroll && viewMode === "all-document",
  });

  const { data, isLoading, error, refetch } =
    viewMode === "my-pending" ? myPendingQuery : allDocumentQuery;

  const activeListHook =
    viewMode === "my-pending"
      ? useMyPendingPurchaseRequest
      : usePurchaseRequest;

  const grid = useGridPagination<PurchaseRequest>({
    useListHook: activeListHook,
    params: queryParams,
    enabled: useInfiniteScroll,
  });

  const items = useInfiniteScroll ? grid.items : (data?.data ?? []);

  // ประกาศลำดับแถวให้ปุ่ม ↑↓ บนหัวหน้า detail (DocSequenceNav) — my-pending ยิงชุด
  // เต็ม (perpage: -1) แยกอีกหนึ่ง query เพื่อให้ ↑↓ เดินได้ทุกใบที่รอเราอยู่ ไม่ใช่แค่
  // หน้าที่เปิดค้างไว้ (คนอนุมัติไล่เคลียร์ได้จบชุดโดยไม่ต้องเด้งกลับ list)
  // all-document ไม่ทำแบบนี้ — ใบทั้งระบบมีหลักพัน ดึงมาทั้งกองเพื่อเอาแค่ id ไม่คุ้ม
  // ระหว่างชุดเต็มยังโหลดไม่เสร็จใช้แถวหน้าปัจจุบันไปก่อน ปุ่มจึงไม่หายวับ
  const docSequenceQuery = useMyPendingPurchaseRequest(
    { ...queryParams, page: undefined, perpage: -1 },
    { enabled: viewMode === "my-pending" },
  );
  const docSequenceItems =
    viewMode === "my-pending" ? (docSequenceQuery.data?.data ?? items) : items;
  useRecordDocSequence(docSequenceItems.map((d) => d.id));
  const totalRecords = useInfiniteScroll
    ? grid.totalRecords
    : (data?.paginate?.total ?? 0);

  const selection = usePrSelection(items);
  const { selectedItems, hasSelection, selectedGroup } = selection;

  const table = usePurchaseRequestTable({
    items,
    totalRecords,
    params,
    tableConfig,
    onEdit: (item) => navigate(`/procurement/purchase-request/${item.id}`),
    onDelete: setDeleteTarget,
    onApprove: setApproveTarget,
    onReject: setRejectTarget,
    isMyPending: viewMode === "my-pending",
    onRowSelect: selection.handleRowSelect,
    onSelectAll: selection.handleSelectAll,
    rowSelection: selection.rowSelection,
    onRowSelectionChange: selection.setRowSelection,
  });

  // ไม่มี workflow ให้เริ่มใบเลย = สร้างไม่ได้ ปุ่มจาง แต่กดแล้วยังบอกเหตุผล
  // (ซ่อนไปเลยพนักงานจะนึกว่าระบบเสีย)
  const { canCreate: canCreatePr } = useCreatableWorkflows(WORKFLOW_TYPE.PR);

  const handleAdd = () => {
    if (!canCreatePr) {
      dispatchPermissionDenied(undefined, t("noCreatableWorkflow"));
      return;
    }
    setCreateDialogOpen(true);
  };

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
            onAdd={handleAdd}
            addLabel={t("add")}
            addDisabled={!canCreatePr}
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
            {/* Saved views + registry filter sheet — ทำงานทั้ง desktop และ mobile
                (ListFilter ปรับ side เอง ผ่าน useIsMobile ภายในตัวมัน) */}
            <ViewSelector
              view={lf.view}
              snapshot={{ filters: lf.values, sort: lf.sortParam || undefined }}
            />
            <ListFilter
              fields={prFilterFields}
              values={lf.values}
              setValue={lf.setValue}
              onClearAll={lf.clearAll}
              onSaveClick={() => setSaveViewDialogOpen(true)}
              activeCount={lf.activeFilters.length}
            />
          </div>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <DataGridSortMenu table={table} />
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
        {hasSelection && viewMode === "my-pending" && (
          <div className="flex items-center justify-end gap-2">
            <span className="text-muted-foreground text-xs">
              {selectedItems.length} {t("selected")}
            </span>
            {selectedGroup === "draft" ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setBatchDeleteOpen(true)}
              >
                <Trash2 aria-hidden="true" />
                {tc("delete")}
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="success"
                  onClick={() => setBatchApproveOpen(true)}
                >
                  <CheckCircle2 aria-hidden="true" />
                  {tc("approve")}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setBatchRejectOpen(true)}
                >
                  <XCircle aria-hidden="true" />
                  {tc("reject")}
                </Button>
              </>
            )}
          </div>
        )}

        {!isGridMode && (
          <DataGrid
            table={table}
            recordCount={totalRecords}
            isLoading={isLoading}
            tableLayout={{
              checkbox: true,
              headerSticky: true,
              // คอลัมน์เยอะจนบีบกันแน่นในความกว้างจอ — เปิดตัวนี้แล้ว table ได้
              // width = getTotalSize() (ผลรวม size ที่แต่ละคอลัมน์ประกาศไว้) แทน
              // w-full ที่หารพื้นที่ให้ทุกคอลัมน์เท่าไรก็ได้ ล้นแล้วเลื่อนแนวนอนเอา
              columnsResizable: true,
            }}
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
            <PrCardList
              items={items}
              isLoading={useInfiniteScroll ? grid.isLoading : isLoading}
              onEdit={(item) =>
                navigate(`/procurement/purchase-request/${item.id}`)
              }
              onApprove={setApproveTarget}
              onReject={setRejectTarget}
              onDelete={setDeleteTarget}
              isMyPending={viewMode === "my-pending"}
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

      <PrListDialogs
        deleteTarget={deleteTarget}
        setDeleteTarget={setDeleteTarget}
        approveTarget={approveTarget}
        setApproveTarget={setApproveTarget}
        rejectTarget={rejectTarget}
        setRejectTarget={setRejectTarget}
        batchApproveOpen={batchApproveOpen}
        setBatchApproveOpen={setBatchApproveOpen}
        batchRejectOpen={batchRejectOpen}
        setBatchRejectOpen={setBatchRejectOpen}
        batchDeleteOpen={batchDeleteOpen}
        setBatchDeleteOpen={setBatchDeleteOpen}
        selectedItems={selectedItems}
        pageItemCount={items.length}
        clearSelection={selection.clearSelection}
        table={table}
      />

      <ConfirmDialog
        open={!!selection.switchTarget}
        onOpenChange={(open) => !open && selection.setSwitchTarget(null)}
        title={t("switchSelectionTitle")}
        description={t("switchSelectionDesc", {
          count: selectedItems.length,
          from:
            selectedGroup === "draft"
              ? t("selectDraft")
              : t("selectInProgress"),
        })}
        confirmText={t("switchSelectionConfirm", {
          to:
            selection.switchTarget &&
            selection.groupOf(selection.switchTarget) === "draft"
              ? t("selectDraft")
              : t("selectInProgress"),
        })}
        onConfirm={selection.confirmSwitch}
      />

      <PrStatusSelectDialog
        open={selection.selectAllOpen}
        onOpenChange={selection.setSelectAllOpen}
        draftCount={selection.draftItems.length}
        inProgressCount={selection.inProgressItems.length}
        onSelectDraft={() => {
          selection.selectOnly(selection.draftItems);
          selection.setSelectAllOpen(false);
        }}
        onSelectInProgress={() => {
          selection.selectOnly(selection.inProgressItems);
          selection.setSelectAllOpen(false);
        }}
      />

      <Suspense fallback={null}>
        <CreatePRDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      </Suspense>

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
