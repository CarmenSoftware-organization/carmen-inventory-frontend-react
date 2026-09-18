import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type { BusinessType } from "@/types/business-type";

export function createBusinessTypeSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    name: z.string().min(1, tv("required", { field: tf("name") })),
    is_active: z.boolean(),
  });
}

export type BusinessTypeFormValues = z.infer<
  ReturnType<typeof createBusinessTypeSchema>
>;

export const EMPTY_FORM: BusinessTypeFormValues = {
  name: "",
  is_active: true,
};

export function getDefaultValues(
  businessType?: BusinessType,
): BusinessTypeFormValues {
  if (!businessType) return { ...EMPTY_FORM };
  return {
    name: businessType.name,
    is_active: businessType.is_active,
  };
}
