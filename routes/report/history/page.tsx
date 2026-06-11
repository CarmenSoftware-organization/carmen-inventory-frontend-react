import HistoryComponent from "./_components/history-component";

/**
 * หน้าแสดงประวัติการเรียกใช้รายงาน (Report History)
 *
 * @param - ไม่มี parameter
 * @returns React element ของหน้าประวัติรายงาน
 * @example
 * ```tsx
 * // เข้าถึงผ่าน Next.js App Router ที่ path /report/history
 * <ReportHistoryPage />
 * ```
 */
export default function ReportHistoryPage() {
  return <HistoryComponent />;
}

export const Component = ReportHistoryPage;
