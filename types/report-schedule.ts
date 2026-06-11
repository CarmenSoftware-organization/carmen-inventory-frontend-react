/**
 * Types สำหรับ Report Schedule (cron-driven recurring report job)
 *
 * Backend endpoints อยู่ที่ `/{buCode}/reports/schedules` — list/create/delete
 * ตัว create รับ `CreateReportScheduleDto` คืน `ReportSchedule`
 */

export type ScheduleFrequency = "daily" | "weekly" | "monthly";

export type ReportFormat =
  | "REPORT_FORMAT_PDF"
  | "REPORT_FORMAT_EXCEL"
  | "REPORT_FORMAT_CSV"
  | "REPORT_FORMAT_JSON"
  | "REPORT_FORMAT_VIEWER_URL"
  | "viewer_url"
  | "pdf"
  | "excel"
  | "csv"
  | "json";

export interface ScheduleConfig {
  frequency: ScheduleFrequency;
  /** "HH:mm" 24h */
  time: string;
  /** 0=Sun .. 6=Sat — used when frequency=weekly */
  days_of_week?: number[];
  /** 1..31 — used when frequency=monthly */
  days_of_month?: number[];
}

export interface ScheduleNotifications {
  web: boolean;
  email: boolean;
}

export interface ScheduleDelivery {
  type: "viewer_url";
  viewer_endpoint: string;
}

export interface ReportSchedule {
  id: string;
  name: string;
  report_type: string;
  report_template_id?: string;
  format: ReportFormat;
  cron_expression: string;
  schedule_config?: ScheduleConfig;
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
}

export interface CreateReportScheduleDto {
  name: string;
  report_type: string;
  report_template_id: string;
  format: "viewer_url";
  delivery: ScheduleDelivery;
  schedule_config: ScheduleConfig;
  notifications: ScheduleNotifications;
  filters?: Record<string, string>;
  recipients?: string[];
}

/**
 * Flat representation of a parsed `<Dialog>` field for the schedule form.
 * Shape ตรงกับที่ XML parser ของ schedule produce (ไม่ใช้ range grouping
 * ของ list-page param dialog เพราะ schedule แค่ pre-set filter ตอน create)
 */
export interface ReportScheduleDialogField {
  name: string;
  type: "date" | "select" | "text";
  label: string;
  options?: string[];
  source?: string;
}

export interface ReportLookupItem {
  label: string;
  value: string;
}

export type ReportLookupMap = Record<string, ReportLookupItem[]>;
