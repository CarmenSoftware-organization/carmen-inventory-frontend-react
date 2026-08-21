import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import { Columns3, LayoutGrid, LayoutList, Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGridPagination } from "@/hooks/use-grid-pagination";
import { toast } from "sonner";
import {
  DataGrid,
  DataGridContainer,
  DataGridScrollArea,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination";
import { Button } from "@/components/ui/button";
import {
  useCreditNote,
  useDeleteCreditNote,
  useExportCreditNote,
} from "@/hooks/use-credit-note";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { CN_STATUS_CONFIG, CN_TYPE_CONFIG } from "@/constant/credit-note";
import type { CreditNote } from "@/types/credit-note";
import SearchInput from "@/components/search-input";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ErrorState } from "@/components/ui/error-state";
import { ActiveFilterBar } from "@/components/ui/active-filter-bar";
import { cn } from "@/lib/utils";
import { DocumentListHeader } from "@/components/share/document-list-header";
import { DataGridColumnVisibility } from "@/components/ui/data-grid/data-grid-column-visibility";
import { useCnTable } from "./use-cn-table";
import CnCardList from "./cn-card-list";
import EmptyComponent from "@/components/empty-component";
import { DocumentListActions } from "@/components/share/document-list-actions";
import { useListFilters } from "@/hooks/use-list-filters";
import { ViewSelector } from "@/components/list-filter/view-selector";
import { ListFilterSheet } from "@/components/list-filter/list-filter-sheet";
import { SaveViewDialog } from "@/components/list-filter/save-view-dialog";
import { LIST_PAGE_KEYS } from "@/constant/list-page-keys";
import type { FilterFieldDef } from "@/types/list-filter";
import { useExportErrorToast } from "@/hooks/use-export-error-toast";

