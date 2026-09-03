import { useTranslations } from "use-intl";
import { useRecipeById } from "./use-recipe";
import { RecipeForm } from "./recipe-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

/**
 * หน้าดู/แก้ไขสูตรอาหาร ตาม id — ดึงข้อมูลผ่าน `useRecipeById`
 *
 * @param props.id - รหัสสูตรอาหารที่ route อ่านมาจาก URL segment (`useParams`)
 * @returns `FormSkeleton` ระหว่างโหลด · `ErrorState` เมื่อล้มเหลวหรือไม่พบ · `RecipeForm` เมื่อได้ข้อมูล
 */
export function RecipeEditContent({ id }: { id: string }) {
  const t = useTranslations("operationPlan.recipe");
  const { data: recipe, isLoading, error, refetch } = useRecipeById(id);

  if (isLoading) return <FormSkeleton />;
  if (error || !recipe)
    return (
      <ErrorState
        error={error}
        notFoundMessage={t("notFound")}
        onRetry={() => refetch()}
        backTo="/operation-plan/recipe"
      />
    );

  return <RecipeForm recipe={recipe} />;
}
