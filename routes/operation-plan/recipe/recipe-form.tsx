import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";
import { toast } from "sonner";
import {
  useCreateRecipe,
  useUpdateRecipe,
  useDeleteRecipe,
} from "./use-recipe";
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

  // guard สองตัวต้องอ่าน dirty ค่าเดียวกัน ไม่งั้นปุ่ม Back ถามแต่เมนู sidebar เงียบ
  const isFormDirty = form.formState.isDirty || gallery.isDirty;

  const discard = useDiscardConfirm({
    isDirty: isFormDirty,
    isPending,
  });

  // ระหว่าง submit ตอน create ปิด guard — ไม่งั้น sentinel ที่ guard ดันไว้ที่ /new
  // ค้างอยู่ใน history stack หลัง navigate ออกไป กด back แล้วเจอ /new ซ้ำ
  const [isSubmitting, setIsSubmitting] = useState(false);

  // useDiscardConfirm ดักได้แค่ปุ่มในฟอร์มเอง (Cancel/Back) — ลิงก์ข้างนอกอย่าง
  // เมนู sidebar ต้องใช้ตัวนี้ดัก ไม่งั้นกดแล้วหลุดออกไปพร้อมข้อมูลที่ยังไม่ได้เซฟ
  const navGuard = useNavigationGuard(
    (isAdd || isEdit) && isFormDirty && !isSubmitting,
  );

  const onSubmit = (values: RecipeFormValues) => {
    const payload = buildRecipePayload(values);
    const {
      files,
      manifest,
      count,
      isDirty: galleryDirty,
    } = gallery.buildPayload();

    if (isEdit && recipe) {
      // Send the full gallery manifest only when it changed (full-sync);
      // omitting it keeps the existing images untouched.
      // ปิด guard ก่อนยิง mutation → sentinel ถูก teardown ลบระหว่างรอ network
      setIsSubmitting(true);
      updateRecipe.mutate(
        {
          id: recipe.id,
          // doc_version round-trips the loaded record's version — backend requires it for optimistic-concurrency on update
          doc_version: recipe.doc_version,
          ...payload,
          ...(galleryDirty ? { images: files, gallery: manifest } : {}),
        },
        {
          onError: () => setIsSubmitting(false),
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            navigate("/operation-plan/recipe");
          },
        },
      );
    } else {
      // ปิด guard ก่อนยิง mutation → sentinel ถูก teardown ลบระหว่างรอ network
      setIsSubmitting(true);
      createRecipe.mutate(
        {
          ...payload,
          ...(count > 0 ? { images: files, gallery: manifest } : {}),
        },
        {
          onError: () => setIsSubmitting(false),
          onSuccess: () => {
            toast.success(tt("createSuccess", { entity: t("entity") }));
            navigate("/operation-plan/recipe");
          },
        },
      );
    }
  };

  // Back = กลับหน้า list เสมอ ไม่ใช่ history back — จากหน้า detail ผู้ใช้เดินไปใบอื่น
  // ได้ (ปุ่ม ↑↓ ของ DocSequenceNav) history จึงเป็นเส้นทางที่เดินผ่านมา ไม่ใช่ที่ที่
  // อยากกลับไป กดครั้งเดียวต้องถึง list ไม่ใช่ถอยทีละใบ
  const goBack = () => {
    navigate("/operation-plan/recipe");
  };

  const handleBack = () => {
    if (isEdit || isAdd) {
      discard.confirm(goBack);
    } else {
      goBack();
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
    });
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-[max(1rem,env(safe-area-inset-bottom))]">
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

      {/* flatten หน้าเดียว: hero บนสุด แล้วแต่ละ section เป็น 2-col แบบ company
          profile (title/desc ซ้าย · เนื้อหาขวา) stack ต่อกันด้วยเส้นคั่น */}
      <form
        id="recipe-form"
        onSubmit={form.handleSubmit(onSubmit, () =>
          scrollToFirstInvalidField(),
        )}
      >
        <RecipeHeroFields
          form={form}
          isDisabled={isDisabled}
          computed={computed}
          gallery={gallery}
        />
        <RecipeGeneralFields form={form} isDisabled={isDisabled} />
        <RecipeIngredientsFields
          ingredients={ingredients}
          onChange={setIngredients}
          isDisabled={isDisabled}
        />
        <RecipeComplianceFields form={form} isDisabled={isDisabled} />
        <RecipeCostFields
          form={form}
          isDisabled={isDisabled}
          computed={computed}
        />
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

      <DiscardDialog
        open={navGuard.isOpen}
        onOpenChange={(o) => {
          if (!o) navGuard.cancel();
        }}
        onConfirm={navGuard.confirm}
        onCancel={navGuard.cancel}
        variant="warning"
      />
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
