import {
  ReportFormatRaw,
  ReportStatus,
  ReportStatusRaw,
} from "@/types/report-history";
import { createStatusConfig } from "./status-config";

/** Display label per backend format enum */
export const REPORT_FORMAT_LABELS: Record<ReportFormatRaw, string> = {
  REPORT_FORMAT_PDF: "PDF",
  REPORT_FORMAT_EXCEL: "Excel",
  REPORT_FORMAT_CSV: "CSV",
  REPORT_FORMAT_JSON: "JSON",
};

export const JOB_STATUS_CONFIG = createStatusConfig(
  ["queued", "processing", "completed", "failed", "cancelled"] as const,
  {
    queued: {
      className:
        "bg-[var(--status-pending)] text-[var(--status-pending-fg)] border-transparent px-2",
      label: "Queued",
    },
    processing: {
      className:
        "bg-[var(--status-in-progress)] text-[var(--status-in-progress-fg)] border-transparent px-2",
      label: "Processing",
    },
    completed: { label: "Completed" },
    failed: {
      className:
        "bg-destructive text-destructive-foreground border-transparent px-2",
      label: "Failed",
    },
    cancelled: { label: "Cancelled" },
  },
);

/** Map backend prefixed status → bare status key used by JOB_STATUS_CONFIG */
const RAW_TO_KEY: Record<ReportStatusRaw, ReportStatus> = {
  JOB_STATUS_QUEUED: "queued",
  JOB_STATUS_PROCESSING: "processing",
  JOB_STATUS_COMPLETED: "completed",
  JOB_STATUS_FAILED: "failed",
  JOB_STATUS_CANCELLED: "cancelled",
};

export function normalizeJobStatus(raw: string): ReportStatus | null {
  return RAW_TO_KEY[raw as ReportStatusRaw] ?? null;
}
