import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { useParams } from "react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { SettingSection } from "@/components/ui/setting-section";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import { useInterfaceConfig } from "./use-interface-config";
import { InterfacePageLayout } from "./interface-page-layout";
import { TextField, EnumField, ToggleField } from "./interface-fields";

export const accountingSchema = z.object({
  enabled: z.boolean(),
  default_account_code: z.string(),
  default_department_code: z.string(),
  /** free text — ดู "Open question" ใน spec: KB ไม่ได้ระบุว่า value นี้คืออะไร */
  default_invoice_value: z.string(),
  export_format: z.enum(["csv", "xml", "json"]),
  endpoint: z.string(),
  posting_frequency: z.enum(["manual", "daily", "monthly"]),
});

export type AccountingFormValues = z.infer<typeof accountingSchema>;

export const EMPTY_ACCOUNTING: AccountingFormValues = {
  enabled: false,
  default_account_code: "",
  default_department_code: "",
  default_invoice_value: "",
  export_format: "csv",
  endpoint: "",
  posting_frequency: "manual",
};

/** แปลงค่าจาก app_config เป็นค่า form — key ที่ขาดตกไปใช้ default */
export function toFormValues(
  value: Record<string, unknown> | undefined,
): AccountingFormValues {
  if (!value) return EMPTY_ACCOUNTING;
  const parsed = accountingSchema.safeParse({ ...EMPTY_ACCOUNTING, ...value });
  return parsed.success ? parsed.data : EMPTY_ACCOUNTING;
}

/** แปลงค่า form เป็น payload ของ app_config */
export function toApiValue(
  values: AccountingFormValues,
): Record<string, unknown> {
  return { ...values };
}

// derive dropdown options from the schema so the two never drift
const FORMATS = accountingSchema.shape.export_format.options;
const FREQUENCIES = accountingSchema.shape.posting_frequency.options;

/**
 * หน้า config ของ Accounting brand เดียว — ตั้งค่าการส่งข้อมูลไป GL/AP
 *
 * brand (Carmen GL / BlueLedgers / External) มาจาก route param — เก็บใน key
 * `interface_accounting_<brand>` ไม่ใช่ field ในฟอร์ม
 *
 * `default_account_code` / `default_department_code` / `default_invoice_value` เป็นค่า
 * fallback ที่ระบบใช้เมื่อ vendor ไม่ได้ตั้งค่าไว้ (ดู kb-carmen changelog sep2024)
 *
 * @returns React element ของหน้า accounting interface
 */
export default function AccountingInterfaceForm() {
  const t = useTranslations("systemAdmin.interface");
  const ta = useTranslations("systemAdmin.interface.accounting");
  const { brand } = useParams<{ brand: string }>();
  const { value, isLoading, isError, refetch, save, isSaving } =
    useInterfaceConfig(`interface_accounting_${brand}`);

  const form = useForm<AccountingFormValues>({
    resolver: zodResolver(accountingSchema) as Resolver<AccountingFormValues>,
    defaultValues: EMPTY_ACCOUNTING,
  });

  useEffect(() => {
    if (value) form.reset(toFormValues(value));
  }, [value, form]);

  const submit = form.handleSubmit(
    (values) =>
      save(toApiValue(values), { onSuccess: () => toast.success(t("saved")) }),
    () => scrollToFirstInvalidField(),
  );

  return (
    <InterfacePageLayout
      title={ta(`brand.${brand}`)}
      description={ta("desc")}
      onSave={submit}
      isSaving={isSaving}
      isLoading={isLoading}
      isError={isError}
      isDirty={form.formState.isDirty}
      onRetry={refetch}
      errorMessage={t("loadError")}
      saveLabel={t("save")}
    >
      <SettingSection first title={ta("connection")} description={ta("connectionDesc")}>
        <ToggleField
          label={t("enabled")}
          checked={form.watch("enabled")}
          onChange={(v) => form.setValue("enabled", v, { shouldDirty: true })}
        />
        <TextField
          label={t("endpoint")}
          field={form.register("endpoint")}
          error={form.formState.errors.endpoint?.message}
          placeholder="https://gl.example.com"
          className="sm:col-span-2"
        />
      </SettingSection>

      <SettingSection title={ta("defaults")} description={ta("defaultsDesc")}>
        <TextField
          label={ta("defaultAccountCode")}
          field={form.register("default_account_code")}
          error={form.formState.errors.default_account_code?.message}
          placeholder="1000"
        />
        <TextField
          label={ta("defaultDepartmentCode")}
          field={form.register("default_department_code")}
          error={form.formState.errors.default_department_code?.message}
          placeholder="D1"
        />
        <TextField
          label={ta("defaultInvoiceValue")}
          field={form.register("default_invoice_value")}
          error={form.formState.errors.default_invoice_value?.message}
          placeholder="0"
        />
      </SettingSection>

      <SettingSection title={ta("posting")} description={ta("postingDesc")}>
        <EnumField
          label={ta("exportFormat")}
          value={form.watch("export_format")}
          options={FORMATS}
          optionLabel={(f) => ta(`formatOption.${f}`)}
          onChange={(v) => form.setValue("export_format", v, { shouldDirty: true })}
        />
        <EnumField
          label={ta("postingFrequency")}
          value={form.watch("posting_frequency")}
          options={FREQUENCIES}
          optionLabel={(f) => t(`frequencyOption.${f}`)}
          onChange={(v) =>
            form.setValue("posting_frequency", v, { shouldDirty: true })
          }
        />
      </SettingSection>
    </InterfacePageLayout>
  );
}
