
import { type UseFormReturn } from "react-hook-form";
import { RecipeCostHero } from "./recipe-cost-hero";
import { RecipeCostBreakdown } from "./recipe-cost-breakdown";
import { RecipeCostMargins } from "./recipe-cost-margins";
import { RecipeCostMetrics } from "./recipe-cost-metrics";
import type { RecipeFormValues } from "./recipe-form-schema";
import type { RecipeComputed } from "./use-recipe-cost-calc";

interface RecipeCostFieldsProps {
  readonly form: UseFormReturn<RecipeFormValues>;
  readonly isDisabled: boolean;
  readonly computed: RecipeComputed;
}

/**
 * Sticky cost console — composes hero + breakdown + margins + other metrics
 */
export function RecipeCostFields({
  form,
  isDisabled,
  computed,
}: RecipeCostFieldsProps) {
  return (
    <>
      <RecipeCostHero form={form} isDisabled={isDisabled} computed={computed} />
      <RecipeCostBreakdown form={form} isDisabled={isDisabled} />
      <RecipeCostMargins
        form={form}
        isDisabled={isDisabled}
        computed={computed}
      />
      <RecipeCostMetrics
        form={form}
        isDisabled={isDisabled}
        computed={computed}
      />
    </>
  );
}
