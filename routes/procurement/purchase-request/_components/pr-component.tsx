
import { useState } from "react";
import { useRouter } from "@/lib/compat/navigation";
import { useTranslations } from "use-intl";
import { Check, Columns3, LayoutGrid, LayoutList, X, Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGridPagination } from "@/hooks/use-grid-pagination";
import { toast } from "sonner";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { cn } from "@/lib/utils";
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
  useExportPurchaseRequest,
} from "@/hooks/use-purchase-request";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useURL } from "@/hooks/use-url";
import type { PurchaseRequest } from "@/types/purchase-request";
import SearchInput from "@/components/search-input";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { VoidDialog } from "@/components/share/void-dialog";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/error-state";
import { ModuleTileIcon } from "@/components/ui/module-tile";
import { usePurchaseRequestTable } from "./pr-table";
import PrCardList from "./pr-card-list";
import { DataGridColumnVisibility } from "@/components/ui/data-grid/data-grid-column-visibility";
import { PrFilterSheet } from "./pr-filter-sheet";
import { ActiveFilterBar } from "@/components/ui/active-filter-bar";
import EmptyComponent from "@/components/empty-component";
import { lazy, Suspense } from "react";
import { useProfile } from "@/hooks/use-profile";
import { FilterStage } from "@/components/filter/filter-stage";
import { PrFilterStatus } from "./pr-filter-status";
import { usePrActiveFilters } from "./pr-active-filters";
import { PrDocumentActions } from "./pr-document-actions";

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
  const tfl = useTranslations("field");
  const tt = useTranslations("toast");
  const router = useRouter();
  const { defaultCurrencyCode } = useProfile();
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
  const [viewMode, setViewMode] = useState<"my-pending" | "all-document">(
    "my-pending",
  );
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [displayMode, setDisplayMode] = useState<"list" | "grid">("list");
  const isMobile = useIsMobile();
  const isGridMode = isMobile || displayMode === "grid";
  const deletePurchaseRequest = useDeletePurchaseRequest();
  const batchApprovePurchaseRequest = useBatchApprovePurchaseRequest();
  const batchRejectPurchaseRequest = useBatchRejectPurchaseRequest();
  const { exportPurchaseRequest, isExporting } = useExportPurchaseRequest();

  const {
    params,
    search,
    setSearch,
    filter,
    setFilter,
    stage,
    setStage,
    userId,
    setUserId,
    tableConfig,
  } = useDataGridState({
    defaultSort: viewMode === "my-pending" ? "pr_date:desc" : "pr_no:desc",
  });

  const [departmentId, setDepartmentId] = useURL("department");
  const [workflowId, setWorkflowId] = useURL("workflow");
  const [prDate, setPrDate] = useURL("pr_date");

  const { data: stages } = usePurchaseRequestWorkflowStages();
  const filterStr =
    [params.filter, departmentId, workflowId, prDate]
      .filter(Boolean)
      .join(";") || undefined;
  const queryParams = { ...params, filter: filterStr };

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

  const useInfiniteScroll = !!isMobile;

  const myPendingQuery = useMyPendingPurchaseRequest(queryParams, {
    enabled: !useInfiniteScroll,
  });
  const allDocumentQuery = usePurchaseRequest(queryParams, {
    enabled: !useInfiniteScroll,
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

  const { activeFilters, clearAllFilters } = usePrActiveFilters({
    filter,
    setFilter,
    stage,
    setStage,
    userId,
    setUserId,
    departmentId,
    setDepartmentId,
    workflowId,
    setWorkflowId,
    prDate,
    setPrDate,
  });

  const items = useInfiniteScroll ? grid.items : (data?.data ?? []);
  const totalRecords = useInfiniteScroll
    ? grid.totalRecords
    : (data?.paginate?.total ?? 0);

  const table = usePurchaseRequestTable({
    items,
    totalRecords,
    params,
    tableConfig,
    onEdit: (item) => router.push(`/procurement/purchase-request/${item.id}`),
    onDelete: setDeleteTarget,
    onApprove: setApproveTarget,
    onReject: setRejectTarget,
    isMyPending: viewMode === "my-pending",
  });

  const selectedRows = table.getSelectedRowModel().rows;
  const hasSelection = selectedRows.length > 0;

  const handleBatchApprove = () => {
    setBatchApproveOpen(true);
  };

  const handleBatchReject = () => {
    setBatchRejectOpen(true);
  };

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
          <PrDocumentActions
            onExport={handleExport}
            isExporting={isExporting}
            onAdd={() => setCreateDialogOpen(true)}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex w-full flex-1 flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
            <div className="w-full sm:w-auto sm:flex-initial">
              <SearchInput defaultValue={search} onSearch={setSearch} />
            </div>
            <span className="bg-border hidden h-4 w-px sm:block" />
            <div className="hidden items-center gap-2 sm:flex">
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
              {viewMode === "all-document" && (
                <div className="hidden sm:block">
                  <PrFilterStatus
                    value={filter}
                    onChange={setFilter}
                    className="w-26"
                  />
                </div>
              )}
              <div className="hidden sm:block">
                <FilterStage
                  value={stage}
                  onChange={setStage}
                  stages={stages ?? []}
                />
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <PrFilterSheet
              filter={filter}
              onFilterChange={setFilter}
              stage={stage}
              onStageChange={setStage}
              stages={stages}
              requesterId={userId}
              onRequesterIdChange={setUserId}
              departmentId={departmentId}
              onDepartmentIdChange={setDepartmentId}
              workflowId={workflowId}
              onWorkflowIdChange={setWorkflowId}
              prDate={prDate}
              onPrDateChange={setPrDate}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
            <div className="hidden sm:block">
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
            </div>
            <div className="hidden items-center rounded-md border sm:flex">
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
        {hasSelection && viewMode === "my-pending" && (
          <div className="flex items-center justify-end gap-2">
            <span className="text-muted-foreground text-xs">
              {selectedRows.length} {t("selected")}
            </span>
            <Button size="sm" variant="success" onClick={handleBatchApprove}>
              <Check aria-hidden="true" />
              {tc("approve")}
            </Button>
            <Button size="sm" variant="destructive" onClick={handleBatchReject}>
              <X aria-hidden="true" />
              {tc("reject")}
            </Button>
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
            <PrCardList
              items={items}
              isLoading={useInfiniteScroll ? grid.isLoading : isLoading}
              onEdit={(item) =>
                router.push(`/procurement/purchase-request/${item.id}`)
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

      <ConfirmDialog
        open={!!approveTarget}
        onOpenChange={(open) =>
          !open &&
          !batchApprovePurchaseRequest.isPending &&
          setApproveTarget(null)
        }
        title={t("approveTitle")}
        description={t("approveConfirm", { prNo: approveTarget?.pr_no ?? "" })}
        confirmText={tc("approve")}
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
              onError: (err) => toast.error(err.message),
            },
          );
        }}
      />
      <VoidDialog
        open={!!rejectTarget}
        onOpenChange={(open) =>
          !open &&
          !batchRejectPurchaseRequest.isPending &&
          setRejectTarget(null)
        }
        title={t("rejectTitle")}
        description={t("rejectConfirm", { prNo: rejectTarget?.pr_no ?? "" })}
        isPending={batchRejectPurchaseRequest.isPending}
        onConfirm={(reason) => {
          if (!rejectTarget) return;
          batchRejectPurchaseRequest.mutate(
            { pr_ids: [rejectTarget.id], reject_message: reason },
            {
              onSuccess: () => {
                toast.success(tt("rejectSuccess", { entity: t("entity") }));
                setRejectTarget(null);
              },
              onError: (err) => toast.error(err.message),
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
            onError: (err) => toast.error(err.message),
          });
        }}
      />

      <ConfirmDialog
        open={batchApproveOpen}
        onOpenChange={(open) =>
          !open &&
          !batchApprovePurchaseRequest.isPending &&
          setBatchApproveOpen(false)
        }
        title={t("batchApproveTitle")}
        description={
          <div className="space-y-2">
            <p>{t("batchApproveConfirm", { count: selectedRows.length })}</p>
            <ul className="space-y-1 text-xs">
              {selectedRows.map((row) => (
                <li key={row.original.id}>{row.original.pr_no}</li>
              ))}
            </ul>
          </div>
        }
        confirmText={tc("approve")}
        isPending={batchApprovePurchaseRequest.isPending}
        onConfirm={() => {
          const selectedIds = selectedRows.map((row) => row.original.id);
          batchApprovePurchaseRequest.mutate(
            { pr_ids: selectedIds },
            {
              onSuccess: () => {
                toast.success(tt("approveSuccess", { entity: t("entity") }));
                setBatchApproveOpen(false);
                table.resetRowSelection();
              },
              onError: (err) => toast.error(err.message),
            },
          );
        }}
      />

      <VoidDialog
        open={batchRejectOpen}
        onOpenChange={(open) =>
          !open &&
          !batchRejectPurchaseRequest.isPending &&
          setBatchRejectOpen(false)
        }
        title={t("batchRejectTitle")}
        description={
          <div className="space-y-2">
            <p>{t("batchRejectConfirm", { count: selectedRows.length })}</p>
            <ul className="space-y-1 text-xs">
              {selectedRows.map((row) => (
                <li key={row.original.id}>{row.original.pr_no}</li>
              ))}
            </ul>
          </div>
        }
        isPending={batchRejectPurchaseRequest.isPending}
        onConfirm={(reason) => {
          const selectedIds = selectedRows.map((row) => row.original.id);
          batchRejectPurchaseRequest.mutate(
            { pr_ids: selectedIds, reject_message: reason },
            {
              onSuccess: () => {
                toast.success(tt("rejectSuccess", { entity: t("entity") }));
                setBatchRejectOpen(false);
                table.resetRowSelection();
              },
              onError: (err) => toast.error(err.message),
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
    </div>
  );
}
