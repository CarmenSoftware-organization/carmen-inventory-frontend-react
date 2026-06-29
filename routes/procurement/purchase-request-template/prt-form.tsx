
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
import { Badge } from "@/components/ui/badge";
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
          onError: (err) => toast.error(err.message),
        },
      );
    } else if (isAdd) {
      createPrt.mutate(payload, {
        onSuccess: (data) => {
          toast.success(tt("createSuccess", { entity: t("entity") }));
          navigate(
            `/procurement/purchase-request-template/${data.data.id}`,
            { replace: true },
          );
          setMode("view");
        },
        onError: (err) => toast.error(err.message),
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
      discard.confirm(() =>
        navigate("/procurement/purchase-request-template"),
      );
    } else {
      navigate("/procurement/purchase-request-template");
    }
  };

  return (
    <div className="space-y-4">
      <FormToolbar
        entity={template?.name || t("entity")}
        statusBadge={
          template && (
            <Badge
              variant={template.is_active ? "default" : "secondary"}
              size="sm"
            >
              {template.is_active ? "ACTIVE" : "INACTIVE"}
            </Badge>
          )
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

      <form
        id="prt-form"
        onSubmit={form.handleSubmit(onSubmit, () =>
          scrollToFirstInvalidField(),
        )}
        className="space-y-4"
      >
        <PrtGeneralFields form={form} readOnly={isView} disabled={isPending} />
        <PrtItemFields
          form={form}
          readOnly={isView}
          disabled={isPending}
          defaultBu={defaultBu}
        />
      </form>

      <DiscardDialog {...discard.dialogProps} variant="warning" />

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
              onError: (err) => toast.error(err.message),
            });
          }}
        />
      )}
    </div>
  );
}
