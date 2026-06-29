import { z } from "zod";
import type { Cuisine } from "@/types/cuisine";
import {
  arrayToText,
  objectToText,
  textToArray,
  textToObject,
} from "@/lib/form-helpers";

export const cuisineSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string(),
  note: z.string(),
  region: z.string().min(1, "Region is required"),
  popular_dishes: z.string(),
  key_ingredients: z.string(),
  info: z.string(),
  dimension: z.string(),
  is_active: z.boolean(),
});

export type CuisineFormValues = z.infer<typeof cuisineSchema>;

export const EMPTY_FORM: CuisineFormValues = {
  name: "",
  description: "",
  note: "",
  region: "ASIA",
  popular_dishes: "",
  key_ingredients: "",
  info: "",
  dimension: "",
  is_active: true,
};

/**
 * แปลงข้อมูล cuisine เป็นค่าเริ่มต้นของฟอร์ม
 * @param cuisine - ข้อมูล cuisine ที่มีอยู่ (ถ้ามี)
 * @returns ค่าเริ่มต้นของฟอร์ม cuisine
 * @example
 * const defaults = getDefaultValues(cuisine);
 * form.reset(defaults);
 */
export function getDefaultValues(cuisine?: Cuisine): CuisineFormValues {
  if (!cuisine) return EMPTY_FORM;
  return {
    name: cuisine.name,
    description: cuisine.description ?? "",
    note: cuisine.note ?? "",
    region: cuisine.region,
    popular_dishes: arrayToText(cuisine.popular_dishes),
    key_ingredients: arrayToText(cuisine.key_ingredients),
    info: objectToText(cuisine.info),
    dimension: arrayToText(cuisine.dimension),
    is_active: cuisine.is_active,
  };
}

/**
 * แปลงค่าจากฟอร์ม cuisine เป็น payload สำหรับส่งไปยัง API
 * @param values - ค่าฟอร์ม cuisine
 * @returns payload พร้อมส่งไปยัง API
 * @example
 * const payload = mapToPayload(form.getValues());
 * await createCuisine(payload);
 */
export function mapToPayload(values: CuisineFormValues) {
  return {
    name: values.name,
    description: values.description || null,
    note: values.note || null,
    region: values.region,
    popular_dishes: textToArray(values.popular_dishes),
    key_ingredients: textToArray(values.key_ingredients),
    info: textToObject(values.info),
    dimension: textToArray(values.dimension),
    is_active: values.is_active,
  };
}
