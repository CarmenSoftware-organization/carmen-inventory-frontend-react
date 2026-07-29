
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import {
  Columns3,
  Download,
  LayoutGrid,
  LayoutList,
  Loader2,
  MoreHorizontal,
  Printer,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGridPagination } from "@/hooks/use-grid-pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  useInventoryAdjustment,
  useDeleteInventoryAdjustment,
  useExportInventoryAdjustment,
} from "@/hooks/use-inventory-adjustment";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import {
  INVENTORY_ADJUSTMENT_BASE_PATH,
  getAdjustmentType,
  type InventoryAdjustment,
} from "@/types/inventory-adjustment";
import { IA_TYPE_ICON } from "@/constant/inventory-adjustment";
import SearchInput from "@/components/search-input";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ErrorState } from "@/components/ui/error-state";
import EmptyComponent from "@/components/empty-component";
import { StatusFilter } from "@/components/ui/status-filter";
import { DocumentListHeader } from "@/components/share/document-list-header";
import { ActiveFilterBar } from "@/components/ui/active-filter-bar";
import { DataGridColumnVisibility } from "@/components/ui/data-grid/data-grid-column-visibility";
import { useInventoryAdjustmentTable } from "./use-ia-table";
import IaCardList from "./ia-card-list";
import { useListFilters } from "@/hooks/use-list-filters";
import { ViewSelector } from "@/components/list-filter/view-selector";
import { ListFilterSheet } from "@/components/list-filter/list-filter-sheet";
import { SaveViewDialog } from "@/components/list-filter/save-view-dialog";
import { LIST_PAGE_KEYS } from "@/constant/list-page-keys";
import type { FilterFieldDef } from "@/types/list-filter";
import type { ViewScope } from "@/types/list-view";

