import { useTranslations } from "use-intl";
import { useRecipeById } from "./use-recipe";
import { RecipeForm } from "./recipe-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

/**
 * หน้าสำหรับแก้ไขสูตรอาหารที่มีอยู่
 * @param props - params ที่มี id ของสูตรอาหาร
 * @returns React element ของหน้าแก้ไขสูตรอาหาร
 * @example
 * // route: /operation-plan/recipe/abc-123
 * <EditRecipePage params={Promise.resolve({ id: "abc-123" })} />
 */
export function EditRecipeContent({ id }: { id: string }) {
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
