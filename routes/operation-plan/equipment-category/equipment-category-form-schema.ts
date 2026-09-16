import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type { EquipmentCategory } from "@/types/equipment-category";

export function createEquipmentCategorySchema(
  tv: TranslationFn,
  tf: TranslationFn,
) {
  return z.object({
    name: z.string().min(1, tv("required", { field: tf("name") })),
    description: z.string(),
    is_active: z.boolean(),
  });
}

export type EquipmentCategoryFormValues = z.infer<
  ReturnType<typeof createEquipmentCategorySchema>
>;

export const EMPTY_FORM: EquipmentCategoryFormValues = {
  name: "",
  description: "",
  is_active: true,
};

export function getDefaultValues(
  equipmentCategory?: EquipmentCategory,
): EquipmentCategoryFormValues {
  if (!equipmentCategory) return EMPTY_FORM;
  return {
    name: equipmentCategory.name,
    description: equipmentCategory.description ?? "",
    is_active: equipmentCategory.is_active,
  };
}

export function mapToPayload(values: EquipmentCategoryFormValues) {
  return {
    name: values.name,
    description: values.description || null,
    is_active: values.is_active,
  };
}
