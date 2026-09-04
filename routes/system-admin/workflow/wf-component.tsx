import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
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
  useWorkflow,
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
import { StatusFilter } from "@/components/ui/status-filter";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { cn } from "@/lib/utils";
import { useWfTable } from "./wf-table";
import { useWfRowMutations } from "./use-wf-row-mutations";
import { STATUS_OPTIONS, WF_TYPE_OPTIONS } from "./wf-filter-options";
import { useListFilters } from "@/hooks/use-list-filters";
import { ListToolbar } from "@/components/list-filter/list-toolbar";
import { SaveViewDialog } from "@/components/list-filter/save-view-dialog";
import { LIST_PAGE_KEYS } from "@/constant/list-page-keys";
import type { FilterFieldDef } from "@/types/list-filter";
import { DocumentListHeader } from "@/components/share/document-list-header";

interface WorkflowComponentProps {
  /**
   * จำกัดรายการไว้ที่ชนิดเอกสารเดียว — ยิง `GET /config/{bu}/workflows/{slug}`
   * แทน endpoint รวม และซ่อนตัวกรองชนิดใบ (หน้านี้เป็นของชนิดนั้นอยู่แล้ว)
   */
  readonly docType?: WorkflowDocType;
}

export default function WorkflowComponent({
  docType,
}: WorkflowComponentProps = {}) {
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<WorkflowDto | null>(null);
  const deleteWorkflow = useDeleteWorkflow();
  const isMobile = useIsMobile();
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const t = useTranslations("systemAdmin.workflow");
  const tt = useTranslations("toast");
  const ts = useTranslations("status");
  const statusOptions = useMemo(
    () =>
      STATUS_OPTIONS.map((o) => ({
        ...o,
        label: o.value.endsWith("true") ? ts("active") : ts("inactive"),
      })),
    [ts],
  );
  const { params, search, setSearch, tableConfig } = useDataGridState();
  const { pendingId, toggleActive, duplicate } = useWfRowMutations();

  // STATUS_OPTIONS/WF_TYPE_OPTIONS มา createStatusFilterOptions/literal array —
  // label ไม่ใช่ i18n key ล้วน (status ยัง derive จาก ts() แต่ workflow_type เป็น
  // literal string จริง) จึงต้องใช้ control: "custom" ห่อ StatusFilter/
  // MultiSelectFilter ตรง ๆ แทน control ทั่วไป — เหมือน pattern ของ PO_TYPE/CN_TYPE
  // ใน Task 19
  const workflowFilterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        key: "filter",
        section: "listView.sectionDocument",
        control: "custom",
        labelKey: "common.status",
        render: (value, onChange) => (
          <StatusFilter
            value={value}
            onChange={onChange}
            options={statusOptions}
            className="w-full"
          />
        ),
      },
      ...(docType
        ? []
        : ([
            {
              key: "workflow_type",
              section: "listView.sectionDocument",
              control: "custom",
              labelKey: "systemAdmin.workflow.workflowType",
              render: (value, onChange) => (
                <MultiSelectFilter
                  value={value}
                  onChange={onChange}
                  placeholder={t("workflowType")}
                  options={WF_TYPE_OPTIONS}
                  className="w-full"
                />
              ),
            },
          ] satisfies FilterFieldDef[])),
    ],
    [statusOptions, t, docType],
  );

  const lf = useListFilters({
    pageKey: LIST_PAGE_KEYS.WORKFLOW,
    fields: workflowFilterFields,
  });

  const combinedParams = { ...params, filter: lf.filterParam };

  const useInfiniteScroll = !!isMobile;
  // หน้าที่จำกัดชนิดใบยิง endpoint ของชนิดนั้นตรง ๆ ไม่ใช่ดึงทั้งหมดมากรองทีหลัง
  // (docType มาจาก route จึงคงที่ตลอดอายุหน้า ลำดับ hook ไม่สลับ)
  const useListHook = docType ? WORKFLOW_LIST_HOOKS[docType] : useWorkflow;
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

  const gridMaxHeight =
    lf.activeFilters.length > 0
      ? "max-h-[calc(100vh-13rem-3rem)]"
      : "max-h-[calc(100vh-10rem-3rem)]";

  const table = useWfTable({
    workflows,
    totalRecords,
    params,
    tableConfig,
    onEdit: (workflow) => navigate(`/system-admin/workflow/${workflow.id}`),
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
            title={t("title")}
            description={t("desc")}
            count={totalRecords}
          />
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              size="sm"
              onClick={() => navigate("/system-admin/workflow/new")}
            >
              <Plus aria-hidden="true" />
              {t("newWorkflow")}
            </Button>
          </div>
        </div>

        <ListToolbar
          variant="row"
          search={search}
          onSearch={setSearch}
          lf={lf}
          fields={workflowFilterFields}
          onSaveViewClick={() => setSaveViewDialogOpen(true)}
        />
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
                  onEdit={(w) => navigate(`/system-admin/workflow/${w.id}`)}
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
            <DataGridContainer className={cn("flex flex-col", gridMaxHeight)}>
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
