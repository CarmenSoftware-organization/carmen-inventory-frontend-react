import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Package } from "lucide-react";
import { useTranslations } from "use-intl";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination";
import { useWastageReport } from "@/hooks/use-wastage-report";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import SearchInput from "@/components/search-input";
import { ErrorState } from "@/components/ui/error-state";
import EmptyComponent from "@/components/empty-component";
import { StatusFilter } from "@/components/ui/status-filter";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import DisplayTemplate from "@/components/display-template";
import { ActiveFilterBar } from "@/components/ui/active-filter-bar";
import { formatCurrency } from "@/lib/currency-utils";
import { WASTAGE_STATUS_OPTIONS } from "@/constant/wastage-reporting";
import { useWastageReportTable } from "./use-wr-table";
import { useListFilters } from "@/hooks/use-list-filters";
import { ViewSelector } from "@/components/list-filter/view-selector";
import { ListFilterSheet } from "@/components/list-filter/list-filter-sheet";
import { SaveViewDialog } from "@/components/list-filter/save-view-dialog";
import { LIST_PAGE_KEYS } from "@/constant/list-page-keys";
import type { FilterFieldDef } from "@/types/list-filter";

/**
 * หน้ารายการ lot สินค้าหมดอายุ/ใกล้หมดอายุ (wastage reporting) — read-only
 * มี search, filter สถานะ, summary มูลค่าเสี่ยง และ DataGrid กด GRN no
 * ไปหน้า GRN ต้นทางได้
 *
 * @returns คอมโพเนนต์หน้ารายการ wastage reporting
 * @example
 * import WrComponent from "./wr-component";
 * export function Component() { return <WrComponent />; }
 */
export default function WrComponent() {
  const navigate = useNavigate();
  const t = useTranslations("storeOperation.wastageReporting");
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const { params, search, setSearch, tableConfig } = useDataGridState();

  // WASTAGE_STATUS_OPTIONS label เป็น literal string ไม่ใช่ i18n key จึงห่อด้วย
  // control: "custom" แทน control: "status" (ตัวนั้นเรียก t() กับ label ตรง ๆ)
  const wrFilterFields = useMemo<FilterFieldDef[]>(
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
            options={WASTAGE_STATUS_OPTIONS}
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
  const summary = data?.summary;

  const table = useWastageReportTable({
    items,
    totalRecords,
    params,
    tableConfig,
    onOpenGrn: (item) =>
      navigate(`/procurement/goods-receive-note/${item.grn_id}`),
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
    >
      <div className="space-y-3">
        {/* summary จาก backend — ยอดรวมทั้งชุดข้อมูล ไม่ใช่แค่หน้าปัจจุบัน */}
        {summary && (
          <div className="bg-muted/30 flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Package className="size-3.5" aria-hidden="true" />
              {t("nItems", { count: summary.total_items })}
            </span>
            <span className="text-muted-foreground/40">|</span>
            <StatusDotBadge tone="destructive" size="xs">
              {t("nExpired", { count: summary.expired_count })}
            </StatusDotBadge>
            <StatusDotBadge tone="warning" size="xs">
              {t("nExpiring", { count: summary.expiring_count })}
            </StatusDotBadge>
            <span className="text-muted-foreground/40">|</span>
            <span className="font-semibold">
              {t("qtyAtRisk")}{" "}
              <span className="tabular-nums">
                {summary.total_qty_at_risk.toLocaleString()}
              </span>
            </span>
            <span className="font-semibold">
              {t("valueAtRisk")}{" "}
              <span className="tabular-nums">
                {formatCurrency(summary.total_value_at_risk)}
              </span>
            </span>
          </div>
        )}

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
      </div>

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
