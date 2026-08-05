import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import { Columns3, LayoutGrid, LayoutList, Loader2 } from "lucide-react";
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
  useStoreRequisition,
  useMyPendingStoreRequisition,
  useDeleteStoreRequisition,
  useExportStoreRequisition,
} from "@/hooks/use-store-requisition";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import type { StoreRequisition } from "@/types/store-requisition";
import SearchInput from "@/components/search-input";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ErrorState } from "@/components/ui/error-state";
import EmptyComponent from "@/components/empty-component";
import { ActiveFilterBar } from "@/components/ui/active-filter-bar";
import { DocumentListHeader } from "@/components/share/document-list-header";
import { DocumentListActions } from "@/components/share/document-list-actions";
import { useCreatableWorkflows } from "@/hooks/use-workflow";
import { WORKFLOW_TYPE } from "@/types/workflows";
import { dispatchPermissionDenied } from "@/components/permission-denied-dialog";
import { DataGridColumnVisibility } from "@/components/ui/data-grid/data-grid-column-visibility";
import { useURL } from "@/hooks/use-url";
import { FieldLabel } from "@/components/ui/field";
import { SrFilterStatus } from "./sr-filter-status";
import { SrFilterFromLocation } from "./sr-filter-from-location";
import { SrFilterToLocation } from "./sr-filter-to-location";
import { SrFilterType } from "./sr-filter-type";
import { useStoreRequisitionTable } from "./use-sr-table";
import SrCardList from "./sr-card-list";
import { useListFilters } from "@/hooks/use-list-filters";
import { ViewSelector } from "@/components/list-filter/view-selector";
import { ListFilterSheet } from "@/components/list-filter/list-filter-sheet";
import { SaveViewDialog } from "@/components/list-filter/save-view-dialog";
import { LIST_PAGE_KEYS } from "@/constant/list-page-keys";
import type { FilterFieldDef } from "@/types/list-filter";
import { useExportErrorToast } from "@/hooks/use-export-error-toast";

/**
 * คอมโพเนนต์หลักของหน้ารายการใบเบิกสินค้า
 * รองรับโหมด list/grid, my-pending/all-document, filter status, delete dialog
 * และ infinite scroll บนมือถือ
 *
 * @returns คอมโพเนนต์หน้ารายการ SR
 * @example
 * // ใช้ใน app/(root)/store-operation/store-requisition/page.tsx
 * import SrComponent from "./sr-component";
 * export default function Page() { return <SrComponent />; }
 */
