
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import {
  Tag as TagIcon,
  Sparkles,
  Check,
  Truck,
  Flame,
  ChefHat,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RecipeNameField } from "./recipe-name-field";
import { RecipeImageGallery } from "./recipe-image-gallery";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RECIPE_DIFFICULTY_OPTIONS } from "@/constant/recipe";
import type { RecipeFormValues } from "./recipe-form-schema";
import type { RecipeComputed } from "./recipe-form";
import type { RecipeGalleryController } from "./use-recipe-gallery";

interface RecipeHeroFieldsProps {
  readonly form: UseFormReturn<RecipeFormValues>;
  readonly isDisabled: boolean;
  readonly computed: RecipeComputed;
  readonly gallery: RecipeGalleryController;
}

const DIFFICULTY_DOTS: Record<string, number> = {
  EASY: 1,
  MEDIUM: 2,
  HARD: 3,
};

export function RecipeHeroFields({
  form,
  isDisabled,
  computed,
  gallery,
}: RecipeHeroFieldsProps) {
  const t = useTranslations("operationPlan.recipe");
  const tfl = useTranslations("field");
  const ts = useTranslations("status");

  const description = useWatch({ control: form.control, name: "description" });
  const difficulty = useWatch({ control: form.control, name: "difficulty" });
  const prepTime = useWatch({ control: form.control, name: "prep_time" });
  const cookTime = useWatch({ control: form.control, name: "cook_time" });
  const baseYield = useWatch({ control: form.control, name: "base_yield" });

  const totalTime = (Number(prepTime) || 0) + (Number(cookTime) || 0);

  return (
    <section className="grid gap-4 md:grid-cols-[18rem_minmax(0,1fr)] lg:grid-cols-[22rem_minmax(0,1fr)]">
      {/* Image gallery — existing images from GET + pending uploads (desired state) */}
      <RecipeImageGallery disabled={isDisabled} gallery={gallery} />

      {/* Identity block */}
      <div className="flex min-w-0 flex-col gap-3">
        {/* Pill row */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Controller
            control={form.control}
            name="difficulty"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isDisabled}
              >
                <SelectTrigger
                  size="xs"
                  className="h-6 gap-1.5 rounded-full px-2 text-[0.6875rem] font-semibold tracking-wider"
                  aria-label={tfl("difficulty")}
                >
                  <span className="inline-flex items-center gap-1">
                    {[1, 2, 3].map((dot) => (
                      <span
                        key={dot}
                        className={cn(
                          "size-1.5 rounded-full",
                          dot <= (DIFFICULTY_DOTS[difficulty] ?? 0)
                            ? "bg-warning"
                            : "bg-muted-foreground/30",
                        )}
                        aria-hidden="true"
                      />
                    ))}
                  </span>
                  <SelectValue placeholder={t("selectDifficulty")} />
                </SelectTrigger>
                <SelectContent>
                  {RECIPE_DIFFICULTY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {ts(
                        opt.value.toLowerCase() as "easy" | "medium" | "hard",
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />

          <Controller
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <button
                type="button"
                onClick={() => !isDisabled && field.onChange(!field.value)}
                disabled={isDisabled}
                className={cn(
                  "inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-[0.6875rem] font-semibold transition-colors",
                  field.value
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-muted-foreground",
                  isDisabled && "cursor-not-allowed opacity-60",
                )}
                aria-pressed={field.value}
              >
                <Check className="size-2.5" aria-hidden="true" />
                {field.value ? t("active") : t("inactive")}
              </button>
            )}
          />

          <Controller
            control={form.control}
            name="deduct_from_stock"
            render={({ field }) => (
              <button
                type="button"
                onClick={() => !isDisabled && field.onChange(!field.value)}
                disabled={isDisabled}
                className={cn(
                  "inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-[0.6875rem] font-semibold transition-colors",
                  field.value
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-muted-foreground",
                  isDisabled && "cursor-not-allowed opacity-60",
                )}
                aria-pressed={field.value}
              >
                <Truck className="size-2.5" aria-hidden="true" />
                {t("deductsStock")}
              </button>
            )}
          />
        </div>

        {/* Name input · PL-style hero field */}
        <Controller
          control={form.control}
          name="name"
          render={({ field }) => (
            <RecipeNameField
              value={field.value ?? ""}
              onChange={field.onChange}
              placeholder={t("namePlaceholder")}
              disabled={isDisabled}
              error={form.formState.errors.name?.message}
              labels={{
                nameLabel: t("nameLabel"),
                tapToEdit: t("tapToEdit"),
                pressEnterToSave: t("pressEnterToSave"),
                clickToRename: t("clickToRename"),
                requiredField: t("requiredField"),
              }}
            />
          )}
        />

        {/* Description preview */}
        <p
          className={cn(
            "max-w-2xl text-sm leading-relaxed",
            description ? "text-foreground/80" : "text-muted-foreground italic",
          )}
        >
          {description || tfl("description")}
        </p>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <QuickStat
            icon={ChefHat}
            label={t("prep")}
            value={`${prepTime || 0}m`}
          />
          <QuickStat
            icon={Flame}
            label={t("cook")}
            value={`${cookTime || 0}m`}
          />
          <QuickStat
            icon={TagIcon}
            label={t("yield")}
            value={`${baseYield || 0}`}
          />
          <QuickStat
            icon={Sparkles}
            label={t("total")}
            value={`${totalTime}m`}
            accent
            sub={
              computed.costPerPortion > 0
                ? `฿${computed.costPerPortion.toFixed(2)}`
                : undefined
            }
          />
        </div>
      </div>
    </section>
  );
}

function QuickStat({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: string;
  readonly sub?: React.ReactNode;
  readonly accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2",
        accent
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1 text-[0.625rem] font-bold tracking-wider uppercase",
          accent ? "text-primary-foreground/70" : "text-muted-foreground",
        )}
      >
        <Icon className="size-3" aria-hidden="true" />
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-xl font-semibold tracking-tight",
          accent ? "text-primary-foreground" : "text-foreground",
        )}
      >
        {value}
      </div>
      {sub && (
        <div
          className={cn(
            "text-[0.6875rem]",
            accent ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
