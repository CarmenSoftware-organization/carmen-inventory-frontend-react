
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import { toast } from "sonner";
import {
  useCreateCuisine,
  useUpdateCuisine,
  useDeleteCuisine,
} from "@/hooks/use-cuisine";
import type { Cuisine } from "@/types/cuisine";
import type { FormMode } from "@/types/form";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import {
  cuisineSchema,
  getDefaultValues,
  mapToPayload,
  type CuisineFormValues,
} from "./cuisine-form-schema";
import { CuisineToolbar } from "./cuisine-toolbar";
import { CuisineGeneralFields } from "./cuisine-general-fields";
import { CuisineDetailFields } from "./cuisine-detail-fields";
import { CuisineAdditionalFields } from "./cuisine-additional-fields";

interface CuisineFormProps {
  readonly cuisine?: Cuisine;
}

/**
 * ฟอร์มสำหรับสร้างและแก้ไขข้อมูล cuisine รองรับโหมด view/edit/add
 */
export function CuisineForm({ cuisine }: CuisineFormProps) {
  const t = useTranslations("operationPlan.cuisine");
  const tt = useTranslations("toast");
  const navigate = useNavigate();
  const [mode, setMode] = useState<FormMode>(cuisine ? "view" : "add");
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const createCuisine = useCreateCuisine();
  const updateCuisine = useUpdateCuisine();
  const deleteCuisine = useDeleteCuisine();
  const [showDelete, setShowDelete] = useState(false);
  const isPending = createCuisine.isPending || updateCuisine.isPending;
  const isDisabled = isView || isPending;

  const form = useForm<CuisineFormValues>({
    resolver: zodResolver(cuisineSchema) as Resolver<CuisineFormValues>,
    defaultValues: getDefaultValues(cuisine),
  });

  const discard = useDiscardConfirm({
    isDirty: form.formState.isDirty,
    isPending,
  });

  const onSubmit = (values: CuisineFormValues) => {
    const payload = mapToPayload(values);

    if (isEdit && cuisine) {
      updateCuisine.mutate(
        // doc_version round-trips the loaded record's version — backend requires it for optimistic-concurrency on update
        { id: cuisine.id, doc_version: cuisine.doc_version, ...payload },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            navigate("/operation-plan/cuisine");
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else {
      createCuisine.mutate(payload, {
        onSuccess: () => {
          toast.success(tt("createSuccess", { entity: t("entity") }));
          navigate("/operation-plan/cuisine");
        },
        onError: (err) => toast.error(err.message),
      });
    }
  };

  const handleBack = () => {
    if (isEdit || isAdd) {
      discard.confirm(() => navigate("/operation-plan/cuisine"));
    } else {
      navigate("/operation-plan/cuisine");
    }
  };

  const handleEdit = () => setMode("edit");

  const handleCancel = () => {
    discard.confirm(() => {
      if (isEdit && cuisine) {
        form.reset(getDefaultValues(cuisine));
        setMode("view");
      } else {
        navigate("/operation-plan/cuisine");
      }
    });
  };

  const handleDelete = () => {
    if (!cuisine) return;
    deleteCuisine.mutate(cuisine.id, {
      onSuccess: () => {
        toast.success(tt("deleteSuccess", { entity: t("entity") }));
        navigate("/operation-plan/cuisine");
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="space-y-4">
      <CuisineToolbar
        form={form}
        mode={mode}
        isPending={isPending}
        isDeleting={deleteCuisine.isPending}
        onBack={handleBack}
        onEdit={handleEdit}
        onCancel={handleCancel}
        onDelete={cuisine ? () => setShowDelete(true) : undefined}
      />

      <form
        id="cuisine-form"
        onSubmit={form.handleSubmit(onSubmit, () => scrollToFirstInvalidField())}
        className="space-y-4"
      >
        <CuisineGeneralFields form={form} isDisabled={isDisabled} />
        <CuisineDetailFields form={form} isDisabled={isDisabled} />
        <CuisineAdditionalFields form={form} isDisabled={isDisabled} />
      </form>

      <DiscardDialog {...discard.dialogProps} variant="warning" />

      {cuisine && (
        <DeleteDialog
          open={showDelete}
          onOpenChange={(open) =>
            !open && !deleteCuisine.isPending && setShowDelete(false)
          }
          title={t("deleteTitle")}
          description={t("deleteConfirm", { name: cuisine.name })}
          isPending={deleteCuisine.isPending}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
