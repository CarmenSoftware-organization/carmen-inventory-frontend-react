import { useTranslations } from "use-intl";
import { useUserById } from "@/hooks/use-user";
import { UserAssignedForm } from "./user-assigned-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

/**
 * หน้ารายละเอียดผู้ใช้ — แก้ได้เฉพาะ Role ส่วน Department กับ Location ดูอย่างเดียว
 * (ผูก/ถอนคลังทำที่ /config/location)
 *
 * @param props.id - รหัสผู้ใช้ที่ route อ่านมาจาก URL segment (`useParams`)
 * @returns skeleton ระหว่างโหลด · `ErrorState` เมื่อ error หรือไม่พบ · ฟอร์มเมื่อได้ข้อมูล
 */
export function UserDetailContent({ id }: { id: string }) {
  const tErr = useTranslations("systemAdmin.user");
  const { data: user, isLoading, error, refetch } = useUserById(id);

  if (isLoading) return <FormSkeleton />;
  if (error || !user)
    return (
      <ErrorState
        error={error}
        notFoundMessage={tErr("notFound")}
        onRetry={() => refetch()}
        backTo="/system-admin/user"
      />
    );

  return <UserAssignedForm user={user} />;
}
