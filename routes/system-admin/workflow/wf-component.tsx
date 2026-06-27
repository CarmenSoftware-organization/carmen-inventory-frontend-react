
import { useState } from "react";
import { useNavigate } from "react-router";
import { Filter as FilterIcon, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useWorkflow, useDeleteWorkflow } from "@/hooks/use-workflow";
import type { WorkflowDto } from "@/types/workflows";
import { useGridPagination } from "@/hooks/use-grid-pagination";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useIsMobile } from "@/hooks/use-mobile";
import { useURL } from "@/hooks/use-url";
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
import {
  STATUS_OPTIONS,
  WF_TYPE_OPTIONS,
  buildActiveFilters,
} from "./wf-filter-options";

export default function WorkflowComponent() {
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<WorkflowDto | null>(null);
  const deleteWorkflow = useDeleteWorkflow();
  const isMobile = useIsMobile();
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const t = useTranslations("systemAdmin.workflow");
  const tc = useTranslations("common");
  const tt = useTranslations("toast");
  const { params, search, setSearch, filter, setFilter, tableConfig } =
    useDataGridState();
  const [wfType, setWfType] = useURL("workflow_type");
  const { pendingId, toggleActive, duplicate } = useWfRowMutations();

  const combinedFilter = [params.filter, wfType].filter(Boolean).join(",");
  const combinedParams = {
    ...params,
    filter: combinedFilter || undefined,
  };

  const useInfiniteScroll = !!isMobile;
  const { data, isLoading, error, refetch } = useWorkflow(combinedParams, {
    enabled: !useInfiniteScroll,
  });

  const grid = useGridPagination<WorkflowDto>({
    useListHook: useWorkflow,
    params: combinedParams,
    enabled: useInfiniteScroll,
  });

  const activeFilters = buildActiveFilters({
    filter,
    wfType,
    setFilter,
    setWfType,
  });

  const clearAllFilters = () => {
    setFilter("");
    setWfType("");
  };

  const workflows = useInfiniteScroll ? grid.items : (data?.data ?? []);
  const totalRecords = useInfiniteScroll
    ? grid.totalRecords
    : (data?.paginate?.total ?? 0);

  const gridMaxHeight =
    activeFilters.length > 0
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
          <div className="hidden sm:flex sm:items-center sm:gap-2">
            <StatusFilter
              value={filter}
              onChange={setFilter}
              options={STATUS_OPTIONS}
            />
            <MultiSelectFilter
              value={wfType}
              onChange={setWfType}
              placeholder={t("workflowType")}
              options={WF_TYPE_OPTIONS}
            />
          </div>
          <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                className="relative h-11 w-11 shrink-0 sm:hidden"
                aria-label={tc("aria.openFilters")}
              >
                <FilterIcon aria-hidden="true" />
                {activeFilters.length > 0 && (
                  <Badge
                    variant="secondary"
                    size="xs"
                    className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[0.625rem] tabular-nums"
                  >
                    {activeFilters.length}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[80vh]">
              <SheetHeader>
                <SheetTitle>{tc("filter")}</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-3 p-4">
                <StatusFilter
                  value={filter}
                  onChange={setFilter}
                  options={STATUS_OPTIONS}
                />
                <MultiSelectFilter
                  value={wfType}
                  onChange={setWfType}
                  placeholder={t("workflowType")}
                  options={WF_TYPE_OPTIONS}
                />
                <Button
                  variant="outline"
                  className="h-11 w-full"
                  onClick={() => setFilterSheetOpen(false)}
                >
                  {tc("done")}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Active filter badges */}
        <ActiveFilterBar filters={activeFilters} onClearAll={clearAllFilters} />
      </div>

      <div className="mt-3 space-y-3">
        {isMobile && grid.isLoading && <CardSkeletonGrid />}
        {isMobile && !grid.isLoading && grid.error && (
          <ErrorState
            message={grid.error.message}
            onRetry={() => grid.refetch?.()}
          />
        )}
        {isMobile && !grid.isLoading && !grid.error && workflows.length === 0 && (
          <EmptyComponent />
        )}
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
              <div className="flex-1 overflow-auto">
                <DataGridTable />
              </div>
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
            onError: (err) => toast.error(err.message),
          });
        }}
      />
    </div>
  );
}
