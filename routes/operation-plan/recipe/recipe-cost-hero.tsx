import { useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Sparkles } from "lucide-react";
import { FieldInput } from "@/components/ui/field";
import { SettingSection } from "@/components/ui/setting-section";
import type { RecipeFormValues } from "./recipe-form-schema";
import type { RecipeComputed } from "./use-recipe-cost-calc";

interface RecipeCostHeroProps {
  readonly form: UseFormReturn<RecipeFormValues>;
  readonly isDisabled: boolean;
  readonly computed: RecipeComputed;
}

/**
 * Section ต้นทุน/ราคา — cost per portion (computed) + selling price (input) +
 * suggested chip · neutral ตาม DESIGN.md (accent อยู่ที่ตัวเลขอย่างเดียว ไม่ใช่
 * ทั้งบล็อกสีทึบ) เข้าชุดกับ section 2-col อื่นของฟอร์ม
 */
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
    <SettingSection plain title={t("pricing")} description={t("pricingDesc")}>
      <div className="space-y-4">
        {/* Cost per portion — computed · accent อยู่ที่ตัวเลข */}
        <div>
          <div className="text-muted-foreground text-micro-legal font-bold tracking-wider uppercase">
            {t("costPerPortion")}
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-muted-foreground text-base">฿</span>
            <span className="text-foreground text-3xl font-semibold tracking-tight tabular-nums">
              {portion.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Selling price — input */}
        <div>
          <div className="text-muted-foreground text-micro-legal font-bold tracking-wider uppercase">
            {t("sellingPrice")}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-muted-foreground text-sm">฿</span>
            <FieldInput
              type="number"
              inputMode="decimal"
              step="0.01"
              disabled={isDisabled}
              className="h-9 w-32 text-lg font-semibold tabular-nums"
              placeholder="0.00"
              aria-label={t("sellingPrice")}
              error={errors.selling_price?.message}
              errorIconAlign="left"
              {...form.register("selling_price")}
            />
          </div>
          {suggested != null && suggested > 0 && (
            <div className="bg-muted text-muted-foreground mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-micro font-semibold">
              <Sparkles className="size-2.5" aria-hidden="true" />
              {t("suggestedAtTarget", {
                price: `฿${suggested.toFixed(2)}`,
                pct: targetPct.toFixed(0),
              })}
            </div>
          )}
        </div>
      </div>
    </SettingSection>
  );
}
