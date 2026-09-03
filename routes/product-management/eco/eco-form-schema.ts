import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type { EcoLabel } from "@/types/eco-label";

export function createEcoLabelSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    code: z.string().min(1, tv("required", { field: tf("code") })),
    name: z.string().min(1, tv("required", { field: tf("name") })),
    description: z.string().optional(),
    is_active: z.boolean(),
  });
}

export type EcoLabelFormValues = z.infer<
  ReturnType<typeof createEcoLabelSchema>
>;

export const EMPTY_FORM: EcoLabelFormValues = {
  code: "",
  name: "",
  description: "",
  is_active: true,
};

export function getDefaultValues(ecoLabel?: EcoLabel): EcoLabelFormValues {
  if (!ecoLabel) return { ...EMPTY_FORM };
  return {
    code: ecoLabel.code,
    name: ecoLabel.name,
    description: ecoLabel.description ?? "",
    is_active: ecoLabel.is_active,
  };
}