export default function CnComponent() {
  const t = useTranslations("procurement.creditNote");
  const tc = useTranslations("common");
  const exportErrorToast = useExportErrorToast();
  const tfl = useTranslations("field");
  const tt = useTranslations("toast");
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<CreditNote | null>(null);
  const [displayMode, setDisplayMode] = useState<"list" | "grid">("list");
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const isMobile = useIsMobile();
  const isGridMode = isMobile || displayMode === "grid";
  const useInfiniteScroll = !!isMobile;
  const deleteCn = useDeleteCreditNote();
  const { exportCreditNote, isExporting } = useExportCreditNote();
  const { params, search, setSearch, tableConfig } = useDataGridState({
    defaultSort: "cn_date:desc",
  });

  // ค่า option คงที่จาก config module-level — ไม่ผูก t() (label ไม่เคยแปลภาษาอยู่แล้ว
  // เดิม แม้ locale เป็นไทย — พฤติกรรมเดิมก่อน migrate ไม่แก้ในงานนี้)
  const cnTypeOptions = useMemo(
    () =>
      Object.entries(CN_TYPE_CONFIG).map(([key, cfg]) => ({
        label: cfg.label,
        value: `credit_note_type|string:${key}`,
      })),
    [],
  );

  const cnStatusOptions = useMemo(
    () =>
      // คอลัมน์จริงใน DB ชื่อ doc_status — prefix เดิม cn_status ไม่มีในตาราง CN
      // กรองเมื่อไร backend 500 ตลอด (แบบเดียวกับ grn_status ของ GRN)
      Object.entries(CN_STATUS_CONFIG).map(([key, cfg]) => ({
        label: cfg.label,
        value: `doc_status|string:${key}`,
      })),
    [],
  );

  const cnFilterFields = useMemo<FilterFieldDef[]>(
    () => [
      { key: "filter", control: "status", labelKey: "common.status" },
      {
        key: "cn_type",
        control: "custom",
        labelKey: "procurement.creditNote.type",
        render: (value, onChange) => (
          <MultiSelectFilter
            value={value}
            onChange={onChange}
            options={cnTypeOptions}
            className="w-full"
          />
        ),
      },
      {
        key: "cn_status",
        control: "custom",
        labelKey: "procurement.creditNote.status",
        render: (value, onChange) => (
          <MultiSelectFilter
            value={value}
            onChange={onChange}
            options={cnStatusOptions}
            className="w-full"
          />
        ),
      },
      {
        // ผู้สร้าง = คนเปิดใบลดหนี้ (คอลัมน์ Created By ใน list) — กรองที่ created_by_id
        key: "created_by",
        control: "requester",
        labelKey: "field.createdBy",
        fieldKey: "created_by_id",
      },
      {
        key: "cn_date",
        control: "date-range",
        labelKey: "field.docDate",
        fieldKey: "cn_date",
      },
    ],
    [cnTypeOptions, cnStatusOptions],
  );

  const lf = useListFilters({
    pageKey: LIST_PAGE_KEYS.CREDIT_NOTE,
    fields: cnFilterFields,
  });

  const queryParams = { ...params, filter: lf.filterParam };

  const { data, isLoading, error, refetch } = useCreditNote(queryParams, {
    enabled: !useInfiniteScroll,
  });

  const grid = useGridPagination<CreditNote>({
    useListHook: useCreditNote,
    params: queryParams,
    enabled: useInfiniteScroll,
  });

  const creditNotes = useInfiniteScroll ? grid.items : (data?.data ?? []);
  const totalRecords = useInfiniteScroll
    ? grid.totalRecords
    : (data?.paginate?.total ?? 0);

  const handleExport = async () => {
    try {
      const count = await exportCreditNote({
        params: queryParams,
        columns: [
          { header: tfl("cnNo"), value: (r) => r.cn_no, width: 22 },
          {
            header: tfl("vendor"),
            value: (r) => r.vendor_name ?? "",
            width: 26,
          },
          {
            header: tfl("type"),
            value: (r) => r.credit_note_type,
            width: 16,
          },
          { header: tfl("docDate"), value: (r) => r.cn_date, width: 12 },
          { header: tfl("status"), value: (r) => r.doc_status, width: 14 },
          {
            header: tfl("netAmount"),
            value: (r) => r.base_total_amount ?? 0,
            width: 16,
          },
          {
            header: tfl("totalAmount"),
            value: (r) => r.total_amount ?? 0,
            width: 16,
          },
          {
            header: tfl("currency"),
            value: (r) => r.currency_code ?? "",
            width: 10,
          },
          {
            header: tfl("createdBy"),
            value: (r) => r.audit?.created?.name ?? "",
            width: 22,
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

  const table = useCnTable({
    creditNotes,
    totalRecords,
    params,
    tableConfig,
    onEdit: (cn) => navigate(`/procurement/credit-note/${cn.id}`),
    onDelete: setDeleteTarget,
  });

  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  return (
    <div className="pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="sticky top-0 z-20 space-y-3 pb-3 sm:static sm:pb-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <DocumentListHeader title={t("title")} description={t("desc")} />
          <DocumentListActions
            onExport={handleExport}
            isExporting={isExporting}
            onAdd={() => navigate("/procurement/credit-note/new")}
            addLabel={t("add")}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex w-full flex-1 flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
            <div className="w-full sm:w-auto sm:flex-initial">
              <SearchInput defaultValue={search} onSearch={setSearch} />
            </div>
            <span className="bg-border hidden h-4 w-px sm:block" />
            <ViewSelector
              view={lf.view}
              snapshot={{ filters: lf.values, sort: lf.sortParam || undefined }}
            />
            <ListFilterSheet
              fields={cnFilterFields}
              values={lf.values}
              setValue={lf.setValue}
              onClearAll={lf.clearAll}
              onSaveClick={() => setSaveViewDialogOpen(true)}
              activeCount={lf.activeFilters.length}
            />
          </div>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
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

        <ActiveFilterBar filters={lf.activeFilters} onClearAll={lf.clearAll} />
      </div>

      <div className="mt-3 space-y-3">
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

        {isGridMode && useInfiniteScroll && (
          <>
            <CnCardList
              items={creditNotes}
              isLoading={grid.isLoading}
              onEdit={(cn) => navigate(`/procurement/credit-note/${cn.id}`)}
              onDelete={setDeleteTarget}
            />
            {grid.hasMore && (
              <div ref={grid.sentinelRef} className="flex justify-center py-4">
                {grid.isLoadingMore && (
                  <Loader2 className="text-muted-foreground size-5 animate-spin" />
                )}
              </div>
            )}
          </>
        )}

        {isGridMode && !useInfiniteScroll && (
          <DataGrid
            table={table}
            recordCount={totalRecords}
            isLoading={isLoading}
            tableLayout={{ headerSticky: true }}
          >
            <DataGridContainer
              className={cn(
                "flex flex-col",
                lf.activeFilters.length > 0
                  ? "max-h-[calc(100vh-13rem-3rem)]"
                  : "max-h-[calc(100vh-10rem-3rem)]",
              )}
            >
              <div className="flex-1 overflow-auto p-3">
                <CnCardList
                  items={creditNotes}
                  isLoading={isLoading}
                  onEdit={(cn) => navigate(`/procurement/credit-note/${cn.id}`)}
                  onDelete={setDeleteTarget}
                />
              </div>
              <DataGridPagination />
            </DataGridContainer>
          </DataGrid>
        )}
      </div>

      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) =>
          !open && !deleteCn.isPending && setDeleteTarget(null)
        }
        title={t("deleteTitle")}
        description={t("deleteConfirm", { cnNo: deleteTarget?.cn_no ?? "" })}
        isPending={deleteCn.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteCn.mutate(deleteTarget.id, {
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
