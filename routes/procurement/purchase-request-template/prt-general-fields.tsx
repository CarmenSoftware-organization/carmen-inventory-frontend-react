import { useTranslations } from "use-intl";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import {
  Field,
  FieldGroup,
  FieldInput,
  FieldLabel,
  FieldPlainText,
} from "@/components/ui/field";
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

  // view mode → คู่ label↔value ชิด (gap-1) + label เงียบ (เทา/ปกติ) ให้ value
  // เด่นกว่า สร้าง proximity grouping + lightness contrast แบบ Apple (เหมือน CN)
  const viewFieldGap = readOnly ? "gap-1" : undefined;
  const viewLabelClass = readOnly
    ? "text-muted-foreground font-normal"
    : undefined;

  return (
    <div className="max-w-3xl">
      <FieldGroup className="gap-3">
        {/* Workflow + Name */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field className={viewFieldGap}>
            <FieldLabel required={!readOnly} className={viewLabelClass}>
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
                  className="text-xs"
                />
              )}
            />
          </Field>
          <Field className={viewFieldGap}>
            <FieldLabel
              htmlFor="prt-name"
              required={!readOnly}
              className={viewLabelClass}
            >
              {tfl("name")}
            </FieldLabel>
            {readOnly ? (
              <FieldPlainText className="text-xs">
                {watchedName?.trim() ? (
                  watchedName
                ) : (
                  <span className="text-muted-foreground font-normal">—</span>
                )}
              </FieldPlainText>
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
      </FieldGroup>
    </div>
  );
}
