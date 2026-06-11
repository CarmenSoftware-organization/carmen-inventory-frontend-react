import { WastageReportForm } from "../_components/wr-form";

/**
 * หน้าสร้างรายงานของเสียใหม่
 * แสดง WastageReportForm ในโหมด add โดยไม่ส่ง wastageReport prop
 *
 * @returns คอมโพเนนต์ฟอร์มสร้าง WR
 * @example
 * // เข้าถึงผ่าน URL: /store-operation/wastage-reporting/new
 * export default NewWastageReportPage;
 */
export default function NewWastageReportPage() {
  return <WastageReportForm />;
}

export const Component = NewWastageReportPage;
