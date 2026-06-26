
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { cn } from "@/lib/utils";
import {
  Field,
  FieldError,
  FieldInput,
  FieldLabel,
  FieldSelect,
} from "@/components/ui/field";
import { SelectContent, SelectItem } from "@/components/ui/select";
import type { ScheduleFormValues } from "./schedule-form-schema";

interface ScheduleFrequencyFieldProps {
  readonly form: UseFormReturn<ScheduleFormValues>;
  readonly disabled: boolean;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);

/**
 * Field group สำหรับ frequency / time / days picker
 *
 * - Daily: เลือกเวลาอย่างเดียว
 * - Weekly: Toggle 7 ปุ่ม (Sun–Sat) — multi-select
 * - Monthly: Toggle 31 ปุ่ม (1–31) — multi-select
 *
 * Toggle ใช้ `<button>` จริง (มี aria-pressed + keyboard) ไม่ใช่ Badge onClick
 *
 * @param props.form - RHF instance ของ schedule form
 * @param props.disabled - ปิด input ทั้งกลุ่ม
 * @returns JSX
 */
export function ScheduleFrequencyField({
  form,
  disabled,
}: ScheduleFrequencyFieldProps) {
  const t = useTranslations("reportSchedule");
  const tfl = useTranslations("field");
  const frequency = useWatch({ control: form.control, name: "frequency" });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel required>{t("frequency")}</FieldLabel>
          <Controller
            control={form.control}
            name="frequency"
            render={({ field, fieldState }) => (
              <FieldSelect
                value={field.value}
                onValueChange={field.onChange}
                disabled={disabled}
                className="h-8"
                error={fieldState.error?.message}
              >
                <SelectContent>
                  <SelectItem value="daily">{t("daily")}</SelectItem>
                  <SelectItem value="weekly">{t("weekly")}</SelectItem>
                  <SelectItem value="monthly">{t("monthly")}</SelectItem>
                </SelectContent>
              </FieldSelect>
            )}
          />
        </Field>
        <Field>
          <FieldLabel required>{tfl("time")}</FieldLabel>
          <FieldInput
            type="time"
            className="h-8"
            disabled={disabled}
            error={form.formState.errors.time?.message}
            {...form.register("time")}
          />
        </Field>
      </div>

      {frequency === "weekly" && (
        <Controller
          control={form.control}
          name="days_of_week"
          render={({ field, fieldState }) => (
            <Field>
              <FieldLabel required>{tfl("daysOfWeek")}</FieldLabel>
              <div
                role="group"
                aria-label={tfl("daysOfWeek")}
                className="flex flex-wrap gap-1.5"
              >
                {WEEKDAY_LABELS.map((label, idx) => {
                  const isActive = field.value.includes(idx);
                  return (
                    <button
                      key={label}
                      type="button"
                      disabled={disabled}
                      aria-pressed={isActive}
                      onClick={() => {
                        const next = isActive
                          ? field.value.filter((d) => d !== idx)
                          : [...field.value, idx].sort((a, b) => a - b);
                        field.onChange(next);
                      }}
                      className={cn(
                        "rounded-md border px-2 py-1 text-xs font-semibold transition-colors",
                        "focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-none",
                        isActive
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card hover:bg-muted/40 hover:border-primary/40",
                        disabled && "cursor-not-allowed opacity-50",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {fieldState.error && (
                <FieldError>{fieldState.error.message}</FieldError>
              )}
            </Field>
          )}
        />
      )}

      {frequency === "monthly" && (
        <Controller
          control={form.control}
          name="days_of_month"
          render={({ field, fieldState }) => (
            <Field>
              <FieldLabel required>{tfl("daysOfMonth")}</FieldLabel>
              <div
                role="group"
                aria-label={tfl("daysOfMonth")}
                className="flex flex-wrap gap-1"
              >
                {DAYS_OF_MONTH.map((day) => {
                  const isActive = field.value.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={disabled}
                      aria-pressed={isActive}
                      onClick={() => {
                        const next = isActive
                          ? field.value.filter((d) => d !== day)
                          : [...field.value, day].sort((a, b) => a - b);
                        field.onChange(next);
                      }}
                      className={cn(
                        "min-w-[2rem] rounded-md border px-2 py-1 text-xs tabular-nums transition-colors",
                        "focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-none",
                        isActive
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card hover:bg-muted/40 hover:border-primary/40",
                        disabled && "cursor-not-allowed opacity-50",
                      )}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              {fieldState.error && (
                <FieldError>{fieldState.error.message}</FieldError>
              )}
            </Field>
          )}
        />
      )}
    </div>
  );
}
