
import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAllUsers } from "@/hooks/use-all-users";
import { getUserFullName } from "@/components/lookup/lookup-user";
import type { ScheduleFormValues } from "./schedule-form-schema";

interface ScheduleRecipientsFieldProps {
  readonly form: UseFormReturn<ScheduleFormValues>;
  readonly disabled: boolean;
}

/**
 * Multi-select user picker สำหรับ recipients ของ schedule
 *
 * - แสดง chip ของ recipient ที่เลือกอยู่ + ปุ่ม X เอาออก
 * - List ของ user ทั้งหมดดึงผ่าน `useAllUsers()` (TanStack Query)
 * - แต่ละ row ใช้ shadcn `Checkbox` + `Label htmlFor` ไม่ใช้ native input
 * - List wrap ใน scroll container `max-h-40`
 *
 * @param props.form - RHF instance
 * @param props.disabled - ปิด controls ทั้งกลุ่ม
 * @returns JSX
 */
export function ScheduleRecipientsField({
  form,
  disabled,
}: ScheduleRecipientsFieldProps) {
  const t = useTranslations("reportSchedule");
  const { data: users = [] } = useAllUsers();

  return (
    <Controller
      control={form.control}
      name="recipients"
      render={({ field }) => {
        const selected = field.value;
        const nameById = new Map(
          users.map((u) => [u.user_id, getUserFullName(u)]),
        );

        const toggle = (id: string) => {
          if (selected.includes(id)) {
            field.onChange(selected.filter((s) => s !== id));
          } else {
            field.onChange([...selected, id]);
          }
        };

        return (
          <Field>
            <FieldLabel>{t("recipients")}</FieldLabel>

            {selected.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selected.map((id) => (
                  <Badge key={id} asChild variant="default" className="gap-1">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => toggle(id)}
                      aria-label={`Remove ${nameById.get(id) ?? id}`}
                      className="disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {nameById.get(id) ?? id}
                      <X className="size-3" aria-hidden="true" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <ScrollArea className="h-40 rounded-md border">
              <div className="p-2">
                {users.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    {t("noUsersFound")}
                  </p>
                ) : (
                  users.map((user) => {
                    const id = `recipient-${user.user_id}`;
                    return (
                      <div
                        key={user.user_id}
                        className="hover:bg-accent flex items-center gap-2 rounded px-1 py-1 text-sm"
                      >
                        <Checkbox
                          id={id}
                          checked={selected.includes(user.user_id)}
                          onCheckedChange={() => toggle(user.user_id)}
                          disabled={disabled}
                        />
                        <Label htmlFor={id} className="cursor-pointer">
                          {getUserFullName(user)}
                        </Label>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </Field>
        );
      }}
    />
  );
}
