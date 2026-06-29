
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
import { Building2, Clock, Layers, Tag } from "lucide-react";

import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { LookupCurrency } from "@/components/lookup/lookup-currency";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/use-profile";
import { PLT_STATUS_CONFIG } from "@/constant/price-list-template";
import type { PriceListTemplate } from "@/types/price-list-template";
import type { FormMode } from "@/types/form";

import {
  CardLabel,
  GlassCard,
  MetaChip,
  PlainText,
} from "@/components/share/glass-card";
import { NameField } from "../price-list/pl-name-field";
import { AnimationStyles, Reveal } from "@/components/share/reveal";

import {
  createPltSchema,
  getDefaultValues,
  PLT_DETAIL_EMPTY,
  type PltFormValues,
} from "./plt-form-schema";
import { PltValidityStepper } from "./plt-validity-stepper";
import { PltHeroStatCard } from "./plt-hero-stat-card";
import { PltFormToolbar } from "./plt-form-toolbar";
import { PltFormProductsSection } from "./plt-form-products-section";
import { PltFormSummaryAside } from "./plt-form-summary-aside";
import { PltFormDialogs } from "./plt-form-dialogs";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { usePltFormActions } from "./use-plt-form-actions";
import { FORM_ID } from "./plt-form-helpers";
import {
  useProductLabels,
  useStepperLabels,
  useSummaryLabels,
  useToolbarLabels,
} from "./plt-form-labels";

