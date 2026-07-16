import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { SettingSection } from "@/components/ui/setting-section";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import { useInterfaceConfig } from "./use-interface-config";
import { InterfacePageLayout } from "./interface-page-layout";
import { TextField, EnumField, ToggleField } from "./interface-fields";

export const posSchema = z.object({
  enabled: z.boolean(),
  vendor: z.enum(["micros", "infrasys", "square", "other"]),
  endpoint: z.string(),
  api_key: z.string(),
  sync_frequency: z.enum(["manual", "hourly", "daily"]),
  default_location_code: z.string(),
  consumption_posting: z.enum(["recipe", "direct"]),
});

export type PosFormValues = z.infer<typeof posSchema>;

export const EMPTY_POS: PosFormValues = {
  enabled: false,
  vendor: "micros",
  endpoint: "",
  api_key: "",
  sync_frequency: "manual",
  default_location_code: "",
  consumption_posting: "recipe",
};

/**
 * แปลงค่าจาก app_config เป็นค่า form
 *
 * `api_key` ที่ backend ส่งมาเป็น mask (`***ENCRYPTED***`) ถูกเก็บไว้ตามเดิม — ถ้า user
 * ไม่แตะ ค่านี้จะถูกส่งกลับขึ้นไปแล้ว backend คืนค่าลับเดิมให้ (ดู `retainMaskedSecrets`)
 */
export function toFormValues(
  value: Record<string, unknown> | undefined,
): PosFormValues {
  if (!value) return EMPTY_POS;
  const parsed = posSchema.safeParse({ ...EMPTY_POS, ...value });
  return parsed.success ? parsed.data : EMPTY_POS;
}

/** แปลงค่า form เป็น payload ของ app_config */
export function toApiValue(values: PosFormValues): Record<string, unknown> {
  return { ...values };
}

// derive dropdown options from the schema so the two never drift
const VENDORS = posSchema.shape.vendor.options;
const FREQUENCIES = posSchema.shape.sync_frequency.options;
const POSTINGS = posSchema.shape.consumption_posting.options;

/**
 * หน้า config ของ POS Interface — ตั้งค่าการดึงยอดขาย/การใช้วัตถุดิบจากระบบขายหน้าร้าน
 *
 * @returns React element ของหน้า POS interface
 */
export default function PosInterfaceForm() {
  const t = useTranslations("systemAdmin.interface");
  const tp = useTranslations("systemAdmin.interface.pos");
  const { value, isLoading, isError, refetch, save, isSaving } =
    useInterfaceConfig("interface_pos");

  const form = useForm<PosFormValues>({
    resolver: zodResolver(posSchema) as Resolver<PosFormValues>,
    defaultValues: EMPTY_POS,
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
      title={tp("title")}
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
        <EnumField
          label={tp("vendor")}
          value={form.watch("vendor")}
          options={VENDORS}
          optionLabel={(v) => tp(`vendorOption.${v}`)}
          onChange={(v) => form.setValue("vendor", v, { shouldDirty: true })}
        />
        <TextField
          label={t("endpoint")}
          field={form.register("endpoint")}
          error={form.formState.errors.endpoint?.message}
          placeholder="https://pos.example.com"
        />
        <TextField
          label={t("apiKey")}
          field={form.register("api_key")}
          error={form.formState.errors.api_key?.message}
          type="password"
          hint={t("apiKeyHint")}
          className="sm:col-span-2"
        />
      </SettingSection>

      <SettingSection title={tp("sync")} description={tp("syncDesc")}>
        <EnumField
          label={tp("syncFrequency")}
          value={form.watch("sync_frequency")}
          options={FREQUENCIES}
          optionLabel={(f) => t(`frequencyOption.${f}`)}
          onChange={(v) => form.setValue("sync_frequency", v, { shouldDirty: true })}
        />
        <TextField
          label={tp("defaultLocationCode")}
          field={form.register("default_location_code")}
          error={form.formState.errors.default_location_code?.message}
          placeholder="L1"
        />
        <EnumField
          label={tp("consumptionPosting")}
          value={form.watch("consumption_posting")}
          options={POSTINGS}
          optionLabel={(p) => tp(`postingOption.${p}`)}
          onChange={(v) =>
            form.setValue("consumption_posting", v, { shouldDirty: true })
          }
        />
      </SettingSection>
    </InterfacePageLayout>
  );
}
