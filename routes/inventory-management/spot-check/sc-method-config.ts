import { Gem, Hash, Shuffle } from "lucide-react";
import type { SpotCheckMethod } from "@/types/spot-check";

export interface MethodConfig {
  label: string;
  hint: string;
  className: string;
  icon: React.ComponentType<{ className?: string }>;
  tipBody: string;
}

type TFn = (key: string) => string;

export function getSubmitLabel(
  isPending: boolean,
  isAdd: boolean,
  tc: TFn,
  tform: TFn,
): string {
  if (isPending) return isAdd ? tform("creating") : tform("saving");
  return isAdd ? tc("create") : tc("save");
}

export function getMethodConfig(
  method: SpotCheckMethod,
  t: TFn,
): MethodConfig {
  switch (method) {
    case "random":
      return {
        label: t("methodRandom"),
        hint: t("methodRandomHint"),
        className: "bg-info/15 text-info-foreground",
        icon: Shuffle,
        tipBody: t("tipBodyRandom"),
      };
    case "high_value":
      return {
        label: t("methodHighValue"),
        hint: t("methodHighValueHint"),
        className: "bg-warning/15 text-warning-foreground",
        icon: Gem,
        tipBody: t("tipBodyHighValue"),
      };
    case "manual":
      return {
        label: t("methodManual"),
        hint: t("methodManualHint"),
        className: "bg-primary/15 text-primary",
        icon: Hash,
        tipBody: t("tipBodyManual"),
      };
  }
}
