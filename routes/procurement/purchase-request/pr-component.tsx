import { useCallback, useMemo, useState } from "react";
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
  usePurchaseRequestWorkflowStages,
  useDeletePurchaseRequest,
  useBatchApprovePurchaseRequest,
  useBatchRejectPurchaseRequest,
  useBatchDeletePurchaseRequest,
  useExportPurchaseRequest,
} from "@/hooks/use-purchase-request";
import { useCreatableWorkflows } from "@/hooks/use-workflow";
import { WORKFLOW_TYPE } from "@/types/workflows";
import { dispatchPermissionDenied } from "@/components/permission-denied-dialog";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { setURLParams, useURL } from "@/hooks/use-url";
import type { PurchaseRequest } from "@/types/purchase-request";
import { PR_STATUS } from "@/types/purchase-request";
import SearchInput from "@/components/search-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { PrStatusSelectDialog } from "./pr-select-dialog";
import { PrActionDialog } from "./workflow/pr-action-dialog";
import { ErrorState } from "@/components/ui/error-state";
import { FieldLabel } from "@/components/ui/field";
import { usePurchaseRequestTable } from "./pr-table";
import PrCardList from "./pr-card-list";
import { DataGridColumnVisibility } from "@/components/ui/data-grid/data-grid-column-visibility";
import { ActiveFilterBar } from "@/components/ui/active-filter-bar";
import EmptyComponent from "@/components/empty-component";
import { lazy, Suspense } from "react";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { PURCHASE_REQUEST_STATUS_OPTIONS } from "@/constant/purchase-request";
import { DocumentListActions } from "@/components/share/document-list-actions";
import { DocumentListHeader } from "@/components/share/document-list-header";
import { useListFilters } from "@/hooks/use-list-filters";
import { ViewSelector } from "@/components/list-filter/view-selector";
import { ListFilterSheet } from "@/components/list-filter/list-filter-sheet";
import { SaveViewDialog } from "@/components/list-filter/save-view-dialog";
import { LIST_PAGE_KEYS } from "@/constant/list-page-keys";
import type { FilterFieldDef } from "@/types/list-filter";
import { SENDBACK_FILTER_CLAUSE } from "@/constant/last-action";
import { useExportErrorToast } from "@/hooks/use-export-error-toast";

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
  const tt = useTranslations("toast");
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
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  // ใบที่ผู้ใช้กดติ๊กทั้งที่คนละกลุ่มกับที่เลือกค้างไว้ (รอยืนยันว่าจะสลับกลุ่ม)
  const [switchTarget, setSwitchTarget] = useState<PurchaseRequest | null>(
    null,
  );
  const [selectAllOpen, setSelectAllOpen] = useState(false);
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
  const deletePurchaseRequest = useDeletePurchaseRequest();
  const batchApprovePurchaseRequest = useBatchApprovePurchaseRequest();
  const batchRejectPurchaseRequest = useBatchRejectPurchaseRequest();
  const batchDeletePurchaseRequest = useBatchDeletePurchaseRequest();
  const { exportPurchaseRequest, isExporting } = useExportPurchaseRequest();

  const { params, search, setSearch, tableConfig } = useDataGridState({
    defaultSort: viewMode === "my-pending" ? "pr_date:desc" : "pr_no:desc",
  });

  const { data: stages } = usePurchaseRequestWorkflowStages();

  // field แรกเป็น custom control ล้วน ๆ — ไม่ใช่ filter จริง แค่ยืม slot ใน
  // ListFilterSheet เพื่อวาง toggle my-pending/all-document (มือถือเท่านั้น
  // เหมือนที่เคยอยู่ใน PrFilterSheet เดิม) ไม่มี value จริงจึงไม่ถูกนับใน
  // filterParam/activeFilters — key ตั้งไม่ให้ชนกับ "view" (ของ tab บน URL จริง)
  const prFilterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        key: "view_mode_toggle",
        control: "custom",
        // labelKey ว่างเจตนา — ListFilterSheet จะไม่ render <FieldLabel> ลอย ๆ ให้
        // (control นี้ sm:hidden อยู่แล้ว มี label "View" ของตัวเองอยู่ข้างในสำหรับ
        // มือถือเท่านั้น ไม่งั้น desktop จะเห็น label ค้างแต่ไม่มี control ข้างใต้)
        labelKey: "",
        // field นี้ไม่มี value จริง (ปุ่ม toggle ไม่ผ่าน setValue) จึงไม่ควรมี clause
        // ลง filterParam — ถ้าไม่ประกาศ toClause ค่า default คือ pass-through ตรง
        // ซึ่งจะไม่มีวันเกิดขึ้นเพราะ values[key] ว่างเสมออยู่แล้ว แต่ประกาศไว้ชัดเจน
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
        // ค่า option เป็น clause เต็มต่อตัว (pr_status|string:draft) — เลือกหลายตัว
        // MultiSelectFilter join เป็น clause ซ้ำ prefix ซึ่ง gateway parse รวมเป็น
        // IN query ให้เอง (parseFilterString รองรับทั้งสอง format โดยตั้งใจ)
        key: "filter",
        control: "custom",
        labelKey: "common.status",
        render: (value, onChange) => (
          <MultiSelectFilter
            value={value}
            onChange={onChange}
            options={PURCHASE_REQUEST_STATUS_OPTIONS}
            className="w-full"
          />
        ),
      },
      {
        key: "workflow_current_stage",
        control: "stage",
        labelKey: "procurement.purchaseRequest.stage",
        stages: stages ?? [],
      },
      {
        key: "workflow",
        control: "workflow",
        labelKey: "field.workflow",
        workflowType: WORKFLOW_TYPE.PR,
      },
      {
        key: "department",
        control: "department",
        labelKey: "field.department",
      },
      { key: "user_id", control: "requester", labelKey: "common.requester" },
      {
        key: "pr_date",
        control: "date-range",
        labelKey: "field.prDate",
        fieldKey: "pr_date",
      },
      {
        // ตัวกรอง "ใบที่ถูกตีกลับ" — dropdown สองตัวเลือก (ทั้งหมด / ส่งกลับ)
        // ค่าที่เก็บคือ clause เต็มอยู่แล้ว จึงไม่ต้องประกาศ toClause
        key: "sendback",
        control: "status",
        labelKey: "common.sendBack",
        options: [
          { labelKey: "common.sendBack", value: SENDBACK_FILTER_CLAUSE },
        ],
      },
    ],
    [stages, viewMode, t, tc],
  );

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
        columns: [
          { header: tfl("prNo"), value: (r) => r.pr_no, width: 18 },
          { header: tfl("date"), value: (r) => r.pr_date, width: 12 },
          { header: tfl("type"), value: (r) => r.workflow_name, width: 16 },
          {
            header: tfl("stage"),
            value: (r) => r.workflow_current_stage,
            width: 18,
          },
          { header: tfl("status"), value: (r) => r.pr_status, width: 14 },
          {
            header: tfl("requester"),
            value: (r) => r.requestor_name,
            width: 22,
          },
          {
            header: tfl("department"),
            value: (r) => r.department_name,
            width: 24,
          },
          {
            header: tfl("totalAmount"),
            value: (r) => r.base_total_amount,
            width: 16,
          },
          {
            header: tfl("currency"),
            value: () => defaultCurrencyCode,
            width: 8,
          },
          {
            header: tfl("description"),
            value: (r) => r.description ?? "",
            width: 40,
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
  const totalRecords = useInfiniteScroll
    ? grid.totalRecords
    : (data?.paginate?.total ?? 0);

  // ใบฉบับร่างลบได้อย่างเดียว ใบที่เหลืออนุมัติ/ไม่อนุมัติได้ — ปุ่มคนละชุด
  // จึงติ๊กปนกันไม่ได้
  const groupOf = (item: PurchaseRequest) =>
    item.pr_status === PR_STATUS.DRAFT ? "draft" : "in_progress";

  const selectedItems = items.filter((item) => rowSelection[item.id]);
  const hasSelection = selectedItems.length > 0;
  const selectedGroup = selectedItems.length ? groupOf(selectedItems[0]) : null;
  const draftItems = items.filter((item) => groupOf(item) === "draft");
  const inProgressItems = items.filter(
    (item) => groupOf(item) === "in_progress",
  );

  const selectOnly = (list: PurchaseRequest[]) =>
    setRowSelection(Object.fromEntries(list.map((item) => [item.id, true])));

  const handleRowSelect = (item: PurchaseRequest, next: boolean) => {
    if (!next) {
      setRowSelection(({ [item.id]: _removed, ...rest }) => rest);
      return;
    }
    if (selectedGroup && selectedGroup !== groupOf(item)) {
      setSwitchTarget(item);
      return;
    }
    setRowSelection((prev) => ({ ...prev, [item.id]: true }));
  };

  const handleSelectAll = () => {
    if (hasSelection) {
      setRowSelection({});
      return;
    }
    setSelectAllOpen(true);
  };

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
    onRowSelect: handleRowSelect,
    onSelectAll: handleSelectAll,
    rowSelection,
    onRowSelectionChange: setRowSelection,
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

  const handleBatchApprove = () => {
    setBatchApproveOpen(true);
  };

  const handleBatchReject = () => {
    setBatchRejectOpen(true);
  };

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
                (ListFilterSheet ปรับ side เอง ผ่าน useIsMobile ภายในตัวมัน) */}
            <ViewSelector
              view={lf.view}
              snapshot={{ filters: lf.values, sort: lf.sortParam || undefined }}
            />
            <ListFilterSheet
              fields={prFilterFields}
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
                  onClick={handleBatchApprove}
                >
                  <CheckCircle2 aria-hidden="true" />
                  {tc("approve")}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBatchReject}
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
            tableLayout={{ checkbox: true, headerSticky: true }}
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

      <PrActionDialog
        open={!!approveTarget}
        onOpenChange={(open) =>
          !open &&
          !batchApprovePurchaseRequest.isPending &&
          setApproveTarget(null)
        }
        title={t("approveTitle")}
        description={t("approveConfirm", { prNo: approveTarget?.pr_no ?? "" })}
        confirmVariant="success"
        confirmLabel={tc("approve")}
        showMessage={false}
        isPending={batchApprovePurchaseRequest.isPending}
        onConfirm={() => {
          if (!approveTarget) return;
          batchApprovePurchaseRequest.mutate(
            { pr_ids: [approveTarget.id] },
            {
              onSuccess: () => {
                toast.success(tt("approveSuccess", { entity: t("entity") }));
                setApproveTarget(null);
              },
            },
          );
        }}
      />
      <PrActionDialog
        open={!!rejectTarget}
        onOpenChange={(open) =>
          !open &&
          !batchRejectPurchaseRequest.isPending &&
          setRejectTarget(null)
        }
        title={t("rejectTitle")}
        description={t("rejectConfirm", { prNo: rejectTarget?.pr_no ?? "" })}
        confirmVariant="destructive"
        confirmLabel={tc("reject")}
        isPending={batchRejectPurchaseRequest.isPending}
        onConfirm={(messages) => {
          if (!rejectTarget) return;
          batchRejectPurchaseRequest.mutate(
            { pr_ids: [rejectTarget.id], reject_message: messages[0] ?? "" },
            {
              onSuccess: () => {
                toast.success(tt("rejectSuccess", { entity: t("entity") }));
                setRejectTarget(null);
              },
            },
          );
        }}
      />
      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) =>
          !open && !deletePurchaseRequest.isPending && setDeleteTarget(null)
        }
        title={t("deleteTitle")}
        description={t("deleteConfirm", { prNo: deleteTarget?.pr_no ?? "" })}
        isPending={deletePurchaseRequest.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deletePurchaseRequest.mutate(deleteTarget.id, {
            onSuccess: () => {
              toast.success(tt("deleteSuccess", { entity: t("entity") }));
              setDeleteTarget(null);
            },
          });
        }}
      />

      <PrActionDialog
        open={batchApproveOpen}
        onOpenChange={(open) =>
          !open &&
          !batchApprovePurchaseRequest.isPending &&
          setBatchApproveOpen(false)
        }
        title={t("batchApproveTitle")}
        description={
          <div className="space-y-2">
            <p>{t("batchApproveConfirm", { count: selectedItems.length })}</p>
            <ul className="space-y-1 text-xs">
              {selectedItems.map((item) => (
                <li key={item.id}>{item.pr_no}</li>
              ))}
            </ul>
          </div>
        }
        confirmVariant="success"
        confirmLabel={tc("approve")}
        showMessage={false}
        isPending={batchApprovePurchaseRequest.isPending}
        onConfirm={() => {
          const selectedIds = selectedItems.map((item) => item.id);
          batchApprovePurchaseRequest.mutate(
            { pr_ids: selectedIds },
            {
              onSuccess: () => {
                toast.success(tt("approveSuccess", { entity: t("entity") }));
                setBatchApproveOpen(false);
                setRowSelection({});
              },
            },
          );
        }}
      />

      <PrActionDialog
        open={batchRejectOpen}
        onOpenChange={(open) =>
          !open &&
          !batchRejectPurchaseRequest.isPending &&
          setBatchRejectOpen(false)
        }
        title={t("batchRejectTitle")}
        description={
          <div className="space-y-2">
            <p>{t("batchRejectConfirm", { count: selectedItems.length })}</p>
            <ul className="space-y-1 text-xs">
              {selectedItems.map((item) => (
                <li key={item.id}>{item.pr_no}</li>
              ))}
            </ul>
          </div>
        }
        confirmVariant="destructive"
        confirmLabel={tc("reject")}
        isPending={batchRejectPurchaseRequest.isPending}
        onConfirm={(messages) => {
          const selectedIds = selectedItems.map((item) => item.id);
          batchRejectPurchaseRequest.mutate(
            { pr_ids: selectedIds, reject_message: messages[0] ?? "" },
            {
              onSuccess: () => {
                toast.success(tt("rejectSuccess", { entity: t("entity") }));
                setBatchRejectOpen(false);
                setRowSelection({});
              },
            },
          );
        }}
      />

      <ConfirmDialog
        open={!!switchTarget}
        onOpenChange={(open) => !open && setSwitchTarget(null)}
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
            switchTarget && groupOf(switchTarget) === "draft"
              ? t("selectDraft")
              : t("selectInProgress"),
        })}
        onConfirm={() => {
          if (!switchTarget) return;
          setRowSelection({ [switchTarget.id]: true });
          setSwitchTarget(null);
        }}
      />

      <PrStatusSelectDialog
        open={selectAllOpen}
        onOpenChange={setSelectAllOpen}
        draftCount={draftItems.length}
        inProgressCount={inProgressItems.length}
        onSelectDraft={() => {
          selectOnly(draftItems);
          setSelectAllOpen(false);
        }}
        onSelectInProgress={() => {
          selectOnly(inProgressItems);
          setSelectAllOpen(false);
        }}
      />

      <DeleteDialog
        open={batchDeleteOpen}
        onOpenChange={(open) =>
          !open &&
          !batchDeletePurchaseRequest.isPending &&
          setBatchDeleteOpen(false)
        }
        title={t("batchDeleteTitle")}
        description={t("batchDeleteConfirm", { count: selectedItems.length })}
        isPending={batchDeletePurchaseRequest.isPending}
        onConfirm={() => {
          // ลบทั้งหน้า = หน้านี้จะว่างหลัง refetch ต้องถอยไปหน้าก่อนหน้าเอง
          // ไม่งั้นคนใช้เจอหน้าเปล่าแล้วนึกว่าข้อมูลหายหมด
          const clearsPage = selectedItems.length === items.length;
          batchDeletePurchaseRequest.mutate(
            { ids: selectedItems.map((item) => item.id) },
            {
              onSuccess: () => {
                toast.success(tt("deleteSuccess", { entity: t("entity") }));
                setRowSelection({});
                setBatchDeleteOpen(false);
                if (clearsPage && table.getState().pagination.pageIndex > 0) {
                  table.previousPage();
                }
              },
            },
          );
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
