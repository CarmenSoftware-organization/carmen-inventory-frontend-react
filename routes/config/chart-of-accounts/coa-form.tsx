import { useState } from "react";
import { Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { Field, FieldInput, FieldLabel, FieldSelect } from "@/components/ui/field";
import { SelectContent, SelectItem } from "@/components/ui/select";
import { SettingSection } from "@/components/ui/setting-section";
import { StatusSwitch } from "@/components/ui/status-switch";
import { FormToolbar } from "@/components/share/form-toolbar";
import { useEntityForm } from "@/hooks/use-entity-form";
import { useBuCode } from "@/hooks/use-bu-code";
import { useGlAccountGroups } from "../shared/use-gl-account-groups";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { httpClient } from "@/lib/http-client";
import { ApiError } from "@/lib/api-error";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import type { DimensionMaster } from "@/types/accounting-master";
import {
  ACCOUNT_CATEGORIES,
  ACCOUNT_NATURE,
  CHART_OF_ACCOUNT_TYPES,
  type AccountCategory,
  type ChartOfAccount,
} from "@/types/chart-of-accounts";
import { createCoaSchema, natureFor, type CoaFormValues } from "./coa-form-schema";
import { useCreateChartOfAccount, useDeleteChartOfAccount, useUpdateChartOfAccount } from "./use-coa";

const LIST_PATH = "/config/chart-of-accounts";
const FORM_ID = "coa-form";

export function CoaForm({ account }: { account?: ChartOfAccount }) {
  const navigate = useNavigate();
  const t = useTranslations("config.chartOfAccounts");
  const tfl = useTranslations("field");
  const tv = useTranslations("validation");
  const tt = useTranslations("toast");
  const create = useCreateChartOfAccount();
  const update = useUpdateChartOfAccount();
  const remove = useDeleteChartOfAccount();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const groupQuery = useGlAccountGroups();
  const buCode = useBuCode();
  const dimensionQuery = useQuery({
    queryKey: ["accounting-master", "dimensions", buCode],
    enabled: !!buCode,
    queryFn: async (): Promise<DimensionMaster[]> => {
      const res = await httpClient.get(API_ENDPOINTS.GL_DIMENSIONS(buCode!));
      if (!res.ok) throw await ApiError.from(res, "Unable to load dimensions");
      const json = await res.json();
      return Array.isArray(json) ? json : (json.data ?? []);
    },
  });
  const f = useEntityForm<CoaFormValues>({
    entity: account,
    resolver: zodResolver(createCoaSchema(tv, tfl)) as Resolver<CoaFormValues>,
    defaultValues: account
      ? {
          code: account.code,
          description_1: account.description_1 ?? "",
          description_2: account.description_2 ?? "",
          category: account.category,
          nature: account.nature,
          type: account.type,
          account_group_id: account.account_group_id ?? "",
          allowed_dimensions: account.allowed_dimensions ?? [],
          dimension_required: account.dimension_required ?? false,
          is_active: account.is_active,
        }
      : {
          code: "",
          description_1: "",
          description_2: "",
          category: "" as AccountCategory,
          nature: ACCOUNT_NATURE.DEBIT,
          type: "" as ChartOfAccount["type"],
          account_group_id: "",
          allowed_dimensions: [],
          dimension_required: false,
          is_active: true,
        },
    listPath: LIST_PATH,
    isPending: create.isPending || update.isPending,
  });
  const { form } = f;
  const category = form.watch("category");
  const groups = (groupQuery.data ?? []).filter(
    (g) => g.category === category && (g.is_active || g.id === account?.account_group_id),
  );
  const dimensions = (dimensionQuery.data ?? []).filter((d) => d.is_active);

  const onSubmit = (values: CoaFormValues) => {
    const payload = {
      code: values.code,
      description_1: values.description_1,
      description_2: values.description_2 || null,
      category: values.category,
      nature: natureFor(values.category),
      type: values.type,
      account_group_id: values.account_group_id,
      allowed_dimensions: values.allowed_dimensions ?? [],
      dimension_required: values.dimension_required ?? false,
      is_active: values.is_active,
    };
    if (account) {
      f.submit(update, { id: account.id, doc_version: account.doc_version, ...payload }, () => {
        toast.success(tt("updateSuccess", { entity: t("entity") }));
        f.backToList();
      });
    } else {
      f.submit(create, payload, () => {
        toast.success(tt("createSuccess", { entity: t("entity") }));
        navigate(LIST_PATH, { replace: true, ...f.returnState });
      });
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl p-[max(1rem,env(safe-area-inset-bottom))]">
      <FormToolbar
        entity={account?.description_1 || t("entity")}
        mode={f.mode}
        formId={FORM_ID}
        isPending={create.isPending || update.isPending}
        onBack={f.handleBack}
        onCancel={f.handleCancel}
        onEdit={f.handleEdit}
        onDelete={account ? () => setDeleteOpen(true) : undefined}
        deleteIsPending={remove.isPending}
        statusBadge={account && <Badge variant="secondary" size="sm">{account.code}</Badge>}
      />
      <form id={FORM_ID} className="mt-6 space-y-6" onSubmit={form.handleSubmit(onSubmit, () => scrollToFirstInvalidField())}>
        <SettingSection first title={tfl("general")}>
          <Field>
            <FieldLabel htmlFor="coa-code" required>{tfl("code")}</FieldLabel>
            <FieldInput id="coa-code" maxLength={50} disabled={f.isDisabled || !!account} error={form.formState.errors.code?.message} {...form.register("code")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="coa-description-1" required>{t("descriptionEnglish")}</FieldLabel>
            <FieldInput id="coa-description-1" maxLength={150} disabled={f.isDisabled} error={form.formState.errors.description_1?.message} {...form.register("description_1")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="coa-description-2">{t("descriptionThai")}</FieldLabel>
            <FieldInput id="coa-description-2" maxLength={150} disabled={f.isDisabled} {...form.register("description_2")} />
          </Field>
          <Field>
            <FieldLabel required>{tfl("category")}</FieldLabel>
            <Controller control={form.control} name="category" render={({ field }) => (
              <FieldSelect value={field.value || undefined} onValueChange={(value) => {
                field.onChange(value);
                form.setValue("nature", natureFor(value as AccountCategory), { shouldDirty: true });
                form.setValue("account_group_id", "", { shouldDirty: true });
              }} disabled={f.isDisabled} error={form.formState.errors.category?.message} placeholder={tfl("category")}>
                <SelectContent>{ACCOUNT_CATEGORIES.map((value) => <SelectItem key={value} value={value}>{t(`accountCategory.${value}`)}</SelectItem>)}</SelectContent>
              </FieldSelect>
            )} />
          </Field>
          <Field>
            <FieldLabel>{tfl("nature")}</FieldLabel>
            <FieldInput readOnly value={category ? t(`nature.${natureFor(category)}`) : "—"} />
          </Field>
          <Field>
            <FieldLabel required>{tfl("type")}</FieldLabel>
            <Controller control={form.control} name="type" render={({ field }) => (
              <FieldSelect value={field.value || undefined} onValueChange={field.onChange} disabled={f.isDisabled} error={form.formState.errors.type?.message} placeholder={tfl("selectType")}>
                <SelectContent>{CHART_OF_ACCOUNT_TYPES.map((value) => <SelectItem key={value} value={value}>{t(`accountType.${value}`)}</SelectItem>)}</SelectContent>
              </FieldSelect>
            )} />
          </Field>
          <Controller control={form.control} name="is_active" render={({ field }) => <StatusSwitch id="coa-is-active" checked={field.value} onCheckedChange={field.onChange} disabled={f.isDisabled} />} />
        </SettingSection>
        <SettingSection title="Account Grouping">
          <Field>
            <FieldLabel required>Account Code Grouping Path</FieldLabel>
            {groupQuery.isError && <p className="text-xs text-destructive">Unable to load account groups.</p>}
            {!groupQuery.isLoading && !groupQuery.isError && category && groups.length === 0 && (
              <p className="text-sm text-muted-foreground">No active group for this category. <Link className="text-primary underline" to="/config/account-grouping">Set up Account Code Grouping</Link> first.</p>
            )}
            <Controller control={form.control} name="account_group_id" render={({ field }) => (
              <FieldSelect value={field.value || undefined} onValueChange={field.onChange} disabled={f.isDisabled || !category || groupQuery.isLoading || groups.length === 0} error={form.formState.errors.account_group_id?.message} placeholder="Select Account Group">
                <SelectContent>{groups.map((group) => <SelectItem key={group.id} value={group.id}>L{group.level} | {group.code} — {group.name}</SelectItem>)}</SelectContent>
              </FieldSelect>
            )} />
          </Field>
        </SettingSection>
        <SettingSection title="Accounting Dimensions" description="Allowed dimensions for journal entry" wide>
          <Controller control={form.control} name="dimension_required" render={({ field }) => <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={field.value ?? false} onChange={(event) => field.onChange(event.target.checked)} disabled={f.isDisabled} />Require dimension on journal entry</label>} />
          {dimensionQuery.isError && <p className="text-xs text-destructive">Unable to load dimensions.</p>}
          <Controller control={form.control} name="allowed_dimensions" render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {dimensions.length === 0 && <p className="text-sm text-muted-foreground">No active dimensions defined.</p>}
              {dimensions.map((dim) => <label key={dim.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"><input type="checkbox" checked={(field.value ?? []).includes(dim.id)} disabled={f.isDisabled} onChange={(event) => field.onChange(event.target.checked ? [...(field.value ?? []), dim.id] : (field.value ?? []).filter((id) => id !== dim.id))} />{dim.code} — {dim.name}</label>)}
            </div>
          )} />
        </SettingSection>
      </form>
      <DiscardDialog {...f.discard.dialogProps} variant="warning" />
      <DiscardDialog open={f.navGuard.isOpen} onOpenChange={(open) => { if (!open) f.navGuard.cancel(); }} onConfirm={f.navGuard.confirm} onCancel={f.navGuard.cancel} variant="warning" />
      {account && <DeleteDialog open={deleteOpen} onOpenChange={(open) => { if (!open && !remove.isPending) setDeleteOpen(false); }} title={t("deleteTitle")} description={t("deleteConfirm", { name: account.code })} isPending={remove.isPending} onConfirm={() => remove.mutate(account.id, { onSuccess: () => { toast.success(tt("deleteSuccess", { entity: t("entity") })); f.backToList(); } })} />}
    </div>
  );
}
