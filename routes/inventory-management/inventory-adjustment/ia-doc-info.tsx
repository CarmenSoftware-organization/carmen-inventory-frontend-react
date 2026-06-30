import { useTranslations } from "use-intl";
import { Controller, useForm, useWatch, type Control } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldDatePicker,
  FieldSelect,
} from "@/components/ui/field";
import { SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LookupUserLocation } from "@/components/lookup/lookup-user-location";
import { INVENTORY_TYPE } from "@/constant/location";
import { cn } from "@/lib/utils";
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
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="text-sm">{t("docInfo")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field className={cn(isView && "gap-1")}>
            <FieldLabel
              required={!isView}
              className={cn(isView && "text-muted-foreground font-normal")}
            >
              {tfl("date")}
            </FieldLabel>
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
                    className="h-9 w-full text-xs"
                    fromDate={
                      currentPeriodStart
                        ? new Date(currentPeriodStart)
                        : undefined
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

          <Field className={cn(isView && "gap-1")}>
            <FieldLabel
              required={!isView}
              className={cn(isView && "text-muted-foreground font-normal")}
            >
              {tfl("reason")}
            </FieldLabel>
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
                    className="h-9 text-xs"
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

          <Field
            className={cn("sm:col-span-2 lg:col-span-1", isView && "gap-1")}
          >
            <FieldLabel
              required={!isView}
              className={cn(isView && "text-muted-foreground font-normal")}
            >
              {tfl("location")}
            </FieldLabel>
            {isView ? (
              <PlainValue>
                {inventoryAdjustment?.location_name ?? "—"}
              </PlainValue>
            ) : (
              <Controller
                control={form.control}
                name="location_id"
                render={({ field }) => (
                  <LookupUserLocation
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isDisabled}
                    className="h-9 text-xs"
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
        </div>

        <Field className={cn(isView && "gap-1")}>
          <FieldLabel
            htmlFor="inv-adj-description"
            className={cn(isView && "text-muted-foreground font-normal")}
          >
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
      </CardContent>
    </Card>
  );
}

function PlainValue({
  children,
  multiline,
}: {
  readonly children: React.ReactNode;
  readonly multiline?: boolean;
}) {
  return (
    <div
      className={
        multiline
          ? "text-foreground min-h-9 text-sm font-medium whitespace-pre-wrap"
          : "text-foreground flex h-9 items-center text-sm font-medium"
      }
    >
      {children}
    </div>
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
  return <PlainValue>{date ? formatDate(date, dateFormat) : "—"}</PlainValue>;
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
  return <PlainValue>{name ?? fallback ?? "—"}</PlainValue>;
}

function PlainDescriptionValue({
  control,
}: {
  readonly control: Control<AdjFormValues>;
}) {
  const description = useWatch({ control, name: "description" });
  return <PlainValue multiline>{description || "—"}</PlainValue>;
}