export default function InventoryAdjustmentComponent() {
  const navigate = useNavigate();
  const t = useTranslations("inventoryManagement.inventoryAdjustment");
  const tc = useTranslations("common");
  const tt = useTranslations("toast");
  const ts = useTranslations("status");
  const tfl = useTranslations("field");
  const [deleteTarget, setDeleteTarget] = useState<InventoryAdjustment | null>(
    null,
  );
  const [displayMode, setDisplayMode] = useState<"list" | "grid">("list");
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const isMobile = useIsMobile();
  const isGridMode = isMobile || displayMode === "grid";
  // Infinite scroll สำหรับทุกโหมด grid (mobile auto + desktop card view)
  // โหมด list (desktop table) ยังคงใช้ pagination ปกติ
  const useInfiniteScroll = isGridMode;
  const deleteInventoryAdjustment = useDeleteInventoryAdjustment();
  const { exportInventoryAdjustment, isExporting } =
    useExportInventoryAdjustment();
  const { params, search, setSearch, tableConfig } = useDataGridState();

  // ของเดิมเก็บ type+status ปนกันใน "filter" ตัวเดียว (CSV) — แยกเป็น 2 URL param
  // ("filter" คง status, "adj_type" ใหม่คง type) ตามชื่อที่ตั้งไว้ในหน้า config
  // adjustment-type (adj_type) เพื่อให้แต่ละ field มี chip ลบเองอิสระได้ (ของเดิม
  // ลบได้ทีละตัวอยู่แล้วผ่าน activeFilters เดิม) ลิงก์เก่าที่มี "filter" รวมทั้งคู่
  // ยังกรองข้อมูลถูกอยู่ (ค่าดิบไหลเข้า filterParam ตรง ๆ) แค่ dropdown ในชีทอาจไม่
  // ขึ้น selected state ให้จนกว่าจะกดเลือกใหม่
  const iaFilterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        key: "adj_type",
        control: "custom",
        labelKey: "field.type",
        render: (value, onChange) => (
          <StatusFilter
            value={value}
            onChange={onChange}
            options={[
              { label: ts("stockIn"), value: "type|string:stock-in" },
              { label: ts("stockOut"), value: "type|string:stock-out" },
            ]}
            placeholder={tfl("type")}
            defaultLabel={ts("allType")}
            className="w-full"
          />
        ),
      },
      {
        key: "filter",
        control: "status",
        labelKey: "common.status",
        options: [
          { labelKey: "status.in_progress", value: "doc_status|string:in_progress" },
          { labelKey: "status.completed", value: "doc_status|string:completed" },
          { labelKey: "status.draft", value: "doc_status|string:draft" },
          { labelKey: "status.voided", value: "doc_status|string:voided" },
        ],
      },
    ],
    [ts, tfl],
  );

  const lf = useListFilters({
    pageKey: LIST_PAGE_KEYS.INVENTORY_ADJUSTMENT,
    fields: iaFilterFields,
  });

  const queryParams = { ...params, filter: lf.filterParam };

  /** replace semantics: ชื่อซ้ำใน scope เดียวกัน → update ของเดิม, ไม่ซ้ำ → saveAs ใหม่
   *  (mirror ของ PR pilot's handleSaveViewDialogSave) */
  const handleSaveViewDialogSave = async (name: string, scope: ViewScope) => {
    const list = scope === "bu" ? lf.view.buViews : lf.view.userViews;
    const existing = list.find((v) => v.name === name);
    const snapshot = { filters: lf.values, sort: lf.sortParam || undefined };
    if (existing) {
      await lf.view.update(existing.id, scope, snapshot);
      if (existing.id !== lf.view.current?.id) {
        lf.view.apply({
          ...existing,
          filters: snapshot.filters,
          sort: snapshot.sort,
        });
      }
    } else {
      const saved = await lf.view.saveAs(name, scope, snapshot);
      lf.view.apply(saved);
    }
  };

  const handleExport = async () => {
    try {
      const count = await exportInventoryAdjustment({
        params: queryParams,
        columns: [
          {
            header: tfl("adjustment"),
            value: (r) => r.si_no ?? r.so_no ?? "",
            width: 22,
          },
          {
            header: tfl("date"),
            value: (r) => r.si_date ?? r.so_date ?? "",
            width: 12,
          },
          {
            header: tfl("type"),
            value: (r) =>
              ts(getAdjustmentType(r) === "stock-in" ? "stockIn" : "stockOut"),
            width: 12,
          },
          {
            header: tfl("location"),
            value: (r) => r.location_name ?? "",
            width: 22,
          },
          {
            header: tfl("reason"),
            value: (r) => r.adjustment_type_name ?? "",
            width: 22,
          },
          {
            header: tfl("items"),
            value: (r) => r.item_count ?? 0,
            width: 8,
          },
          {
            header: tfl("total"),
            value: (r) => r.base_total_cost ?? 0,
            width: 14,
          },
          {
            header: tfl("status"),
            value: (r) => r.doc_status,
            width: 14,
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

  const { data, isLoading, error, refetch } = useInventoryAdjustment(
    queryParams,
    {
      enabled: !useInfiniteScroll,
    },
  );

  const grid = useGridPagination<InventoryAdjustment>({
    useListHook: useInventoryAdjustment,
    params: queryParams,
    enabled: useInfiniteScroll,
  });

  const items = useInfiniteScroll ? grid.items : (data?.data ?? []);
  const totalRecords = useInfiniteScroll
    ? grid.totalRecords
    : (data?.paginate?.total ?? 0);

  const navigateToItem = (item: InventoryAdjustment) =>
    navigate(
      `${INVENTORY_ADJUSTMENT_BASE_PATH}/${item.id}?type=${getAdjustmentType(item)}`,
    );

  const table = useInventoryAdjustmentTable({
    items,
    totalRecords,
    params,
    tableConfig,
    onEdit: navigateToItem,
    onDelete: setDeleteTarget,
  });

  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;

  return (
    <div className="pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="sticky top-0 z-20 space-y-3 pb-3 sm:static sm:pb-0">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <DocumentListHeader
            title={t("title")}
            description={t("desc")}
          />
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
            {(() => {
              const StockInIcon = IA_TYPE_ICON["stock-in"];
              const StockOutIcon = IA_TYPE_ICON["stock-out"];
              return (
                <>
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() =>
                      navigate(
                        `${INVENTORY_ADJUSTMENT_BASE_PATH}/new?type=stock-in`,
                      )
                    }
                  >
                    <StockInIcon aria-hidden="true" />
                    {t("addStockIn")}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      navigate(
                        `${INVENTORY_ADJUSTMENT_BASE_PATH}/new?type=stock-out`,
                      )
                    }
                  >
                    <StockOutIcon aria-hidden="true" />
                    {t("addStockOut")}
                  </Button>
                </>
              );
            })()}
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

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex w-full flex-1 items-center gap-2 sm:w-auto">
            <div className="flex-1 sm:flex-initial">
              <SearchInput defaultValue={search} onSearch={setSearch} />
            </div>
            <span className="bg-border hidden h-4 w-px sm:block" />
            <ViewSelector
              view={lf.view}
              snapshot={{ filters: lf.values, sort: lf.sortParam || undefined }}
            />
            <ListFilterSheet
              fields={iaFilterFields}
              values={lf.values}
              setValue={lf.setValue}
              onClearAll={lf.clearAll}
              onSaveClick={() => setSaveViewDialogOpen(true)}
              activeCount={lf.activeFilters.length}
            />
          </div>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            {displayMode === "list" && (
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
            )}
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

        {/* Active filter badges */}
        <ActiveFilterBar filters={lf.activeFilters} onClearAll={lf.clearAll} />
      </div>

      <div className="mt-3 space-y-3">
        {/* Content */}
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
              <div className="flex-1 overflow-auto">
                <DataGridTable />
              </div>
              <DataGridPagination />
            </DataGridContainer>
          </DataGrid>
        )}

        {isGridMode && (
          <>
            <IaCardList
              items={items}
              isLoading={useInfiniteScroll ? grid.isLoading : isLoading}
              onEdit={navigateToItem}
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

      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) =>
          !open && !deleteInventoryAdjustment.isPending && setDeleteTarget(null)
        }
        title={t("deleteTitle")}
        description={t("deleteConfirm", {
          documentNo: deleteTarget?.si_no ?? deleteTarget?.so_no ?? "",
        })}
        isPending={deleteInventoryAdjustment.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteInventoryAdjustment.mutate(
            {
              id: deleteTarget.id,
              type: getAdjustmentType(deleteTarget),
            },
            {
              onSuccess: () => {
                toast.success(tt("deleteSuccess", { entity: t("entity") }));
                setDeleteTarget(null);
              },
            },
          );
        }}
      />

      <SaveViewDialog
        open={saveViewDialogOpen}
        onOpenChange={setSaveViewDialogOpen}
        canManageBu={lf.view.canManageBu}
        existingNames={(s) =>
          (s === "bu" ? lf.view.buViews : lf.view.userViews).map((v) => v.name)
        }
        onSave={handleSaveViewDialogSave}
      />
    </div>
  );
}
