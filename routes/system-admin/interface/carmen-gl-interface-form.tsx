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

export const carmenGlSchema = z.object({
  enabled: z.boolean(),
  api_server: z.string(),
  authorize_token: z.string(),
  account_code_path: z.string(),
  department_path: z.string(),
  vendor_path: z.string(),
  set_account_mapping_all_items: z.boolean(),
  allow_posting_transfer_to_gl: z.boolean(),
});

export type CarmenGlFormValues = z.infer<typeof carmenGlSchema>;

export const EMPTY_CARMEN_GL: CarmenGlFormValues = {
  enabled: false,
  api_server: "",
  authorize_token: "",
  account_code_path: "api/interface/accountCode",
  department_path: "api/interface/department",
  vendor_path: "api/interface/vendor",
  set_account_mapping_all_items: true,
  allow_posting_transfer_to_gl: false,
};

/** แปลงค่าจาก app_config เป็นค่า form — row shape เก่า (generic accounting) parse เป็น default */
export function toFormValues(
  value: Record<string, unknown> | undefined,
): CarmenGlFormValues {
  if (!value) return EMPTY_CARMEN_GL;
  const parsed = carmenGlSchema.safeParse({ ...EMPTY_CARMEN_GL, ...value });
  return parsed.success ? parsed.data : EMPTY_CARMEN_GL;
}

/** แปลงค่า form เป็น payload ของ app_config */
export function toApiValue(
  values: CarmenGlFormValues,
): Record<string, unknown> {
  return { ...values };
}

/**
 * หน้า config ของ Carmen GL (Carmen 4 legacy) — API server + authorize token +
 * endpoint path 3 เส้น + option การ post GL
 *
 * brand เดียวที่ใช้ฟอร์มนี้คือ carmen_gl (form override ใน registry) — config key จึง fix ได้
 *
 * `authorize_token` เป็น secret: backend เข้ารหัสตอนเก็บและ mask ตอน GET — ถ้าผู้ใช้ไม่แตะ
 * ช่องนี้ ฟอร์มส่ง mask กลับและ backend คง token เดิม (pattern เดียวกับ api_key ของ POS/PMS)
 *
 * @returns React element ของหน้า Carmen GL interface
 */
export default function CarmenGlInterfaceForm() {
  const t = useTranslations("systemAdmin.interface");
  const ta = useTranslations("systemAdmin.interface.accounting");
  const tc = useTranslations("systemAdmin.interface.accounting.carmenGl");
  const { brand } = useParams<{ brand: string }>();
  const { value, isLoading, isError, refetch, save, isSaving } =
    useInterfaceConfig("interface_accounting_carmen_gl");

  const form = useForm<CarmenGlFormValues>({
    resolver: zodResolver(carmenGlSchema) as Resolver<CarmenGlFormValues>,
    defaultValues: EMPTY_CARMEN_GL,
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
      description={tc("desc")}
      onSave={submit}
      isSaving={isSaving}
      isLoading={isLoading}
      isError={isError}
      isDirty={form.formState.isDirty}
      onRetry={refetch}
      errorMessage={t("loadError")}
      saveLabel={t("save")}
    >
      <SettingSection first title={tc("connection")} description={tc("connectionDesc")}>
        <ToggleField
          label={t("enabled")}
          checked={form.watch("enabled")}
          onChange={(v) => form.setValue("enabled", v, { shouldDirty: true })}
        />
        <TextField
          label={tc("apiServer")}
          field={form.register("api_server")}
          error={form.formState.errors.api_server?.message}
          placeholder="https://dev.carmen4.com/carmen.api/"
          className="sm:col-span-2"
        />
        <TextField
          label={tc("authorizeToken")}
          field={form.register("authorize_token")}
          error={form.formState.errors.authorize_token?.message}
          type="password"
          hint={t("apiKeyHint")}
          className="sm:col-span-2"
        />
      </SettingSection>

      <SettingSection title={tc("endpoints")} description={tc("endpointsDesc")}>
        <TextField
          label={tc("accountCodePath")}
          field={form.register("account_code_path")}
          error={form.formState.errors.account_code_path?.message}
        />
        <TextField
          label={tc("departmentPath")}
          field={form.register("department_path")}
          error={form.formState.errors.department_path?.message}
        />
        <TextField
          label={tc("vendorPath")}
          field={form.register("vendor_path")}
          error={form.formState.errors.vendor_path?.message}
        />
      </SettingSection>

      <SettingSection title={tc("options")} description={tc("optionsDesc")}>
        <ToggleField
          label={tc("setAccountMappingAllItems")}
          checked={form.watch("set_account_mapping_all_items")}
          onChange={(v) =>
            form.setValue("set_account_mapping_all_items", v, {
              shouldDirty: true,
            })
          }
        />
        <ToggleField
          label={tc("allowPostingTransferToGl")}
          checked={form.watch("allow_posting_transfer_to_gl")}
          onChange={(v) =>
            form.setValue("allow_posting_transfer_to_gl", v, {
              shouldDirty: true,
            })
          }
        />
      </SettingSection>
    </InterfacePageLayout>
  );
}
