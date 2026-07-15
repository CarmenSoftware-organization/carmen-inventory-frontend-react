import { useTranslations } from "use-intl";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import {
  Field,
  FieldInput,
  FieldLabel,
  FieldPlainText,
} from "@/components/ui/field";
import { SettingSection } from "@/components/ui/setting-section";
import { StatusSwitch } from "@/components/ui/status-switch";
import { Textarea } from "@/components/ui/textarea";
import { LookupWorkflow } from "@/components/lookup/lookup-workflow";
import { WORKFLOW_TYPE } from "@/types/workflows";
import type { PrtFormValues } from "./prt-form-schema";

interface PrtGeneralFieldsProps {
  readonly form: UseFormReturn<PrtFormValues>;
  /** view mode → render เป็น plain text */
  readonly readOnly: boolean;
  /** submit pending → input ยังอยู่แต่กดไม่ได้ */
  readonly disabled: boolean;
  /** ชื่อ workflow ที่ backend ส่งมา — ใช้แสดงใน view mode */
  readonly workflowName?: string;
}

/** General section — workflow, name, description และสถานะของเทมเพลต */
export function PrtGeneralFields({
  form,
  readOnly,
  disabled,
  workflowName,
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
    <SettingSection first title={tfl("general")} description={t("generalDesc")}>
      <Field>
        <FieldLabel required={!readOnly}>{tfl("workflow")}</FieldLabel>
        {/* ไม่ใช้ LookupWorkflow readOnly เพราะมัน render <span> ของตัวเอง — Field
            จะมุด label ให้ก็ต่อเมื่อ FieldPlainText เป็น direct child เท่านั้น */}
        {readOnly ? (
          <FieldPlainText>{workflowName}</FieldPlainText>
        ) : (
          <Controller
            control={form.control}
            name="workflow_id"
            render={({ field }) => (
              <LookupWorkflow
                value={field.value}
                onValueChange={field.onChange}
                workflowType={WORKFLOW_TYPE.PR}
                disabled={disabled}
                error={errors.workflow_id?.message}
                className="w-full"
              />
            )}
          />
        )}
      </Field>

      <Field>
        <FieldLabel htmlFor="prt-name" required={!readOnly}>
          {tfl("name")}
        </FieldLabel>
        {readOnly ? (
          <FieldPlainText>{watchedName}</FieldPlainText>
        ) : (
          <FieldInput
            id="prt-name"
            placeholder={t("namePlaceholder")}
            disabled={disabled}
            maxLength={100}
            error={errors.name?.message}
            {...form.register("name")}
          />
        )}
      </Field>

      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="prt-description">{tfl("description")}</FieldLabel>
        {readOnly ? (
          <FieldPlainText className="items-start whitespace-pre-wrap">
            {watchedDescription}
          </FieldPlainText>
        ) : (
          <Textarea
            id="prt-description"
            placeholder={tfl("optional")}
            rows={2}
            disabled={disabled}
            maxLength={256}
            className="resize-none"
            {...form.register("description")}
          />
        )}
      </Field>

      <div className="sm:col-span-2">
        <Controller
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <StatusSwitch
              id="prt-is-active"
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={readOnly || disabled}
            />
          )}
        />
      </div>
    </SettingSection>
  );
}
