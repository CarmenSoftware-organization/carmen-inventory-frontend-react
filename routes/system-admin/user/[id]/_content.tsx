
import { useUserById } from "@/hooks/use-user";
import { UserAssignedForm } from "../_components/user-assigned-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

/**
 * หน้าแสดงรายละเอียดและแก้ไขการกำหนด Role/Location ของผู้ใช้ตาม id
 * @param props - params ที่มี id ของผู้ใช้ (Promise ตาม Next.js 16)
 * @returns JSX element ของหน้า User Detail
 * @example
 * // ใช้เป็น Next.js route: /system-admin/user/[id]
 * <UserDetailPage params={Promise.resolve({ id: "u-1" })} />
 */
export function UserDetailContent({ id }: { id: string }) {
  const { data: user, isLoading, error, refetch } = useUserById(id);

  if (isLoading) return <FormSkeleton />;
  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!user) return <ErrorState message="User not found" />;

  return <UserAssignedForm user={user} />;
}
