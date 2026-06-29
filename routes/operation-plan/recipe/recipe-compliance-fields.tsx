
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Check, Sparkles } from "lucide-react";
import {
  Field,
  FieldLabel,
  FieldGroup,
  FieldDescription,
  FieldInput,
} from "@/components/ui/field";
import { ALLERGEN_OPTIONS } from "@/constant/recipe";
import { cn } from "@/lib/utils";
import { Card, CardSubLabel } from "./recipe-card-shell";
import type { RecipeFormValues } from "./recipe-form-schema";

interface RecipeComplianceFieldsProps {
  readonly form: UseFormReturn<RecipeFormValues>;
  readonly isDisabled: boolean;
}

const TAG_CATALOG: { key: string; labelKey: string }[] = [
  { key: "seasonal", labelKey: "tagSeasonal" },
  { key: "best-seller", labelKey: "tagBestSeller" },
  { key: "new", labelKey: "tagNew" },
  { key: "high-margin", labelKey: "tagHighMargin" },
  { key: "vegetarian", labelKey: "tagVegetarian" },
];

export function RecipeComplianceFields({
  form,
  isDisabled,
}: RecipeComplianceFieldsProps) {
  const t = useTranslations("operationPlan.recipe");

  const standardAllergens = useWatch({
    control: form.control,
    name: "allergens.standard",
  });
  const customAllergens = useWatch({
    control: form.control,
    name: "allergens.custom",
  });
  const tags = useWatch({ control: form.control, name: "tags" });

  const customList = (customAllergens ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const flaggedCount = (standardAllergens?.length ?? 0) + customList.length;

  const tagsList = (tags ?? "")
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);

  const toggleTag = (tag: string) => {
    const next = tagsList.includes(tag)
      ? tagsList.filter((x) => x !== tag)
      : [...tagsList, tag];
    form.setValue("tags", next.join("\n"), { shouldDirty: true });
  };

  return (
    <>
      {/* Allergens & tags */}
      <Card label={t("safetyCompliance")}>
        <FieldGroup className="gap-4">
          <div>
            <CardSubLabel className="flex items-center gap-1.5">
              {t("allergens")}
              <span className="ml-1 font-semibold normal-case tracking-normal text-muted-foreground">
                · {t("allergensFlagged", { count: flaggedCount })}
              </span>
            </CardSubLabel>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {ALLERGEN_OPTIONS.map((allergen) => (
                <Controller
                  key={allergen.value}
                  control={form.control}
                  name="allergens.standard"
                  render={({ field }) => {
                    const on = field.value?.includes(allergen.value) ?? false;
                    return (
                      <button
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          const current = field.value ?? [];
                          field.onChange(
                            on
                              ? current.filter(
                                  (v: string) => v !== allergen.value,
                                )
                              : [...current, allergen.value],
                          );
                        }}
                        aria-pressed={on}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                          on
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-card text-foreground/70 hover:border-foreground/40",
                          isDisabled && "cursor-not-allowed opacity-60",
                        )}
                      >
                        {on && (
                          <Check className="size-3" aria-hidden="true" />
                        )}
                        {allergen.label}
                      </button>
                    );
                  }}
                />
              ))}
              {customList.map((custom) => (
                <span
                  key={custom}
                  className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-warning bg-warning/10 px-3 py-1 text-xs font-semibold text-warning-foreground"
                >
                  <Sparkles className="size-3" aria-hidden="true" />
                  {custom}
                  <span className="text-[0.625rem] font-semibold opacity-70">
                    {t("customAllergen")}
                  </span>
                </span>
              ))}
            </div>
          </div>

          <Field>
            <FieldLabel htmlFor="recipe-custom-allergens">
              {t("otherAllergens")}
            </FieldLabel>
            <FieldInput
              id="recipe-custom-allergens"
              placeholder={t("otherAllergensPlaceholder")}
              className="h-8"
              disabled={isDisabled}
              maxLength={256}
              error={form.formState.errors.allergens?.custom?.message}
              {...form.register("allergens.custom")}
            />
            <FieldDescription>{t("otherAllergensDesc")}</FieldDescription>
          </Field>

          <div>
            <CardSubLabel>{t("tags")}</CardSubLabel>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TAG_CATALOG.map((tag) => {
                const on = tagsList.includes(tag.key);
                return (
                  <button
                    key={tag.key}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => toggleTag(tag.key)}
                    aria-pressed={on}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground/70 hover:border-primary/40",
                      isDisabled && "cursor-not-allowed opacity-60",
                    )}
                  >
                    {on && <Check className="size-3" aria-hidden="true" />}
                    {t(
                      tag.labelKey as
                        | "tagSeasonal"
                        | "tagBestSeller"
                        | "tagNew"
                        | "tagHighMargin"
                        | "tagVegetarian",
                    )}
                  </button>
                );
              })}
            </div>
            <FieldDescription className="mt-2">
              {t("tagsHint")}
            </FieldDescription>
          </div>
        </FieldGroup>
      </Card>
    </>
  );
}
