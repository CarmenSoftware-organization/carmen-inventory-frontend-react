
import { useState } from "react";
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
import { WASTAGE_REPORT_STATUS_OPTIONS } from "@/constant/wastage-reporting";
import { useWastageReportTable } from "./use-wr-table";

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
  const deleteWr = useDeleteWastageReport();
  const { params, search, setSearch, filter, setFilter, tableConfig } =
    useDataGridState();
  const { data, isLoading, error, refetch } = useWastageReport(params);

  const items = data?.data ?? [];
  const totalRecords = data?.paginate?.total ?? 0;

  const table = useWastageReportTable({
    items,
    totalRecords,
    params,
    tableConfig,
    onEdit: (item) =>
      navigate(`/store-operation/wastage-reporting/${item.id}`),
    onDelete: setDeleteTarget,
  });

  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;

  return (
    <DisplayTemplate
      title={t("title")}
      description={t("desc")}
      toolbar={
        <>
          <SearchInput defaultValue={search} onSearch={setSearch} />
          <StatusFilter
            value={filter}
            onChange={setFilter}
            options={WASTAGE_REPORT_STATUS_OPTIONS}
          />
        </>
      }
      actions={
        <Button
          size="sm"
          onClick={() =>
            navigate("/store-operation/wastage-reporting/new")
          }
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
            onError: (err) => toast.error(err.message),
          });
        }}
      />
    </DisplayTemplate>
  );
}
