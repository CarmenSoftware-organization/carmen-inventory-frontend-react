import ActivityLogComponent from "./_components/activity-log-component";

/**
 * หน้ารายการ Activity Log สำหรับติดตามการทำงานในระบบทั้งหมด
 * @returns React element ของหน้า Activity Log
 * @example
 * // ใช้เป็น Next.js route: /system-admin/activity-log
 * <ActivityLogPage />
 */
export default function ActivityLogPage() {
  return <ActivityLogComponent />;
}

export const Component = ActivityLogPage;
