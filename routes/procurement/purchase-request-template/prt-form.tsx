import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import {
  buildItemChanges,
  scrollToFirstInvalidField,
} from "@/lib/form-helpers";
import { FormToolbar } from "@/components/ui/form-toolbar";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "sonner";
import { useCreatePrt, useUpdatePrt, useDeletePrt } from "@/hooks/use-prt";
import type {
  PurchaseRequestTemplate,
  CreatePrtDto,
} from "@/types/purchase-request";
import type { FormMode } from "@/types/form";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";
import { PrtGeneralFields } from "./prt-general-fields";
import { PrtItemFields } from "./prt-item-fields";
import {
  createPrtSchema,
  type PrtFormValues,
  getDefaultValues,
  mapItemToPayload,
} from "./prt-form-schema";
import { useProfile } from "@/hooks/use-profile";

interface PrtFormProps {
  readonly template?: PurchaseRequestTemplate;
}

export function PrtForm({ template }: PrtFormProps) {
  const t = useTranslations("procurement.purchaseRequestTemplate");
  const tt = useTranslations("toast");
  const tv = useTranslations("validation");
  const tfl = useTranslations("field");
  const { defaultBu } = useProfile();
  const navigate = useNavigate();
  const [mode, setMode] = useState<FormMode>(template ? "view" : "add");
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const createPrt = useCreatePrt();
  const updatePrt = useUpdatePrt();
  const deletePrt = useDeletePrt();
  const [showDelete, setShowDelete] = useState(false);
  const isPending = createPrt.isPending || updatePrt.isPending;

  const defaultValues = getDefaultValues(template);

  const prtSchema = createPrtSchema(tv, tfl);
  const form = useForm<PrtFormValues>({
    resolver: zodResolver(prtSchema) as Resolver<PrtFormValues>,
    defaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
  });

  const discard = useDiscardConfirm({
    isDirty: form.formState.isDirty,
    isPending,
  });

  // in-app navigation guard: เตือนก่อนออกเมื่อ add/edit และฟอร์มถูกแก้ไข
  const navGuard = useNavigationGuard(
    (isAdd || isEdit) && form.formState.isDirty,
  );

  const onSubmit = (values: PrtFormValues) => {
    const purchase_request_template_detail = buildItemChanges(
      values.items,
      defaultValues.items,
      form.formState.dirtyFields.items as Record<string, unknown>[] | undefined,
      mapItemToPayload,
    );

    const payload: CreatePrtDto = {
      name: values.name,
      description: values.description,
      workflow_id: values.workflow_id,
      is_active: values.is_active,
      purchase_request_template_detail,
    };

    if (isEdit && template) {
      updatePrt.mutate(
        { id: template.id, doc_version: template.doc_version, ...payload },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            setMode("view");
          },
        },
      );
    } else if (isAdd) {
      createPrt.mutate(payload, {
        onSuccess: (data) => {
          toast.success(tt("createSuccess", { entity: t("entity") }));
          navigate(`/procurement/purchase-request-template/${data.data.id}`, {
            replace: true,
          });
          setMode("view");
        },
      });
    }
  };

  const handleCancel = () => {
    discard.confirm(() => {
      if (isEdit && template) {
        form.reset(defaultValues);
        setMode("view");
      } else {
        navigate("/procurement/purchase-request-template");
      }
    });
  };

  const handleBack = () => {
    if (isEdit || isAdd) {
      discard.confirm(() => navigate("/procurement/purchase-request-template"));
    } else {
      navigate("/procurement/purchase-request-template");
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-[max(1rem,env(safe-area-inset-bottom))]">
      <FormToolbar
        entity={template?.name || t("entity")}
        statusBadge={
          template && <StatusBadge active={template.is_active} size="xs" />
        }
        mode={mode}
        formId="prt-form"
        isPending={isPending}
        onBack={handleBack}
        onEdit={() => setMode("edit")}
        onCancel={handleCancel}
        onDelete={template ? () => setShowDelete(true) : undefined}
        deleteIsPending={deletePrt.isPending}
      />

      <div className="mt-6">
        <form
          id="prt-form"
          onSubmit={form.handleSubmit(onSubmit, () =>
            scrollToFirstInvalidField(),
          )}
        >
          <PrtGeneralFields
            form={form}
            readOnly={isView}
            disabled={isPending}
            workflowName={template?.workflow_name}
          />
          <PrtItemFields
            form={form}
            readOnly={isView}
            disabled={isPending}
            defaultBu={defaultBu}
          />
        </form>
      </div>

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

      {template && (
        <DeleteDialog
          open={showDelete}
          onOpenChange={(open) =>
            !open && !deletePrt.isPending && setShowDelete(false)
          }
          title={t("deleteTitle")}
          description={t("deleteConfirm", { name: template.name })}
          isPending={deletePrt.isPending}
          onConfirm={() => {
            deletePrt.mutate(template.id, {
              onSuccess: () => {
                toast.success(tt("deleteSuccess", { entity: t("entity") }));
                navigate("/procurement/purchase-request-template");
              },
            });
          }}
        />
      )}
    </div>
  );
}
