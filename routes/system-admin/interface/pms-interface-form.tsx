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
import { TextField, ToggleField } from "./interface-fields";

export const pmsSchema = z.object({
  enabled: z.boolean(),
  endpoint: z.string(),
  api_key: z.string(),
  property_code: z.string(),
  post_city_ledger: z.boolean(),
  post_credit_card: z.boolean(),
});

export type PmsFormValues = z.infer<typeof pmsSchema>;

export const EMPTY_PMS: PmsFormValues = {
  enabled: false,
  endpoint: "",
  api_key: "",
  property_code: "",
  post_city_ledger: false,
  post_credit_card: false,
};

/** แปลงค่าจาก app_config เป็นค่า form — `api_key` ที่เป็น mask ถูกเก็บไว้ตามเดิม */
export function toFormValues(
  value: Record<string, unknown> | undefined,
): PmsFormValues {
  if (!value) return EMPTY_PMS;
  const parsed = pmsSchema.safeParse({ ...EMPTY_PMS, ...value });
  return parsed.success ? parsed.data : EMPTY_PMS;
}

/** แปลงค่า form เป็น payload ของ app_config */
export function toApiValue(values: PmsFormValues): Record<string, unknown> {
  return { ...values };
}

/**
 * หน้า config ของ PMS brand เดียว — ตั้งค่าการ post City Ledger / Credit Card จากระบบ PMS
 *
 * brand (Opera / Protel) มาจาก route param — เก็บใน key `interface_pms_<brand>`
 * ไม่ใช่ field ในฟอร์ม
 *
 * City Ledger และ Credit Card เป็นสองอย่างที่ Carmen ดึงจาก PMS ผ่าน API
 * (ดู kb-carmen AR-posting_pms.md)
 *
 * @returns React element ของหน้า PMS interface
 */
export default function PmsInterfaceForm() {
  const t = useTranslations("systemAdmin.interface");
  const tp = useTranslations("systemAdmin.interface.pms");
  const { brand } = useParams<{ brand: string }>();
  const { value, isLoading, isError, refetch, save, isSaving } =
    useInterfaceConfig(`interface_pms_${brand}`);

  const form = useForm<PmsFormValues>({
    resolver: zodResolver(pmsSchema) as Resolver<PmsFormValues>,
    defaultValues: EMPTY_PMS,
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
      title={tp(`brand.${brand}`)}
      description={tp("desc")}
      onSave={submit}
      isSaving={isSaving}
      isLoading={isLoading}
      isError={isError}
      isDirty={form.formState.isDirty}
      onRetry={refetch}
      errorMessage={t("loadError")}
      saveLabel={t("save")}
    >
      <SettingSection first title={tp("connection")} description={tp("connectionDesc")}>
        <ToggleField
          label={t("enabled")}
          checked={form.watch("enabled")}
          onChange={(v) => form.setValue("enabled", v, { shouldDirty: true })}
        />
        <TextField
          label={tp("propertyCode")}
          field={form.register("property_code")}
          error={form.formState.errors.property_code?.message}
          placeholder="P1"
        />
        <TextField
          label={t("endpoint")}
          field={form.register("endpoint")}
          error={form.formState.errors.endpoint?.message}
          placeholder="https://pms.example.com"
        />
        <TextField
          label={t("apiKey")}
          field={form.register("api_key")}
          error={form.formState.errors.api_key?.message}
          type="password"
          hint={t("apiKeyHint")}
        />
      </SettingSection>

      <SettingSection title={tp("posting")} description={tp("postingDesc")}>
        <ToggleField
          label={tp("postCityLedger")}
          checked={form.watch("post_city_ledger")}
          onChange={(v) =>
            form.setValue("post_city_ledger", v, { shouldDirty: true })
          }
        />
        <ToggleField
          label={tp("postCreditCard")}
          checked={form.watch("post_credit_card")}
          onChange={(v) =>
            form.setValue("post_credit_card", v, { shouldDirty: true })
          }
        />
      </SettingSection>
    </InterfacePageLayout>
  );
}
