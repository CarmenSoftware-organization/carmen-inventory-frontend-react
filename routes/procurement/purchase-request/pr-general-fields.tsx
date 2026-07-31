import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LookupWorkflow } from "@/components/lookup/lookup-workflow";
import { WORKFLOW_TYPE } from "@/types/workflows";
import type { PrFormValues } from "./pr-form-schema";

/** ตรงกับ maxLength ของ description ใน schema */
const DESCRIPTION_MAX = 256;

/**
 * ช่อง workflow ที่แก้ไขได้
 *
 * ไปวางในแถบข้อมูลหัวเอกสาร (pr-header) ตำแหน่งเดียวกับตอนอ่านอย่างเดียว
 * ไม่ใช่บล็อกแยกในตัวฟอร์ม — ฟิลด์เดียวกันไม่ควรย้ายที่ไปมาตามโหมด
 * ไม่งั้นผู้ใช้ต้องไล่หาใหม่ทุกครั้งที่กด Edit
 */
export function PrWorkflowField({
  form,
  disabled,
  isAdd,
}: {
  readonly form: UseFormReturn<PrFormValues>;
  /** submit pending → ช่องยังอยู่แต่กดไม่ได้ */
  readonly disabled: boolean;
  /** กำลังสร้างใบใหม่ — ให้เลือกเฉพาะ workflow ที่ผู้ใช้เริ่มใบได้ */
  readonly isAdd?: boolean;
}) {
  const tfl = useTranslations("field");
  return (
    <Field>
      <FieldLabel required>{tfl("workflow")}</FieldLabel>
      <Controller
        control={form.control}
        name="workflow_id"
        render={({ field }) => (
          <LookupWorkflow
            value={field.value}
            onValueChange={field.onChange}
            workflowType={WORKFLOW_TYPE.PR}
            creatableOnly={isAdd}
            disabled={disabled}
            error={form.formState.errors.workflow_id?.message}
            className="text-xs"
          />
        )}
      />
    </Field>
  );
}

/** ช่องคำอธิบายที่แก้ไขได้ — กติกาตำแหน่งเดียวกับ workflow */
export function PrDescriptionField({
  form,
  disabled,
  className,
}: {
  readonly form: UseFormReturn<PrFormValues>;
  readonly disabled: boolean;
  readonly className?: string;
}) {
  const t = useTranslations("procurement.purchaseRequest");
  const tfl = useTranslations("field");
  return (
    <Field className={className}>
      <FieldLabel htmlFor="pr-description">{tfl("description")}</FieldLabel>
      <Input
        id="pr-description"
        placeholder={t("descPlaceholder")}
        maxLength={DESCRIPTION_MAX}
        disabled={disabled}
        className="text-xs"
        {...form.register("description")}
      />
    </Field>
  );
}
