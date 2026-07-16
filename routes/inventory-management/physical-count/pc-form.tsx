
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { FormToolbar } from "@/components/ui/form-toolbar";
import { PrintDocumentButton } from "@/components/print-document-button";
import {
  useCreatePhysicalCount,
  useUpdatePhysicalCount,
  useDeletePhysicalCount,
} from "@/hooks/use-physical-count";
import type {
  PhysicalCount,
  CreatePhysicalCountDto,
} from "@/types/physical-count";
import type { FormMode } from "@/types/form";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import { PcGeneralFields } from "./pc-general-fields";
import {
  createPhysicalCountSchema,
  type PhysicalCountFormValues,
  getDefaultValues,
} from "./pc-form-schema";

interface PcFormProps {
  readonly physicalCount?: PhysicalCount;
}

export function PcForm({ physicalCount }: PcFormProps) {
  const t = useTranslations("inventoryManagement.physicalCount");
  const tt = useTranslations("toast");
  const tv = useTranslations("validation");
  const tfl = useTranslations("field");
  const navigate = useNavigate();
  const [mode, setMode] = useState<FormMode>(physicalCount ? "view" : "add");
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const createPc = useCreatePhysicalCount();
  const updatePc = useUpdatePhysicalCount();
  const deletePc = useDeletePhysicalCount();
  const [showDelete, setShowDelete] = useState(false);
  const isPending = createPc.isPending || updatePc.isPending;
  const isDisabled = isView || isPending;

  const physicalCountSchema = createPhysicalCountSchema(tv, tfl);
  const defaultValues = getDefaultValues(physicalCount);

  const form = useForm<PhysicalCountFormValues>({
    resolver: zodResolver(
      physicalCountSchema,
    ) as Resolver<PhysicalCountFormValues>,
    defaultValues,
  });

  const discard = useDiscardConfirm({
    isDirty: form.formState.isDirty,
    isPending,
  });

  const onSubmit = (values: PhysicalCountFormValues) => {
    const payload = {
      department_id: values.department_id,
    } as unknown as CreatePhysicalCountDto;

    if (isEdit && physicalCount) {
      updatePc.mutate(
        { id: physicalCount.id, doc_version: physicalCount.doc_version, ...payload },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            setMode("view");
          },
        },
      );
    } else if (isAdd) {
      createPc.mutate(payload, {
        onSuccess: () => {
          toast.success(tt("createSuccess", { entity: t("entity") }));
          navigate("/inventory-management/physical-count");
        },
      });
    }
  };

  const handleCancel = () => {
    discard.confirm(() => {
      if (isEdit && physicalCount) {
        form.reset(defaultValues);
        setMode("view");
      } else {
        navigate("/inventory-management/physical-count");
      }
    });
  };

  const handleBack = () => {
    if (isEdit || isAdd) {
      discard.confirm(() =>
        navigate("/inventory-management/physical-count"),
      );
    } else {
      navigate("/inventory-management/physical-count");
    }
  };

  return (
    <div className="space-y-4">
      <FormToolbar
        entity={t("entity")}
        mode={mode}
        formId="pc-form"
        isPending={isPending}
        onBack={handleBack}
        onCancel={handleCancel}
        onEdit={() => setMode("edit")}
        onDelete={physicalCount ? () => setShowDelete(true) : undefined}
        deleteIsPending={deletePc.isPending}
      >
        {mode === "view" && physicalCount?.id && (
          <PrintDocumentButton
            documentType="PC"
            documentId={physicalCount.id}
          />
        )}
      </FormToolbar>

      <form
        id="pc-form"
        onSubmit={form.handleSubmit(onSubmit, () =>
          scrollToFirstInvalidField(),
        )}
        className="space-y-4"
      >
        <PcGeneralFields form={form} disabled={isDisabled} />
      </form>

      <DiscardDialog {...discard.dialogProps} variant="warning" />

      {physicalCount && (
        <DeleteDialog
          open={showDelete}
          onOpenChange={(open) =>
            !open && !deletePc.isPending && setShowDelete(false)
          }
          title={t("deleteTitle")}
          description={t("deleteConfirm")}
          isPending={deletePc.isPending}
          onConfirm={() => {
            deletePc.mutate(physicalCount.id, {
              onSuccess: () => {
                toast.success(tt("deleteSuccess", { entity: t("entity") }));
                navigate("/inventory-management/physical-count");
              },
            });
          }}
        />
      )}
    </div>
  );
}
