import { RoleForm } from "../_components/role-form";

/**
 * หน้าสำหรับสร้าง Role ใหม่
 * @returns JSX element ของฟอร์มสร้าง Role
 * @example
 * // ใช้เป็น Next.js route: /system-admin/role/new
 * <NewRolePage />
 */
export default function NewRolePage() {
  return <RoleForm />;
}

export const Component = NewRolePage;
