import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination";
import { Button } from "@/components/ui/button";
import {
  useWastageReport,
  useDeleteWastageReport,
} from "@/hooks/use-wastage-report";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import type { WastageReport } from "@/types/wastage-reporting";
import SearchInput from "@/components/search-input";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ErrorState } from "@/components/ui/error-state";
import EmptyComponent from "@/components/empty-component";
import { StatusFilter } from "@/components/ui/status-filter";
import DisplayTemplate from "@/components/display-template";
import { ActiveFilterBar } from "@/components/ui/active-filter-bar";
import { WASTAGE_REPORT_STATUS_OPTIONS } from "@/constant/wastage-reporting";
import { useWastageReportTable } from "./use-wr-table";
import { useListFilters } from "@/hooks/use-list-filters";
import { ViewSelector } from "@/components/list-filter/view-selector";
import { ListFilterSheet } from "@/components/list-filter/list-filter-sheet";
import { SaveViewDialog } from "@/components/list-filter/save-view-dialog";
import { LIST_PAGE_KEYS } from "@/constant/list-page-keys";
import type { FilterFieldDef } from "@/types/list-filter";

/**
 * คอมโพเนนต์หลักของหน้ารายการรายงานของเสีย
 * มี search, filter สถานะ, DataGrid และ DeleteDialog
 *
 * @returns คอมโพเนนต์หน้ารายการ WR
 * @example
 * // ใช้ใน app/(root)/store-operation/wastage-reporting/page.tsx
 * import WrComponent from "./wr-component";
 * export default function Page() { return <WrComponent />; }
 */
export default function WrComponent() {
  const navigate = useNavigate();
  const t = useTranslations("storeOperation.wastageReporting");
  const tt = useTranslations("toast");
  const [deleteTarget, setDeleteTarget] = useState<WastageReport | null>(null);
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const deleteWr = useDeleteWastageReport();
  const { params, search, setSearch, tableConfig } = useDataGridState();

  // WASTAGE_REPORT_STATUS_OPTIONS มา createStatusFilterOptions — label เป็น
  // literal string ล้วน ไม่ใช่ i18n key (เหมือนเดิมก่อน migrate) จึงต้องห่อด้วย
  // control: "custom" แทน control: "status" ทั่วไป (ตัวนั้นจะเรียก t() กับ label
  // ที่ไม่ใช่ key จริง ทำให้ console error) — เหมือน pattern ของ PO_TYPE/CN_TYPE ใน
  // Task 19
  const wrFilterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        key: "filter",
        control: "custom",
        labelKey: "common.status",
        render: (value, onChange) => (
          <StatusFilter
            value={value}
            onChange={onChange}
            options={WASTAGE_REPORT_STATUS_OPTIONS}
            className="w-full"
          />
        ),
      },
    ],
    [],
  );

  const lf = useListFilters({
    pageKey: LIST_PAGE_KEYS.WASTAGE_REPORTING,
    fields: wrFilterFields,
  });

  const queryParams = { ...params, filter: lf.filterParam };

  const { data, isLoading, error, refetch } = useWastageReport(queryParams);

  const items = data?.data ?? [];
  const totalRecords = data?.paginate?.total ?? 0;

  const table = useWastageReportTable({
    items,
    totalRecords,
    params,
    tableConfig,
    onEdit: (item) => navigate(`/store-operation/wastage-reporting/${item.id}`),
    onDelete: setDeleteTarget,
  });

  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  return (
    <DisplayTemplate
      title={t("title")}
      description={t("desc")}
      toolbar={
        <>
          <SearchInput defaultValue={search} onSearch={setSearch} />
          <ViewSelector
            view={lf.view}
            snapshot={{ filters: lf.values, sort: lf.sortParam || undefined }}
          />
          <ListFilterSheet
            fields={wrFilterFields}
            values={lf.values}
            setValue={lf.setValue}
            onClearAll={lf.clearAll}
            onSaveClick={() => setSaveViewDialogOpen(true)}
            activeCount={lf.activeFilters.length}
          />
        </>
      }
      filterBar={
        <ActiveFilterBar filters={lf.activeFilters} onClearAll={lf.clearAll} />
      }
      actions={
        <Button
          size="sm"
          onClick={() => navigate("/store-operation/wastage-reporting/new")}
        >
          <Plus aria-hidden="true" />
          {t("add")}
        </Button>
      }
    >
      <DataGrid
        table={table}
        recordCount={totalRecords}
        isLoading={isLoading}
        emptyMessage={<EmptyComponent />}
      >
        <DataGridContainer>
          <DataGridTable />
          <DataGridPagination />
        </DataGridContainer>
      </DataGrid>

      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) =>
          !open && !deleteWr.isPending && setDeleteTarget(null)
        }
        title={t("deleteTitle")}
        description={t("deleteConfirm", { wrNo: deleteTarget?.wr_no ?? "" })}
        isPending={deleteWr.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteWr.mutate(deleteTarget.id, {
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
    </DisplayTemplate>
  );
}
