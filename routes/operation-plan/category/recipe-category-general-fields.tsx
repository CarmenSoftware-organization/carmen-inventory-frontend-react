
import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldInput,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { LookupRecipeCategory } from "@/components/lookup/lookup-recipe-category";
import { Card } from "./recipe-category-card-shell";
import type { RecipeCategoryFormValues } from "./recipe-category-form-schema";

interface RecipeCategoryGeneralFieldsProps {
  readonly form: UseFormReturn<RecipeCategoryFormValues>;
  readonly isDisabled: boolean;
  readonly excludeIds?: Set<string>;
  readonly onParentChange: (parentId: string) => void;
}

/** General info section — code · name · parent · description */
export function RecipeCategoryGeneralFields({
  form,
  isDisabled,
  excludeIds,
  onParentChange,
}: RecipeCategoryGeneralFieldsProps) {
  const t = useTranslations("operationPlan.recipeCategory");
  const tfl = useTranslations("field");
  const tf = useTranslations("form");
  const errors = form.formState.errors;

  return (
    <Card label={tf("generalInfo")}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field>
          <FieldLabel htmlFor="rc-code" required>
            {tfl("code")}
          </FieldLabel>
          <FieldInput
            id="rc-code"
            placeholder={t("codePlaceholder")}
            className="h-8"
            disabled={isDisabled}
            maxLength={10}
            error={errors.code?.message}
            {...form.register("code")}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="rc-name" required>
            {tfl("name")}
          </FieldLabel>
          <FieldInput
            id="rc-name"
            placeholder={t("namePlaceholder")}
            className="h-8"
            disabled={isDisabled}
            maxLength={100}
            error={errors.name?.message}
            {...form.register("name")}
          />
        </Field>

        <Field>
          <FieldLabel>{tfl("parentCategory")}</FieldLabel>
          <Controller
            control={form.control}
            name="parent_id"
            render={({ field }) => (
              <LookupRecipeCategory
                value={field.value ?? ""}
                onValueChange={(id) => {
                  field.onChange(id || null);
                  onParentChange(id);
                }}
                disabled={isDisabled}
                placeholder={t("notSet")}
                excludeIds={excludeIds}
                error={errors.parent_id?.message}
              />
            )}
          />
          <FieldDescription>{t("parentCategoryDesc")}</FieldDescription>
        </Field>

        <Field className="sm:col-span-2 lg:col-span-3">
          <FieldLabel htmlFor="rc-description">{tfl("description")}</FieldLabel>
          <Textarea
            id="rc-description"
            placeholder={tfl("optional")}
            rows={2}
            disabled={isDisabled}
            maxLength={256}
            {...form.register("description")}
          />
        </Field>
      </div>
    </Card>
  );
}
