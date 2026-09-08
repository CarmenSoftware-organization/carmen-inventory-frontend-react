import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Download, Loader2, MoreHorizontal, Plus, Printer } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import {
  DataGrid,
  DataGridContainer,
  DataGridScrollArea,
} from "@/components/ui/data-grid/data-grid";
import { cn } from "@/lib/utils";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination";
import { Button } from "@/components/ui/button";
import { useEquipment, useDeleteEquipment } from "./use-eq";
import { useEquipmentCategory } from "@/hooks/use-equipment-category";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGridPagination } from "@/hooks/use-grid-pagination";
import type { Equipment } from "@/types/equipment";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ErrorState } from "@/components/ui/error-state";
import EmptyComponent from "@/components/empty-component";
import { StatusFilter } from "@/components/ui/status-filter";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { DocumentListHeader } from "@/components/share/document-list-header";
import { CardSkeletonGrid } from "@/components/loader/card-skeleton";
import { useEquipmentTable } from "./use-eq-table";
import EqCard from "./eq-card";
import { useListFilters } from "@/hooks/use-list-filters";
import { ListToolbar } from "@/components/list-filter/list-toolbar";
import { SaveViewDialog } from "@/components/list-filter/save-view-dialog";
import { LIST_PAGE_KEYS } from "@/constant/list-page-keys";
import type { FilterFieldDef } from "@/types/list-filter";

/**
 * คอมโพเนนต์หลักของหน้ารายการอุปกรณ์ รองรับ list/grid view และ filter ตามหมวดหมู่
 * @returns React element ของรายการอุปกรณ์
 * @example
 * // ใช้ภายใน page.tsx ของโมดูล equipment
 * <EquipmentComponent />
 */
export default function EquipmentComponent() {
  const t = useTranslations("operationPlan.equipment");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const tt = useTranslations("toast");
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<Equipment | null>(null);
  const [displayMode, setDisplayMode] = useState<"list" | "grid">("list");
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const isMobile = useIsMobile();
  const deleteEquipment = useDeleteEquipment();
  const tfl = useTranslations("field");
  const { params, search, setSearch, tableConfig } = useDataGridState();
  const { data: categoryData } = useEquipmentCategory({ perpage: -1 });

  const isGridMode = isMobile || displayMode === "grid";

  const categories = new Map(
    (categoryData?.data ?? []).map((c) => [c.id, c.name]),
  );

  const categoryFilterOptions = useMemo(
    () =>
      (categoryData?.data ?? [])
        .filter((c) => c.is_active)
        .map((c) => ({ label: c.name, value: `category_id|string:${c.id}` })),
    [categoryData],
  );

  const STATUS_OPTIONS = useMemo(
    () => [
      { label: ts("active"), value: "is_active|bool:true" },
      { label: ts("inactive"), value: "is_active|bool:false" },
    ],
    [ts],
  );

  // category เป็นชื่อ literal string จริง (ไม่ใช่ i18n key) จึงต้องใช้
  // control: "custom" ห่อ MultiSelectFilter ตรง ๆ — เหมือน pattern ของ
  // PO_TYPE/CN_TYPE ใน Task 19
  const equipmentFilterFields = useMemo<FilterFieldDef[]>(
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
            options={STATUS_OPTIONS}
            className="w-full"
          />
        ),
      },
      {
        key: "category",
        section: "listView.sectionCategory",
        control: "custom",
        labelKey: "field.category",
        render: (value, onChange) => (
          <MultiSelectFilter
            value={value}
            onChange={onChange}
            placeholder={tfl("category")}
            options={categoryFilterOptions}
            className="w-full"
          />
        ),
      },
    ],
    [STATUS_OPTIONS, categoryFilterOptions, tfl],
  );

  const lf = useListFilters({
    pageKey: LIST_PAGE_KEYS.EQUIPMENT,
    fields: equipmentFilterFields,
  });

  const combinedParams = { ...params, filter: lf.filterParam };

  const { data, isLoading, error, refetch } = useEquipment(combinedParams, {
    enabled: !isGridMode,
  });

  const grid = useGridPagination<Equipment>({
    useListHook: useEquipment,
    params: combinedParams,
    enabled: isGridMode,
  });

  const equipments = isGridMode ? grid.items : (data?.data ?? []);
  const totalRecords = isGridMode
    ? grid.totalRecords
    : (data?.paginate?.total ?? 0);

  const table = useEquipmentTable({
    equipments,
    categories,
    totalRecords,
    params,
    tableConfig,
    onEdit: (equipment) =>
      navigate(`/operation-plan/equipment/${equipment.id}`),
    onDelete: setDeleteTarget,
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
              disabled
              title={tc("comingSoon")}
              className="hidden sm:inline-flex"
            >
              <Download aria-hidden="true" />
              {tc("export")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled
              title={tc("comingSoon")}
              className="hidden sm:inline-flex"
            >
              <Printer aria-hidden="true" />
              {tc("print")}
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/operation-plan/equipment/new")}
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
                <DropdownMenuItem disabled>
                  <Download aria-hidden="true" />
                  {tc("export")}
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <Printer aria-hidden="true" />
                  {tc("print")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <ListToolbar
          search={search}
          onSearch={setSearch}
          lf={lf}
          fields={equipmentFilterFields}
          onSaveViewClick={() => setSaveViewDialogOpen(true)}
          table={table}
          displayMode={displayMode}
          onDisplayModeChange={setDisplayMode}
        />
      </div>

      <div className="mt-3 space-y-3">
        {isGridMode && grid.isLoading && <CardSkeletonGrid />}
        {isGridMode && !grid.isLoading && equipments.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {equipments.map((item) => (
                <EqCard
                  key={item.id}
                  item={item}
                  categoryName={
                    item.category_id
                      ? categories.get(item.category_id)
                      : undefined
                  }
                  onEdit={(eq) =>
                    navigate(`/operation-plan/equipment/${eq.id}`)
                  }
                  onDelete={setDeleteTarget}
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
        {isGridMode && !grid.isLoading && equipments.length === 0 && (
          <EmptyComponent />
        )}

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
          !open && !deleteEquipment.isPending && setDeleteTarget(null)
        }
        title={t("deleteTitle")}
        description={t("deleteConfirm", { name: deleteTarget?.name ?? "" })}
        isPending={deleteEquipment.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteEquipment.mutate(deleteTarget.id, {
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
