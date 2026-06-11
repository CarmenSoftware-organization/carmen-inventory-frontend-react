import { createLabelGetter } from "@/lib/i18n/label-map";
import type { SpotCheckMethod } from "@/types/spot-check";

export const SPOT_CHECK_METHODS = [
  "random",
  "high_value",
  "manual",
] as const satisfies readonly SpotCheckMethod[];

const SPOT_CHECK_METHOD_LABEL_KEYS = {
  random: "methodRandom",
  high_value: "methodHighValue",
  manual: "methodManual",
} as const satisfies Record<SpotCheckMethod, string>;

export const getSpotCheckMethodLabel = createLabelGetter(
  SPOT_CHECK_METHOD_LABEL_KEYS,
  "manual",
);
