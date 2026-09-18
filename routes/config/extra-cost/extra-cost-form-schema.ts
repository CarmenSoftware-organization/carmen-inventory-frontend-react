import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type { ExtraCost } from "@/types/extra-cost";

export function createExtraCostSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    name: z.string().min(1, tv("required", { field: tf("name") })),
    is_active: z.boolean(),
  });
}

export type ExtraCostFormValues = z.infer<
  ReturnType<typeof createExtraCostSchema>
>;

export const EMPTY_FORM: ExtraCostFormValues = {
  name: "",
  is_active: true,
};

export function getDefaultValues(extraCost?: ExtraCost): ExtraCostFormValues {
  if (!extraCost) return { ...EMPTY_FORM };
  return {
    name: extraCost.name,
    is_active: extraCost.is_active,
  };
}
