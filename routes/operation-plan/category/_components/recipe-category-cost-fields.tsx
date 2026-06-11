
import type { UseFormReturn, FieldPath } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Field, FieldLabel, FieldInput } from "@/components/ui/field";
import { Card } from "./recipe-category-card-shell";
import type { RecipeCategoryFormValues } from "./recipe-category-form-schema";

interface RecipeCategoryCostFieldsProps {
  readonly form: UseFormReturn<RecipeCategoryFormValues>;
  readonly isDisabled: boolean;
}

/** Default cost settings — labor% · overhead% · target food cost% */
export function RecipeCategoryCostFields({
  form,
  isDisabled,
}: RecipeCategoryCostFieldsProps) {
  const t = useTranslations("operationPlan.recipeCategory");

  return (
    <Card label={t("defaultCostSettings")}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <PercentField
          form={form}
          name="cost_labor_percentage"
          id="rc-cost-labor"
          label={t("laborCostPct")}
          isDisabled={isDisabled}
        />
        <PercentField
          form={form}
          name="cost_overhead_percentage"
          id="rc-cost-overhead"
          label={t("overheadPct")}
          isDisabled={isDisabled}
        />
        <PercentField
          form={form}
          name="cost_target_food_cost_percentage"
          id="rc-cost-food"
          label={t("targetFoodCostPct")}
          isDisabled={isDisabled}
        />
      </div>
    </Card>
  );
}

function PercentField({
  form,
  name,
  id,
  label,
  isDisabled,
  description,
}: {
  readonly form: UseFormReturn<RecipeCategoryFormValues>;
  readonly name: FieldPath<RecipeCategoryFormValues>;
  readonly id: string;
  readonly label: string;
  readonly isDisabled: boolean;
  readonly description?: string;
}) {
  const error = form.formState.errors[
    name as keyof RecipeCategoryFormValues
  ]?.message as string | undefined;
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <FieldInput
          id={id}
          type="number"
          inputMode="decimal"
          step="0.01"
          min={0}
          placeholder="0"
          className="h-8 pr-10 text-right"
          disabled={isDisabled}
          error={error}
          errorIconAlign="left"
          {...form.register(name)}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          %
        </span>
      </div>
      {description && (
        <span className="text-xs text-muted-foreground">{description}</span>
      )}
    </Field>
  );
}

export { PercentField };
