
import { useTranslations } from "use-intl";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import {
  Field,
  FieldDatePicker,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { LookupWorkflow } from "@/components/lookup/lookup-workflow";
import { WORKFLOW_TYPE } from "@/types/workflows";
import { formatDate } from "@/lib/date-utils";
import { useProfile } from "@/hooks/use-profile";
import type { FromPriceListFormValues } from "../from-price-list-form-schema";

interface StepOrderDetailsProps {
  readonly form: UseFormReturn<FromPriceListFormValues>;
}

export function StepOrderDetails({ form }: StepOrderDetailsProps) {
  const tc = useTranslations("common");
  const tfl = useTranslations("field");
  const { dateFormat } = useProfile();

  const orderDate = useWatch({ control: form.control, name: "order_date" });
  const buyerName = useWatch({ control: form.control, name: "buyer_name" });
  // Department ไม่อยู่ใน PoFormValues schema — อ่านจาก profile ตรง ๆ
  const { defaultBu } = useProfile();
  const departmentName = defaultBu?.department?.name ?? "";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-6 border-b pb-3">
        <InfoCell
          label={tfl("date")}
          value={formatDate(orderDate, dateFormat)}
        />
        <InfoCell label={tfl("buyer")} value={buyerName} />
        <InfoCell label={tfl("department")} value={departmentName} />
      </div>

      <FieldGroup className="gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel required>{tfl("workflow")}</FieldLabel>
            <Controller
              control={form.control}
              name="workflow_id"
              render={({ field, fieldState }) => (
                <LookupWorkflow
                  value={field.value ?? ""}
                  onValueChange={(v) => {
                    field.onChange(v);
                    // clear error ทันทีเมื่อ fill (wizard ไม่ผ่าน handleSubmit
                    // → reValidateMode ไม่ทำงานเอง)
                    if (fieldState.error) form.trigger("workflow_id");
                  }}
                  workflowType={WORKFLOW_TYPE.PO}
                  className="w-full text-xs"
                  error={fieldState.error?.message}
                />
              )}
            />
          </Field>

          <Field>
            <FieldLabel required>{tfl("deliveryDate")}</FieldLabel>
            <Controller
              control={form.control}
              name="delivery_date"
              render={({ field, fieldState }) => (
                <FieldDatePicker
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    if (fieldState.error) form.trigger("delivery_date");
                  }}
                  placeholder={tc("selectDate")}
                  className="w-full text-xs"
                  error={fieldState.error?.message}
                />
              )}
            />
          </Field>
        </div>
      </FieldGroup>
    </div>
  );
}

interface InfoCellProps {
  readonly label: string;
  readonly value: string;
}

const InfoCell = ({ label, value }: InfoCellProps) => {
  return (
    <div>
      <span className="text-muted-foreground text-xs">{label}</span>
      <p className="truncate text-sm font-semibold">{value || "—"}</p>
    </div>
  );
};
