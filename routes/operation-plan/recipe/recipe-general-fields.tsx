
import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import {
  Field,
  FieldLabel,
  FieldGroup,
  FieldDescription,
  FieldInput,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { LookupCuisine } from "@/components/lookup/lookup-cuisine";
import { LookupRecipeCategory } from "@/components/lookup/lookup-recipe-category";
import { LookupUnit } from "@/components/lookup/lookup-unit";
import { Card } from "./recipe-card-shell";
import type { RecipeFormValues } from "./recipe-form-schema";

interface RecipeGeneralFieldsProps {
  readonly form: UseFormReturn<RecipeFormValues>;
  readonly isDisabled: boolean;
}

export function RecipeGeneralFields({
  form,
  isDisabled,
}: RecipeGeneralFieldsProps) {
  const t = useTranslations("operationPlan.recipe");
  const tfl = useTranslations("field");
  const errors = form.formState.errors;

  return (
    <Card label={t("recipeDetails")}>
      <FieldGroup className="gap-3">
        {/* Code + Classification */}
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="recipe-code" required>
              {tfl("code")}
            </FieldLabel>
            <FieldInput
              id="recipe-code"
              placeholder={t("codePlaceholder")}
              className="h-8"
              disabled={isDisabled}
              maxLength={10}
              error={errors.code?.message}
              {...form.register("code")}
            />
          </Field>

          <Field>
            <FieldLabel required>{tfl("cuisine")}</FieldLabel>
            <Controller
              control={form.control}
              name="cuisine_id"
              render={({ field }) => (
                <LookupCuisine
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  disabled={isDisabled}
                  error={errors.cuisine_id?.message}
                  className="h-8"
                />
              )}
            />
          </Field>

          <Field>
            <FieldLabel required>{tfl("category")}</FieldLabel>
            <Controller
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <LookupRecipeCategory
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  disabled={isDisabled}
                  error={errors.category_id?.message}
                  className="h-8"
                />
              )}
            />
          </Field>
        </div>

        {/* Description / Note */}
        <Field>
          <FieldLabel htmlFor="recipe-description">
            {tfl("description")}
          </FieldLabel>
          <Textarea
            id="recipe-description"
            placeholder={t("descriptionPlaceholder")}
            rows={2}
            disabled={isDisabled}
            maxLength={256}
            {...form.register("description")}
          />
          <FieldDescription>{t("descriptionDesc")}</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="recipe-note">{tfl("internalNote")}</FieldLabel>
          <Textarea
            id="recipe-note"
            placeholder={t("internalNotePlaceholder")}
            rows={2}
            disabled={isDisabled}
            maxLength={256}
            {...form.register("note")}
          />
          <FieldDescription>{t("internalNoteDesc")}</FieldDescription>
        </Field>

        {/* Time + yield steppers */}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <TimeStepper
            id="recipe-prep-time"
            label={t("prepTime")}
            suffix={t("min")}
            value={form.watch("prep_time")}
            onChange={(v) =>
              form.setValue("prep_time", v, { shouldDirty: true })
            }
            disabled={isDisabled}
            error={errors.prep_time?.message}
          />
          <TimeStepper
            id="recipe-cook-time"
            label={t("cookTime")}
            suffix={t("min")}
            value={form.watch("cook_time")}
            onChange={(v) =>
              form.setValue("cook_time", v, { shouldDirty: true })
            }
            disabled={isDisabled}
            error={errors.cook_time?.message}
          />
          <TimeStepper
            id="recipe-base-yield"
            label={t("baseYield")}
            suffix=""
            value={form.watch("base_yield")}
            onChange={(v) =>
              form.setValue("base_yield", v, { shouldDirty: true })
            }
            disabled={isDisabled}
            error={errors.base_yield?.message}
            accent
          />

          <Field>
            <FieldLabel required>{t("yieldUnit")}</FieldLabel>
            <Controller
              control={form.control}
              name="base_yield_unit"
              render={({ field }) => (
                <LookupUnit
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  disabled={isDisabled}
                  placeholder={t("selectUnit")}
                  error={errors.base_yield_unit?.message}
                  className="h-8"
                />
              )}
            />
          </Field>
        </div>
      </FieldGroup>
    </Card>
  );
}

function TimeStepper({
  id,
  label,
  suffix,
  value,
  onChange,
  disabled,
  accent,
  error,
}: {
  readonly id: string;
  readonly label: string;
  readonly suffix: string;
  readonly value: number | undefined;
  readonly onChange: (v: number) => void;
  readonly disabled: boolean;
  readonly accent?: boolean;
  readonly error?: string;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div
        className={
          accent
            ? "border-primary/40 bg-primary/5 aria-invalid:border-destructive flex items-center rounded-md border"
            : "bg-muted/40 aria-invalid:border-destructive flex items-center rounded-md border"
        }
        aria-invalid={!!error}
      >
        <button
          type="button"
          onClick={() => onChange(Math.max(0, (Number(value) || 0) - 1))}
          disabled={disabled}
          aria-label="decrement"
          className="text-muted-foreground hover:text-foreground flex h-8 w-7 items-center justify-center transition-colors disabled:opacity-50"
        >
          −
        </button>
        <FieldInput
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          className="h-8 flex-1 border-0 bg-transparent text-center text-base font-semibold shadow-none focus-visible:ring-0"
          value={value ?? 0}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          disabled={disabled}
          error={error}
          errorIconAlign="left"
        />
        <button
          type="button"
          onClick={() => onChange((Number(value) || 0) + 1)}
          disabled={disabled}
          aria-label="increment"
          className="text-muted-foreground hover:text-foreground flex h-8 w-7 items-center justify-center transition-colors disabled:opacity-50"
        >
          +
        </button>
      </div>
      {suffix && (
        <FieldDescription className="text-center">{suffix}</FieldDescription>
      )}
    </Field>
  );
}
