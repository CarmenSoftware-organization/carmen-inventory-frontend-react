import { Controller } from "react-hook-form";
import { BookText, Layers } from "lucide-react";
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
  ACCOUNT_CATEGORIES,
  type AccountCategory,
  type ChartOfAccount,
} from "@/types/chart-of-accounts";
import { useAccountingMasterMock } from "../accounting-master-mock";
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
  category: AccountCategory;
  account_group_id?: string | null;
  allowed_dimensions?: string[] | null;
  dimension_required?: boolean;
  is_active: boolean;
};

export function CoaDialog({
  open,
  onOpenChange,
  chartOfAccount,
  readOnly,
}: CoaDialogProps) {
  const t = useTranslations("config.chartOfAccounts");
  const tfl = useTranslations("field");
  const store = useAccountingMasterMock();

  return (
    <ConfigEntityDialog<ChartOfAccount, CoaFormValues, CoaPayload>
      open={open}
      onOpenChange={onOpenChange}
      entity={chartOfAccount}
      readOnly={readOnly}
      icon={BookText}
      // สองคอลัมน์ต้องการที่ — กว้าง md เดิมบีบจนช่องแคบกว่าที่อ่านสบาย
      contentClassName="sm:max-w-2xl"
      translationNamespace="config.chartOfAccounts"
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
              category: e.category,
              account_group_id: e.account_group_id ?? null,
              allowed_dimensions: e.allowed_dimensions ?? [],
              dimension_required: e.dimension_required ?? false,
              is_active: e.is_active,
            }
          : {
              code: "",
              description_1: "",
              description_2: "",
              nature: ACCOUNT_NATURE.DEBIT,
              type: CHART_OF_ACCOUNT_TYPE.BALANCE_SHEET,
              category: "asset",
              account_group_id: null,
              allowed_dimensions: [],
              dimension_required: false,
              is_active: true,
            }
      }
      toPayload={(v) => ({
        code: v.code,
        description_1: v.description_1,
        description_2: v.description_2 || null,
        nature: v.nature,
        type: v.type,
        category: v.category,
        account_group_id: v.account_group_id || null,
        ...(v.allowed_dimensions && v.allowed_dimensions.length > 0
          ? { allowed_dimensions: v.allowed_dimensions }
          : {}),
        ...(v.dimension_required ? { dimension_required: true } : {}),
        is_active: v.is_active,
      })}
    >
      {({ form, disabled }) => {
        const watchedCategory = form.watch("category");
        const availableGroups = store.accountGroups.filter(
          (g) => g.is_active && g.category === watchedCategory,
        );
        return (
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
            <Field>
              <FieldLabel required>{tfl("category")}</FieldLabel>
              <Controller
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FieldSelect
                    value={field.value}
                    onValueChange={(val) => {
                      field.onChange(val);
                      const currentGroupId = form.getValues("account_group_id");
                      if (currentGroupId) {
                        const grp = store.accountGroups.find(
                          (g) => g.id === currentGroupId,
                        );
                        if (grp && grp.category !== val) {
                          form.setValue("account_group_id", null);
                        }
                      }
                    }}
                    disabled={disabled}
                    error={form.formState.errors.category?.message}
                    className="h-8 text-sm"
                  >
                    <SelectContent>
                      {ACCOUNT_CATEGORIES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {t(`accountCategory.${value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </FieldSelect>
                )}
              />
            </Field>

            <Field>
              <FieldLabel>Account Group</FieldLabel>
              <Controller
                control={form.control}
                name="account_group_id"
                render={({ field }) => (
                  <FieldSelect
                    value={field.value ?? "none"}
                    onValueChange={(val) =>
                      field.onChange(val === "none" ? null : val)
                    }
                    disabled={disabled}
                    placeholder="Select Account Group"
                    className="h-8 text-sm"
                  >
                    <SelectContent>
                      <SelectItem value="none">None (No Group)</SelectItem>
                      {availableGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          L{group.level} | {group.code} — {group.name}
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
          <div className="rounded-md border p-3 bg-muted/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <Layers className="size-3.5 text-primary" />
                <span>Accounting Dimensions</span>
              </div>
              <Controller
                control={form.control}
                name="dimension_required"
                render={({ field }) => (
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.value ?? false}
                      onChange={(e) => field.onChange(e.target.checked)}
                      disabled={disabled}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    Require dimension on journal entry
                  </label>
                )}
              />
            </div>
            <Controller
              control={form.control}
              name="allowed_dimensions"
              render={({ field }) => {
                const selected = new Set(field.value ?? []);
                const activeDims = store.dimensions.filter((d) => d.is_active);
                if (activeDims.length === 0) {
                  return (
                    <div className="text-xs text-muted-foreground">
                      No active dimensions defined.
                    </div>
                  );
                }
                return (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {activeDims.map((dim) => {
                      const isChecked = selected.has(dim.id);
                      return (
                        <button
                          key={dim.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            const next = new Set(selected);
                            if (isChecked) next.delete(dim.id);
                            else next.add(dim.id);
                            field.onChange(Array.from(next));
                          }}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border transition-colors ${
                            isChecked
                              ? "bg-primary text-primary-foreground border-primary font-medium"
                              : "bg-background text-muted-foreground border-border hover:bg-muted"
                          }`}
                        >
                          <span>{dim.code}</span>
                          <span className="opacity-70 text-[10px]">({dim.name})</span>
                        </button>
                      );
                    })}
                  </div>
                );
              }}
            />
          </div>
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
      );
      }}
    </ConfigEntityDialog>
  );
}
