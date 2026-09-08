import { useTranslations } from "use-intl";
import { useRoleById } from "../shared/use-role";
import { RoleForm } from "./role-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

/**
 * หน้าแก้ไข Role ตาม id — ดึงข้อมูลผ่าน `useRoleById`
 *
 * @param props.id - รหัส Role ที่ route อ่านมาจาก URL segment (`useParams`)
 * @returns `FormSkeleton` ระหว่างโหลด · `ErrorState` เมื่อล้มเหลวหรือไม่พบ · `RoleForm` เมื่อได้ข้อมูล
 */
export function RoleEditContent({ id }: { id: string }) {
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
