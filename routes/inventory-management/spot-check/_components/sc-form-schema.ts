import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type {
  CreateSpotCheckDto,
  SpotCheck,
  SpotCheckMethod,
} from "@/types/spot-check";

const productItemSchema = z.object({
  product_id: z.string(),
  product_name: z.string(), // display only
});

/**
 * สร้าง Zod schema สำหรับตรวจสอบฟอร์ม Spot Check
 * รองรับ 3 method: random | high_value | manual
 *
 * Validation conditional ตาม method:
 * - random / high_value → items >= 1
 * - high_value          → min_value >= 0
 * - manual              → products.length >= 1 (ทุก product_id ต้องไม่ว่าง)
 *
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @param tf - ฟังก์ชันแปลชื่อฟิลด์
 * @returns Zod schema ของฟอร์ม spot check
 */
export function createSpotCheckSchema(tv: TranslationFn, tf: TranslationFn) {
  return z
    .object({
      location_id: z.string().min(1, tv("required", { field: tf("location") })),
      method: z.enum([
        "random",
        "high_value",
        "manual",
      ]) satisfies z.ZodType<SpotCheckMethod>,
      items: z.coerce.number().optional(),
      min_value: z.coerce.number().optional(),
      products: z.array(productItemSchema),
      description: z.string(),
      note: z.string(),
    })
    .refine(
      (data) =>
        (data.method !== "random" && data.method !== "high_value") ||
        (data.items != null && data.items >= 1),
      {
        message: tv("minNumber", { field: tf("items"), min: 1 }),
        path: ["items"],
      },
    )
    .refine(
      (data) =>
        data.method !== "high_value" ||
        (data.min_value != null && data.min_value >= 0),
      {
        message: tv("minNumber", { field: tf("minValue"), min: 0 }),
        path: ["min_value"],
      },
    )
    .refine(
      (data) =>
        data.method !== "manual" ||
        (data.products.length >= 1 &&
          data.products.every((p) => p.product_id !== "")),
      {
        message: tv("atLeastOneItem", { item: tf("product") }),
        path: ["products"],
      },
    );
}

export type SpotCheckFormValues = z.infer<ReturnType<typeof createSpotCheckSchema>>;

// --- Defaults ---

export const EMPTY_FORM: SpotCheckFormValues = {
  location_id: "",
  method: "random",
  items: 0,
  min_value: 0,
  products: [],
  description: "",
  note: "",
};

// --- Helpers ---

/**
 * สร้างค่า default ของฟอร์ม Spot Check จากข้อมูลที่มีอยู่
 * ใช้ใน ScForm ทั้งโหมด add (ไม่ส่ง arg) และ edit (ส่ง entity)
 *
 * @param spotCheck - ข้อมูล SpotCheck สำหรับโหมดแก้ไข (optional)
 * @returns ค่าเริ่มต้นของฟอร์ม spot check
 * @example
 * const defaults = getDefaultValues(spotCheck);
 * const form = useForm<SpotCheckFormValues>({ defaultValues: defaults });
 */
export function getDefaultValues(spotCheck?: SpotCheck): SpotCheckFormValues {
  if (spotCheck) {
    return {
      location_id: spotCheck.location_id ?? "",
      method: spotCheck.method ?? "random",
      items: spotCheck.items ?? 0,
      min_value: spotCheck.min_value ?? 0,
      products:
        spotCheck.product_id?.map((id) => ({
          product_id: id,
          product_name: "",
        })) ?? [],
      description: spotCheck.description ?? "",
      note: spotCheck.note ?? "",
    };
  }
  return { ...EMPTY_FORM, products: [] };
}

/**
 * Map form values → API payload (discriminated union ตาม method)
 * - random      → { location_id, method, items, description?, note? }
 * - high_value  → { location_id, method, items, min_value, description?, note? }
 * - manual      → { location_id, method, product_id: string[], description?, note? }
 */
export function mapFormToPayload(
  values: SpotCheckFormValues,
): CreateSpotCheckDto {
  const base = {
    location_id: values.location_id,
    description: values.description || undefined,
    note: values.note || undefined,
  };

  if (values.method === "random") {
    return { ...base, method: "random", items: values.items ?? 0 };
  }

  if (values.method === "high_value") {
    return {
      ...base,
      method: "high_value",
      items: values.items ?? 0,
      min_value: values.min_value ?? 0,
    };
  }

  return {
    ...base,
    method: "manual",
    product_id: values.products
      .map((p) => p.product_id)
      .filter((id) => id !== ""),
  };
}
