
import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Save, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { ModuleTileIcon } from "@/components/ui/module-tile";
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ModuleTileIcon />
            <h1 className="text-lg font-semibold">Email Configuration</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            SMTP settings for sending notification and report emails
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleTestEmail} disabled={testEmail.isPending}>
            <Send className="mr-1 size-4" />
            Test Email
          </Button>
        </div>
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit, () => scrollToFirstInvalidField())}
        className="mt-6 max-w-2xl space-y-6"
      >
        <div className="rounded-lg border p-4">
          <h2 className="mb-4 font-semibold">SMTP Server</h2>
          <FieldGroup>
            <div className="grid grid-cols-3 gap-4">
              <Field className="col-span-2">
                <FieldLabel>Host</FieldLabel>
                <Input {...form.register("smtp_host")} placeholder="smtp.gmail.com" />
                <FieldError>{form.formState.errors.smtp_host?.message}</FieldError>
              </Field>
              <Field>
                <FieldLabel>Port</FieldLabel>
                <Input {...form.register("smtp_port")} type="number" placeholder="587" />
                <FieldError>{form.formState.errors.smtp_port?.message}</FieldError>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Username</FieldLabel>
                <Input {...form.register("smtp_username")} placeholder="noreply@example.com" />
                <FieldError>{form.formState.errors.smtp_username?.message}</FieldError>
              </Field>
              <Field>
                <FieldLabel>Password</FieldLabel>
                <Input {...form.register("smtp_password")} type="password" placeholder="App password" />
                <FieldError>{form.formState.errors.smtp_password?.message}</FieldError>
              </Field>
            </div>
            <Field>
              <FieldLabel>From Address</FieldLabel>
              <Input {...form.register("smtp_from")} placeholder="noreply@example.com" />
              <FieldError>{form.formState.errors.smtp_from?.message}</FieldError>
            </Field>
            <Field className="flex items-center gap-3 pt-2">
              <Switch
                checked={form.watch("smtp_enabled")}
                onCheckedChange={(v) => form.setValue("smtp_enabled", v)}
              />
              <FieldLabel className="mb-0">Enabled</FieldLabel>
            </Field>
          </FieldGroup>
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="mb-4 font-semibold">Recipients</h2>
          <FieldGroup>
            <Field>
              <FieldLabel>To (comma-separated)</FieldLabel>
              <Input {...form.register("recipients")} placeholder="admin@example.com, manager@example.com" />
            </Field>
            <Field>
              <FieldLabel>CC (comma-separated)</FieldLabel>
              <Input {...form.register("cc")} placeholder="finance@example.com" />
            </Field>
            <Field>
              <FieldLabel>Subject Prefix</FieldLabel>
              <Input {...form.register("subject_prefix")} placeholder="[Carmen]" />
            </Field>
          </FieldGroup>
        </div>

        <Button type="submit" disabled={upsert.isPending}>
          <Save className="mr-1 size-4" />
          {upsert.isPending ? "Saving..." : "Save"}
        </Button>
      </form>
    </div>
  );
}
