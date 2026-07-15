
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { ArrowLeft, Info } from "lucide-react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
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
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={tc("goBack")}
            onClick={() => navigate("/system-admin/workflow")}
          >
            <ArrowLeft className="size-3.5" />
          </Button>
          <h1 className="text-lg font-semibold">
            {tf("addTitle", { entity: t("entity") })}
          </h1>
        </div>
        <div className="flex items-center gap-1.5">
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
        </div>
      </div>

      <form
        id="new-workflow-form"
        onSubmit={form.handleSubmit(onSubmit, () =>
          scrollToFirstInvalidField(),
        )}
        className="max-w-2xl"
      >
        <FieldGroup className="gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          </div>

          <Field>
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
        </FieldGroup>
      </form>

      <div className="border-info/40 bg-info/10 max-w-2xl rounded border px-2 py-1.5">
        <div className="flex items-start gap-1.5">
          <Info className="text-info-foreground mt-0.5 size-3.5" />
          <div className="space-y-0.5 text-xs">
            <p className="text-info-foreground font-semibold">
              {t("defaultConfig")}
            </p>
            <p className="text-info-foreground/85">{t("defaultConfigDesc")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
