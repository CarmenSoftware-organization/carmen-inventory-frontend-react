
import { Controller, type UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusSwitch } from "@/components/ui/status-switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "use-intl";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { getWorkflowTypeOptions } from "@/constant/workflow";
import type { WorkflowCreateModel } from "./wf-form-schema";

interface WfGeneralProps {
  readonly form: UseFormReturn<WorkflowCreateModel>;
  readonly isDisabled: boolean;
}

export function WfGeneral({ form, isDisabled }: WfGeneralProps) {
  const t = useTranslations("systemAdmin.workflow");
  const tfl = useTranslations("field");

  const workflowTypeOptions = getWorkflowTypeOptions(t);

  return (
    <div className="max-w-2xl pt-3">
      <FieldGroup className="gap-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          <Field data-invalid={!!form.formState.errors.name}>
            <FieldLabel htmlFor="wf-name">{t("workflowName")}</FieldLabel>
            <Input
              id="wf-name"
              placeholder={t("workflowNamePlaceholder")}
              className="h-8 text-xs"
              disabled={isDisabled}
              maxLength={100}
              {...form.register("name")}
            />
            <FieldError>{form.formState.errors.name?.message}</FieldError>
          </Field>

          <Field data-invalid={!!form.formState.errors.workflow_type}>
            <FieldLabel htmlFor="wf-type">{t("workflowType")}</FieldLabel>
            <Controller
              control={form.control}
              name="workflow_type"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isDisabled}
                >
                  <SelectTrigger id="wf-type" size="sm" className="text-xs">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {workflowTypeOptions.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="text-xs"
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError>
              {form.formState.errors.workflow_type?.message}
            </FieldError>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="wf-description">{tfl("description")}</FieldLabel>
          <Textarea
            id="wf-description"
            placeholder={t("optionalDescription")}
            className="min-h-15 text-xs"
            disabled={isDisabled}
            maxLength={256}
            {...form.register("description")}
          />
        </Field>

        <Controller
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <StatusSwitch
              id="wf-is-active"
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={isDisabled}
            />
          )}
        />
      </FieldGroup>
    </div>
  );
}
