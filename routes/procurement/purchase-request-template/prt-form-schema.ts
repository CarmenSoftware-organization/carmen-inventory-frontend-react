import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type {
  PurchaseRequestTemplate,
  PrtDetailPayload,
} from "@/types/purchase-request";

function createPrtDetailSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    id: z.string().optional(),
    // เวอร์ชันของ "แถว" ไม่ใช่ของแม่แบบ — backend ล็อกแยกกันคนละชั้น แถวที่เพิ่ง
    // เพิ่มยังไม่มี (ไม่ต้องส่งตอน add)
    doc_version: z.coerce.number().optional(),
    location_id: z
      .string()
      .nullable()
      .refine((v) => !!v, tv("required", { field: tf("location") })),
    // display เท่านั้น — ไม่ส่งเข้า payload
    location_name: z.string(),
    location_code: z.string(),
    delivery_point_id: z
      .string()
      .nullable()
      .refine((v) => !!v, tv("required", { field: tf("deliveryPoint") })),
    // display เท่านั้น — ไม่ส่งเข้า payload · จำเป็นเพราะจุดส่งของที่ถูกปิดใช้งาน
    // แล้วจะไม่อยู่ใน list ที่ lookup ดึงมา (`is_active: false`) ชื่อที่เก็บไว้กับ
    // แม่แบบจึงเป็นตัวเดียวที่บอกได้ว่าแถวนี้เลือกอะไรไว้
    delivery_point_name: z.string(),
    product_id: z
      .string()
      .nullable()
      .refine((v) => !!v, tv("required", { field: tf("product") })),
    product_name: z.string(),
    // display เท่านั้น — ไม่ส่งเข้า payload (เหมือน product_name)
    product_local_name: z.string(),
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
  location_name: "",
  location_code: "",
  delivery_point_id: null,
  delivery_point_name: "",
  product_id: null,
  product_name: "",
  product_local_name: "",
  inventory_unit_id: null,
  inventory_unit_name: "",
  // เริ่มที่ 0 — แม่แบบเก็บ "ของชุดนี้" เป็นหลัก จำนวนจริงมากรอกตอนทำใบขอซื้อ
  // การ default เป็น 1 ทำให้ทุกแถวมีเลขที่ไม่มีใครตั้งใจใส่ติดไปกับแม่แบบ
  requested_qty: 0,
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
          doc_version: d.doc_version,
          location_id: d.location_id ?? null,
          location_name: d.location_name ?? "",
          location_code: d.location_code ?? "",
          delivery_point_id: d.delivery_point_id ?? null,
          delivery_point_name: d.delivery_point_name ?? "",
          product_id: d.product_id,
          product_name: d.product_name,
          product_local_name: d.product_local_name ?? "",
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

export function mapItemToPayload(
  item: PrtFormValues["items"][number],
): PrtDetailPayload {
  return {
    ...(item.doc_version != null ? { doc_version: item.doc_version } : {}),
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
