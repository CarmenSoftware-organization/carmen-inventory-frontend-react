
import { useState } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "use-intl";
import { ChevronLeft, Pencil, Save, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Field,
  FieldInput,
  FieldLabel,
  FieldSelect,
} from "@/components/ui/field";
import { SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LookupCurrency } from "@/components/lookup/lookup-currency";
import { PRICE_LIST_TEMPLATE_STATUS_OPTIONS } from "@/constant/price-list-template";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/use-profile";
import type { PriceListTemplate } from "@/types/price-list-template";
import type { FormMode } from "@/types/form";

import { PlainText } from "@/components/share/glass-card";
import { SettingSection } from "../../system-admin/business-setting/business-setting-ui";

import {
  createPltSchema,
  getDefaultValues,
  PLT_DETAIL_EMPTY,
  type PltFormValues,
} from "./plt-form-schema";
import { PltValidityStepper } from "./plt-validity-stepper";
import { PltFormProductsSection } from "./plt-form-products-section";
import { PltFormDialogs } from "./plt-form-dialogs";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";
import { usePltFormActions } from "./use-plt-form-actions";
import { FORM_ID } from "./plt-form-helpers";
import { useProductLabels, useStepperLabels } from "./plt-form-labels";

interface PriceListTemplateFormProps {
  readonly priceListTemplate?: PriceListTemplate;
}

export function PriceListTemplateForm({
  priceListTemplate,
}: PriceListTemplateFormProps) {
  const t = useTranslations("vendorManagement.priceListTemplate");
  const tfl = useTranslations("field");
  const tc = useTranslations("common");
  const tform = useTranslations("form");
  const tv = useTranslations("validation");
  const ts = useTranslations("status");

  const [mode, setMode] = useState<FormMode>(
    priceListTemplate ? "view" : "add",
  );
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const [removeDetailIndex, setRemoveDetailIndex] = useState<number | null>(
    null,
  );

  const { defaultCurrencyId } = useProfile();
  const defaultValues = getDefaultValues(priceListTemplate, {
    defaultCurrencyId,
  });

  const form = useForm<PltFormValues>({
    resolver: zodResolver(createPltSchema(tv, tfl)) as Resolver<PltFormValues>,
    defaultValues,
  });

  const {
    fields: detailFields,
    prepend: prependDetail,
    remove: removeDetail,
  } = useFieldArray({
    control: form.control,
    name: "details",
  });

  const actions = usePltFormActions({
    form,
    priceListTemplate,
    defaultValues,
    mode,
    setMode,
  });

  const isDisabled = isView || actions.isPending;
  const navGuard = useNavigationGuard(
    (isAdd || isEdit) && form.formState.isDirty,
  );

  const watchedValidity = useWatch({
    control: form.control,
    name: "validity_period",
  });
  const watchedStatus = useWatch({ control: form.control, name: "status" });
  const watchedName = useWatch({ control: form.control, name: "name" });

  const handleAddProduct = () => {
    prependDetail({ ...PLT_DETAIL_EMPTY });
  };

  const handleConfirmRemoveTier = () => {
    if (removeDetailIndex === null) return;
    removeDetail(removeDetailIndex);
    setRemoveDetailIndex(null);
  };

  const stepperLabels = useStepperLabels(t);
  const productLabels = useProductLabels(t);
  const tsStatus = ts as (key: "draft" | "active" | "inactive") => string;
  const submitLabel = actions.isPending
    ? isAdd
      ? tform("creating")
      : tform("saving")
    : isAdd
      ? tc("create")
      : tc("save");

  return (
    <div className="mx-auto max-w-4xl p-[max(1rem,env(safe-area-inset-bottom))]">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={tc("goBack")}
            onClick={actions.handleBack}
          >
            <ChevronLeft />
          </Button>
          <h1
            className={cn(
              "truncate text-lg font-semibold tracking-tight",
              watchedName
                ? "text-foreground"
                : "text-muted-foreground italic",
            )}
          >
            {watchedName || t("namePlaceholder")}
          </h1>
          <Badge variant="secondary" size="sm">
            {tsStatus(watchedStatus)}
          </Badge>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isView ? (
            <Button size="sm" onClick={() => setMode("edit")}>
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
              {isEdit && priceListTemplate && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => actions.setShowDelete(true)}
                  disabled={actions.isDeletePending || actions.isPending}
                >
                  <Trash2 />
                  {tc("delete")}
                </Button>
              )}
            </>
          )}
        </div>
      </header>

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
          {/* Name */}
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="plt-name">
              {tfl("name")}
              {!isView && <span className="text-destructive"> *</span>}
            </FieldLabel>
            {isView ? (
              <PlainText value={form.getValues("name")} />
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
              <PlainText value={priceListTemplate?.currency?.code} />
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

          {/* Validity period */}
          <Field className="sm:col-span-2">
            <FieldLabel>{tfl("validityPeriod")}</FieldLabel>
            {isView ? (
              <PlainText
                value={
                  watchedValidity
                    ? t("daysSuffix", { count: watchedValidity })
                    : null
                }
              />
            ) : (
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
            )}
          </Field>

          {/* Description */}
          <Field className="sm:col-span-2">
            <FieldLabel>{tfl("description")}</FieldLabel>
            {isView ? (
              <PlainText value={priceListTemplate?.description} multiline />
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
                <Badge variant="secondary" size="sm">
                  {tsStatus(watchedStatus)}
                </Badge>
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
              <PlainText
                value={priceListTemplate?.vendor_instructions}
                multiline
              />
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

        <PltFormProductsSection
          form={form}
          detailFields={detailFields}
          priceListTemplate={priceListTemplate}
          isView={isView}
          isDisabled={isDisabled}
          onAddProduct={handleAddProduct}
          onRemoveTier={setRemoveDetailIndex}
          labels={productLabels}
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

      <PltFormDialogs
        priceListTemplate={priceListTemplate}
        showDelete={actions.showDelete}
        setShowDelete={actions.setShowDelete}
        isDeletePending={actions.isDeletePending}
        onConfirmDelete={actions.handleConfirmDelete}
        removeDetailIndex={removeDetailIndex}
        setRemoveDetailIndex={setRemoveDetailIndex}
        onConfirmRemoveTier={handleConfirmRemoveTier}
      />
    </div>
  );
}
