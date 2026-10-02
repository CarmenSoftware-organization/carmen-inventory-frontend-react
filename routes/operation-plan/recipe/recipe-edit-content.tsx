import { useTranslations } from "use-intl";
import { useRecipeById } from "./use-recipe";
import { RecipeForm } from "./recipe-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormPageSkeleton } from "@/components/loader/form-page-skeleton";

export function RecipeEditContent({ id }: { id: string }) {
  const t = useTranslations("operationPlan.recipe");
  const { data: recipe, isLoading, error, refetch } = useRecipeById(id);

  if (isLoading) return <FormPageSkeleton />;
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
