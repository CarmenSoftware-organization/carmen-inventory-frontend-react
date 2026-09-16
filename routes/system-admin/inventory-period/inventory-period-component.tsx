import { lazy, Suspense, useMemo, useState } from "react";
import {
  CalendarPlus,
  Download,
  MoreHorizontal,
  Plus,
  Printer,
} from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useInventoryPeriod,
  useGenerateNextInventoryPeriod,
  useExportInventoryPeriod,
} from "./use-inventory-period";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGridPagination } from "@/hooks/use-grid-pagination";
import { Loader2 } from "lucide-react";
import type { InventoryPeriod } from "@/types/inventory-period";
import { CardSkeletonGrid } from "@/components/loader/card-skeleton";
import InventoryPeriodCard from "./inventory-period-card";
import { INVENTORY_PERIOD_STATUS_OPTIONS, INVENTORY_PERIOD_STATUS_CONFIG } from "@/constant/inventory-period";
import { ErrorState } from "@/components/ui/error-state";
import EmptyComponent from "@/components/empty-component";
import { StatusFilter } from "@/components/ui/status-filter";
// แทน next/dynamic ด้วย React.lazy (code-split dialog chunk เหมือนเดิม)
const InventoryPeriodDialog = lazy(() =>
  import("./inventory-period-dialog").then((mod) => ({ default: mod.InventoryPeriodDialog })),
);
import { cn } from "@/lib/utils";
import { useInventoryPeriodTable } from "./use-inventory-period-table";
import { useListFilters } from "@/hooks/use-list-filters";
import { ListToolbar } from "@/components/list-filter/list-toolbar";
import { SaveViewDialog } from "@/components/list-filter/save-view-dialog";
import { LIST_PAGE_KEYS } from "@/constant/list-page-keys";
import type { FilterFieldDef } from "@/types/list-filter";
import { useExportErrorToast } from "@/hooks/use-export-error-toast";
import { DocumentListHeader } from "@/components/share/document-list-header";

export default function InventoryPeriodComponent() {
  const generateNext = useGenerateNextInventoryPeriod();
  const { exportInventoryPeriod, isExporting } = useExportInventoryPeriod();
  const isMobile = useIsMobile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const [editInventoryPeriod, setEditInventoryPeriod] = useState<InventoryPeriod | null>(null);
  const { params, search, setSearch, tableConfig } = useDataGridState();
  const t = useTranslations("systemAdmin.inventoryPeriod");
  const tc = useTranslations("common");
  const exportErrorToast = useExportErrorToast();
  const tt = useTranslations("toast");

  // INVENTORY_PERIOD_STATUS_OPTIONS มา createStatusFilterOptions — label เป็น literal
  // string ล้วน (เช่น "OPEN") ไม่ใช่ i18n key จึงต้องใช้ control: "custom" ห่อ
  // StatusFilter ตรง ๆ แทน control: "status" ทั่วไป — เหมือน pattern ของ
  // PO_TYPE/CN_TYPE ใน Task 19
  const inventoryPeriodFilterFields = useMemo<FilterFieldDef[]>(
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
            options={INVENTORY_PERIOD_STATUS_OPTIONS}
            className="w-full"
          />
        ),
      },
    ],
    [],
  );

  const lf = useListFilters({
    pageKey: LIST_PAGE_KEYS.PERIOD,
    fields: inventoryPeriodFilterFields,
  });

  const combinedParams = { ...params, filter: lf.filterParam };

  const useInfiniteScroll = !!isMobile;
  const { data, isLoading, error, refetch } = useInventoryPeriod(combinedParams, {
    enabled: !useInfiniteScroll,
  });

  const grid = useGridPagination<InventoryPeriod>({
    useListHook: useInventoryPeriod,
    params: combinedParams,
    enabled: useInfiniteScroll,
  });

  const handleExport = async () => {
    try {
      const count = await exportInventoryPeriod({
        params: combinedParams,
        columns: [
          { header: t("period"), value: (r) => r.period, width: 14 },
          {
            header: t("fiscalYear"),
            value: (r) => r.fiscal_year ?? 0,
            width: 12,
          },
          {
            header: t("fiscalMonth"),
            value: (r) => r.fiscal_month ?? 0,
            width: 12,
          },
          { header: t("startAt"), value: (r) => r.start_at ?? "", width: 14 },
          { header: t("endAt"), value: (r) => r.end_at ?? "", width: 14 },
          {
            header: t("status"),
            value: (r) => INVENTORY_PERIOD_STATUS_CONFIG[r.status]?.label ?? r.status,
            width: 12,
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

  const periods = useInfiniteScroll ? grid.items : (data?.data ?? []);
  const totalRecords = useInfiniteScroll
    ? grid.totalRecords
    : (data?.paginate?.total ?? 0);

  const table = useInventoryPeriodTable({
    periods,
    totalRecords,
    params,
    tableConfig,
    onEdit: (period) => {
      setEditInventoryPeriod(period);
      setDialogOpen(true);
    },
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
              variant="outline"
              disabled={generateNext.isPending}
              onClick={() => {
                generateNext.mutate(
                  { count: 12, start_day: 1 },
                  {
                    onSuccess: () =>
                      toast.success(
                        tt("createSuccess", { entity: t("entity") }),
                      ),
                  },
                );
              }}
              className="hidden sm:inline-flex"
            >
              <CalendarPlus aria-hidden="true" />
              {t("generateNext")}
            </Button>
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
              onClick={() => {
                setEditInventoryPeriod(null);
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
                  disabled={generateNext.isPending}
                  onSelect={() =>
                    generateNext.mutate(
                      { count: 12, start_day: 1 },
                      {
                        onSuccess: () =>
                          toast.success(
                            tt("createSuccess", { entity: t("entity") }),
                          ),
                      },
                    )
                  }
                >
                  <CalendarPlus aria-hidden="true" />
                  {t("generateNext")}
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

        <ListToolbar
          variant="row"
          search={search}
          onSearch={setSearch}
          lf={lf}
          fields={inventoryPeriodFilterFields}
          onSaveViewClick={() => setSaveViewDialogOpen(true)}
        />
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
          ) : periods.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-3">
                {periods.map((p) => (
                  <InventoryPeriodCard
                    key={p.id}
                    item={p}
                    onEdit={(period) => {
                      setEditInventoryPeriod(period);
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

      <Suspense fallback={null}>
        <InventoryPeriodDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          period={editInventoryPeriod}
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
