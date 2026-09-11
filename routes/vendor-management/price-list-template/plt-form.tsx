import { useEffect, useState } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "use-intl";
import { History, Pencil, Save, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import { PL_STATUS_TONE } from "@/constant/price-list";
import {
  Field,
  FieldDescription,
  FieldInput,
  FieldLabel,
  FieldPlainText,
  FieldSelect,
} from "@/components/ui/field";
import { SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LookupCurrency } from "@/components/lookup/lookup-currency";
import { PRICE_LIST_TEMPLATE_STATUS_OPTIONS } from "@/constant/price-list-template";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import { DocFormHeader } from "@/components/share/doc-form-header";
import { useProfile } from "@/hooks/use-profile";
import type { PriceListTemplate } from "@/types/price-list-template";
import type { FormMode } from "@/types/form";

import { SettingSection } from "@/components/ui/setting-section";

import {
  createPltSchema,
  getDefaultValues,
  type PltFormValues,
} from "./plt-form-schema";
import { PltValidityStepper } from "./plt-validity-stepper";
import { PltItemFields } from "./plt-item-fields";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { usePltFormActions } from "./use-plt-form-actions";
import { FORM_ID } from "./plt-form-helpers";
import { useStepperLabels } from "./plt-form-labels";
import { openActivity } from "@/components/share/activity-sheet-host";

interface PriceListTemplateFormProps {
  readonly priceListTemplate?: PriceListTemplate;
}

export function PriceListTemplateForm({
  priceListTemplate,
}: PriceListTemplateFormProps) {
  const t = useTranslations("vendorManagement.priceListTemplate");
  const tActivity = useTranslations("activity");
  const tfl = useTranslations("field");
  const tc = useTranslations("common");
  const tform = useTranslations("form");
  const tv = useTranslations("validation");
  const ts = useTranslations("status");

  const [mode, setMode] = useState<FormMode>(
    priceListTemplate ? "view" : "add",
  );
  const isView = mode === "view";
  const isAdd = mode === "add";

  const { defaultCurrencyId } = useProfile();
  const defaultValues = getDefaultValues(priceListTemplate, {
    defaultCurrencyId,
  });

  const form = useForm<PltFormValues>({
    resolver: zodResolver(createPltSchema(tv, tfl)) as Resolver<PltFormValues>,
    defaultValues,
  });

  // หลัง save (edit) → mutation invalidate → byId refetch → priceListTemplate มา
  // ใหม่ (full-replace ทำให้ product ได้ id ใหม่) · re-sync form ในโหมด view ให้
  // โชว์ข้อมูล server จริง และ edit ครั้งถัดไปอ่าน id ใหม่ (ไม่งั้น remove จะใช้ id
  // เก่าที่ถูกลบไปแล้ว → save ซ้ำ = duplicate) · key ด้วยชุด product id ที่เปลี่ยน
  // ทุกครั้งที่ item ถูก add/remove/replace
  const productIdsKey = (priceListTemplate?.products ?? [])
    .map((p) => p.id)
    .join(",");
  useEffect(() => {
    if (mode === "view" && priceListTemplate) {
      form.reset(getDefaultValues(priceListTemplate, { defaultCurrencyId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form/getDefaultValues stable; mode/defaultCurrencyId อ่านโดยไม่ retrigger
  }, [productIdsKey, priceListTemplate?.id]);

  const actions = usePltFormActions({
    form,
    priceListTemplate,
    defaultValues,
    mode,
    setMode,
  });

  const isDisabled = isView || actions.isPending;
  // guard อยู่ใน usePltFormActions — handleBack ที่นั่นต้องใช้ navGuard.back()
  const navGuard = actions.navGuard;

  const watchedValidity = useWatch({
    control: form.control,
    name: "validity_period",
  });
  const watchedStatus = useWatch({ control: form.control, name: "status" });
  const watchedName = useWatch({ control: form.control, name: "name" });

  const stepperLabels = useStepperLabels(t);

  const tsStatus = ts as (key: "draft" | "active" | "inactive") => string;
  const submitLabel = actions.isPending
    ? isAdd
      ? tform("creating")
      : tform("saving")
    : isAdd
      ? tc("create")
      : tc("save");

  return (
    <div className="mx-auto w-full max-w-4xl p-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mb-6">
        <DocFormHeader
          flush
          title={watchedName || t("namePlaceholder")}
          titleMuted={!watchedName}
          backLabel={tc("goBack")}
          onBack={actions.handleBack}
          badges={
            <StatusDotBadge tone={PL_STATUS_TONE[watchedStatus] ?? "neutral"}>
              {tsStatus(watchedStatus)}
            </StatusDotBadge>
          }
          actions={
            <>
              {isView ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setMode("edit")}
                >
                  <Pencil />
                  {tc("edit")}
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={actions.handleCancel}
                    disabled={actions.isPending}
                  >
                    <X />
                    {tc("cancel")}
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    form={FORM_ID}
                    disabled={actions.isPending}
                  >
                    <Save />
                    {submitLabel}
                  </Button>
                </>
              )}
              {priceListTemplate && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => actions.setShowDelete(true)}
                  disabled={actions.isDeletePending || actions.isPending}
                >
                  <Trash2 />
                  {tc("delete")}
                </Button>
              )}
              {/* ปุ่มประวัติอยู่นอก ternary — เป็นการดู ไม่ใช่การแก้ จึงเห็นได้ทุกโหมด */}
              {priceListTemplate && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    openActivity(priceListTemplate.id, priceListTemplate.name)
                  }
                >
                  <History />
                  {tActivity("title")}
                </Button>
              )}
            </>
          }
        />
      </div>

      <form
        id={FORM_ID}
        onSubmit={form.handleSubmit(actions.onSubmit, () =>
          scrollToFirstInvalidField(),
        )}
      >
        {/* General */}
        <SettingSection
          first
          title={tfl("general")}
          description={t("generalDesc")}
        >
          <div className="grid grid-cols-2 gap-4 sm:col-span-2">
            {/* Name */}
            <Field>
              <FieldLabel htmlFor="plt-name">
                {tfl("name")}
                {!isView && <span className="text-destructive"> *</span>}
              </FieldLabel>
              {isView ? (
                <FieldPlainText>{form.getValues("name")}</FieldPlainText>
              ) : (
                <FieldInput
                  id="plt-name"
                  placeholder={t("namePlaceholder")}
                  disabled={isDisabled}
                  error={form.formState.errors.name?.message}
                  maxLength={100}
                  {...form.register("name")}
                />
              )}
            </Field>

            {/* Currency */}
            <Field>
              <FieldLabel>
                {tfl("currency")}
                {!isView && <span className="text-destructive"> *</span>}
              </FieldLabel>
              {isView ? (
                <FieldPlainText>
                  {priceListTemplate?.currency?.code}
                </FieldPlainText>
              ) : (
                <Controller
                  control={form.control}
                  name="currency_id"
                  render={({ field }) => (
                    <LookupCurrency
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isDisabled}
                      fullWidth
                      error={form.formState.errors.currency_id?.message}
                    />
                  )}
                />
              )}
            </Field>
          </div>

          {/* Validity period */}
          <Field className="sm:col-span-2">
            <FieldLabel>{tfl("validityPeriod")}</FieldLabel>
            {isView ? (
              <FieldPlainText>
                {watchedValidity
                  ? t("daysSuffix", { count: watchedValidity })
                  : null}
              </FieldPlainText>
            ) : (
              <>
                <FieldDescription>{stepperLabels.hint}</FieldDescription>
                <Controller
                  control={form.control}
                  name="validity_period"
                  render={({ field }) => (
                    <PltValidityStepper
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isDisabled}
                      labels={stepperLabels}
                    />
                  )}
                />
              </>
            )}
          </Field>

          {/* Description */}
          <Field className="sm:col-span-2">
            <FieldLabel>{tfl("description")}</FieldLabel>
            {isView ? (
              <FieldPlainText className="whitespace-pre-wrap">
                {priceListTemplate?.description}
              </FieldPlainText>
            ) : (
              <Textarea
                placeholder={tfl("optional")}
                rows={2}
                maxLength={256}
                disabled={isDisabled}
                className="resize-none"
                {...form.register("description")}
              />
            )}
          </Field>

          {/* Status */}
          <Field className="sm:col-span-2">
            <FieldLabel>{tfl("status")}</FieldLabel>
            {isView ? (
              <div>
                <StatusDotBadge
                  tone={PL_STATUS_TONE[watchedStatus] ?? "neutral"}
                >
                  {tsStatus(watchedStatus)}
                </StatusDotBadge>
              </div>
            ) : (
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FieldSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isDisabled}
                    placeholder={tfl("selectStatus")}
                    error={form.formState.errors.status?.message}
                  >
                    <SelectContent>
                      {PRICE_LIST_TEMPLATE_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {tsStatus(
                            opt.value as "draft" | "active" | "inactive",
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </FieldSelect>
                )}
              />
            )}
          </Field>
        </SettingSection>

        {/* Vendor instructions */}
        <SettingSection
          title={t("vendorInstructionTitle")}
          description={t("vendorInstructionHelp")}
        >
          <Field className="sm:col-span-2">
            <FieldLabel>{t("vendorInstructionTitle")}</FieldLabel>
            {isView ? (
              <FieldPlainText className="whitespace-pre-wrap">
                {priceListTemplate?.vendor_instructions}
              </FieldPlainText>
            ) : (
              <Textarea
                placeholder={t("vendorInstructionPlaceholder")}
                rows={5}
                maxLength={1000}
                disabled={isDisabled}
                className="resize-none leading-relaxed"
                {...form.register("vendor_instruction")}
              />
            )}
          </Field>
        </SettingSection>

        <PltItemFields
          form={form}
          priceListTemplate={priceListTemplate}
          isView={isView}
          isDisabled={isDisabled}
        />
      </form>

      <DiscardDialog {...actions.discardDialogProps} variant="warning" />

      <DiscardDialog
        open={navGuard.isOpen}
        onOpenChange={(o) => {
          if (!o) navGuard.cancel();
        }}
        onConfirm={navGuard.confirm}
        onCancel={navGuard.cancel}
        variant="warning"
      />

      {priceListTemplate && (
        <DeleteDialog
          open={actions.showDelete}
          onOpenChange={(open) =>
            !open && !actions.isDeletePending && actions.setShowDelete(false)
          }
          title={t("deleteTitle")}
          description={t("deleteConfirm", { name: priceListTemplate.name })}
          isPending={actions.isDeletePending}
          onConfirm={actions.handleConfirmDelete}
        />
      )}
    </div>
  );
}
