import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";

export function createCreditTermSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    name: z.string().min(1, tv("required", { field: tf("name") })),
    value: z.coerce
      .number()
      .min(1, tv("minNumber", { field: tf("creditTermDays"), min: 1 })),
    description: z.string().optional(),
    is_active: z.boolean(),
  });
}

export type CreditTermFormValues = z.infer<
  ReturnType<typeof createCreditTermSchema>
>;
