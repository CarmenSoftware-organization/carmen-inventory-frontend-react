import { createLabelGetter } from "@/lib/i18n/label-map";

export type PcActionType = "start" | "resume" | "done";

const PC_ACTION_LABEL_KEYS = {
  start: "start",
  resume: "resume",
  done: "done",
} as const satisfies Record<PcActionType, string>;

export const getPcActionLabel = createLabelGetter(
  PC_ACTION_LABEL_KEYS,
  "start",
);

export const PC_ACTION_BUTTON_VARIANTS = {
  start: "info",
  resume: "outline",
  done: "success",
} as const satisfies Record<PcActionType, "outline" | "info" | "success">;
