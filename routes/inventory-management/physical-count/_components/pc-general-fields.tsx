
import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Building2, CalendarRange } from "lucide-react";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { LookupDepartment } from "@/components/lookup/lookup-department";
import { LookupPhysicalCountPeriod } from "@/components/lookup/lookup-physical-count-period";
import {
  CardLabel,
  GlassCard,
} from "@/components/share/glass-card";
import type { PhysicalCountFormValues } from "./pc-form-schema";

interface PcGeneralFieldsProps {
  form: UseFormReturn<PhysicalCountFormValues>;
  disabled: boolean;
}

export function PcGeneralFields({
  form,
  disabled,
}: Readonly<PcGeneralFieldsProps>) {
  const tfl = useTranslations("field");
  return (
    <div className="max-w-2xl">
      <GlassCard>
        <CardLabel>
          <span className="inline-flex items-center gap-1">
            <Building2 className="size-2.5" />
            {tfl("department")} · {tfl("physicalCountPeriod")}
          </span>
        </CardLabel>
        <FieldGroup className="gap-3">
          <Field data-invalid={!!form.formState.errors.department_id}>
            <FieldLabel className="text-muted-foreground inline-flex items-center gap-1 text-[0.5625rem] font-semibold tracking-widest uppercase">
              <Building2 className="size-2.5" />
              {tfl("department")}
            </FieldLabel>
            <Controller
              control={form.control}
              name="department_id"
              render={({ field }) => (
                <LookupDepartment
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={disabled}
                />
              )}
            />
            <FieldError>
              {form.formState.errors.department_id?.message}
            </FieldError>
          </Field>

          <Field>
            <FieldLabel className="text-muted-foreground inline-flex items-center gap-1 text-[0.5625rem] font-semibold tracking-widest uppercase">
              <CalendarRange className="size-2.5" />
              {tfl("physicalCountPeriod")}
            </FieldLabel>
            <Controller
              control={form.control}
              name="physical_count_period_id"
              render={({ field }) => (
                <LookupPhysicalCountPeriod
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  disabled={disabled}
                />
              )}
            />
          </Field>
        </FieldGroup>
      </GlassCard>
    </div>
  );
}
