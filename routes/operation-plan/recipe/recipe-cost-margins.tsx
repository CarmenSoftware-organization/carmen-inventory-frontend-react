import { useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { cn } from "@/lib/utils";
import { FieldInput } from "@/components/ui/field";
import { SettingSection } from "@/components/ui/setting-section";
import { EyeBrow } from "@/components/ui/eye-brow";
import { formatCurrency } from "@/lib/currency-utils";
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
    <SettingSection plain title={t("margins")} description={t("marginsDesc")}>
      <div className="grid grid-cols-2 gap-3">
        <MarginTile
          label={t("grossMargin")}
          value={`฿${formatCurrency(grossMargin)}`}
          sub={`${grossMarginPct.toFixed(2)}%`}
          isNegative={grossMargin < 0}
        />
        <MarginTile
          label={t("foodCost")}
          value={`${foodPct.toFixed(2)}%`}
          sub={`${t("targetFoodCost")} ${targetPct.toFixed(0)}%`}
          isNegative={!onTarget}
        />
      </div>

      <div className="bg-muted text-foreground mt-3 flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold">
        <span
          className={cn(
            "size-1.5 rounded-full",
            onTarget ? "bg-muted-foreground/40" : "bg-destructive",
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
            size="sm"
            className="pr-6 text-right text-xs"
            aria-label={t("targetFoodCost")}
            error={errors.target_food_cost_percentage?.message}
            errorIconAlign="left"
            {...form.register("target_food_cost_percentage")}
          />
          <span className="text-muted-foreground text-micro pointer-events-none absolute top-1/2 right-2 -translate-y-1/2">
            %
          </span>
        </div>
      </div>
    </SettingSection>
  );
}

function MarginTile({
  label,
  value,
  sub,
  isNegative,
}: {
  readonly label: string;
  readonly value: string;
  readonly sub: string;
  readonly isNegative: boolean;
}) {
  return (
    <div>
      <EyeBrow>{label}</EyeBrow>
      <div
        className={cn(
          "mt-0.5 text-lg font-semibold tracking-tight tabular-nums",
          isNegative ? "text-destructive" : "text-foreground",
        )}
      >
        {value}
      </div>
      <div className="text-muted-foreground text-micro tabular-nums">{sub}</div>
    </div>
  );
}
