import UserComponent from "./_components/user-component";

/**
 * หน้ารายการผู้ใช้สำหรับผู้ดูแลระบบ
 * @returns JSX element ของหน้า User list
 * @example
 * // ใช้เป็น Next.js route: /system-admin/user
 * <UserPage />
 */
export default function UserPage() {
  return <UserComponent />;
}

export const Component = UserPage;
