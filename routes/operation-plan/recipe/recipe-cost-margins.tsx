
import { useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { cn } from "@/lib/utils";
import { FieldInput } from "@/components/ui/field";
import { Card } from "./recipe-card-shell";
import type { RecipeFormValues } from "./recipe-form-schema";
import type { RecipeComputed } from "./use-recipe-cost-calc";

interface RecipeCostMarginsProps {
  readonly form: UseFormReturn<RecipeFormValues>;
  readonly isDisabled: boolean;
  readonly computed: RecipeComputed;
}

/** Margins panel — gross margin tile + food cost tile + signal banner + target editor */
export function RecipeCostMargins({
  form,
  isDisabled,
  computed,
}: RecipeCostMarginsProps) {
  const t = useTranslations("operationPlan.recipe");
  const errors = form.formState.errors;
  const targetFoodCostPct = useWatch({
    control: form.control,
    name: "target_food_cost_percentage",
  });
  const targetPct = Number(targetFoodCostPct) || 0;

  const grossMargin = computed.grossMargin ?? 0;
  const grossMarginPct = computed.grossMarginPct ?? 0;
  const foodPct = computed.actualFoodCostPct ?? 0;
  const onTarget =
    targetPct > 0 && foodPct > 0 ? foodPct <= targetPct : foodPct === 0;

  return (
    <Card label={t("margins")}>
      <div className="grid grid-cols-2 gap-2">
        <MarginTile
          label={t("grossMargin")}
          value={`฿${grossMargin.toFixed(2)}`}
          sub={`${grossMarginPct.toFixed(2)}%`}
          tone={grossMargin >= 0 ? "success" : "destructive"}
        />
        <MarginTile
          label={t("foodCost")}
          value={`${foodPct.toFixed(2)}%`}
          sub={`${t("targetFoodCost")} ${targetPct.toFixed(0)}%`}
          tone={onTarget ? "success" : "destructive"}
        />
      </div>

      <div
        className={cn(
          "mt-3 flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold",
          onTarget
            ? "bg-success/10 text-success-foreground"
            : "bg-destructive/10 text-destructive-foreground",
        )}
      >
        <span
          className={cn(
            "size-1.5 rounded-full",
            onTarget ? "bg-success" : "bg-destructive",
          )}
          aria-hidden="true"
        />
        {foodPct === 0
          ? t("atTargetCap")
          : onTarget
            ? t("onTargetMessage", { pct: grossMarginPct.toFixed(1) })
            : t("aboveTargetMessage", {
                pts: (foodPct - targetPct).toFixed(1),
              })}
      </div>

      <div className="mt-3 grid grid-cols-2 items-center gap-2 text-xs">
        <span className="text-muted-foreground">{t("targetFoodCost")}</span>
        <div className="relative">
          <FieldInput
            type="number"
            inputMode="decimal"
            step="0.1"
            min={0}
            max={100}
            disabled={isDisabled}
            className="h-7 pr-6 text-right text-xs"
            aria-label={t("targetFoodCost")}
            error={errors.target_food_cost_percentage?.message}
            errorIconAlign="left"
            {...form.register("target_food_cost_percentage")}
          />
          <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[0.6875rem]">
            %
          </span>
        </div>
      </div>
    </Card>
  );
}

function MarginTile({
  label,
  value,
  sub,
  tone,
}: {
  readonly label: string;
  readonly value: string;
  readonly sub: string;
  readonly tone: "success" | "destructive";
}) {
  return (
    <div className="bg-muted/40 rounded-md border p-3">
      <div className="text-muted-foreground text-[0.625rem] font-bold tracking-[0.14em] uppercase">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-xl font-semibold tracking-tight",
          tone === "success"
            ? "text-success-foreground"
            : "text-destructive-foreground",
        )}
      >
        {value}
      </div>
      <div className="text-muted-foreground text-[0.6875rem] font-semibold">
        {sub}
      </div>
    </div>
  );
}
