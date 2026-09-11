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
