import RoleComponent from "./_components/role-component";

/**
 * หน้า Role สำหรับผู้ดูแลระบบ แสดงรายการบทบาทผู้ใช้งานทั้งหมด
 * @returns JSX element ของหน้า Role
 * @example
 * // ใช้เป็น Next.js route: /system-admin/role
 * <RolePage />
 */
export default function RolePage() {
  return <RoleComponent />;
}

export const Component = RolePage;
