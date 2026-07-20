export interface Report {
  Id: number;
  PermissionName: string;
  ReportGroup: string;
  ReportName: string;
  Description: string;
  Dialog: string;
  IsSystem: boolean;
  UserModified: string;
  LastModify: string;
  _templateId?: string;
  _content?: string;
  _columns?: string[];
  _templateType?: "form" | "list";
}

export interface CreateReportDto {
  name: string;
  is_active: boolean;
}

/** ข้อมูล raw จาก BE endpoint `/reports/templates` */
export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  report_group: string;
  dialog: string;
  content: string;
  columns: string[];
  is_standard: boolean;
  is_active: boolean;
  template_type?: "form" | "list";
}

/** Payload สำหรับ POST `/reports/viewer` */
export interface RunReportPayload {
  template_id: string;
  filters: Record<string, string>;
}

/** Response จาก POST `/reports/viewer` — มี viewer URL ให้เปิด tab ใหม่ */
export interface RunReportResponse {
  url: string;
}

/** Period record ที่ backend ส่งกลับใน lookup response */
export interface ReportPeriodInfo {
  period: string;
  start_at: string;
  end_at: string;
}

/** Lookup item สำหรับหน้า list (code + composite "code - name") */
export interface ReportListLookupItem {
  code: string;
  name: string;
}

export type ReportListLookupMap = Record<string, ReportListLookupItem[]>;

export type ReportPeriodMap = Record<string, ReportPeriodInfo | undefined>;
