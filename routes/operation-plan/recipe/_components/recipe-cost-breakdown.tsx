
import { useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { cn } from "@/lib/utils";
import { FieldInput } from "@/components/ui/field";
import { Card } from "./recipe-card-shell";
import type { RecipeFormValues } from "./recipe-form-schema";

interface RecipeCostBreakdownProps {
  readonly form: UseFormReturn<RecipeFormValues>;
  readonly isDisabled: boolean;
}

/** Cost breakdown — stacked bar + 3 editable rows + total */
export function RecipeCostBreakdown({
  form,
  isDisabled,
}: RecipeCostBreakdownProps) {
  const t = useTranslations("operationPlan.recipe");
  const errors = form.formState.errors;

  const ingredientCost = useWatch({
    control: form.control,
    name: "total_ingredient_cost",
  });
  const laborCost = useWatch({ control: form.control, name: "labor_cost" });
  const overheadCost = useWatch({
    control: form.control,
    name: "overhead_cost",
  });

  const ing = Number(ingredientCost) || 0;
  const lab = Number(laborCost) || 0;
  const ovh = Number(overheadCost) || 0;
  const total = ing + lab + ovh;

  const ingPct = total > 0 ? (ing / total) * 100 : 0;
  const labPct = total > 0 ? (lab / total) * 100 : 0;
  const ovhPct = total > 0 ? (ovh / total) * 100 : 0;

  return (
    <Card label={t("costBreakdown")}>
      <div
        className="bg-muted mb-3 flex h-2 overflow-hidden rounded-full"
        aria-hidden="true"
      >
        <div
          className="bg-primary transition-all"
          style={{ width: `${ingPct}%` }}
        />
        <div
          className="bg-warning transition-all"
          style={{ width: `${labPct}%` }}
        />
        <div
          className="bg-foreground/70 transition-all"
          style={{ width: `${ovhPct}%` }}
        />
      </div>

      <div className="space-y-2">
        <CostRow
          color="bg-primary"
          label={t("ingredientCost")}
          pct={ingPct}
          input={
            <FieldInput
              type="number"
              inputMode="decimal"
              step="0.01"
              disabled={isDisabled}
              className="h-7 w-24 text-right text-xs"
              aria-label={t("ingredientCost")}
              error={errors.total_ingredient_cost?.message}
              errorIconAlign="left"
              {...form.register("total_ingredient_cost")}
            />
          }
        />
        <CostRow
          color="bg-warning"
          label={t("laborCost")}
          pct={labPct}
          input={
            <FieldInput
              type="number"
              inputMode="decimal"
              step="0.01"
              disabled={isDisabled}
              className="h-7 w-24 text-right text-xs"
              aria-label={t("laborCost")}
              error={errors.labor_cost?.message}
              errorIconAlign="left"
              {...form.register("labor_cost")}
            />
          }
        />
        <CostRow
          color="bg-foreground/70"
          label={t("overheadCost")}
          pct={ovhPct}
          input={
            <FieldInput
              type="number"
              inputMode="decimal"
              step="0.01"
              disabled={isDisabled}
              className="h-7 w-24 text-right text-xs"
              aria-label={t("overheadCost")}
              error={errors.overhead_cost?.message}
              errorIconAlign="left"
              {...form.register("overhead_cost")}
            />
          }
        />
      </div>

      <div className="border-foreground mt-3 flex items-baseline justify-between border-t-2 pt-3">
        <span className="text-foreground/80 text-[0.625rem] font-bold tracking-[0.14em] uppercase">
          {t("totalRecipeCost")}
        </span>
        <span className="text-base font-bold">฿{total.toFixed(2)}</span>
      </div>
    </Card>
  );
}

function CostRow({
  color,
  label,
  pct,
  input,
}: {
  readonly color: string;
  readonly label: string;
  readonly pct: number;
  readonly input: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[0.5rem_1fr_2.5rem_auto] items-center gap-2">
      <span className={cn("size-2 rounded-sm", color)} aria-hidden="true" />
      <span className="text-foreground/80 text-xs font-semibold">{label}</span>
      <span className="text-muted-foreground text-right text-[0.6875rem] font-semibold">
        {pct.toFixed(0)}%
      </span>
      {input}
    </div>
  );
}
