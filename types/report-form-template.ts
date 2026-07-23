/**
 * แถวจาก `GET /api-system/report-templates/forms`
 * (เฉพาะ field ที่หน้าเลือกแบบฟอร์มการพิมพ์ใช้ — endpoint คืนมามากกว่านี้)
 */
export interface ReportFormTemplate {
  id: string;
  name: string;
  description: string | null;
  /** กลุ่มรายงาน = document type code เช่น "PR" */
  report_group: string;
}
