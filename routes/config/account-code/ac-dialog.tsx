import { Controller } from "react-hook-form";
import { BookText } from "lucide-react";
import { useTranslations } from "use-intl";
import { StatusSwitch } from "@/components/ui/status-switch";
import { Field, FieldInput, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ConfigEntityDialog } from "@/components/templates/config-entity-dialog";
import {
  useCreateAccountCode,
  useUpdateAccountCode,
} from "@/hooks/use-account-code";
import type { AccountCode } from "@/types/account-code";
import { createAcSchema, type AcFormValues } from "./ac-form-schema";

interface AcDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly accountCode?: AccountCode | null;
  readonly readOnly?: boolean;
}

type AcPayload = {
  code: string;
  name: string;
  description: string | null;
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
              name: e.name,
              description: e.description ?? "",
              is_active: e.is_active,
            }
          : {
              code: "",
              name: "",
              description: "",
              is_active: true,
            }
      }
      toPayload={(v) => ({
        code: v.code,
        name: v.name,
        description: v.description || null,
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
            <FieldLabel htmlFor="account-code-name" required>
              {tfl("name")}
            </FieldLabel>
            <FieldInput
              id="account-code-name"
              placeholder={t("namePlaceholder")}
              className="h-8"
              disabled={disabled}
              error={form.formState.errors.name?.message}
              maxLength={150}
              {...form.register("name")}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="account-code-description">
              {tfl("description")}
            </FieldLabel>
            <Textarea
              id="account-code-description"
              placeholder={tfl("optional")}
              className="h-8"
              disabled={disabled}
              maxLength={256}
              {...form.register("description")}
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
