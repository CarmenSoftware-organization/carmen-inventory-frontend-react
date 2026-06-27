
import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import {
  Field,
  FieldInput,
  FieldLabel,
  FieldSelect,
} from "@/components/ui/field";
import { SelectContent, SelectItem } from "@/components/ui/select";
import { useReportLookups } from "@/hooks/use-report-schedule";
import type { ReportScheduleDialogField } from "@/types/report-schedule";
import type { ScheduleFormValues } from "./schedule-form-schema";

interface ScheduleFiltersFieldProps {
  readonly form: UseFormReturn<ScheduleFormValues>;
  readonly fields: readonly ReportScheduleDialogField[];
  readonly disabled: boolean;
}

const ALL_VALUE = "ALL";

/**
 * Render dynamic filter inputs จาก parsed template dialog
 * รองรับ 3 type: `date` / `select` (พร้อม lookup source) / `text`
 *
 * Lookup options ดึงผ่าน `useReportLookups` (TanStack Query, CACHE_STATIC)
 * เมื่อ fields ไม่มี source เลย hook จะไม่ fetch
 *
 * @param props.form - RHF instance
 * @param props.fields - field list ที่ parser คืน
 * @param props.disabled - ปิด input ทั้งกลุ่ม
 * @returns JSX หรือ null ถ้า fields ว่าง
 */
export function ScheduleFiltersField({
  form,
  fields,
  disabled,
}: ScheduleFiltersFieldProps) {
  const t = useTranslations("reportSchedule");
  const sources = fields.flatMap((f) => (f.source ? [f.source] : []));
  const { data: lookups = {} } = useReportLookups(sources);

  if (fields.length === 0) return null;

  return (
    <Field>
      <FieldLabel>{t("filters")}</FieldLabel>
      <div className="grid gap-2 rounded-md border p-3">
        {fields.map((field) => (
          <ScheduleFilterRow
            key={field.name}
            form={form}
            field={field}
            lookups={lookups}
            disabled={disabled}
          />
        ))}
      </div>
    </Field>
  );
}

interface ScheduleFilterRowProps {
  readonly form: UseFormReturn<ScheduleFormValues>;
  readonly field: ReportScheduleDialogField;
  readonly lookups: Record<string, ReadonlyArray<{ label: string; value: string }>>;
  readonly disabled: boolean;
}

function ScheduleFilterRow({
  form,
  field,
  lookups,
  disabled,
}: ScheduleFilterRowProps) {
  const sourceOpts =
    field.source && lookups[field.source]
      ? lookups[field.source]
      : (field.options ?? [])
          .filter((o) => o !== ALL_VALUE)
          .map((o) => ({ label: o, value: o }));

  return (
    <Controller
      control={form.control}
      name={`filters.${field.name}`}
      render={({ field: rhf }) => (
        <div className="grid gap-1">
          <FieldLabel className="text-muted-foreground text-xs">
            {field.label}
          </FieldLabel>
          {field.type === "date" && (
            <FieldInput
              type="date"
              className="h-8"
              disabled={disabled}
              value={rhf.value ?? ""}
              onChange={(e) => rhf.onChange(e.target.value)}
            />
          )}
          {field.type === "select" && (
            <FieldSelect
              value={rhf.value || ALL_VALUE}
              onValueChange={rhf.onChange}
              disabled={disabled}
              className="h-8"
            >
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{ALL_VALUE}</SelectItem>
                {sourceOpts
                  .filter((opt) => !!opt.value)
                  .map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </FieldSelect>
          )}
          {field.type === "text" && (
            <FieldInput
              className="h-8"
              placeholder={field.label}
              disabled={disabled}
              value={rhf.value ?? ""}
              onChange={(e) => rhf.onChange(e.target.value)}
            />
          )}
        </div>
      )}
    />
  );
}
