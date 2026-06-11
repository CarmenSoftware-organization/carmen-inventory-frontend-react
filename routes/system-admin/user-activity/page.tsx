import UserActivityComponent from "./_components/user-activity-component";

/**
 * หน้ารายการกิจกรรมของผู้ใช้ (User Activity) เช่น login/logout
 * @returns React element ของหน้า User Activity
 * @example
 * // ใช้เป็น Next.js route: /system-admin/user-activity
 * <UserActivityPage />
 */
export default function UserActivityPage() {
  return <UserActivityComponent />;
}

export const Component = UserActivityPage;
