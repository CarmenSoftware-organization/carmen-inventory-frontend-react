
import { useTranslations } from "use-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import {
  JOB_STATUS_CONFIG,
  REPORT_FORMAT_LABELS,
  normalizeJobStatus,
} from "@/constant/report-history";
import type {
  ReportFormatRaw,
  ReportHistory,
} from "@/types/report-history";

export function useHistoryTable(): ColumnDef<ReportHistory>[] {
  const t = useTranslations("reportHistory");

  return [
    {
      id: "index",
      header: "#",
      cell: ({ row }) => row.index + 1,
      size: 50,
    },
    {
      accessorKey: "file_name",
      header: t("reportName"),
      cell: ({ row }) => {
        const name = row.original.file_name ?? row.original.report_type;
        const url = row.original.file_url;
        if (url) {
          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary text-xs underline-offset-4 hover:underline"
            >
              {name}
            </a>
          );
        }
        return <span className="text-xs">{name}</span>;
      },
    },
    {
      accessorKey: "report_type",
      header: t("reportType"),
      cell: ({ getValue }) => (
        <span className="text-xs">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: "format",
      header: t("format"),
      cell: ({ getValue }) => (
        <span className="text-xs">
          {REPORT_FORMAT_LABELS[getValue<ReportFormatRaw>()] ?? "-"}
        </span>
      ),
      size: 80,
    },
    {
      accessorKey: "status",
      header: t("status"),
      cell: ({ getValue }) => {
        const key = normalizeJobStatus(getValue<string>());
        if (!key) return "-";
        const config = JOB_STATUS_CONFIG[key];
        return (
          <Badge className={config.className} size="sm">
            {t(key)}
          </Badge>
        );
      },
      size: 120,
    },
    {
      accessorKey: "row_count",
      header: () => <div className="text-right">{t("rowCount")}</div>,
      cell: ({ getValue }) => {
        const v = getValue<number | undefined>();
        return (
          <span className="block text-right text-xs tabular-nums">
            {v != null ? v.toLocaleString() : "-"}
          </span>
        );
      },
      size: 80,
    },
  ];
}
