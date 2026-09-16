import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";

export function createCnReasonSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    name: z.string().min(1, tv("required", { field: tf("name") })),
    description: z.string(),
  });
}

export type CnReasonFormValues = z.infer<
  ReturnType<typeof createCnReasonSchema>
>;
