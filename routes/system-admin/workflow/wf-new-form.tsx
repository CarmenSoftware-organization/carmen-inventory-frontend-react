
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { Info } from "lucide-react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { DocFormHeader } from "@/components/share/doc-form-header";
import { Input } from "@/components/ui/input";
import { StatusSwitch } from "@/components/ui/status-switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { SettingSection } from "@/components/ui/setting-section";
import { toast } from "sonner";
import { useCreateWorkflow } from "@/hooks/use-workflow";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import { workflowTypeField } from "@/constant/workflow";
import {
  createWorkflowFormSchema,
  mapToPayload,
  EMPTY_FORM,
  type WorkflowFormValues,
} from "./wf-form-schema";

export default function WorkflowNewForm() {
  const navigate = useNavigate();
  const createWorkflow = useCreateWorkflow();
  const isPending = createWorkflow.isPending;
  const t = useTranslations("systemAdmin.workflow");
  const tc = useTranslations("common");
  const tt = useTranslations("toast");
  const tf = useTranslations("form");
  const tv = useTranslations("validation");
  const tfl = useTranslations("field");

  const schema = createWorkflowFormSchema(tv, t);
  const form = useForm<WorkflowFormValues>({
    resolver: zodResolver(schema) as Resolver<WorkflowFormValues>,
    defaultValues: EMPTY_FORM,
  });

  const onSubmit = (values: WorkflowFormValues) => {
    const payload = mapToPayload(values);

    createWorkflow.mutate(payload, {
      onSuccess: (res) => {
        toast.success(tt("createSuccess", { entity: t("entity") }));
        const data = res as unknown as { data?: { id?: string } };
        const id = data?.data?.id ?? payload.id;
        navigate(`/system-admin/workflow/${id}`, { replace: true });
      },
    });
  };

  return (
    <div className="mx-auto max-w-4xl p-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mb-6">
        <DocFormHeader
          flush
          title={tf("addTitle", { entity: t("entity") })}
          backLabel={tc("goBack")}
          onBack={() => navigate("/system-admin/workflow")}
          actions={
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate("/system-admin/workflow")}
                disabled={isPending}
                className="text-xs"
              >
                {tc("cancel")}
              </Button>
              <Button
                type="submit"
                size="sm"
                form="new-workflow-form"
                disabled={isPending}
                className="text-xs"
              >
                {isPending ? tf("creating") : t("createWorkflow")}
              </Button>
            </>
          }
        />
      </div>

      <form
        id="new-workflow-form"
        onSubmit={form.handleSubmit(onSubmit, () =>
          scrollToFirstInvalidField(),
        )}
      >
        {/* General */}
        <SettingSection first title={t("general")} description={t("generalDesc")}>
          <Field data-invalid={!!form.formState.errors.name}>
            <FieldLabel htmlFor="wf-name">{t("workflowName")}</FieldLabel>
            <Input
              id="wf-name"
              placeholder={t("workflowNamePlaceholder")}
              className="h-8"
              disabled={isPending}
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
                  disabled={isPending}
                >
                  <SelectTrigger id="wf-type" size="sm" className="text-xs">
                    <SelectValue placeholder={t("selectType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {workflowTypeField.map((opt) => (
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

          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="wf-description">
              {tfl("description")}
            </FieldLabel>
            <Textarea
              id="wf-description"
              placeholder={t("optionalDescription")}
              className="min-h-15 text-xs"
              disabled={isPending}
              maxLength={256}
              {...form.register("description")}
            />
          </Field>
        </SettingSection>

        {/* Status */}
        <SettingSection title={t("status")} description={t("statusDesc")}>
          <div className="sm:col-span-2 space-y-3">
            <Controller
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <StatusSwitch
                  id="wf-is-active"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isPending}
                />
              )}
            />

            {/* single-signal hint (DESIGN.md "avoid neon"): info tint on the
                icon only; box, border and text stay neutral */}
            <div className="bg-muted/40 rounded-md border px-2.5 py-2">
              <div className="flex items-start gap-2">
                <Info className="text-info mt-0.5 size-3.5 shrink-0" />
                <div className="space-y-0.5 text-xs">
                  <p className="text-foreground font-semibold">
                    {t("defaultConfig")}
                  </p>
                  <p className="text-muted-foreground">
                    {t("defaultConfigDesc")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SettingSection>
      </form>
    </div>
  );
}
