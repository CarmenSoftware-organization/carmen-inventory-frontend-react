import { Controller } from "react-hook-form";
import { BookText } from "lucide-react";
import { useTranslations } from "use-intl";
import { StatusSwitch } from "@/components/ui/status-switch";
import {
  Field,
  FieldInput,
  FieldLabel,
  FieldSelect,
} from "@/components/ui/field";
import { SelectContent, SelectItem } from "@/components/ui/select";
import { ConfigEntityDialog } from "@/components/templates/config-entity-dialog";
import { useCreateAccountCode, useUpdateAccountCode } from "./use-account-code";
import {
  ACCOUNT_CODE_TYPE,
  ACCOUNT_CODE_TYPES,
  ACCOUNT_NATURE,
  ACCOUNT_NATURES,
  type AccountCode,
} from "@/types/account-code";
import { createAcSchema, type AcFormValues } from "./ac-form-schema";

interface AcDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly accountCode?: AccountCode | null;
  readonly readOnly?: boolean;
}

type AcPayload = {
  code: string;
  description_1: string;
  nature: ACCOUNT_NATURE;
  type: ACCOUNT_CODE_TYPE;
  is_active: boolean;
};

export function AcDialog({
  open,
  onOpenChange,
  accountCode,
  readOnly,
}: AcDialogProps) {
  const t = useTranslations("config.accountCode");
  const tfl = useTranslations("field");

  return (
    <ConfigEntityDialog<AccountCode, AcFormValues, AcPayload>
      open={open}
      onOpenChange={onOpenChange}
      entity={accountCode}
      readOnly={readOnly}
      icon={BookText}
      translationNamespace="config.accountCode"
      useCreate={useCreateAccountCode}
      useUpdate={useUpdateAccountCode}
      buildSchema={createAcSchema}
      toFormValues={(e) =>
        e
          ? {
              code: e.code,
              description_1: e.description_1 ?? "",
              nature: e.nature,
              type: e.type,
              is_active: e.is_active,
            }
          : {
              code: "",
              description_1: "",
              // ผังบัญชีส่วนใหญ่เริ่มที่บัญชีสินทรัพย์ซึ่งเป็นเดบิต และบัญชีที่
              // ลงรายการได้จริงคือ balance_sheet — ตั้งค่าที่คนกรอกบ่อยที่สุดไว้ก่อน
              nature: ACCOUNT_NATURE.DEBIT,
              type: ACCOUNT_CODE_TYPE.BALANCE_SHEET,
              is_active: true,
            }
      }
      toPayload={(v) => ({
        code: v.code,
        description_1: v.description_1,
        nature: v.nature,
        type: v.type,
        is_active: v.is_active,
      })}
    >
      {({ form, disabled }) => (
        <>
          <Field>
            <FieldLabel htmlFor="account-code-code" required>
              {tfl("code")}
            </FieldLabel>
            <FieldInput
              id="account-code-code"
              placeholder={t("codePlaceholder")}
              className="h-8"
              disabled={disabled}
              error={form.formState.errors.code?.message}
              maxLength={50}
              {...form.register("code")}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="account-code-description-1" required>
              {t("accountName")}
            </FieldLabel>
            <FieldInput
              id="account-code-description-1"
              placeholder={t("accountNamePlaceholder")}
              className="h-8"
              disabled={disabled}
              error={form.formState.errors.description_1?.message}
              maxLength={150}
              {...form.register("description_1")}
            />
          </Field>

          <Field>
            <FieldLabel required>{tfl("nature")}</FieldLabel>
            <Controller
              control={form.control}
              name="nature"
              render={({ field }) => (
                <FieldSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={disabled}
                  error={form.formState.errors.nature?.message}
                  placeholder={t("selectNature")}
                  className="h-8 text-sm"
                >
                  <SelectContent>
                    {ACCOUNT_NATURES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {t(`nature.${value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </FieldSelect>
              )}
            />
          </Field>

          <Field>
            <FieldLabel required>{tfl("type")}</FieldLabel>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <FieldSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={disabled}
                  error={form.formState.errors.type?.message}
                  placeholder={tfl("selectType")}
                  className="h-8 text-sm"
                >
                  <SelectContent>
                    {ACCOUNT_CODE_TYPES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {t(`accountType.${value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </FieldSelect>
              )}
            />
          </Field>

          <Controller
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <StatusSwitch
                id="account-code-is-active"
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={disabled}
              />
            )}
          />
        </>
      )}
    </ConfigEntityDialog>
  );
}
