
import { useEffect } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { round2 } from "@/lib/currency-utils";
import type { RecipeFormValues } from "./recipe-form-schema";

export interface RecipeComputed {
  costPerPortion: number;
  grossMargin: number | null;
  grossMarginPct: number | null;
  actualFoodCostPct: number | null;
  laborCostPct: number | null;
  overheadPct: number | null;
  suggestedPrice: number | null;
}

/**
 * คำนวณต้นทุนและกำไรอัตโนมัติของสูตรอาหารตามค่าในฟอร์ม
 * และเขียนผลลัพธ์กลับเข้า form fields ที่เกี่ยวข้อง (gross_margin, suggested_price ฯลฯ)
 */
export function useRecipeCostCalc(
  form: UseFormReturn<RecipeFormValues>,
): RecipeComputed {
  const [
    ingredientCost,
    laborCost,
    overheadCost,
    baseYield,
    sellingPrice,
    targetFoodCostPct,
  ] = useWatch({
    control: form.control,
    name: [
      "total_ingredient_cost",
      "labor_cost",
      "overhead_cost",
      "base_yield",
      "selling_price",
      "target_food_cost_percentage",
    ],
  });

  const ing = Number(ingredientCost) || 0;
  const lab = Number(laborCost) || 0;
  const ovh = Number(overheadCost) || 0;
  const yld = Number(baseYield) || 0;
  const sell = Number(sellingPrice) || 0;
  const targetPct = Number(targetFoodCostPct) || 0;

  const totalCost = ing + lab + ovh;
  const costPerPortion = yld > 0 ? round2(totalCost / yld) : 0;
  const grossMargin = sell > 0 ? round2(sell - costPerPortion) : null;
  const grossMarginPct =
    sell > 0 && grossMargin != null
      ? round2((grossMargin / sell) * 100)
      : null;
  const actualFoodCostPct =
    sell > 0 ? round2((ing / sell) * 100) : null;
  const laborCostPct = sell > 0 ? round2((lab / sell) * 100) : null;
  const overheadPct = sell > 0 ? round2((ovh / sell) * 100) : null;
  const suggestedPrice =
    targetPct > 0 && targetPct < 100
      ? round2(costPerPortion / (1 - targetPct / 100))
      : null;

  const computed = {
    costPerPortion,
    grossMargin,
    grossMarginPct,
    actualFoodCostPct,
    laborCostPct,
    overheadPct,
    suggestedPrice,
  };

  useEffect(() => {
    form.setValue("cost_per_portion", computed.costPerPortion);
    form.setValue("gross_margin", computed.grossMargin);
    form.setValue("gross_margin_percentage", computed.grossMarginPct);
    form.setValue("actual_food_cost_percentage", computed.actualFoodCostPct);
    form.setValue("labor_cost_percentage", computed.laborCostPct);
    form.setValue("overhead_percentage", computed.overheadPct);
    form.setValue("suggested_price", computed.suggestedPrice);
  }, [computed, form]);

  return computed;
}
