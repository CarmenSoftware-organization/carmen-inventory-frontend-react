import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type { Certification } from "@/types/certification";

export function createCertificationSchema(
  tv: TranslationFn,
  tf: TranslationFn,
) {
  return z.object({
    code: z.string().min(1, tv("required", { field: tf("code") })),
    name: z.string().min(1, tv("required", { field: tf("name") })),
    description: z.string().optional(),
    is_active: z.boolean(),
  });
}

export type CertificationFormValues = z.infer<
  ReturnType<typeof createCertificationSchema>
>;

export const EMPTY_FORM: CertificationFormValues = {
  code: "",
  name: "",
  description: "",
  is_active: true,
};

export function getDefaultValues(
  certification?: Certification,
): CertificationFormValues {
  if (!certification) return { ...EMPTY_FORM };
  return {
    code: certification.code,
    name: certification.name,
    description: certification.description ?? "",
    is_active: certification.is_active,
  };
}
