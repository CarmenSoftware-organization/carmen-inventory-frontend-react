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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWorkflow, useDeleteWorkflow } from "@/hooks/use-workflow";
import type { WorkflowDto } from "@/types/workflows";
import { useGridPagination } from "@/hooks/use-grid-pagination";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useIsMobile } from "@/hooks/use-mobile";
import { CardSkeletonGrid } from "@/components/loader/card-skeleton";
import WfCard from "./wf-card";
import SearchInput from "@/components/search-input";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ErrorState } from "@/components/ui/error-state";
import EmptyComponent from "@/components/empty-component";
import { ModuleTileIcon } from "@/components/ui/module-tile";
import { StatusFilter } from "@/components/ui/status-filter";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { ActiveFilterBar } from "@/components/ui/active-filter-bar";
import { cn } from "@/lib/utils";
import { useWfTable } from "./wf-table";
import { useWfRowMutations } from "./use-wf-row-mutations";
import { STATUS_OPTIONS, WF_TYPE_OPTIONS } from "./wf-filter-options";
import { useListFilters } from "@/hooks/use-list-filters";
import { ViewSelector } from "@/components/list-filter/view-selector";
import { ListFilterSheet } from "@/components/list-filter/list-filter-sheet";
import { SaveViewDialog } from "@/components/list-filter/save-view-dialog";
import { LIST_PAGE_KEYS } from "@/constant/list-page-keys";
import type { FilterFieldDef } from "@/types/list-filter";

export default function WorkflowComponent() {
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
      {
        key: "workflow_type",
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
    ],
    [statusOptions, t],
  );

  const lf = useListFilters({
    pageKey: LIST_PAGE_KEYS.WORKFLOW,
    fields: workflowFilterFields,
  });

  const combinedParams = { ...params, filter: lf.filterParam };

  const useInfiniteScroll = !!isMobile;
  const { data, isLoading, error, refetch } = useWorkflow(combinedParams, {
    enabled: !useInfiniteScroll,
  });

  const grid = useGridPagination<WorkflowDto>({
    useListHook: useWorkflow,
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
            <p className="text-muted-foreground text-sm">{t("desc")}</p>
          </div>
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

        <div className="flex w-full items-center gap-2">
          <div className="flex-1">
            <SearchInput defaultValue={search} onSearch={setSearch} />
          </div>
          <span className="bg-border hidden h-4 w-px sm:block" />
          <ViewSelector
            view={lf.view}
            snapshot={{ filters: lf.values, sort: lf.sortParam || undefined }}
          />
          <ListFilterSheet
            fields={workflowFilterFields}
            values={lf.values}
            setValue={lf.setValue}
            onClearAll={lf.clearAll}
            onSaveClick={() => setSaveViewDialogOpen(true)}
            activeCount={lf.activeFilters.length}
          />
        </div>

        {/* Active filter badges */}
        <ActiveFilterBar filters={lf.activeFilters} onClearAll={lf.clearAll} />
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
