import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type { RunningCode } from "@/types/running-code";

export function createRunningCodeSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    type: z.string().min(1, tv("required", { field: tf("type") })),
    config: z.string().refine(
      (v) => {
        if (!v) return true;
        try {
          JSON.parse(v);
          return true;
        } catch {
          return false;
        }
      },
      { message: tv("invalidJson", { field: tf("config") }) },
    ),
    note: z.string(),
  });
}

export type RunningCodeFormValues = z.infer<
  ReturnType<typeof createRunningCodeSchema>
>;

export const EMPTY_FORM: RunningCodeFormValues = {
  type: "",
  config: "",
  note: "",
};

export function getDefaultValues(
  runningCode?: RunningCode,
): RunningCodeFormValues {
  if (!runningCode) return { ...EMPTY_FORM };
  return {
    type: runningCode.type,
    config: runningCode.config
      ? JSON.stringify(runningCode.config, null, 2)
      : "",
    note: runningCode.note ?? "",
  };
}
