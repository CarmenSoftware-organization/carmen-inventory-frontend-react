
import { useEffect } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldInput,
  FieldLabel,
  FieldSelect,
} from "@/components/ui/field";
import { SelectContent, SelectItem } from "@/components/ui/select";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import { useReportTemplates } from "@/hooks/use-report";
import { useCreateReportSchedule } from "@/hooks/use-report-schedule";
import {
  EMPTY_FORM,
  createScheduleSchema,
  type ScheduleFormValues,
} from "./schedule-form-schema";
import { parseScheduleDialog } from "./parse-schedule-dialog";
import { ScheduleFrequencyField } from "./schedule-frequency-field";
import { ScheduleFiltersField } from "./schedule-filters-field";
import { ScheduleNotificationsField } from "./schedule-notifications-field";
import { ScheduleRecipientsField } from "./schedule-recipients-field";

interface CreateScheduleDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly buCode: string;
  readonly onCreated: () => void;
}

export function CreateScheduleDialog({
  open,
  onOpenChange,
  buCode,
  onCreated,
}: CreateScheduleDialogProps) {
  const t = useTranslations("reportSchedule");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");
  const tv = useTranslations("validation");
  const tt = useTranslations("toast");

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(
      createScheduleSchema(tv, tfl),
    ) as Resolver<ScheduleFormValues>,
    defaultValues: EMPTY_FORM,
  });

  const { data: templatesResp } = useReportTemplates();
  const templates = templatesResp?.data ?? [];

  const createMutation = useCreateReportSchedule();
  const isPending = createMutation.isPending;

  const selectedTemplateId = useWatch({
    control: form.control,
    name: "report_template_id",
  });
  const selectedTemplate = templates.find(
    (tpl) => tpl.id === selectedTemplateId,
  );

  const dialogFields = parseScheduleDialog(selectedTemplate?.dialog);

  // Reset filters when template changes (don't carry old keys to new template)
  useEffect(() => {
    form.setValue("filters", {});
  }, [selectedTemplateId, form]);

  // Reset whole form when dialog closes
  useEffect(() => {
    if (!open) form.reset(EMPTY_FORM);
  }, [open, form]);

  const onSubmit = async (values: ScheduleFormValues) => {
    const allFilters: Record<string, string> = {};
    for (const field of dialogFields) {
      allFilters[field.name] =
        values.filters[field.name] ?? (field.type === "select" ? "ALL" : "");
    }

    try {
      await createMutation.mutateAsync({
        name: values.name,
        report_type: selectedTemplate?.report_group ?? "",
        report_template_id: values.report_template_id,
        format: "viewer_url",
        delivery: {
          type: "viewer_url",
          viewer_endpoint: API_ENDPOINTS.REPORT_VIEWER(buCode),
        },
        schedule_config: {
          frequency: values.frequency,
          time: values.time,
          ...(values.frequency === "weekly" && {
            days_of_week: values.days_of_week,
          }),
          ...(values.frequency === "monthly" && {
            days_of_month: values.days_of_month,
          }),
        },
        notifications: {
          web: values.notify_web,
          email: values.notify_email,
        },
        ...(dialogFields.length > 0 && { filters: allFilters }),
        ...(values.recipients.length > 0 && { recipients: values.recipients }),
      });

      toast.success(tt("createSuccess", { entity: t("title") }));
      onOpenChange(false);
      onCreated();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("createFailed");
      toast.error(msg);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => (isPending ? undefined : onOpenChange(v))}
    >
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
          <DialogTitle>{t("createSchedule")}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit, () =>
            scrollToFirstInvalidField(),
          )}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-4 overflow-y-auto border-y px-6 py-4">
            <Field>
              <FieldLabel required>{tfl("name")}</FieldLabel>
              <FieldInput
                className="h-8"
                placeholder={t("namePlaceholder")}
                maxLength={100}
                disabled={isPending}
                error={form.formState.errors.name?.message}
                {...form.register("name")}
              />
            </Field>

            <Field>
              <FieldLabel required>{tfl("reportTemplate")}</FieldLabel>
              <FieldSelect
                value={selectedTemplateId}
                onValueChange={(v) =>
                  form.setValue("report_template_id", v, {
                    shouldValidate: true,
                  })
                }
                disabled={isPending}
                placeholder={t("selectTemplate")}
                className="h-8"
                error={form.formState.errors.report_template_id?.message}
              >
                <SelectContent>
                  {templates
                    .filter((tpl) => !!tpl.id)
                    .map((tpl) => (
                      <SelectItem key={tpl.id} value={tpl.id}>
                        {tpl.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </FieldSelect>
            </Field>

            <ScheduleFrequencyField form={form} disabled={isPending} />

            <ScheduleFiltersField
              form={form}
              fields={dialogFields}
              disabled={isPending}
            />

            <ScheduleNotificationsField form={form} disabled={isPending} />

            <ScheduleRecipientsField form={form} disabled={isPending} />
          </div>

          <DialogFooter className="shrink-0 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t("creating") : t("createSchedule")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
