
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@/lib/compat/navigation";
import { useTranslations } from "use-intl";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import { toast } from "sonner";
import {
  useCreateRecipeCategory,
  useUpdateRecipeCategory,
  useDeleteRecipeCategory,
  useRecipeCategory,
} from "@/hooks/use-recipe-category";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import type { RecipeCategory } from "@/types/recipe-category";
import type { FormMode } from "@/types/form";
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
export function RecipeCategoryForm({ category }: RecipeCategoryFormProps) {
  const t = useTranslations("operationPlan.recipeCategory");
  const tt = useTranslations("toast");
  const router = useRouter();
  const [mode, setMode] = useState<FormMode>(category ? "view" : "add");
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const { data: allCategoryData } = useRecipeCategory({ perpage: -1 });
  const categoryMap = new Map((allCategoryData?.data ?? []).map((c) => [c.id, c]));

  const createCategory = useCreateRecipeCategory();
  const updateCategory = useUpdateRecipeCategory();
  const deleteCategory = useDeleteRecipeCategory();
  const [showDelete, setShowDelete] = useState(false);
  const isPending = createCategory.isPending || updateCategory.isPending;
  const isDisabled = isView || isPending;

  const form = useForm<RecipeCategoryFormValues>({
    resolver: zodResolver(
      recipeCategorySchema,
    ) as Resolver<RecipeCategoryFormValues>,
    defaultValues: getDefaultValues(category),
  });

  const discard = useDiscardConfirm({
    isDirty: form.formState.isDirty,
    isPending,
  });

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
            router.push("/operation-plan/category");
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else {
      createCategory.mutate(payload, {
        onSuccess: () => {
          toast.success(tt("createSuccess", { entity: t("entity") }));
          router.push("/operation-plan/category");
        },
        onError: (err) => toast.error(err.message),
      });
    }
  };

  const handleBack = () => {
    if (isEdit || isAdd) {
      discard.confirm(() => router.push("/operation-plan/category"));
    } else {
      router.push("/operation-plan/category");
    }
  };

  const handleEdit = () => setMode("edit");

  const handleCancel = () => {
    discard.confirm(() => {
      if (isEdit && category) {
        form.reset(getDefaultValues(category));
        setMode("view");
      } else {
        router.push("/operation-plan/category");
      }
    });
  };

  const handleDelete = () => {
    if (!category) return;
    deleteCategory.mutate(category.id, {
      onSuccess: () => {
        toast.success(tt("deleteSuccess", { entity: t("entity") }));
        router.push("/operation-plan/category");
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const excludeIds = category ? new Set([category.id]) : undefined;

  return (
    <div className="space-y-4">
      <RecipeCategoryToolbar
        form={form}
        mode={mode}
        isPending={isPending}
        isDeleting={deleteCategory.isPending}
        onBack={handleBack}
        onEdit={handleEdit}
        onCancel={handleCancel}
        onDelete={category ? () => setShowDelete(true) : undefined}
      />

      <form
        id="recipe-category-form"
        onSubmit={form.handleSubmit(onSubmit, () =>
          scrollToFirstInvalidField(),
        )}
        className="space-y-4"
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

      <DiscardDialog {...discard.dialogProps} variant="warning" />
    </div>
  );
}
