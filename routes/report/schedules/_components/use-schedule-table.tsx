
import { Trash2 } from "lucide-react";
import { useTranslations } from "use-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ReportFormat, ReportSchedule } from "@/types/report-schedule";

const FORMAT_LABELS: Record<ReportFormat, string> = {
  REPORT_FORMAT_PDF: "PDF",
  REPORT_FORMAT_EXCEL: "Excel",
  REPORT_FORMAT_CSV: "CSV",
  REPORT_FORMAT_JSON: "JSON",
  REPORT_FORMAT_VIEWER_URL: "Viewer Link",
  viewer_url: "Viewer Link",
  pdf: "PDF",
  excel: "Excel",
  csv: "CSV",
  json: "JSON",
};

const WEEKDAY_SHORT = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

/**
 * อ่าน `schedule_config` แปลงเป็นข้อความ "Daily/Weekly/Monthly @ HH:mm"
 * ถ้าไม่มี config ใช้ cron expression เป็น fallback
 *
 * @param row - one ReportSchedule
 * @returns label string
 */
function formatScheduleConfig(row: ReportSchedule): string {
  const cfg = row.schedule_config;
  if (!cfg) return row.cron_expression;
  const { frequency, time } = cfg;
  if (frequency === "daily") return `Daily @ ${time}`;
  if (frequency === "weekly") {
    const days = (cfg.days_of_week ?? [])
      .map((d) => WEEKDAY_SHORT[d])
      .join(", ");
    return `Weekly ${days} @ ${time}`;
  }
  if (frequency === "monthly") {
    const days = (cfg.days_of_month ?? []).join(", ");
    return `Monthly day ${days} @ ${time}`;
  }
  return row.cron_expression;
}

interface UseScheduleTableOptions {
  readonly onDelete: (schedule: ReportSchedule) => void;
}

/**
 * สร้าง column definitions ของหน้า Report Schedules
 *
 * แยกออกจาก `schedule-component.tsx` ให้ตรง pattern `use-{module}-table`
 * ของโปรเจกต์ component ภายนอกเอา columns ไปป้อน `useReactTable` ต่อ
 *
 * @param options.onDelete - callback ตอนกดปุ่ม trash บนแถว
 * @returns array ของ `ColumnDef<ReportSchedule>`
 * @example
 * const columns = useScheduleTableColumns({ onDelete: setPendingDelete });
 * const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });
 */
export function useScheduleTableColumns({
  onDelete,
}: UseScheduleTableOptions): ColumnDef<ReportSchedule>[] {
  const t = useTranslations("reportSchedule");
  const tc = useTranslations("common");
  const ts = useTranslations("status");

  return [
    {
      id: "index",
      header: "#",
      cell: ({ row }) => row.index + 1,
      size: 50,
    },
    { accessorKey: "name", header: t("name") },
    { accessorKey: "report_type", header: t("reportType") },
    {
      accessorKey: "format",
      header: t("format"),
      cell: ({ getValue }) => FORMAT_LABELS[getValue<ReportFormat>()] ?? "-",
      size: 80,
    },
    {
      accessorKey: "cron_expression",
      header: t("frequency"),
      cell: ({ row }) => formatScheduleConfig(row.original),
      size: 200,
    },
    {
      accessorKey: "is_active",
      header: t("active"),
      cell: ({ getValue }) => (
        <Badge
          variant={getValue<boolean>() ? "default" : "secondary"}
          size="sm"
        >
          {getValue<boolean>() ? ts("active") : ts("inactive")}
        </Badge>
      ),
      size: 90,
    },
    {
      accessorKey: "next_run_at",
      header: t("nextRun"),
      cell: ({ getValue }) => {
        const v = getValue<string>();
        return v ? new Date(v).toLocaleString() : "-";
      },
    },
    {
      accessorKey: "last_run_at",
      header: t("lastRun"),
      cell: ({ getValue }) => {
        const v = getValue<string>();
        return v ? new Date(v).toLocaleString() : "-";
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(row.original)}
          aria-label={tc("delete")}
        >
          <Trash2 className="text-destructive size-4" />
        </Button>
      ),
      size: 50,
    },
  ];
}
