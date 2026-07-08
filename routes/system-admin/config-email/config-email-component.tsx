
import { useEffect } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Save, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { SettingSection } from "../business-setting/business-setting-ui";
import { useAppConfigByKey, useUpsertAppConfig, useTestEmail } from "@/hooks/use-app-config";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";

const schema = z.object({
  smtp_host: z.string().min(1, "SMTP host is required"),
  smtp_port: z.coerce.number().int().min(1).max(65535),
  smtp_username: z.string().min(1, "Username is required"),
  smtp_password: z.string().min(1, "Password is required"),
  smtp_from: z.string().min(1, "From address is required"),
  smtp_enabled: z.boolean(),
  recipients: z.string(),
  cc: z.string(),
  subject_prefix: z.string(),
});

type FormValues = z.infer<typeof schema>;

const EMPTY_FORM: FormValues = {
  smtp_host: "",
  smtp_port: 587,
  smtp_username: "",
  smtp_password: "",
  smtp_from: "",
  smtp_enabled: true,
  recipients: "",
  cc: "",
  subject_prefix: "[Carmen]",
};

function toFormValues(value: Record<string, unknown> | undefined): FormValues {
  if (!value) return EMPTY_FORM;
  const smtp = (value.smtp || {}) as Record<string, unknown>;
  return {
    smtp_host: (smtp.host as string) || "",
    smtp_port: (smtp.port as number) || 587,
    smtp_username: (smtp.username as string) || "",
    smtp_password: (smtp.password as string) || "",
    smtp_from: (smtp.from as string) || "",
    smtp_enabled: smtp.enabled !== false,
    recipients: ((value.recipients as string[]) || []).join(", "),
    cc: ((value.cc as string[]) || []).join(", "),
    subject_prefix: (value.subject_prefix as string) || "",
  };
}

function toApiValue(values: FormValues): Record<string, unknown> {
  const parseEmails = (s: string) =>
    s.split(/[,;\s]+/).map((e) => e.trim()).filter(Boolean);
  return {
    smtp: {
      host: values.smtp_host,
      port: values.smtp_port,
      username: values.smtp_username,
      password: values.smtp_password,
      from: values.smtp_from,
      enabled: values.smtp_enabled,
    },
    recipients: parseEmails(values.recipients),
    cc: parseEmails(values.cc),
    subject_prefix: values.subject_prefix,
  };
}

export default function ConfigEmailComponent() {
  const { data, isLoading } = useAppConfigByKey("report_email");
  const upsert = useUpsertAppConfig();
  const testEmail = useTestEmail();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: EMPTY_FORM,
  });

  useEffect(() => {
    if (data?.value) {
      form.reset(toFormValues(data.value));
    }
  }, [data, form]);

  const onSubmit = (values: FormValues) => {
    upsert.mutate(
      { key: "report_email", value: toApiValue(values) },
      {
        onSuccess: () => toast.success("Email config saved"),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const handleTestEmail = () => {
    testEmail.mutate(undefined as never, {
      onSuccess: () => toast.success("Test email sent successfully"),
      onError: (err) => toast.error(err.message),
    });
  };

  const smtpEnabled = useWatch({ control: form.control, name: "smtp_enabled" });
  const submit = form.handleSubmit(onSubmit, () => scrollToFirstInvalidField());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-[max(1rem,env(safe-area-inset-bottom))]">
      {/* ── Header: title + actions (business-setting layout) ── */}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Email Configuration
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            SMTP settings for sending notification and report emails
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleTestEmail}
            disabled={testEmail.isPending}
          >
            <Send className="size-3.5" aria-hidden="true" />
            Test Email
          </Button>
          <Button size="sm" onClick={submit} disabled={upsert.isPending}>
            {upsert.isPending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="size-3.5" aria-hidden="true" />
            )}
            {upsert.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </header>

      <form onSubmit={submit}>
        <SettingSection
          first
          title="SMTP Server"
          description="Connection details for the outgoing mail server."
        >
          <Field>
            <FieldLabel>Host</FieldLabel>
            <Input {...form.register("smtp_host")} placeholder="smtp.gmail.com" />
            <FieldError>{form.formState.errors.smtp_host?.message}</FieldError>
          </Field>
          <Field>
            <FieldLabel>Port</FieldLabel>
            <Input
              {...form.register("smtp_port")}
              type="number"
              placeholder="587"
            />
            <FieldError>{form.formState.errors.smtp_port?.message}</FieldError>
          </Field>
          <Field>
            <FieldLabel>Username</FieldLabel>
            <Input
              {...form.register("smtp_username")}
              placeholder="noreply@example.com"
            />
            <FieldError>
              {form.formState.errors.smtp_username?.message}
            </FieldError>
          </Field>
          <Field>
            <FieldLabel>Password</FieldLabel>
            <Input
              {...form.register("smtp_password")}
              type="password"
              placeholder="App password"
            />
            <FieldError>
              {form.formState.errors.smtp_password?.message}
            </FieldError>
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>From Address</FieldLabel>
            <Input
              {...form.register("smtp_from")}
              placeholder="noreply@example.com"
            />
            <FieldError>{form.formState.errors.smtp_from?.message}</FieldError>
          </Field>
          <div className="flex items-center gap-3 pt-1 sm:col-span-2">
            <Switch
              id="smtp_enabled"
              checked={smtpEnabled}
              onCheckedChange={(v) =>
                form.setValue("smtp_enabled", v, { shouldDirty: true })
              }
            />
            <label htmlFor="smtp_enabled" className="text-foreground text-sm">
              Enabled
            </label>
          </div>
        </SettingSection>

        <SettingSection
          title="Recipients"
          description="Where report and notification emails are delivered."
        >
          <Field className="sm:col-span-2">
            <FieldLabel>To (comma-separated)</FieldLabel>
            <Input
              {...form.register("recipients")}
              placeholder="admin@example.com, manager@example.com"
            />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>CC (comma-separated)</FieldLabel>
            <Input
              {...form.register("cc")}
              placeholder="finance@example.com"
            />
          </Field>
          <Field>
            <FieldLabel>Subject Prefix</FieldLabel>
            <Input {...form.register("subject_prefix")} placeholder="[Carmen]" />
          </Field>
        </SettingSection>
      </form>
    </div>
  );
}
