import { useState } from "react";
import {
  useForm,
  useWatch,
  Controller,
  type Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import {
  buildItemChanges,
  scrollToFirstInvalidField,
} from "@/lib/form-helpers";
import { FormToolbar } from "@/components/ui/form-toolbar";
import { StatusBadge } from "@/components/ui/status-badge";
import { NotesSection } from "@/components/ui/notes-section";
import { Field, FieldLabel, FieldPlainText } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { StatusSwitch } from "@/components/ui/status-switch";
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

  const watchedDescription = useWatch({
    control: form.control,
    name: "description",
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
          navigate(`/procurement/purchase-request-template/${data.data.id}`, {
            replace: true,
          });
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
      discard.confirm(() => navigate("/procurement/purchase-request-template"));
    } else {
      navigate("/procurement/purchase-request-template");
    }
  };

  return (
    <div className="space-y-4">
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

      <form
        id="prt-form"
        onSubmit={form.handleSubmit(onSubmit, () =>
          scrollToFirstInvalidField(),
        )}
        className="space-y-4 px-4"
      >
        <PrtGeneralFields form={form} readOnly={isView} disabled={isPending} />
        <PrtItemFields
          form={form}
          readOnly={isView}
          disabled={isPending}
          defaultBu={defaultBu}
        />

        <NotesSection title={t("sectionNotes")} subtitle={t("sectionNotesSub")}>
          <Field className={isView ? "gap-1" : undefined}>
            <FieldLabel
              htmlFor="prt-description"
              className={isView ? "text-muted-foreground font-normal" : undefined}
            >
              {tfl("description")}
            </FieldLabel>
            {isView ? (
              <FieldPlainText className="text-sm">
                {watchedDescription?.trim() ? (
                  <span className="whitespace-pre-line">
                    {watchedDescription}
                  </span>
                ) : (
                  <span className="text-muted-foreground font-normal">—</span>
                )}
              </FieldPlainText>
            ) : (
              <Textarea
                id="prt-description"
                placeholder={tfl("optional")}
                rows={2}
                disabled={isPending}
                maxLength={256}
                {...form.register("description")}
              />
            )}
          </Field>

          <Controller
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <StatusSwitch
                id="prt-is-active"
                checked={field.value}
                onCheckedChange={field.onChange}
                description="Enable to make this template available for use"
                disabled={isView || isPending}
              />
            )}
          />
        </NotesSection>
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
