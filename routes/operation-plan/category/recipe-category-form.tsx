import { useState } from "react";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "use-intl";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useEntityForm } from "@/hooks/use-entity-form";
import { toast } from "sonner";
import {
  useCreateRecipeCategory,
  useUpdateRecipeCategory,
  useDeleteRecipeCategory,
  useRecipeCategory,
} from "@/hooks/use-recipe-category";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import type { RecipeCategory } from "@/types/recipe-category";
import {
  recipeCategorySchema,
  getDefaultValues,
  mapToPayload,
  type RecipeCategoryFormValues,
} from "./recipe-category-form-schema";
import { RecipeCategoryToolbar } from "./recipe-category-toolbar";
import { RecipeCategoryGeneralFields } from "./recipe-category-general-fields";
import { RecipeCategoryCostFields } from "./recipe-category-cost-fields";
import { RecipeCategoryMarginFields } from "./recipe-category-margin-fields";

interface RecipeCategoryFormProps {
  readonly category?: RecipeCategory;
}

/**
 * ฟอร์มสร้างและแก้ไขหมวดหมู่สูตรอาหาร พร้อมการคำนวณระดับและต้นทุนเริ่มต้น
 */
const LIST_PATH = "/operation-plan/category";

export function RecipeCategoryForm({ category }: RecipeCategoryFormProps) {
  const t = useTranslations("operationPlan.recipeCategory");
  const tt = useTranslations("toast");

  const { data: allCategoryData } = useRecipeCategory({ perpage: -1 });
  const categoryMap = new Map(
    (allCategoryData?.data ?? []).map((c) => [c.id, c]),
  );

  const createCategory = useCreateRecipeCategory();
  const updateCategory = useUpdateRecipeCategory();
  const deleteCategory = useDeleteRecipeCategory();
  const [showDelete, setShowDelete] = useState(false);
  const isPending = createCategory.isPending || updateCategory.isPending;

  const f = useEntityForm<RecipeCategoryFormValues>({
    entity: category,
    resolver: zodResolver(
      recipeCategorySchema,
    ) as Resolver<RecipeCategoryFormValues>,
    defaultValues: getDefaultValues(category),
    listPath: LIST_PATH,
    isPending,
  });
  const { form, isEdit, isDisabled } = f;

  const handleParentChange = (parentId: string) => {
    if (!parentId) {
      form.setValue("level", 1);
    } else {
      const parent = categoryMap.get(parentId);
      form.setValue("level", parent ? parent.level + 1 : 1);
    }
  };

  const onSubmit = (values: RecipeCategoryFormValues) => {
    const payload = mapToPayload(values);

    if (isEdit && category) {
      updateCategory.mutate(
        // doc_version round-trips the loaded record's version — backend requires it for optimistic-concurrency on update
        { id: category.id, doc_version: category.doc_version, ...payload },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            f.backToList();
          },
        },
      );
    } else {
      createCategory.mutate(payload, {
        onSuccess: () => {
          toast.success(tt("createSuccess", { entity: t("entity") }));
          f.backToList();
        },
      });
    }
  };

  const handleDelete = () => {
    if (!category) return;
    deleteCategory.mutate(category.id, {
      onSuccess: () => {
        toast.success(tt("deleteSuccess", { entity: t("entity") }));
        f.backToList();
      },
    });
  };

  const excludeIds = category ? new Set([category.id]) : undefined;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-[max(1rem,env(safe-area-inset-bottom))]">
      <RecipeCategoryToolbar
        form={form}
        mode={f.mode}
        isPending={isPending}
        isDeleting={deleteCategory.isPending}
        onBack={f.handleBack}
        onEdit={f.handleEdit}
        onCancel={f.handleCancel}
        onDelete={category ? () => setShowDelete(true) : undefined}
        activityId={category?.id}
      />

      <form
        id="recipe-category-form"
        onSubmit={form.handleSubmit(onSubmit, () =>
          scrollToFirstInvalidField(),
        )}
      >
        <RecipeCategoryGeneralFields
          form={form}
          isDisabled={isDisabled}
          excludeIds={excludeIds}
          onParentChange={handleParentChange}
        />
        <RecipeCategoryCostFields form={form} isDisabled={isDisabled} />
        <RecipeCategoryMarginFields form={form} isDisabled={isDisabled} />
      </form>

      {category && (
        <DeleteDialog
          open={showDelete}
          onOpenChange={(open) =>
            !open && !deleteCategory.isPending && setShowDelete(false)
          }
          title={t("deleteTitle")}
          description={t("deleteConfirm", { name: category.name })}
          isPending={deleteCategory.isPending}
          onConfirm={handleDelete}
        />
      )}

      <DiscardDialog {...f.discard.dialogProps} variant="warning" />

      <DiscardDialog
        open={f.navGuard.isOpen}
        onOpenChange={(o) => {
          if (!o) f.navGuard.cancel();
        }}
        onConfirm={f.navGuard.confirm}
        onCancel={f.navGuard.cancel}
        variant="warning"
      />
    </div>
  );
}
