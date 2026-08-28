import { useTranslations } from "use-intl";
import { useRoleById } from "../shared/use-role";
import { RoleForm } from "./role-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

/**
 * หน้าแก้ไข Role ตาม id พร้อมจัดการสถานะโหลดและข้อผิดพลาด
 * @param props - params ที่มี id ของ Role (เป็น Promise ตาม Next.js 16)
 * @returns JSX element ของฟอร์มแก้ไข Role
 * @example
 * // ใช้เป็น Next.js route: /system-admin/role/[id]
 * <EditRolePage params={Promise.resolve({ id: "r-1" })} />
 */
export function EditRoleContent({ id }: { id: string }) {
  const tErr = useTranslations("systemAdmin.role");
  const { data: role, isLoading, error, refetch } = useRoleById(id);

  if (isLoading) return <FormSkeleton />;
  if (error || !role)
    return (
      <ErrorState
        error={error}
        notFoundMessage={tErr("notFound")}
        onRetry={() => refetch()}
        backTo="/system-admin/role"
      />
    );

  return <RoleForm role={role} />;
}
