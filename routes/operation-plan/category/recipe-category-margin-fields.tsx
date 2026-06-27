
import type { UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Field, FieldLabel, FieldDescription, FieldInput } from "@/components/ui/field";
import { Card } from "./recipe-category-card-shell";
import type { RecipeCategoryFormValues } from "./recipe-category-form-schema";

interface RecipeCategoryMarginFieldsProps {
  readonly form: UseFormReturn<RecipeCategoryFormValues>;
  readonly isDisabled: boolean;
}

/** Default profit margins — minimum · target */
export function RecipeCategoryMarginFields({
  form,
  isDisabled,
}: RecipeCategoryMarginFieldsProps) {
  const t = useTranslations("operationPlan.recipeCategory");
  const errors = form.formState.errors;

  return (
    <Card label={t("defaultProfitMargins")}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="rc-margin-min">{t("minProfitMargin")}</FieldLabel>
          <div className="relative">
            <FieldInput
              id="rc-margin-min"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              placeholder="0"
              className="h-8 pr-10 text-right"
              disabled={isDisabled}
              error={errors.margin_minimum?.message}
              errorIconAlign="left"
              {...form.register("margin_minimum")}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              %
            </span>
          </div>
          <FieldDescription>{t("minProfitMarginDesc")}</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="rc-margin-target">
            {t("targetProfitMargin")}
          </FieldLabel>
          <div className="relative">
            <FieldInput
              id="rc-margin-target"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              placeholder="0"
              className="h-8 pr-10 text-right"
              disabled={isDisabled}
              error={errors.margin_target?.message}
              errorIconAlign="left"
              {...form.register("margin_target")}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              %
            </span>
          </div>
          <FieldDescription>{t("targetProfitMarginDesc")}</FieldDescription>
        </Field>
      </div>
    </Card>
  );
}
