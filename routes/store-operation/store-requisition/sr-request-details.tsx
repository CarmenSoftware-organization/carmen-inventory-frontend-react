import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDatePicker,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { LookupUserLocation } from "@/components/lookup/lookup-user-location";
import { LookupWorkflow } from "@/components/lookup/lookup-workflow";
import { INVENTORY_TYPE } from "@/constant/location";
import { WORKFLOW_TYPE } from "@/types/workflows";
import { STAGE_ROLE } from "@/types/stage-role";
import { formatDate } from "@/lib/date-utils";
import { PlainValue } from "./sr-form-shared";
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
  const description = form.watch("description");

  // role-based lock = ขั้น approve/issue/view ห้ามแก้ทั้ง section (ถาวร ไม่ใช่ pending)
  const isReadOnly =
    readOnly ||
    role === STAGE_ROLE.APPROVE ||
    role === STAGE_ROLE.ISSUE ||
    role === STAGE_ROLE.VIEW_ONLY;
  const labelMuted = isReadOnly ? "text-muted-foreground" : undefined;

  return (
    <section className="bg-background rounded-lg border">
      <header className="border-b px-5 py-3.5 text-[0.8125rem] font-semibold">
        {t("requestDetails")}
      </header>
      <div className="p-5">
        <FieldGroup className="gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel required={!isReadOnly} className={labelMuted}>
                {tfl("expectedDate")}
              </FieldLabel>
              {isReadOnly ? (
                <PlainValue
                  value={
                    expectedDate ? formatDate(expectedDate, dateFormat) : ""
                  }
                />
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

            <Field>
              <FieldLabel required={!isReadOnly} className={labelMuted}>
                {tfl("workflow")}
              </FieldLabel>
              {isReadOnly ? (
                <PlainValue value={workflowName} />
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
                    />
                  )}
                />
              )}
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel required={!isReadOnly} className={labelMuted}>
                {tfl("fromLocation")}
              </FieldLabel>
              {isReadOnly ? (
                <PlainValue value={fromLocInfo.name} />
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

            <Field>
              <FieldLabel required={!isReadOnly} className={labelMuted}>
                {tfl("toLocation")}
              </FieldLabel>
              {isReadOnly ? (
                <PlainValue value={toLocInfo.name} />
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

          <Field>
            <FieldLabel htmlFor="sr-description" className={labelMuted}>
              {tfl("description")}
            </FieldLabel>
            {isReadOnly ? (
              <PlainValue value={description} multiline />
            ) : (
              <Textarea
                id="sr-description"
                placeholder={t("optionalDescription")}
                className="min-h-13 text-sm"
                maxLength={256}
                disabled={disabled}
                {...form.register("description")}
              />
            )}
          </Field>
        </FieldGroup>
      </div>
    </section>
  );
}
