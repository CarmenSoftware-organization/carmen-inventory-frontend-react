import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useCreateRecipe,
  useUpdateRecipe,
  useDeleteRecipe,
} from "@/hooks/use-recipe";
import type { Recipe } from "@/types/recipe";
import type { FormMode } from "@/types/form";
import {
  createRecipeSchema,
  type RecipeFormValues,
  getDefaultValues,
  textToArray,
  textToObject,
  mergeAllergens,
} from "./recipe-form-schema";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import { useRecipeCostCalc } from "./use-recipe-cost-calc";
import { useRecipeGallery } from "./use-recipe-gallery";
import { RecipeToolbar } from "./recipe-toolbar";
import { RecipeHeroFields } from "./recipe-hero-fields";
import { RecipeGeneralFields } from "./recipe-general-fields";
import {
  RecipeIngredientsFields,
  type RecipeIngredient,
} from "./recipe-ingredients-fields";
import { RecipeCostFields } from "./recipe-cost-fields";
import { RecipeComplianceFields } from "./recipe-compliance-fields";

export type { RecipeComputed } from "./use-recipe-cost-calc";

interface RecipeFormProps {
  readonly recipe?: Recipe;
}

export function RecipeForm({ recipe }: RecipeFormProps) {
  "use no memo";
  const t = useTranslations("operationPlan.recipe");
  const tt = useTranslations("toast");
  const tv = useTranslations("validation");
  const tfl = useTranslations("field");
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<FormMode>(recipe ? "view" : "add");
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();
  const deleteRecipe = useDeleteRecipe();
  const [showDelete, setShowDelete] = useState(false);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const isPending = createRecipe.isPending || updateRecipe.isPending;
  const isDisabled = isView || isPending;

  const defaultValues = getDefaultValues(recipe);

  const recipeSchema = createRecipeSchema(tv, tfl);
  const form = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeSchema) as Resolver<RecipeFormValues>,
    defaultValues,
  });

  const computed = useRecipeCostCalc(form);
  const gallery = useRecipeGallery(recipe?.images);

  const discard = useDiscardConfirm({
    isDirty: form.formState.isDirty || gallery.isDirty,
    isPending,
  });

  const onSubmit = (values: RecipeFormValues) => {
    const payload = buildRecipePayload(values);
    const { files, manifest, count, isDirty: galleryDirty } =
      gallery.buildPayload();

    if (isEdit && recipe) {
      // Send the full gallery manifest only when it changed (full-sync);
      // omitting it keeps the existing images untouched.
      updateRecipe.mutate(
        {
          id: recipe.id,
          // doc_version round-trips the loaded record's version — backend requires it for optimistic-concurrency on update
          doc_version: recipe.doc_version,
          ...payload,
          ...(galleryDirty ? { images: files, gallery: manifest } : {}),
        },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            navigate("/operation-plan/recipe");
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else {
      createRecipe.mutate(
        { ...payload, ...(count > 0 ? { images: files, gallery: manifest } : {}) },
        {
          onSuccess: () => {
            toast.success(tt("createSuccess", { entity: t("entity") }));
            navigate("/operation-plan/recipe");
          },
          onError: (err) => toast.error(err.message),
        },
      );
    }
  };

  const handleBack = () => {
    if (isEdit || isAdd) {
      discard.confirm(() => navigate("/operation-plan/recipe"));
    } else {
      navigate("/operation-plan/recipe");
    }
  };

  const handleEdit = () => setMode("edit");

  const handleCancel = () => {
    discard.confirm(() => {
      if (isEdit && recipe) {
        form.reset(getDefaultValues(recipe));
        gallery.reset();
        setMode("view");
      } else {
        navigate("/operation-plan/recipe");
      }
    });
  };

  const handleDelete = () => {
    if (!recipe) return;
    deleteRecipe.mutate(recipe.id, {
      onSuccess: () => {
        toast.success(tt("deleteSuccess", { entity: t("entity") }));
        navigate("/operation-plan/recipe");
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="space-y-4">
      <RecipeToolbar
        form={form}
        mode={mode}
        isPending={isPending}
        isDeleting={deleteRecipe.isPending}
        onBack={handleBack}
        onEdit={handleEdit}
        onCancel={handleCancel}
        onDelete={recipe ? () => setShowDelete(true) : undefined}
      />

      <form
        id="recipe-form"
        onSubmit={form.handleSubmit(onSubmit, () => scrollToFirstInvalidField())}
        className="space-y-4"
      >
        <RecipeHeroFields
          form={form}
          isDisabled={isDisabled}
          computed={computed}
          gallery={gallery}
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex min-w-0 flex-col gap-4">
            <RecipeGeneralFields form={form} isDisabled={isDisabled} />
            <RecipeIngredientsFields
              ingredients={ingredients}
              onChange={setIngredients}
              isDisabled={isDisabled}
            />
            <RecipeComplianceFields form={form} isDisabled={isDisabled} />
          </div>

          <div
            className={cn(
              "flex flex-col gap-3",
              !isMobile && "lg:sticky lg:top-4 lg:self-start",
            )}
          >
            <RecipeCostFields
              form={form}
              isDisabled={isDisabled}
              computed={computed}
            />
          </div>
        </div>
      </form>

      {recipe && (
        <DeleteDialog
          open={showDelete}
          onOpenChange={(open) =>
            !open && !deleteRecipe.isPending && setShowDelete(false)
          }
          title={t("deleteTitle")}
          description={t("deleteConfirm", { name: recipe.name })}
          isPending={deleteRecipe.isPending}
          onConfirm={handleDelete}
        />
      )}

      <DiscardDialog {...discard.dialogProps} variant="warning" />
    </div>
  );
}

function buildRecipePayload(values: RecipeFormValues) {
  return {
    code: values.code,
    name: values.name,
    description: values.description || null,
    note: values.note || null,
    status: values.status,
    difficulty: values.difficulty,
    cuisine_id: values.cuisine_id!,
    category_id: values.category_id!,
    prep_time: values.prep_time,
    cook_time: values.cook_time,
    base_yield: values.base_yield,
    base_yield_unit: values.base_yield_unit!,
    total_ingredient_cost: values.total_ingredient_cost,
    labor_cost: values.labor_cost,
    overhead_cost: values.overhead_cost,
    cost_per_portion: values.cost_per_portion,
    selling_price: values.selling_price,
    suggested_price: values.suggested_price,
    gross_margin: values.gross_margin,
    gross_margin_percentage: values.gross_margin_percentage,
    actual_food_cost_percentage: values.actual_food_cost_percentage,
    target_food_cost_percentage: values.target_food_cost_percentage,
    labor_cost_percentage: values.labor_cost_percentage,
    overhead_percentage: values.overhead_percentage,
    allergens: mergeAllergens(values.allergens),
    tags: textToArray(values.tags) ?? [],
    carbon_footprint: values.carbon_footprint,
    deduct_from_stock: values.deduct_from_stock,
    default_variant_id: values.default_variant_id || null,
    info: textToObject(values.info),
    dimension: textToObject(values.dimension),
    is_active: values.is_active,
  };
}
