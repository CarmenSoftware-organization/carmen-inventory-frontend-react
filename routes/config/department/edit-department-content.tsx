import { useTranslations } from "use-intl";
import { useDepartmentById } from "@/hooks/use-department";
import { DepartmentForm } from "./department-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

/**
 * หน้าดู/แก้ไข Department ตาม id — ดึงข้อมูลผ่าน `useDepartmentById`
 *
 * @param props.id - รหัส Department ที่ route อ่านมาจาก URL segment (`useParams`)
 * @returns `FormSkeleton` ระหว่างโหลด · `ErrorState` เมื่อล้มเหลวหรือไม่พบ · `DepartmentForm` เมื่อได้ข้อมูล
 */
export function EditDepartmentContent({ id }: { id: string }) {
  const tErr = useTranslations("config.department");
  const { data: department, isLoading, error, refetch } = useDepartmentById(id);

  if (isLoading) return <FormSkeleton />;
  if (error || !department)
    return (
      <ErrorState
        error={error}
        notFoundMessage={tErr("notFound")}
        onRetry={() => refetch()}
        backTo="/config/department"
      />
    );

  return <DepartmentForm department={department} />;
}
