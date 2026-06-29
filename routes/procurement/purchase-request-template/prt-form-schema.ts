import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type {
  PurchaseRequestTemplate,
  PrtDetailPayload,
} from "@/types/purchase-request";

/**
 * สร้าง Zod schema สำหรับรายการสินค้าใน PRT
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @param tf - ฟังก์ชันแปลชื่อฟิลด์
 * @returns Zod schema ของรายการ PRT
 */
function createPrtDetailSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    id: z.string().optional(),
    location_id: z
      .string()
      .nullable()
      .refine((v) => !!v, tv("required", { field: tf("location") })),
    delivery_point_id: z
      .string()
      .nullable()
      .refine((v) => !!v, tv("required", { field: tf("deliveryPoint") })),
    product_id: z
      .string()
      .nullable()
      .refine((v) => !!v, tv("required", { field: tf("product") })),
    product_name: z.string(),
    inventory_unit_id: z.string().nullable(),
    inventory_unit_name: z.string(),
    requested_qty: z.coerce
      .number()
      .min(0, tv("minNumber", { field: tf("qty"), min: 0 })),
    requested_unit_id: z
      .string()
      .nullable()
      .refine((v) => !!v, tv("required", { field: tf("unit") })),
    requested_unit_name: z.string(),
    currency_id: z
      .string()
      .nullable()
      .refine((v) => !!v, tv("required", { field: tf("currency") })),
  });
}

/**
 * สร้าง Zod schema สำหรับฟอร์มเทมเพลตใบขอซื้อ
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @param tf - ฟังก์ชันแปลชื่อฟิลด์
 * @returns Zod object schema ของฟอร์ม PRT
 */
export function createPrtSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    name: z.string().min(1, tv("required", { field: tf("name") })),
    description: z.string(),
    workflow_id: z.string().min(1, tv("required", { field: tf("workflow") })),
    is_active: z.boolean(),
    items: z
      .array(createPrtDetailSchema(tv, tf))
      .min(1, tv("required", { field: tf("items") })),
  });
}

export type PrtFormValues = z.infer<ReturnType<typeof createPrtSchema>>;

// --- Defaults ---

export const PRT_ITEM = {
  location_id: null,
  delivery_point_id: null,
  product_id: null,
  product_name: "",
  inventory_unit_id: null,
  inventory_unit_name: "",
  requested_qty: 1,
  requested_unit_id: null,
  requested_unit_name: "",
  currency_id: null,
} as const;

export const EMPTY_FORM: PrtFormValues = {
  name: "",
  description: "",
  workflow_id: "",
  is_active: true,
  items: [],
};

// --- Helpers ---

/**
 * สร้างค่าเริ่มต้นของฟอร์ม PRT จากข้อมูลที่มีอยู่หรือเริ่มต้นใหม่
 * @param template - ข้อมูลเทมเพลตเดิม (optional)
 * @returns ค่าเริ่มต้นของฟอร์ม PRT
 */
export function getDefaultValues(
  template?: PurchaseRequestTemplate,
): PrtFormValues {
  if (template) {
    return {
      name: template.name ?? "",
      description: template.description ?? "",
      workflow_id: template.workflow_id ?? "",
      is_active: template.is_active ?? true,
      items:
        template.purchase_request_template_detail?.map((d) => ({
          id: d.id,
          location_id: d.location_id ?? null,
          delivery_point_id: d.delivery_point_id ?? null,
          product_id: d.product_id,
          product_name: d.product_name,
          inventory_unit_id: d.inventory_unit_id ?? null,
          inventory_unit_name: d.inventory_unit_name ?? "",
          requested_qty: d.requested_qty,
          requested_unit_id: d.requested_unit_id ?? null,
          requested_unit_name: d.requested_unit_name ?? "",
          currency_id: d.currency_id ?? null,
        })) ?? [],
    };
  }
  return EMPTY_FORM;
}

/**
 * แปลงรายการสินค้าในฟอร์ม PRT เป็น payload สำหรับส่ง API
 * @param item - รายการสินค้าในฟอร์ม PRT
 * @returns payload รายการ PRT
 */
export function mapItemToPayload(
  item: PrtFormValues["items"][number],
): PrtDetailPayload {
  return {
    location_id: item.location_id || null,
    delivery_point_id: item.delivery_point_id || null,
    product_id: item.product_id || null,
    product_name: item.product_name,
    inventory_unit_id: item.inventory_unit_id || null,
    inventory_unit_name: item.inventory_unit_name,
    requested_qty: item.requested_qty,
    requested_unit_id: item.requested_unit_id || null,
    requested_unit_name: item.requested_unit_name,
    requested_unit_conversion_factor: 1,
    requested_base_qty: item.requested_qty,
    currency_id: item.currency_id || null,
  };
}
