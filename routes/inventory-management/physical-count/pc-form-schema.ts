import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type { PhysicalCount } from "@/types/physical-count";

export function createPhysicalCountSchema(
  tv: TranslationFn,
  tf: TranslationFn,
) {
  return z.object({
    department_id: z
      .string()
      .min(1, tv("required", { field: tf("department") })),
    physical_count_period_id: z.string().optional(),
  });
}

export type PhysicalCountFormValues = z.infer<
  ReturnType<typeof createPhysicalCountSchema>
>;

// --- Defaults ---

export const EMPTY_FORM: PhysicalCountFormValues = {
  department_id: "",
  physical_count_period_id: "",
};

// --- Helpers ---

export function getDefaultValues(
  physicalCount?: PhysicalCount,
): PhysicalCountFormValues {
  if (physicalCount) {
    return {
      department_id: physicalCount.department_id ?? "",
      physical_count_period_id: "",
    };
  }
  return { ...EMPTY_FORM };
}