export default function StoreRequisitionComponent() {
  const t = useTranslations("storeOperation.storeRequisition");
  const tc = useTranslations("common");
  const exportErrorToast = useExportErrorToast();
  const tfl = useTranslations("field");
  const ts = useTranslations("status");
  const tt = useTranslations("toast");
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<StoreRequisition | null>(
    null,
  );
  // ไม่มี workflow ให้เริ่มใบเลย = สร้างไม่ได้ ปุ่มจาง แต่กดแล้วยังบอกเหตุผล
  // (ซ่อนไปเลยพนักงานจะนึกว่าระบบเสีย)
  const { canCreate: canCreateSr } = useCreatableWorkflows(WORKFLOW_TYPE.SR);

  const handleAdd = () => {
    if (!canCreateSr) {
      dispatchPermissionDenied(undefined, t("noCreatableWorkflow"));
      return;
    }
    navigate("/store-operation/store-requisition/new");
  };
  const [viewModeParam, setViewMode] = useURL("view", {
    defaultValue: "my-pending",
  });
  const viewMode = viewModeParam as "my-pending" | "all-document";
  // setViewMode (จาก useURL) ได้ reference ใหม่ทุก render — เก็บไว้ใน ref กันไม่ให้
  // หลุดเข้า useMemo deps ของ srFilterFields ข้างล่าง (mirror ของ PR pilot) อัปเดต
  // ref ใน useEffect (หลัง render เสร็จ) แทนเขียนตรงกลาง render — mirror ของวิธีแก้
  // ใน transaction-component.tsx (Task 20 review finding 3: เขียนตรงกลาง render
  // ปลอดภัยในทางปฏิบัติเพราะอ่านผ่าน ref เฉพาะตอน user โต้ตอบ event handler เท่านั้น
  // แต่เป็น anti-pattern ที่ transaction ไฟล์เดียวกันเจอ eslint react-hooks/refs ฟ้อง
  // จริง — แก้ให้สอดคล้องกันทั้งสองไฟล์)
  const setViewModeRef = useRef(setViewMode);
  useEffect(() => {
    setViewModeRef.current = setViewMode;
  });
  const [displayMode, setDisplayMode] = useState<"list" | "grid">("list");
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const isMobile = useIsMobile();
  const isGridMode = isMobile || displayMode === "grid";
  // โหมดการ์ดไม่มีแถบ pagination ให้กด — เดิม infinite scroll ติดแค่บนมือถือ
  // ทำให้การ์ดบน desktop ค้างอยู่หน้าแรกหน้าเดียว ไม่มีทางดูรายการที่เหลือ
  // ผูกกับ isGridMode ไปเลย (ตามที่ inventory-adjustment / activity-log ใช้)
  const useInfiniteScroll = isGridMode;
  const deleteStoreRequisition = useDeleteStoreRequisition();
  const { exportStoreRequisition, isExporting } = useExportStoreRequisition();
  const { params, search, setSearch, tableConfig } = useDataGridState();

  // ของเดิม 4 popover (status/sr_type/from_location/to_location) แต่ละตัวมี
  // value/onChange เป็น URL filter string ของตัวเองอยู่แล้ว (คนละ URL param) —
  // ใช้ control: "custom" ห่อ component เดิมตรง ๆ ไม่ต้องเขียน UI ใหม่
  const srFilterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        // field แรกเป็น custom control ล้วน ๆ — ยืม slot ใน ListFilterSheet เพื่อวาง
        // toggle my-pending/all-document สำหรับมือถือเท่านั้น (ของเดิมอยู่ใน sheet
        // มือถือคู่กับปุ่ม inline บน desktop) ไม่มี value จริงจึงไม่ถูกนับใน
        // filterParam/activeFilters — key ตั้งไม่ให้ชนกับ "view" ของ tab บน URL จริง
        key: "view_mode_toggle",
        control: "custom",
        labelKey: "",
        // ไม่มี value จริง (ปุ่ม toggle ไม่ผ่าน setValue) — ประกาศ toClause ว่างชัดเจน
        // ให้ตรงกับ pattern ของ field หลอกตัวอื่น (เช่น transaction's dateRange)
        toClause: () => "",
        render: () => (
          <div className="space-y-1.5 sm:hidden">
            <FieldLabel className="text-xs">{tc("view")}</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant={viewMode === "my-pending" ? "default" : "outline"}
                onClick={() => setViewModeRef.current("my-pending")}
              >
                {t("myPending")}
              </Button>
              <Button
                size="sm"
                variant={viewMode === "all-document" ? "default" : "outline"}
                onClick={() => setViewModeRef.current("all-document")}
              >
                {t("allDocuments")}
              </Button>
            </div>
          </div>
        ),
      },
      {
        key: "sr_type",
        control: "custom",
        labelKey: "common.type",
        render: (value, onChange) => (
          <SrFilterType value={value} onChange={onChange} className="w-full" />
        ),
      },
      {
        key: "filter",
        control: "custom",
        labelKey: "common.status",
        render: (value, onChange) => (
          <SrFilterStatus
            value={value}
            onChange={onChange}
            className="w-full"
          />
        ),
      },
      {
        key: "from_location",
        control: "custom",
        labelKey: "field.fromLocation",
        render: (value, onChange) => (
          <SrFilterFromLocation
            value={value}
            onChange={onChange}
            className="w-full"
          />
        ),
      },
      {
        key: "to_location",
        control: "custom",
        labelKey: "field.toLocation",
        render: (value, onChange) => (
          <SrFilterToLocation
            value={value}
            onChange={onChange}
            className="w-full"
          />
        ),
      },
    ],
    [viewMode, t, tc],
  );

  const lf = useListFilters({
    pageKey: LIST_PAGE_KEYS.STORE_REQUISITION,
    fields: srFilterFields,
  });

  const queryParams = {
    ...params,
    filter: lf.filterParam,
    sort: params.sort ?? "sr_date:desc",
  };

  // gate แต่ละ query ตาม viewMode ด้วย — ก่อนหน้านี้ทั้งสอง query ยิงพร้อมกันทุก
  // ครั้งที่ search/filter/page เปลี่ยน ทั้งที่ render แค่อันเดียว (เปลือง network)
  const myPendingQuery = useMyPendingStoreRequisition(queryParams, {
    enabled: !useInfiniteScroll && viewMode === "my-pending",
  });
  const allDocumentQuery = useStoreRequisition(queryParams, {
    enabled: !useInfiniteScroll && viewMode !== "my-pending",
  });

  const { data, isLoading, error, refetch } =
    viewMode === "my-pending" ? myPendingQuery : allDocumentQuery;

  const activeListHook =
    viewMode === "my-pending"
      ? useMyPendingStoreRequisition
      : useStoreRequisition;

  const grid = useGridPagination<StoreRequisition>({
    useListHook: activeListHook,
    params: queryParams,
    enabled: useInfiniteScroll,
    // my-pending and all-document share identical queryParams; without this the
    // accumulated items from one view would carry over when toggling to the other.
    resetKey: viewMode,
  });

  const items = useInfiniteScroll ? grid.items : (data?.data ?? []);
  const totalRecords = useInfiniteScroll
    ? grid.totalRecords
    : (data?.paginate?.total ?? 0);
  // โหมดการ์ดยิง query ผ่าน useGridPagination — error/refetch ต้องเอาจากตัวนั้น
  // ไม่ใช่ query ที่ถูก disable ไว้ ไม่งั้นโหลดพลาดในโหมดการ์ดจะเงียบ จอว่างเปล่า
  const listError = useInfiniteScroll ? grid.error : error;
  const listRefetch = useInfiniteScroll ? grid.refetch : refetch;

  const handleExport = async () => {
    try {
      const count = await exportStoreRequisition({
        params: queryParams,
        viewMode,
        columns: [
          { header: tfl("srNo"), value: (r) => r.sr_no, width: 22 },
          { header: tfl("type"), value: (r) => r.sr_type, width: 12 },
          { header: tfl("date"), value: (r) => r.sr_date, width: 12 },
          {
            header: tfl("fromTo"),
            value: (r) =>
              `${r.from_location_name ?? ""} → ${r.to_location_name ?? ""}`,
            width: 32,
          },
          {
            header: tfl("requester"),
            value: (r) => r.requestor_name ?? "",
            width: 22,
          },
          {
            header: tfl("department"),
            value: (r) => r.department_name ?? "",
            width: 22,
          },
          {
            header: tfl("status"),
            value: (r) => ts(r.doc_status),
            width: 14,
          },
          {
            header: tfl("workflowStage"),
            value: (r) => r.workflow_name ?? "",
            width: 18,
          },
          {
            header: tfl("currentStage"),
            value: (r) => r.workflow_current_stage ?? "",
            width: 18,
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
      exportErrorToast(err);
    }
  };

  const table = useStoreRequisitionTable({
    items,
    totalRecords,
    params,
    tableConfig,
    onEdit: (item) => navigate(`/store-operation/store-requisition/${item.id}`),
    onDelete: setDeleteTarget,
  });

  if (listError)
    return <ErrorState error={listError} onRetry={() => listRefetch?.()} />;

  return (
    <div className="pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="sticky top-0 z-20 space-y-3 pb-3 sm:static sm:pb-0">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <DocumentListHeader title={t("title")} description={t("desc")} />
          <DocumentListActions
            onExport={handleExport}
            isExporting={isExporting}
            onAdd={handleAdd}
            addLabel={t("add")}
            addDisabled={!canCreateSr}
          />
        </div>

        {/* Toolbar — ระยะระหว่างกลุ่ม (ค้นหา/กรอง vs มุมมอง) กว้างกว่าระยะในกลุ่ม
            ไม่งั้นจอแคบลงมาสองก้อนชนกันที่ 8px แล้วอ่านเป็นแถวเดียวกันหมด */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <div className="flex w-full min-w-0 items-center gap-2">
            <div className="flex-1 sm:flex-initial">
              <SearchInput defaultValue={search} onSearch={setSearch} />
            </div>
            <span className="bg-border hidden h-4 w-px sm:block" />
            {/* กรองเยอะจนไม่พอ ให้ตัวกรองขึ้นบรรทัดใหม่กันเอง อย่าไปดัน toggle ตก */}
            <div className="hidden sm:flex sm:min-w-0 sm:flex-wrap sm:items-center sm:gap-2">
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
            </div>
            <ViewSelector
              view={lf.view}
              snapshot={{ filters: lf.values, sort: lf.sortParam || undefined }}
            />
            <ListFilterSheet
              fields={srFilterFields}
              values={lf.values}
              setValue={lf.setValue}
              onClearAll={lf.clearAll}
              onSaveClick={() => setSaveViewDialogOpen(true)}
              activeCount={lf.activeFilters.length}
            />
          </div>
          {/* กลุ่มขวา = เครื่องมือมุมมอง อยู่บรรทัดใต้ช่องค้นหา ชิดขวา (ml-auto)
              ปิดท้ายด้วย toggle list/grid ให้เป็นของขวาสุดเสมอ */}
          <div className="ml-auto hidden shrink-0 items-center gap-2 sm:flex">
            {displayMode === "list" && (
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
            )}
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
            // 11 คอลัมน์ ยัดให้พอดีจอทำให้ทุกช่องถูกบีบจนอ่านไม่ออก — min-w-max
            // ให้ตารางกว้างเท่าผลรวม size ของคอลัมน์ที่เปิดอยู่ แล้วเลื่อนแนวนอนเอา
            // (ผูกกับ column visibility เอง ไม่ต้องฮาร์ดโค้ดตัวเลข)
            tableClassNames={{ base: "min-w-max" }}
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
              {/* pb-3 กันแถบเลื่อนทับแถวสุดท้าย + แถบบางจาง ตามที่ PO/PR/GRN ใช้ */}
              <div className="flex-1 [scrollbar-width:thin] [scrollbar-color:var(--scrollbar-thumb)_transparent] overflow-auto pb-3">
                <DataGridTable />
              </div>
              <DataGridPagination />
            </DataGridContainer>
          </DataGrid>
        )}

        {isGridMode && (
          <>
            <SrCardList
              items={items}
              isLoading={useInfiniteScroll ? grid.isLoading : isLoading}
              onEdit={(item) =>
                navigate(`/store-operation/store-requisition/${item.id}`)
              }
              onDelete={setDeleteTarget}
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
          !open && !deleteStoreRequisition.isPending && setDeleteTarget(null)
        }
        title={t("deleteTitle")}
        description={t("deleteConfirm", { srNo: deleteTarget?.sr_no ?? "" })}
        isPending={deleteStoreRequisition.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteStoreRequisition.mutate(deleteTarget.id, {
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
