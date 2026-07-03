import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Field, FieldLabel, FieldPlainText } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { LookupWorkflow } from "@/components/lookup/lookup-workflow";
import { WORKFLOW_TYPE } from "@/types/workflows";
import type { PrFormValues } from "./pr-form-schema";
import { STAGE_ROLE } from "@/types/stage-role";

interface PrGeneralFieldsProps {
  readonly form: UseFormReturn<PrFormValues>;
  /** view mode → render เป็น plain text */
  readonly readOnly: boolean;
  /** submit pending → input ยังอยู่แต่กดไม่ได้ */
  readonly disabled: boolean;
  readonly role?: string;
  readonly fromTemplate?: boolean;
}

export function PrGeneralFields({
  form,
  readOnly,
  disabled,
  role,
  fromTemplate,
}: PrGeneralFieldsProps) {
  const t = useTranslations("procurement.purchaseRequest");
  const tfl = useTranslations("field");
  const watchedDescription = useWatch({
    control: form.control,
    name: "description",
  });

  // หลัง submit (role != CREATE) field ทั้งสองถูก lock ถาวร → render เป็น text
  const lockedAfterCreate = !!role && role !== STAGE_ROLE.CREATE;
  const descriptionReadOnly = readOnly || lockedAfterCreate;
  const workflowReadOnly = descriptionReadOnly || !!fromTemplate;

  return (
    <>
      <Field className={workflowReadOnly ? "gap-1" : undefined}>
        <FieldLabel
          required={!workflowReadOnly}
          className={
            workflowReadOnly ? "text-muted-foreground font-normal" : undefined
          }
        >
          {tfl("workflow")}
        </FieldLabel>
        <Controller
          control={form.control}
          name="workflow_id"
          render={({ field }) => (
            <LookupWorkflow
              value={field.value}
              onValueChange={field.onChange}
              workflowType={WORKFLOW_TYPE.PR}
              readOnly={workflowReadOnly}
              disabled={disabled}
              error={form.formState.errors.workflow_id?.message}
              className={workflowReadOnly ? "font-medium" : undefined}
            />
          )}
        />
      </Field>

      <Field className={descriptionReadOnly ? "gap-1" : undefined}>
        <FieldLabel
          htmlFor="pr-description"
          className={
            descriptionReadOnly
              ? "text-muted-foreground font-normal"
              : undefined
          }
        >
          {tfl("description")}
        </FieldLabel>
        {descriptionReadOnly ? (
          <FieldPlainText className="text-sm">
            {watchedDescription?.trim() ? (
              <span className="whitespace-pre-line">{watchedDescription}</span>
            ) : (
              <span className="text-muted-foreground font-normal">—</span>
            )}
          </FieldPlainText>
        ) : (
          <Textarea
            id="pr-description"
            placeholder={t("descPlaceholder")}
            rows={2}
            maxLength={256}
            disabled={disabled}
            {...form.register("description")}
          />
        )}
      </Field>
    </>
  );
}
