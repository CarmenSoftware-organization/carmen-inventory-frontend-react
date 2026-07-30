import { useTranslations } from "use-intl";
import { Controller, useForm, useWatch, type Control } from "react-hook-form";
import { SettingSection } from "@/components/ui/setting-section";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldDatePicker,
  FieldSelect,
  FieldPlainText,
} from "@/components/ui/field";
import { SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LookupUserLocation } from "@/components/lookup/lookup-user-location";
import { INVENTORY_TYPE } from "@/constant/location";
import { formatDate } from "@/lib/date-utils";
import type { InventoryAdjustment } from "@/types/inventory-adjustment";
import type { AdjFormValues } from "./ia-form-schema";

interface DocumentInfoProps {
  readonly form: ReturnType<typeof useForm<AdjFormValues>>;
  readonly isView: boolean;
  readonly isDisabled: boolean;
  readonly adjTypes: ReadonlyArray<{ id: string; name: string }>;
  readonly inventoryAdjustment?: InventoryAdjustment;
  readonly currentPeriodStart?: string;
  readonly currentPeriodEnd?: string;
  readonly dateFormat: string;
  readonly t: ReturnType<typeof useTranslations>;
  readonly tc: ReturnType<typeof useTranslations>;
  readonly tfl: ReturnType<typeof useTranslations>;
}

export function DocumentInfo({
  form,
  isView,
  isDisabled,
  adjTypes,
  inventoryAdjustment,
  currentPeriodStart,
  currentPeriodEnd,
  dateFormat,
  t,
  tc,
  tfl,
}: DocumentInfoProps) {
  // section แบบเดียวกับ price-list / company-profile: ไม่มี Card — หัวข้อ+คำอธิบาย
  // อยู่คอลัมน์ซ้าย field อยู่ขวา คั่น section ด้วยเส้นบน (SettingSection จัดให้)
  // label ใน view mode ไม่ต้องใส่ text-muted-foreground/font-normal เอง — Field
  // หุบให้อัตโนมัติเมื่อลูกเป็น FieldPlainText
  return (
    <SettingSection first title={t("docInfo")} description={t("docInfoDesc")}>
      <Field>
        <FieldLabel required={!isView}>{tfl("date")}</FieldLabel>
        {isView ? (
          <PlainDateValue control={form.control} dateFormat={dateFormat} />
        ) : (
          <Controller
            control={form.control}
            name="date"
            render={({ field }) => (
              <FieldDatePicker
                value={field.value}
                onValueChange={field.onChange}
                disabled={isDisabled}
                placeholder={tc("selectDate")}
                className="w-full text-xs"
                fromDate={
                  currentPeriodStart ? new Date(currentPeriodStart) : undefined
                }
                toDate={
                  currentPeriodEnd ? new Date(currentPeriodEnd) : undefined
                }
                error={form.formState.errors.date?.message}
              />
            )}
          />
        )}
      </Field>

      <Field>
        <FieldLabel required={!isView}>{tfl("reason")}</FieldLabel>
        {isView ? (
          <PlainReasonValue
            control={form.control}
            adjTypes={adjTypes}
            fallback={inventoryAdjustment?.adjustment_type_name}
          />
        ) : (
          <Controller
            control={form.control}
            name="adjustment_type_id"
            render={({ field }) => (
              <FieldSelect
                value={field.value ?? ""}
                onValueChange={field.onChange}
                disabled={isDisabled}
                placeholder={tfl("selectAdjustmentType")}
                className="text-xs"
                error={form.formState.errors.adjustment_type_id?.message}
              >
                <SelectContent>
                  {adjTypes.map((at) => (
                    <SelectItem key={at.id} value={at.id}>
                      {at.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </FieldSelect>
            )}
          />
        )}
      </Field>

      <Field className="sm:col-span-2">
        <FieldLabel required={!isView}>{tfl("location")}</FieldLabel>
        {isView ? (
          <FieldPlainText>{inventoryAdjustment?.location_name}</FieldPlainText>
        ) : (
          <Controller
            control={form.control}
            name="location_id"
            render={({ field }) => (
              <LookupUserLocation
                value={field.value}
                onValueChange={field.onChange}
                disabled={isDisabled}
                className="text-xs"
                locationTypes={[
                  INVENTORY_TYPE.INVENTORY,
                  INVENTORY_TYPE.CONSIGNMENT,
                ]}
                defaultLabel={inventoryAdjustment?.location_name}
                error={form.formState.errors.location_id?.message}
                lazy
              />
            )}
          />
        )}
      </Field>

      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="inv-adj-description">
          {tfl("description")}
        </FieldLabel>
        {isView ? (
          <PlainDescriptionValue control={form.control} />
        ) : (
          <>
            <Textarea
              id="inv-adj-description"
              placeholder={tfl("optional")}
              className="text-xs"
              disabled={isDisabled}
              maxLength={256}
              aria-invalid={!!form.formState.errors.description}
              {...form.register("description")}
            />
            {form.formState.errors.description?.message && (
              <FieldError>
                {form.formState.errors.description.message}
              </FieldError>
            )}
          </>
        )}
      </Field>
    </SettingSection>
  );
}

function PlainDateValue({
  control,
  dateFormat,
}: {
  readonly control: Control<AdjFormValues>;
  readonly dateFormat: string;
}) {
  const date = useWatch({ control, name: "date" });
  return (
    <FieldPlainText>{date ? formatDate(date, dateFormat) : ""}</FieldPlainText>
  );
}

function PlainReasonValue({
  control,
  adjTypes,
  fallback,
}: {
  readonly control: Control<AdjFormValues>;
  readonly adjTypes: ReadonlyArray<{ id: string; name: string }>;
  readonly fallback?: string;
}) {
  const adjustmentTypeId = useWatch({ control, name: "adjustment_type_id" });
  const name = adjTypes.find((at) => at.id === adjustmentTypeId)?.name;
  return <FieldPlainText>{name ?? fallback}</FieldPlainText>;
}

function PlainDescriptionValue({
  control,
}: {
  readonly control: Control<AdjFormValues>;
}) {
  const description = useWatch({ control, name: "description" });
  return (
    <FieldPlainText>
      {description ? (
        <span className="whitespace-pre-wrap">{description}</span>
      ) : (
        ""
      )}
    </FieldPlainText>
  );
}
