import { useState } from "react";
import { useNavigate } from "react-router";
import { listReturnState } from "@/hooks/use-list-return";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import {
  DataGrid,
  DataGridContainer,
  DataGridScrollArea,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination";
import { Button } from "@/components/ui/button";
import {
  WORKFLOW_LIST_HOOKS,
  type WorkflowDocType,
} from "@/hooks/use-workflow";
import { useDeleteWorkflow } from "./use-wf-mutations";
import type { WorkflowDto } from "@/types/workflows";
import { useGridPagination } from "@/hooks/use-grid-pagination";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useIsMobile } from "@/hooks/use-mobile";
import { CardSkeletonGrid } from "@/components/loader/card-skeleton";
import WfCard from "./wf-card";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ErrorState } from "@/components/ui/error-state";
import EmptyComponent from "@/components/empty-component";
import { useWfTable } from "./use-wf-table";
import { useWfRowMutations } from "./use-wf-row-mutations";
import { DocumentListHeader } from "@/components/share/document-list-header";
import SearchInput from "@/components/search-input";

interface WorkflowComponentProps {
  readonly docType: WorkflowDocType;
}

const TITLE_KEY: Record<WorkflowDocType, string> = {
  "purchase-request": "titlePurchaseRequest",
  "purchase-order": "titlePurchaseOrder",
  "store-requisition": "titleStoreRequisition",
};

export default function WorkflowComponent({
  docType,
}: WorkflowComponentProps) {
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<WorkflowDto | null>(null);
  const deleteWorkflow = useDeleteWorkflow();
  const isMobile = useIsMobile();
  const t = useTranslations("systemAdmin.workflow");
  const tt = useTranslations("toast");
  const { params, search, setSearch, tableConfig } = useDataGridState();
  const { pendingId, toggleActive, duplicate } = useWfRowMutations();

  const combinedParams = params;

  const useInfiniteScroll = !!isMobile;
  // ยิง endpoint ของชนิดนั้นตรง ๆ ไม่ใช่ดึงทั้งหมดมากรองทีหลัง (docType มาจาก
  // route จึงคงที่ตลอดอายุหน้า ลำดับ hook ไม่สลับ)
  const useListHook = WORKFLOW_LIST_HOOKS[docType];
  const { data, isLoading, error, refetch } = useListHook(combinedParams, {
    enabled: !useInfiniteScroll,
  });

  const grid = useGridPagination<WorkflowDto>({
    useListHook,
    params: combinedParams,
    enabled: useInfiniteScroll,
  });

  const workflows = useInfiniteScroll ? grid.items : (data?.data ?? []);
  const totalRecords = useInfiniteScroll
    ? grid.totalRecords
    : (data?.paginate?.total ?? 0);

  const table = useWfTable({
    workflows,
    totalRecords,
    params,
    tableConfig,
    onEdit: (workflow) =>
      navigate(`/system-admin/workflow/${workflow.id}`, listReturnState()),
    onDelete: setDeleteTarget,
    onToggleActive: toggleActive,
    onDuplicate: duplicate,
    pendingId,
  });

  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  return (
    <div className="pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="sticky top-0 z-20 space-y-3 pb-3 sm:static sm:pb-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <DocumentListHeader
            title={t(TITLE_KEY[docType])}
            description={t("desc")}
            count={totalRecords}
          />
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              size="sm"
              onClick={() =>
                navigate(
                  `/system-admin/workflow/new?type=${docType}`,
                  listReturnState(),
                )
              }
            >
              <Plus aria-hidden="true" />
              {t("newWorkflow")}
            </Button>
          </div>
        </div>

        <SearchInput defaultValue={search} onSearch={setSearch} />
      </div>

      <div className="mt-3 space-y-3">
        {isMobile && grid.isLoading && <CardSkeletonGrid />}
        {isMobile && !grid.isLoading && grid.error && (
          <ErrorState
            message={grid.error.message}
            onRetry={() => grid.refetch?.()}
          />
        )}
        {isMobile &&
          !grid.isLoading &&
          !grid.error &&
          workflows.length === 0 && <EmptyComponent />}
        {isMobile && !grid.isLoading && !grid.error && workflows.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-3">
              {workflows.map((wf, i) => (
                <WfCard
                  key={wf.id}
                  item={wf}
                  index={i}
                  onEdit={(w) =>
                    navigate(
                      `/system-admin/workflow/${w.id}`,
                      listReturnState(),
                    )
                  }
                  onToggleActive={toggleActive}
                  onDuplicate={duplicate}
                  onDelete={setDeleteTarget}
                  isPending={pendingId === wf.id}
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
        {!isMobile && (
          <DataGrid
            table={table}
            recordCount={totalRecords}
            isLoading={isLoading}
            tableLayout={{ headerSticky: true }}
            emptyMessage={<EmptyComponent />}
          >
            <DataGridContainer className="flex max-h-[calc(100vh-10rem-3rem)] flex-col">
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
          !open && !deleteWorkflow.isPending && setDeleteTarget(null)
        }
        title={t("deleteTitle")}
        description={t("deleteConfirm", { name: deleteTarget?.name ?? "" })}
        isPending={deleteWorkflow.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteWorkflow.mutate(deleteTarget.id, {
            onSuccess: () => {
              toast.success(tt("deleteSuccess", { entity: t("entity") }));
              setDeleteTarget(null);
            },
          });
        }}
      />
    </div>
  );
}
