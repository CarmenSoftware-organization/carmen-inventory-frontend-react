import { useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { FieldInput } from "@/components/ui/field";
import { SettingSection } from "@/components/ui/setting-section";
import type { RecipeFormValues } from "./recipe-form-schema";
import type { RecipeComputed } from "./use-recipe-cost-calc";

interface RecipeCostMetricsProps {
  readonly form: UseFormReturn<RecipeFormValues>;
  readonly isDisabled: boolean;
  readonly computed: RecipeComputed;
}

/** Other metrics — labor%, overhead%, carbon footprint */
export function RecipeCostMetrics({
  form,
  isDisabled,
  computed,
}: RecipeCostMetricsProps) {
  const t = useTranslations("operationPlan.recipe");
  const errors = form.formState.errors;
  const carbon = useWatch({
    control: form.control,
    name: "carbon_footprint",
  });

  return (
    <SettingSection
      plain
      title={t("otherMetrics")}
      description={t("otherMetricsDesc")}
    >
      <div className="space-y-2 text-xs">
        <InfoRow
          label={t("laborCostRatio")}
          value={
            computed.laborCostPct != null
              ? `${computed.laborCostPct.toFixed(1)}%`
              : "—"
          }
        />
        <InfoRow
          label={t("overhead")}
          value={
            computed.overheadPct != null
              ? `${computed.overheadPct.toFixed(1)}%`
              : "—"
          }
        />
        <InfoRow
          label={t("carbonFootprint")}
          value={
            carbon != null && Number(carbon) > 0
              ? t("carbonValueUnit", { value: carbon })
              : "—"
          }
        />
      </div>

      <div className="mt-3 grid grid-cols-2 items-center gap-2 text-xs">
        <label
          htmlFor="recipe-carbon-footprint"
          className="text-muted-foreground"
        >
          {t("carbonFootprint")}
        </label>
        <div className="relative">
          <FieldInput
            id="recipe-carbon-footprint"
            type="number"
            inputMode="decimal"
            step="0.01"
            disabled={isDisabled}
            className="h-7 pr-12 text-right text-xs"
            error={errors.carbon_footprint?.message}
            errorIconAlign="left"
            {...form.register("carbon_footprint")}
          />
          <span className="text-muted-foreground text-micro pointer-events-none absolute top-1/2 right-2 -translate-y-1/2">
            {t("kgCo2e")}
          </span>
        </div>
      </div>
    </SettingSection>
  );
}

function InfoRow({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
