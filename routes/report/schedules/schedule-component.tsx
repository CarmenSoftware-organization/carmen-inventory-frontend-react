import { useState } from "react";
import { useTranslations } from "use-intl";
import { useReactTable, getCoreRowModel } from "@tanstack/react-table";
import {
  DataGrid,
  DataGridContainer,
  DataGridScrollArea,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import EmptyComponent from "@/components/empty-component";
import { toast } from "sonner";
import { useBuCode } from "@/hooks/use-bu-code";
import { useErrorToast } from "@/hooks/use-error-toast";
import {
  useDeleteReportSchedule,
  useReportSchedules,
} from "./use-report-schedule";
import type { ReportSchedule } from "@/types/report-schedule";
import { CreateScheduleDialog } from "./create-schedule-dialog";
import { useScheduleTableColumns } from "./use-schedule-table";
import { cn } from "@/lib/utils";
import { ListPageShell } from "@/components/share/list-page-shell";
import { listGridMaxH } from "@/components/share/list-grid-max-h";
import { DocumentListActions } from "@/components/share/document-list-actions";

export default function ScheduleComponent() {
  const t = useTranslations("reportSchedule");
  const buCode = useBuCode();
  const errorToast = useErrorToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ReportSchedule | null>(
    null,
  );

  const { data: schedules = [], isLoading, refetch } = useReportSchedules();
  const deleteMutation = useDeleteReportSchedule();

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync(pendingDelete.id);
      toast.success(t("deleteSuccess"));
      setPendingDelete(null);
    } catch (err) {
      // เดิมโยน err.message ดิบ และ fallback ยังเป็น t("deleteConfirm") ซึ่งเป็น
      // ประโยคถามยืนยัน ไม่ใช่ข้อความบอกว่าลบไม่สำเร็จ
      errorToast(err);
    }
  };

  const columns = useScheduleTableColumns({ onDelete: setPendingDelete });

  const table = useReactTable({
    data: schedules,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <ListPageShell
      title={t("title")}
      description={t("desc")}
      count={schedules.length}
      actions={
        <DocumentListActions
          onAdd={() => setCreateOpen(true)}
          addLabel={t("createSchedule")}
          hideExportPrint
        />
      }
    >
      <DataGrid
        table={table}
        recordCount={schedules.length}
        isLoading={isLoading}
        tableLayout={{ headerSticky: true }}
        emptyMessage={<EmptyComponent />}
      >
        <DataGridContainer className={cn("flex flex-col", listGridMaxH(false))}>
          <DataGridScrollArea>
            <DataGridTable />
          </DataGridScrollArea>
        </DataGridContainer>
      </DataGrid>

      <CreateScheduleDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        buCode={buCode ?? ""}
        onCreated={() => refetch()}
      />

      <DeleteDialog
        open={!!pendingDelete}
        onOpenChange={(v) => !v && setPendingDelete(null)}
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
        title={t("deleteConfirm")}
        description={pendingDelete?.name}
      />
    </ListPageShell>
  );
}
