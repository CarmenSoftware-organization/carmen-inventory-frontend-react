
import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import type { ScheduleFormValues } from "./schedule-form-schema";

interface ScheduleNotificationsFieldProps {
  readonly form: UseFormReturn<ScheduleFormValues>;
  readonly disabled: boolean;
}

/**
 * Two checkboxes ใช้สื่อช่องทาง notification (web app + email)
 *
 * Pair `htmlFor` + `id` ตามที่ CLAUDE.md กำหนด — shadcn Checkbox อย่างเดียว
 * ไม่ปนกับ `<input type="checkbox">` native
 *
 * @param props.form - RHF instance
 * @param props.disabled - ปิด input ทั้งกลุ่ม
 * @returns JSX
 */
export function ScheduleNotificationsField({
  form,
  disabled,
}: ScheduleNotificationsFieldProps) {
  const t = useTranslations("reportSchedule");

  return (
    <Field>
      <FieldLabel>{t("notifications")}</FieldLabel>
      <div className="flex flex-col gap-2 rounded-md border p-3">
        <Controller
          control={form.control}
          name="notify_web"
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Checkbox
                id="notify-web"
                checked={field.value}
                onCheckedChange={(v) => field.onChange(v === true)}
                disabled={disabled}
              />
              <Label htmlFor="notify-web" className="cursor-pointer text-sm">
                {t("notifyWebApplication")}
              </Label>
            </div>
          )}
        />
        <Controller
          control={form.control}
          name="notify_email"
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Checkbox
                id="notify-email"
                checked={field.value}
                onCheckedChange={(v) => field.onChange(v === true)}
                disabled={disabled}
              />
              <Label htmlFor="notify-email" className="cursor-pointer text-sm">
                {t("notifyEmail")}
              </Label>
            </div>
          )}
        />
      </div>
    </Field>
  );
}
