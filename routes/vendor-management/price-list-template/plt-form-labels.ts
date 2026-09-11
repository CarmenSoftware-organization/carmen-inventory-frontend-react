import { useTranslations } from "use-intl";

export interface StepperLabels {
  readonly label: string;
  readonly hint: string;
  readonly daySingular: string;
  readonly dayPlural: string;
  readonly presets: string;
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
