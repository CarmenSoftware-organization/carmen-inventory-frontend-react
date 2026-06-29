
import { useState } from "react";
import { useTranslations } from "use-intl";
import { Plus } from "lucide-react";
import { useReactTable, getCoreRowModel } from "@tanstack/react-table";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ModuleTileIcon } from "@/components/ui/module-tile";
import EmptyComponent from "@/components/empty-component";
import { toast } from "sonner";
import { useBuCode } from "@/hooks/use-bu-code";
import {
  useDeleteReportSchedule,
  useReportSchedules,
} from "@/hooks/use-report-schedule";
import type { ReportSchedule } from "@/types/report-schedule";
import { CreateScheduleDialog } from "./create-schedule-dialog";
import { useScheduleTableColumns } from "./use-schedule-table";

export default function ScheduleComponent() {
  const t = useTranslations("reportSchedule");
  const buCode = useBuCode();

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
      const msg = err instanceof Error ? err.message : t("deleteConfirm");
      toast.error(msg);
    }
  };

  const columns = useScheduleTableColumns({ onDelete: setPendingDelete });

  const table = useReactTable({
    data: schedules,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ModuleTileIcon />
              <h1 className="text-lg font-semibold">{t("title")}</h1>
              {schedules.length > 0 && (
                <Badge variant="secondary" size="sm" className="tabular-nums">
                  {schedules.length.toLocaleString()}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm">{t("desc")}</p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 size-4" aria-hidden="true" />
            {t("createSchedule")}
          </Button>
        </div>

        <DataGrid
          table={table}
          recordCount={schedules.length}
          isLoading={isLoading}
          tableLayout={{ headerSticky: true }}
          emptyMessage={<EmptyComponent />}
        >
          <DataGridContainer className="flex max-h-[calc(100vh-13rem-3rem)] flex-col">
            <div className="flex-1 overflow-auto">
              <DataGridTable />
            </div>
          </DataGridContainer>
        </DataGrid>
      </div>

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
    </>
  );
}
