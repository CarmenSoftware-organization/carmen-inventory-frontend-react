
import { useTranslations } from "use-intl";
import { Plus, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldInput } from "@/components/ui/field";
import { Card } from "./recipe-card-shell";
import { cn } from "@/lib/utils";

export interface RecipeIngredient {
  id: string;
  name: string;
  qty: number;
  unit: string;
  cost: number;
  yieldPct: number;
  prep: string;
}

interface RecipeIngredientsFieldsProps {
  readonly ingredients: RecipeIngredient[];
  readonly onChange: (ingredients: RecipeIngredient[]) => void;
  readonly isDisabled: boolean;
}

const NEW_ROW_ID = "__new__";

const makeIngredient = (): RecipeIngredient => ({
  id: `${NEW_ROW_ID}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: "",
  qty: 1,
  unit: "",
  cost: 0,
  yieldPct: 100,
  prep: "",
});

export function RecipeIngredientsFields({
  ingredients,
  onChange,
  isDisabled,
}: RecipeIngredientsFieldsProps) {
  const t = useTranslations("operationPlan.recipe");
  const tfl = useTranslations("field");

  const total = ingredients.reduce((s, i) => s + (Number(i.cost) || 0), 0);

  const handleAdd = () => onChange([...ingredients, makeIngredient()]);
  const handleUpdate = (id: string, patch: Partial<RecipeIngredient>) =>
    onChange(ingredients.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const handleRemove = (id: string) =>
    onChange(ingredients.filter((i) => i.id !== id));

  return (
    <Card
      label={t("ingredients")}
      action={
        !isDisabled && ingredients.length > 0 ? (
          <Button type="button" size="xs" onClick={handleAdd} className="gap-1">
            <Plus className="size-3" aria-hidden="true" />
            {t("addIngredient")}
          </Button>
        ) : undefined
      }
    >
      <div className="mb-3 flex items-center justify-between gap-2 text-xs">
        <p className="text-muted-foreground">
          {ingredients.length === 0
            ? t("ingredientCount", { count: 0 })
            : t("ingredientCount", { count: ingredients.length })}
          {ingredients.length > 0 && (
            <>
              {" · "}
              <span className="text-foreground font-semibold">
                ฿{total.toFixed(2)}
              </span>
              {" "}
              {tfl("total")}
            </>
          )}
        </p>
        <span className="border-warning/30 bg-warning/10 text-warning-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.625rem] font-semibold">
          <Info className="size-2.5" aria-hidden="true" />
          {t("ingredientsPreviewNote")}
        </span>
      </div>

      {ingredients.length === 0 ? (
        <EmptyState
          isDisabled={isDisabled}
          onAdd={handleAdd}
          title={t("noIngredientsYet")}
          description={t("noIngredientsDesc")}
          actionLabel={t("addFirstIngredient")}
        />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-160 text-xs">
            <thead className="bg-muted/60">
              <tr className="text-foreground/70 text-left text-[0.625rem] font-bold tracking-[0.12em] uppercase">
                <th scope="col" className="w-8 px-2 py-2">
                  #
                </th>
                <th scope="col" className="px-2 py-2">
                  {t("ingredientName")}
                </th>
                <th scope="col" className="w-20 px-2 py-2 text-right">
                  {t("qty")}
                </th>
                <th scope="col" className="w-20 px-2 py-2">
                  {t("unit")}
                </th>
                <th scope="col" className="w-24 px-2 py-2 text-right">
                  {t("cost")}
                </th>
                <th scope="col" className="w-20 px-2 py-2 text-right">
                  {t("yieldPct")}
                </th>
                <th scope="col" className="px-2 py-2">
                  {t("prepNotes")}
                </th>
                <th
                  scope="col"
                  className="w-8 px-2 py-2"
                  aria-label="actions"
                />
              </tr>
            </thead>
            <tbody>
              {ingredients.map((ing, i) => (
                <IngredientRow
                  key={ing.id}
                  index={i + 1}
                  ingredient={ing}
                  onUpdate={(patch) => handleUpdate(ing.id, patch)}
                  onRemove={() => handleRemove(ing.id)}
                  isDisabled={isDisabled}
                />
              ))}
              <tr className="border-foreground bg-muted/40 border-t-2 font-semibold">
                <td
                  colSpan={4}
                  className="text-foreground/80 px-2 py-2 text-[0.625rem] tracking-[0.12em] uppercase"
                >
                  {t("totalRecipeCost")}
                </td>
                <td className="px-2 py-2 text-right text-sm">
                  ฿{total.toFixed(2)}
                </td>
                <td colSpan={3} />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function IngredientRow({
  index,
  ingredient,
  onUpdate,
  onRemove,
  isDisabled,
}: {
  readonly index: number;
  readonly ingredient: RecipeIngredient;
  readonly onUpdate: (patch: Partial<RecipeIngredient>) => void;
  readonly onRemove: () => void;
  readonly isDisabled: boolean;
}) {
  const lowYield = ingredient.yieldPct < 90;
  return (
    <tr className="border-border/60 border-t">
      <td className="text-muted-foreground px-2 py-1.5 text-[0.6875rem]">
        {String(index).padStart(2, "0")}
      </td>
      <td className="px-2 py-1.5">
        <FieldInput
          value={ingredient.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="—"
          disabled={isDisabled}
          className="h-7 text-xs"
        />
      </td>
      <td className="px-2 py-1.5 text-right">
        <FieldInput
          type="number"
          inputMode="decimal"
          value={ingredient.qty}
          onChange={(e) => onUpdate({ qty: parseFloat(e.target.value) || 0 })}
          disabled={isDisabled}
          className="h-7 text-right text-xs"
          errorIconAlign="left"
        />
      </td>
      <td className="px-2 py-1.5">
        <FieldInput
          value={ingredient.unit}
          onChange={(e) => onUpdate({ unit: e.target.value })}
          placeholder="g"
          disabled={isDisabled}
          className="h-7 text-xs"
        />
      </td>
      <td className="px-2 py-1.5">
        <div className="relative">
          <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-[0.625rem]">
            ฿
          </span>
          <FieldInput
            type="number"
            inputMode="decimal"
            step="0.01"
            value={ingredient.cost}
            onChange={(e) =>
              onUpdate({ cost: parseFloat(e.target.value) || 0 })
            }
            disabled={isDisabled}
            className="h-7 pl-5 text-right text-xs"
            errorIconAlign="left"
          />
        </div>
      </td>
      <td className="px-2 py-1.5 text-right">
        <FieldInput
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          value={ingredient.yieldPct}
          onChange={(e) =>
            onUpdate({ yieldPct: parseFloat(e.target.value) || 0 })
          }
          disabled={isDisabled}
          className={cn(
            "h-7 text-right text-xs",
            lowYield && "text-warning-foreground",
          )}
          errorIconAlign="left"
        />
      </td>
      <td className="px-2 py-1.5">
        <FieldInput
          value={ingredient.prep}
          onChange={(e) => onUpdate({ prep: e.target.value })}
          disabled={isDisabled}
          className="h-7 text-xs"
          lang="th"
        />
      </td>
      <td className="px-1 py-1.5 text-right">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onRemove}
          disabled={isDisabled}
          aria-label="Remove ingredient"
        >
          <X className="size-3" aria-hidden="true" />
        </Button>
      </td>
    </tr>
  );
}

function EmptyState({
  isDisabled,
  onAdd,
  title,
  description,
  actionLabel,
}: {
  readonly isDisabled: boolean;
  readonly onAdd: () => void;
  readonly title: string;
  readonly description: string;
  readonly actionLabel: string;
}) {
  return (
    <div className="border-primary/40 bg-primary/5 rounded-md border border-dashed px-4 py-6 text-center">
      <div className="border-primary/30 bg-card mx-auto mb-2 flex size-10 items-center justify-center rounded-md border">
        <Plus className="text-primary size-4" aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-muted-foreground mb-3 text-xs">{description}</p>
      <Button
        type="button"
        size="sm"
        onClick={onAdd}
        disabled={isDisabled}
        className="gap-1"
      >
        <Plus className="size-3" aria-hidden="true" />
        {actionLabel}
      </Button>
    </div>
  );
}
