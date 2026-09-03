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
import { Textarea } from "@/components/ui/textarea";
import { ConfigEntityDialog } from "@/components/templates/config-entity-dialog";
import { useCreateChartOfAccount, useUpdateChartOfAccount } from "./use-coa";
import {
  CHART_OF_ACCOUNT_TYPE,
  CHART_OF_ACCOUNT_TYPES,
  ACCOUNT_NATURE,
  ACCOUNT_NATURES,
  type ChartOfAccount,
} from "@/types/chart-of-account";
import { createCoaSchema, type CoaFormValues } from "./coa-form-schema";

interface CoaDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly chartOfAccount?: ChartOfAccount | null;
  readonly readOnly?: boolean;
}

type CoaPayload = {
  code: string;
  description_1: string;
  description_2: string | null;
  nature: ACCOUNT_NATURE;
  type: CHART_OF_ACCOUNT_TYPE;
  is_active: boolean;
};

export function CoaDialog({
  open,
  onOpenChange,
  chartOfAccount,
  readOnly,
}: CoaDialogProps) {
  const t = useTranslations("config.chartOfAccount");
  const tfl = useTranslations("field");

  return (
    <ConfigEntityDialog<ChartOfAccount, CoaFormValues, CoaPayload>
      open={open}
      onOpenChange={onOpenChange}
      entity={chartOfAccount}
      readOnly={readOnly}
      icon={BookText}
      // สองคอลัมน์ต้องการที่ — กว้าง md เดิมบีบจนช่องแคบกว่าที่อ่านสบาย
      contentClassName="sm:max-w-2xl"
      translationNamespace="config.chartOfAccount"
      useCreate={useCreateChartOfAccount}
      useUpdate={useUpdateChartOfAccount}
      buildSchema={createCoaSchema}
      toFormValues={(e) =>
        e
          ? {
              code: e.code,
              description_1: e.description_1 ?? "",
              description_2: e.description_2 ?? "",
              nature: e.nature,
              type: e.type,
              is_active: e.is_active,
            }
          : {
              code: "",
              description_1: "",
              description_2: "",
              nature: ACCOUNT_NATURE.DEBIT,
              type: CHART_OF_ACCOUNT_TYPE.BALANCE_SHEET,
              is_active: true,
            }
      }
      toPayload={(v) => ({
        code: v.code,
        description_1: v.description_1,
        description_2: v.description_2 || null,
        nature: v.nature,
        type: v.type,
        is_active: v.is_active,
      })}
    >
      {({ form, disabled }) => (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="coa-code" required>
                {tfl("code")}
              </FieldLabel>
              <FieldInput
                id="coa-code"
                placeholder={t("codePlaceholder")}
                className="h-8"
                disabled={disabled}
                error={form.formState.errors.code?.message}
                maxLength={50}
                {...form.register("code")}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="coa-description-1" required>
                {t("accountName")}
              </FieldLabel>
              <FieldInput
                id="coa-description-1"
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
                      {CHART_OF_ACCOUNT_TYPES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {t(`accountType.${value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </FieldSelect>
                )}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="coa-description-2">
              {tfl("description")}
            </FieldLabel>
            <Textarea
              id="coa-description-2"
              placeholder={tfl("optional")}
              rows={2}
              className="resize-none text-xs"
              disabled={disabled}
              maxLength={150}
              {...form.register("description_2")}
            />
          </Field>
          <Controller
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <StatusSwitch
                id="coa-is-active"
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={disabled}
              />
            )}
          />
        </div>
      )}
    </ConfigEntityDialog>
  );
}
