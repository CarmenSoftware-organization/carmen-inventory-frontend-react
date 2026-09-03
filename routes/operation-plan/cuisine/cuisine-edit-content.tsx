import { useTranslations } from "use-intl";
import { useCuisineById } from "@/hooks/use-cuisine";
import { CuisineForm } from "./cuisine-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

/**
 * หน้าดู/แก้ไขประเภทอาหาร ตาม id — ดึงข้อมูลผ่าน `useCuisineById`
 *
 * @param props.id - รหัส cuisine ที่ route อ่านมาจาก URL segment (`useParams`)
 * @returns `FormSkeleton` ระหว่างโหลด · `ErrorState` เมื่อล้มเหลวหรือไม่พบ · `CuisineForm` เมื่อได้ข้อมูล
 */
export function CuisineEditContent({ id }: { id: string }) {
  const tErr = useTranslations("operationPlan.cuisine");
  const { data: cuisine, isLoading, error, refetch } = useCuisineById(id);

  if (isLoading) return <FormSkeleton />;
  if (error || !cuisine)
    return (
      <ErrorState
        error={error}
        notFoundMessage={tErr("notFound")}
        onRetry={() => refetch()}
        backTo="/operation-plan/cuisine"
      />
    );

  return <CuisineForm cuisine={cuisine} />;
}