const LABEL_CLASS = cn(
  "text-muted-foreground text-[0.625rem] font-semibold tracking-[0.1em] uppercase",
);

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

  const [mode, setMode] = useState<FormMode>(
    priceListTemplate ? "view" : "add",
  );
  const isView = mode === "view";

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

  const watchedDetails = useWatch({ control: form.control, name: "details" });
  const watchedValidity = useWatch({
    control: form.control,
    name: "validity_period",
  });
  const watchedStatus = useWatch({ control: form.control, name: "status" });

  const stats = (() => {
    const tierCount = (watchedDetails ?? []).length;
    const productSet = new Set<string>();
    const units = new Set<string>();
    (watchedDetails ?? []).forEach((d) => {
      if (d.product_id) productSet.add(d.product_id);
      if (d.unit_id) units.add(d.unit_id);
    });
    return {
      productCount: productSet.size,
      tierCount,
      unitCount: units.size,
    };
  })();

  const handleAddProduct = () => {
    prependDetail({ ...PLT_DETAIL_EMPTY });
  };

  const handleConfirmRemoveTier = () => {
    if (removeDetailIndex === null) return;
    removeDetail(removeDetailIndex);
    setRemoveDetailIndex(null);
  };

  const statusConfig =
    PLT_STATUS_CONFIG[watchedStatus] ?? PLT_STATUS_CONFIG.draft;
  const summaryLabels = useSummaryLabels(t);
  const stepperLabels = useStepperLabels(t);
  const productLabels = useProductLabels(t);
  const toolbarLabels = useToolbarLabels(tc, tform);
  const statValidityLabel = t("avgValidity", { days: watchedValidity ?? 0 });

  return (
    <div className="relative isolate -mx-3 -my-3">
      <AnimationStyles />
      <form
        id={FORM_ID}
        onSubmit={form.handleSubmit(actions.onSubmit, () =>
          scrollToFirstInvalidField(),
        )}
        className="relative px-4 pt-4 pb-8 lg:p-4"
      >
        {/* Hero section */}
        <section className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_22rem]">
          <Reveal>
            <div>
            <PltFormToolbar
              mode={mode}
              statusConfig={statusConfig}
              isPending={actions.isPending}
              isDeleting={actions.isDeletePending}
              onBack={actions.handleBack}
              onEdit={() => setMode("edit")}
              onCancel={actions.handleCancel}
              onDelete={() => actions.setShowDelete(true)}
              labels={toolbarLabels}
              tlabels={{ template: t("entity") }}
            />

            <Controller
              control={form.control}
              name="name"
              render={({ field }) => (
                <NameField
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t("namePlaceholder")}
                  disabled={isDisabled}
                  error={form.formState.errors.name?.message}
                  labels={{
                    nameLabel: t("nameLabel"),
                    tapToEdit: t("internalNote"),
                    pressEnterToSave: t("pressEnterToSave"),
                    clickToRename: t("clickToRename"),
                    requiredField: t("requiredField"),
                  }}
                />
              )}
            />

            <p className="text-foreground/80 mt-2 max-w-xl text-xs leading-relaxed">
              {watchedValidity ? (
                <span className="text-foreground/80">
                  {t("descriptorFilled", { days: watchedValidity })}
                </span>
              ) : (
                <span className="text-muted-foreground italic">
                  {t("descriptorEmpty")}
                </span>
              )}
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <MetaChip
                icon={Tag}
                label={
                  stats.productCount
                    ? t("productsCount", { count: stats.productCount })
                    : t("noProducts")
                }
                empty={!stats.productCount}
              />
              <MetaChip
                icon={Layers}
                label={
                  stats.tierCount
                    ? t("tiersCount", { count: stats.tierCount })
                    : t("noTiers")
                }
                empty={!stats.tierCount}
              />
              <MetaChip
                icon={Clock}
                label={
                  watchedValidity
                    ? t("daysSuffix", { count: watchedValidity })
                    : tfl("validityPeriod")
                }
                empty={!watchedValidity}
              />
              <MetaChip
                icon={Building2}
                label={priceListTemplate?.currency?.code || tfl("currency")}
                empty={!priceListTemplate?.currency}
              />
            </div>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <PltHeroStatCard
              validity={watchedValidity}
              currencyCode={priceListTemplate?.currency?.code}
              stats={stats}
              labels={{
                validityPeriod: tfl("validityPeriod"),
                daySingular: t("daySingular"),
                dayPlural: t("dayPlural"),
                products: t("productsLabel"),
                tiers: t("tiersLabel"),
                currency: tfl("currency"),
                footer: t("heroFooter"),
              }}
            />
          </Reveal>
        </section>

        {/* Body grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_22rem]">
          <div className="flex flex-col gap-4">
            <Reveal delay={120}>
              <GlassCard>
                <CardLabel>{t("settings")}</CardLabel>
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

              <div className="border-border/60 my-4 h-px border-t" />

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field>
                  <FieldLabel className={LABEL_CLASS}>
                    {tfl("currency")}
                    {!isView && <span className="text-destructive">*</span>}
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
                          className="h-8 w-full text-xs"
                          error={form.formState.errors.currency_id?.message}
                        />
                      )}
                    />
                  )}
                </Field>

                <Field>
                  <FieldLabel className={LABEL_CLASS}>
                    {tfl("description")}
                  </FieldLabel>
                  {isView ? (
                    <PlainText
                      value={priceListTemplate?.description}
                      multiline
                    />
                  ) : (
                    <Textarea
                      placeholder={tfl("optional")}
                      rows={2}
                      maxLength={256}
                      disabled={isDisabled}
                      className="bg-background/60 resize-none rounded-lg text-xs"
                      {...form.register("description")}
                    />
                  )}
                </Field>
              </div>
              </GlassCard>
            </Reveal>

            <Reveal delay={160}>
              <GlassCard>
                <CardLabel>{t("vendorInstructionTitle")}</CardLabel>
              <p className="text-muted-foreground mb-3 max-w-xl text-[0.6875rem] leading-relaxed">
                {t("vendorInstructionHelp")}
              </p>
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
                  className="bg-background/60 resize-none rounded-lg text-xs leading-relaxed"
                  {...form.register("vendor_instruction")}
                />
              )}
              </GlassCard>
            </Reveal>

            <Reveal delay={200}>
              <PltFormProductsSection
                form={form}
                detailFields={detailFields}
                priceListTemplate={priceListTemplate}
                stats={stats}
                isView={isView}
                isDisabled={isDisabled}
                onAddProduct={handleAddProduct}
                onRemoveTier={setRemoveDetailIndex}
                labels={productLabels}
              />
            </Reveal>
          </div>

          <Reveal delay={140}>
            <PltFormSummaryAside
              form={form}
              isView={isView}
              isDisabled={isDisabled}
              priceListTemplate={priceListTemplate}
              statusConfig={statusConfig}
              stats={stats}
              watchedValidity={watchedValidity}
              statValidityLabel={statValidityLabel}
              summaryLabels={summaryLabels}
            />
          </Reveal>
        </div>
      </form>

      <DiscardDialog {...actions.discardDialogProps} variant="warning" />

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
