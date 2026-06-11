export type ReportStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

/** Backend's prefixed enum values (raw values from API response) */
export type ReportStatusRaw =
  | "JOB_STATUS_QUEUED"
  | "JOB_STATUS_PROCESSING"
  | "JOB_STATUS_COMPLETED"
  | "JOB_STATUS_FAILED"
  | "JOB_STATUS_CANCELLED";

export type ReportFormatRaw =
  | "REPORT_FORMAT_PDF"
  | "REPORT_FORMAT_EXCEL"
  | "REPORT_FORMAT_CSV"
  | "REPORT_FORMAT_JSON";

export interface ReportHistory {
  job_id: string;
  report_type: string;
  format: ReportFormatRaw | string;
  status: ReportStatusRaw | string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  row_count?: number;
  error_message?: string;
}
