import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import {
  Field,
  FieldLabel,
  FieldDatePicker,
  FieldPlainText,
} from "@/components/ui/field";
import { LookupUserLocation } from "@/components/lookup/lookup-user-location";
import { LookupWorkflow } from "@/components/lookup/lookup-workflow";
import { INVENTORY_TYPE } from "@/constant/location";
import { WORKFLOW_TYPE } from "@/types/workflows";
import { STAGE_ROLE } from "@/types/stage-role";
import { formatDate } from "@/lib/date-utils";
import type { SrFormValues } from "./sr-form-schema";

interface LocationInfo {
  readonly name: string;
  readonly code: string;
  readonly location_type?: string;
}

interface SrRequestDetailsProps {
  readonly form: UseFormReturn<SrFormValues>;
  /** view mode + role-based lock → render เป็น plain text */
  readonly readOnly: boolean;
  /** submit pending → input ยังอยู่แต่กดไม่ได้ */
  readonly disabled: boolean;
  readonly dateFormat: string;
  readonly workflowName?: string;
  readonly fromLocInfo: LocationInfo;
  readonly toLocInfo: LocationInfo;
  readonly onFromLocInfoChange: (info: LocationInfo) => void;
  readonly onToLocInfoChange: (info: LocationInfo) => void;
  readonly role?: string;
}

export function SrRequestDetails({
  form,
  readOnly,
  disabled,
  dateFormat,
  workflowName,
  fromLocInfo,
  toLocInfo,
  onFromLocInfoChange,
  onToLocInfoChange,
  role,
}: SrRequestDetailsProps) {
  "use no memo";
  const t = useTranslations("storeOperation.storeRequisition");
  const tfl = useTranslations("field");

  const errors = form.formState.errors;
  const srDate = form.watch("sr_date");
  const expectedDate = form.watch("expected_date");
  const fromLocationId = form.watch("from_location_id");

  // role-based lock = ขั้น approve/issue/view ห้ามแก้ทั้ง section (ถาวร ไม่ใช่ pending)
  const isReadOnly =
    readOnly ||
    role === STAGE_ROLE.APPROVE ||
    role === STAGE_ROLE.ISSUE ||
    role === STAGE_ROLE.VIEW_ONLY;
  const labelMuted = isReadOnly
    ? "text-muted-foreground font-normal"
    : undefined;
  // view mode → คู่ label↔value ชิด (gap-1) แบบ procurement
  const viewFieldGap = isReadOnly ? "gap-1" : undefined;

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
        <Field className={viewFieldGap}>
          <FieldLabel required={!isReadOnly} className={labelMuted}>
            {tfl("workflow")}
          </FieldLabel>
          {isReadOnly ? (
            <FieldPlainText className="text-xs">{workflowName}</FieldPlainText>
          ) : (
            <Controller
              control={form.control}
              name="workflow_id"
              render={({ field }) => (
                <LookupWorkflow
                  value={field.value}
                  onValueChange={field.onChange}
                  workflowType={WORKFLOW_TYPE.SR}
                  disabled={disabled}
                  error={errors.workflow_id?.message}
                  className="text-xs"
                />
              )}
            />
          )}
        </Field>
        <Field className={viewFieldGap}>
          <FieldLabel required={!isReadOnly} className={labelMuted}>
            {tfl("expectedDate")}
          </FieldLabel>
          {isReadOnly ? (
            <FieldPlainText className="text-xs">
              {expectedDate ? formatDate(expectedDate, dateFormat) : ""}
            </FieldPlainText>
          ) : (
            <Controller
              control={form.control}
              name="expected_date"
              render={({ field }) => (
                <FieldDatePicker
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={disabled || !srDate}
                  fromDate={srDate ? new Date(srDate) : undefined}
                  placeholder={t("pickExpectedDate")}
                  className="w-full"
                  error={errors.expected_date?.message}
                />
              )}
            />
          )}
        </Field>

        <Field className={viewFieldGap}>
          <FieldLabel required={!isReadOnly} className={labelMuted}>
            {tfl("fromLocation")}
          </FieldLabel>
          {isReadOnly ? (
            <FieldPlainText className="text-xs">
              {fromLocInfo.name}
            </FieldPlainText>
          ) : (
            <Controller
              control={form.control}
              name="from_location_id"
              render={({ field }) => (
                <LookupUserLocation
                  value={field.value}
                  onValueChange={(val) => {
                    field.onChange(val);
                    if (val && val === form.getValues("to_location_id")) {
                      form.setValue("to_location_id", "");
                      onToLocInfoChange({ name: "", code: "" });
                    }
                  }}
                  onItemChange={(item) =>
                    onFromLocInfoChange({
                      name: item?.name ?? "",
                      code: item?.code ?? "",
                      location_type: item?.location_type,
                    })
                  }
                  disabled={disabled}
                  locationTypes={[
                    INVENTORY_TYPE.INVENTORY,
                    INVENTORY_TYPE.CONSIGNMENT,
                  ]}
                  popoverWidth="31.25rem"
                  className="text-xs"
                  error={errors.from_location_id?.message}
                />
              )}
            />
          )}
        </Field>

        <Field className={viewFieldGap}>
          <FieldLabel required={!isReadOnly} className={labelMuted}>
            {tfl("toLocation")}
          </FieldLabel>
          {isReadOnly ? (
            <FieldPlainText className="text-xs">
              {toLocInfo.name}
            </FieldPlainText>
          ) : (
            <Controller
              control={form.control}
              name="to_location_id"
              render={({ field }) => (
                <LookupUserLocation
                  value={field.value}
                  onValueChange={field.onChange}
                  onItemChange={(item) =>
                    onToLocInfoChange({
                      name: item?.name ?? "",
                      code: item?.code ?? "",
                      location_type: item?.location_type,
                    })
                  }
                  disabled={disabled || !fromLocationId}
                  excludeIds={
                    fromLocationId ? new Set([fromLocationId]) : undefined
                  }
                  popoverWidth="31.25rem"
                  className="text-xs"
                  error={errors.to_location_id?.message}
                />
              )}
            />
          )}
        </Field>
      </div>
    </section>
  );
}
