
import { useState } from "react";
import { Download, MoreHorizontal, Play, Plus, Printer } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useRunningCode,
  useDeleteRunningCode,
  useInitRunningCode,
  useExportRunningCode,
} from "@/hooks/use-running-code";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useIsMobile } from "@/hooks/use-mobile";
import { CardSkeletonGrid } from "@/components/loader/card-skeleton";
import RunningCodeCard from "./running-code-card";
import type { RunningCode } from "@/types/running-code";
import SearchInput from "@/components/search-input";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ErrorState } from "@/components/ui/error-state";
import EmptyComponent from "@/components/empty-component";
import { ModuleTileIcon } from "@/components/ui/module-tile";
import { RunningCodeDialog } from "./running-code-dialog";
import { useRunningCodeTable } from "./use-running-code-table";
import { useGridPagination } from "@/hooks/use-grid-pagination";
import { Loader2 } from "lucide-react";

/**
 * Component หลักของหน้า Running Code รองรับเพิ่ม/แก้ไข/ลบ และ initialize ข้อมูลเริ่มต้น
 * @returns React element ของหน้า Running Code
 * @example
 * <RunningCodeComponent />
 */
export default function RunningCodeComponent() {
  const [deleteTarget, setDeleteTarget] = useState<RunningCode | null>(null);
  const deleteRunningCode = useDeleteRunningCode();
  const initRunningCode = useInitRunningCode();
  const { exportRunningCode, isExporting } = useExportRunningCode();
  const isMobile = useIsMobile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRunningCode, setEditRunningCode] = useState<RunningCode | null>(
    null,
  );
  const { params, search, setSearch, tableConfig } = useDataGridState();
  const useInfiniteScroll = !!isMobile;
  const { data, isLoading, error, refetch } = useRunningCode(params, {
    enabled: !useInfiniteScroll,
  });

  const grid = useGridPagination<RunningCode>({
    useListHook: useRunningCode,
    params,
    enabled: useInfiniteScroll,
  });
  const t = useTranslations("systemAdmin.runningCode");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");
  const tt = useTranslations("toast");

  const handleExport = async () => {
    try {
      const count = await exportRunningCode({
        params,
        columns: [
          { header: tfl("type"), value: (r) => r.type, width: 20 },
          { header: tfl("note"), value: (r) => r.note ?? "", width: 32 },
          {
            header: tfl("config"),
            value: (r) => JSON.stringify(r.config ?? {}),
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

  const runningCodes = useInfiniteScroll ? grid.items : (data?.data ?? []);
  const totalRecords = useInfiniteScroll
    ? grid.totalRecords
    : (data?.paginate?.total ?? 0);

  const table = useRunningCodeTable({
    runningCodes,
    totalRecords,
    params,
    tableConfig,
    onEdit: (runningCode) => {
      setEditRunningCode(runningCode);
      setDialogOpen(true);
    },
    onDelete: setDeleteTarget,
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
              variant="outline"
              onClick={handleExport}
              disabled={isExporting}
              className="hidden sm:inline-flex"
            >
              {isExporting ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Download aria-hidden="true" />
              )}
              {isExporting ? tc("exporting") : tc("export")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => globalThis.print()}
              className="hidden sm:inline-flex"
            >
              <Printer aria-hidden="true" />
              {tc("print")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                initRunningCode.mutate(undefined, {
                  onSuccess: () => toast.success(t("initSuccess")),
                })
              }
              disabled={initRunningCode.isPending}
              className="hidden sm:inline-flex"
            >
              <Play aria-hidden="true" />
              {initRunningCode.isPending ? t("initializing") : t("init")}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditRunningCode(null);
                setDialogOpen(true);
              }}
            >
              <Plus aria-hidden="true" />
              {t("add")}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-11 w-11 shrink-0 sm:hidden"
                  aria-label={tc("aria.moreActions")}
                >
                  <MoreHorizontal aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  disabled={initRunningCode.isPending}
                  onSelect={() =>
                    initRunningCode.mutate(undefined, {
                      onSuccess: () => toast.success(t("initSuccess")),
                    })
                  }
                >
                  <Play aria-hidden="true" />
                  {initRunningCode.isPending ? t("initializing") : t("init")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport} disabled={isExporting}>
                  {isExporting ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Download aria-hidden="true" />
                  )}
                  {isExporting ? tc("exporting") : tc("export")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => globalThis.print()}>
                  <Printer aria-hidden="true" />
                  {tc("print")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex w-full items-center gap-2">
          <div className="flex-1">
            <SearchInput defaultValue={search} onSearch={setSearch} />
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {isMobile ? (
          grid.isLoading ? (
            <CardSkeletonGrid />
          ) : grid.error ? (
            <ErrorState
              message={grid.error.message}
              onRetry={() => grid.refetch?.()}
            />
          ) : runningCodes.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-3">
                {runningCodes.map((rc, i) => (
                  <RunningCodeCard
                    key={rc.id}
                    item={rc}
                    index={i}
                    onEdit={(item) => {
                      setEditRunningCode(item);
                      setDialogOpen(true);
                    }}
                  />
                ))}
              </div>
              {grid.hasMore && (
                <div
                  ref={grid.sentinelRef}
                  className="flex justify-center py-4"
                >
                  {grid.isLoadingMore && (
                    <Loader2 className="text-muted-foreground size-5 animate-spin" />
                  )}
                </div>
              )}
            </>
          ) : (
            <EmptyComponent />
          )
        ) : (
          <DataGrid
            table={table}
            recordCount={totalRecords}
            isLoading={isLoading}
            tableLayout={{ headerSticky: true }}
            emptyMessage={<EmptyComponent />}
          >
            <DataGridContainer className="flex max-h-[calc(100vh-10rem-3rem)] flex-col">
              <div className="flex-1 overflow-auto">
                <DataGridTable />
              </div>
              <DataGridPagination />
            </DataGridContainer>
          </DataGrid>
        )}
      </div>

      <RunningCodeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        runningCode={editRunningCode}
      />

      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) =>
          !open && !deleteRunningCode.isPending && setDeleteTarget(null)
        }
        title={t("deleteTitle")}
        description={t("deleteConfirm", { name: deleteTarget?.type ?? "" })}
        isPending={deleteRunningCode.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteRunningCode.mutate(deleteTarget.id, {
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
