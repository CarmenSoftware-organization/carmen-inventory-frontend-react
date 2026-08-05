import { useTranslations } from "use-intl";
import { useRecipeCategoryById } from "@/hooks/use-recipe-category";
import { RecipeCategoryForm } from "./recipe-category-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

/**
 * หน้าสำหรับแก้ไขหมวดหมู่สูตรอาหารที่มีอยู่
 * @param props - params ที่มี id ของหมวดหมู่
 * @returns React element ของหน้าแก้ไขหมวดหมู่สูตรอาหาร
 * @example
 * // route: /operation-plan/category/abc-123
 * <EditRecipeCategoryPage params={Promise.resolve({ id: "abc-123" })} />
 */
export function EditRecipeCategoryContent({ id }: { id: string }) {
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
