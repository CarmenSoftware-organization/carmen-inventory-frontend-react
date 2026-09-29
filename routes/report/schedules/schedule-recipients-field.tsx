import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Field, FieldLabel } from "@/components/ui/field";
import { PagedChecklist } from "@/components/lookup/paged-checklist";
import { getUserFullName } from "@/components/lookup/lookup-user";
import { useUser } from "@/hooks/use-user";
import type { User } from "@/types/workflows";
import type { ScheduleFormValues } from "./schedule-form-schema";

interface ScheduleRecipientsFieldProps {
  readonly form: UseFormReturn<ScheduleFormValues>;
  readonly disabled: boolean;
}

export function ScheduleRecipientsField({
  form,
  disabled,
}: ScheduleRecipientsFieldProps) {
  const t = useTranslations("reportSchedule");
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");

  return (
    <Controller
      control={form.control}
      name="recipients"
      render={({ field }) => (
        <Field>
          <FieldLabel>{t("recipients")}</FieldLabel>
          {/* ทะเบียนผู้ใช้ไม่มีคอลัมน์ id / is_active — อ้างด้วย user_id และห้ามส่ง
              is_active (backend ตอบ 0 แถว) */}
          <PagedChecklist<User>
            useListHook={useUser}
            getId={(u) => u.user_id}
            getLabel={getUserFullName}
            idFilterKey="user_id"
            serverFilter={null}
            value={field.value}
            onChange={field.onChange}
            disabled={disabled}
            searchPlaceholder={tl("search", { entity: tfl("user") })}
            emptyMessage={
              <span className="text-muted-foreground text-xs">
                {t("noUsersFound")}
              </span>
            }
          />
        </Field>
      )}
    />
  );
}
