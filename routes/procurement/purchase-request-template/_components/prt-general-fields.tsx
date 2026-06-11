
import { useTranslations } from "use-intl";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import {
  Field,
  FieldGroup,
  FieldInput,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { StatusSwitch } from "@/components/ui/status-switch";
import { LookupWorkflow } from "@/components/lookup/lookup-workflow";
import { WORKFLOW_TYPE } from "@/types/workflows";
import type { PrtFormValues } from "./prt-form-schema";

interface PrtGeneralFieldsProps {
  readonly form: UseFormReturn<PrtFormValues>;
  /** view mode → render เป็น plain text */
  readonly readOnly: boolean;
  /** submit pending → input ยังอยู่แต่กดไม่ได้ */
  readonly disabled: boolean;
}

/**
 * ฟิลด์ข้อมูลทั่วไปของฟอร์ม PRT เช่น ชื่อ คำอธิบาย workflow
 * @param props - form instance, readOnly (view), disabled (pending)
 * @returns React element ของฟิลด์ทั่วไป PRT
 */
export function PrtGeneralFields({
  form,
  readOnly,
  disabled,
}: PrtGeneralFieldsProps) {
  const t = useTranslations("procurement.purchaseRequestTemplate");
  const tfl = useTranslations("field");
  const errors = form.formState.errors;
  const watchedName = useWatch({ control: form.control, name: "name" });
  const watchedDescription = useWatch({
    control: form.control,
    name: "description",
  });

  return (
    <div className="max-w-3xl">
      <FieldGroup className="gap-3">
        {/* Workflow + Name */}
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel
              required={!readOnly}
              className={readOnly ? "text-muted-foreground" : undefined}
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
                  readOnly={readOnly}
                  disabled={disabled}
                  error={errors.workflow_id?.message}
                  className={readOnly ? "font-semibold" : undefined}
                />
              )}
            />
          </Field>
          <Field>
            <FieldLabel
              htmlFor="prt-name"
              required={!readOnly}
              className={readOnly ? "text-muted-foreground" : undefined}
            >
              {tfl("name")}
            </FieldLabel>
            {readOnly ? (
              <span className="inline-flex min-h-8 items-center text-sm font-semibold">
                {watchedName?.trim() ? (
                  watchedName
                ) : (
                  <span className="text-muted-foreground font-normal">—</span>
                )}
              </span>
            ) : (
              <FieldInput
                id="prt-name"
                placeholder={t("namePlaceholder")}
                className="h-8"
                disabled={disabled}
                maxLength={100}
                error={errors.name?.message}
                {...form.register("name")}
              />
            )}
          </Field>
        </div>

        <Field>
          <FieldLabel
            htmlFor="prt-description"
            className={readOnly ? "text-muted-foreground" : undefined}
          >
            {tfl("description")}
          </FieldLabel>
          {readOnly ? (
            <span className="inline-flex min-h-8 items-center text-sm font-semibold">
              {watchedDescription?.trim() ? (
                <span className="whitespace-pre-line">
                  {watchedDescription}
                </span>
              ) : (
                <span className="text-muted-foreground font-normal">—</span>
              )}
            </span>
          ) : (
            <Textarea
              id="prt-description"
              placeholder={tfl("optional")}
              rows={2}
              disabled={disabled}
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
              disabled={readOnly || disabled}
            />
          )}
        />
      </FieldGroup>
    </div>
  );
}
