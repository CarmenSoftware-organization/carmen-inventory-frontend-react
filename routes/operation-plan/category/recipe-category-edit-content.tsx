import { useTranslations } from "use-intl";
import { useRecipeCategoryById } from "@/hooks/use-recipe-category";
import { RecipeCategoryForm } from "./recipe-category-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

/**
 * หน้าดู/แก้ไขหมวดหมู่สูตรอาหาร ตาม id — ดึงข้อมูลผ่าน `useRecipeCategoryById`
 *
 * @param props.id - รหัสหมวดหมู่ที่ route อ่านมาจาก URL segment (`useParams`)
 * @returns `FormSkeleton` ระหว่างโหลด · `ErrorState` เมื่อล้มเหลวหรือไม่พบ · `RecipeCategoryForm` เมื่อได้ข้อมูล
 */
export function RecipeCategoryEditContent({ id }: { id: string }) {
  const tErr = useTranslations("operationPlan.recipeCategory");
  const {
    data: category,
    isLoading,
    error,
    refetch,
  } = useRecipeCategoryById(id);

  if (isLoading) return <FormSkeleton />;
  if (error || !category)
    return (
      <ErrorState
        error={error}
        notFoundMessage={tErr("notFound")}
        onRetry={() => refetch()}
        backTo="/operation-plan/category"
      />
    );

  return <RecipeCategoryForm category={category} />;
}
