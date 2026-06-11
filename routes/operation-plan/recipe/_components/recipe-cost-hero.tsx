
import { useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Sparkles, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { FieldInput } from "@/components/ui/field";
import type { RecipeFormValues } from "./recipe-form-schema";
import type { RecipeComputed } from "./use-recipe-cost-calc";

interface RecipeCostHeroProps {
  readonly form: UseFormReturn<RecipeFormValues>;
  readonly isDisabled: boolean;
  readonly computed: RecipeComputed;
}

/** Gradient hero — cost per portion + selling price + suggested chip */
export function RecipeCostHero({
  form,
  isDisabled,
  computed,
}: RecipeCostHeroProps) {
  const t = useTranslations("operationPlan.recipe");
  const errors = form.formState.errors;
  const targetFoodCostPct = useWatch({
    control: form.control,
    name: "target_food_cost_percentage",
  });
  const targetPct = Number(targetFoodCostPct) || 0;
  const portion = computed.costPerPortion;
  const suggested = computed.suggestedPrice;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md p-5 text-primary-foreground shadow-md",
        "bg-gradient-to-br from-primary via-primary to-primary/80",
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-info/40 blur-2xl"
      />
      <div className="relative space-y-4">
        <div>
          <div className="text-[0.625rem] font-bold uppercase tracking-[0.16em] text-primary-foreground/70">
            {t("costPerPortion")}
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-base text-primary-foreground/70">฿</span>
            <span className="text-4xl font-semibold tracking-tight">
              {portion.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="h-px bg-primary-foreground/20" />

        <div>
          <div className="text-[0.625rem] font-bold uppercase tracking-[0.16em] text-primary-foreground/70">
            {t("sellingPrice")}
          </div>
          <div className="mt-1 flex items-center gap-1">
            <span className="text-sm text-primary-foreground/80">฿</span>
            <FieldInput
              type="number"
              inputMode="decimal"
              step="0.01"
              disabled={isDisabled}
              className="h-auto w-32 border-0 bg-transparent p-0 text-2xl font-semibold tracking-tight text-primary-foreground shadow-none focus-visible:ring-0 placeholder:text-primary-foreground/40"
              placeholder="0.00"
              aria-label={t("sellingPrice")}
              error={errors.selling_price?.message}
              errorIconAlign="left"
              {...form.register("selling_price")}
            />
            <Pencil
              className="size-3 text-primary-foreground/50"
              aria-hidden="true"
            />
          </div>
          {suggested != null && suggested > 0 && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-2.5 py-1 text-[0.6875rem] font-semibold text-primary-foreground/90">
              <Sparkles className="size-2.5" aria-hidden="true" />
              {t("suggestedAtTarget", {
                price: `฿${suggested.toFixed(2)}`,
                pct: targetPct.toFixed(0),
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
