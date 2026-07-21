import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Field, FieldLabel } from "@/components/ui/field";
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
  const tfl = useTranslations("field");

  // หลัง submit (role != CREATE) field ทั้งสองถูก lock ถาวร → render เป็น text
  const lockedAfterCreate = !!role && role !== STAGE_ROLE.CREATE;
  const descriptionReadOnly = readOnly || lockedAfterCreate;
  const workflowReadOnly = descriptionReadOnly || !!fromTemplate;

  return (
    // grid col fixed 10rem → workflow ชิดซ้าย align กับ ribbon (pr-header) คอลัมน์แรก
    <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-[repeat(5,minmax(0,10rem))]">
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
              className="text-xs"
            />
          )}
        />
      </Field>
    </div>
  );
}
