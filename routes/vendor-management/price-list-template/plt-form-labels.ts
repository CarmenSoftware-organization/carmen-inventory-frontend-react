import { useTranslations } from "use-intl";

export interface ToolbarLabels {
  readonly goBack: string;
  readonly edit: string;
  readonly cancel: string;
  readonly save: string;
  readonly create: string;
  readonly saving: string;
  readonly creating: string;
  readonly delete: string;
}

export interface ProductLabels {
  readonly sectionTitle: string;
  readonly noItems: string;
  readonly noItemsDesc: string;
  readonly addLabel: string;
  readonly removeProduct: string;
  readonly removeTier: string;
  readonly addTier: string;
  readonly minimumOrder: string;
  readonly tierSingular: string;
  readonly tierPlural: string;
  readonly qty: string;
  readonly unit: string;
  readonly notePlaceholder: string;
  readonly product: string;
}

export interface SummaryLabels {
  readonly title: string;
  readonly products: string;
  readonly tiers: string;
  readonly unitsUsed: string;
}

export interface StepperLabels {
  readonly label: string;
  readonly hint: string;
  readonly daySingular: string;
  readonly dayPlural: string;
  readonly presets: string;
}

export function useSummaryLabels(
  t: ReturnType<typeof useTranslations>,
): SummaryLabels {
  return {
    title: t("templateSummary"),
    products: t("productsLabel"),
    tiers: t("tiersLabel"),
    unitsUsed: t("unitsUsed"),
  };
}

export function useStepperLabels(
  t: ReturnType<typeof useTranslations>,
): StepperLabels {
  return {
    label: t("validityLabel"),
    hint: t("validityHint"),
    daySingular: t("daySingular"),
    dayPlural: t("dayPlural"),
    presets: t("presetsLabel"),
  };
}

export function useProductLabels(
  t: ReturnType<typeof useTranslations>,
): ProductLabels {
  return {
    sectionTitle: t("productsTitle"),
    noItems: t("detail.noItems"),
    noItemsDesc: t("detail.noItemsDesc"),
    addLabel: t("detail.addDetail"),
    removeProduct: t("removeProduct"),
    removeTier: t("removeTier"),
    addTier: t("addTier"),
    minimumOrder: t("minimumOrder"),
    tierSingular: t("tierSingular"),
    tierPlural: t("tierPlural"),
    qty: t("moq"),
    unit: t("unit"),
    notePlaceholder: t("notePlaceholder"),
    product: t("product"),
  };
}

export function useToolbarLabels(
  tc: ReturnType<typeof useTranslations>,
  tform: ReturnType<typeof useTranslations>,
): ToolbarLabels {
  return {
    goBack: tc("goBack"),
    edit: tc("edit"),
    cancel: tc("cancel"),
    save: tc("save"),
    create: tc("create"),
    saving: tform("saving"),
    creating: tform("creating"),
    delete: tc("delete"),
  };
}
