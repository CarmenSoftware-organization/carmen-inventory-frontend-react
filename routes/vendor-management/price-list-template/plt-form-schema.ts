import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type { PriceListTemplate } from "@/types/price-list-template";

/**
 * สร้าง zod schema สำหรับรายการสินค้าของ price list template หนึ่งรายการ
 * @param tv - ฟังก์ชัน translation สำหรับ validation
 * @param tf - ฟังก์ชัน translation สำหรับชื่อ field
 * @returns zod schema ของ detail
 */
function createPltDetailSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    product_id: z.string().min(1, tv("required", { field: tf("product") })),
    unit_id: z.string().min(1, tv("required", { field: tf("unit") })),
    unit_name: z.string(),
    qty: z.coerce.number().min(0),
    note: z.string(),
  });
}

/**
 * สร้าง zod schema ของ price list template form รวมข้อมูลหลักและรายการสินค้า
 * @param tv - ฟังก์ชัน translation สำหรับ validation
 * @param tf - ฟังก์ชัน translation สำหรับชื่อ field
 * @returns zod schema ของ template form
 */
export function createPltSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    name: z.string().min(1, tv("required", { field: tf("name") })),
    description: z.string(),
    status: z.enum(["draft", "active", "inactive"]),
    currency_id: z.string().min(1, tv("required", { field: tf("currency") })),
    validity_period: z.coerce.number().nullable(),
    vendor_instruction: z.string(),
    details: z.array(createPltDetailSchema(tv, tf)),
  });
}

export type PltFormValues = z.infer<ReturnType<typeof createPltSchema>>;

const EMPTY_FORM: PltFormValues = {
  name: "",
  description: "",
  status: "draft",
  currency_id: "",
  validity_period: null,
  vendor_instruction: "",
  details: [],
};

/**
 * คำนวณค่าเริ่มต้นของ template form จาก template ที่มีอยู่ พร้อม flatten moq เป็นรายการ
 * @param template - template ที่จะใช้ pre-fill (optional)
 * @param options - ตัวเลือกเพิ่มเติมเช่น default currency id
 * @returns ค่า default ของ template form
 */
export function getDefaultValues(
  template?: PriceListTemplate,
  options?: { defaultCurrencyId?: string },
): PltFormValues {
  if (template) {
    const details: PltFormValues["details"] = [];
    for (const product of template.products ?? []) {
      if (product.moq && product.moq.length > 0) {
        for (const moq of product.moq) {
          details.push({
            product_id: product.product_id,
            unit_id: moq.unit_id,
            unit_name: moq.unit_name,
            qty: moq.qty,
            note: moq.note ?? "",
          });
        }
      } else {
        details.push({
          product_id: product.product_id,
          unit_id: product.default_order?.unit_id ?? "",
          unit_name: product.default_order?.unit_name ?? "",
          qty: 0,
          note: "",
        });
      }
    }

    return {
      name: template.name,
      description: template.description ?? "",
      status: template.status,
      currency_id: template.currency?.id ?? "",
      validity_period: template.validity_period,
      vendor_instruction: template.vendor_instructions ?? "",
      details,
    };
  }

  return {
    ...EMPTY_FORM,
    currency_id: options?.defaultCurrencyId ?? "",
  };
}

export const PLT_DETAIL_EMPTY = {
  product_id: "",
  unit_id: "",
  unit_name: "",
  qty: 1,
  note: "",
} satisfies PltFormValues["details"][number];

/**
 * รวมรายการ detail ที่เป็น flat list ให้กลับมาเป็น product พร้อม moq array สำหรับส่ง API
 * @param details - รายการ detail จาก form
 * @returns array ของ product พร้อม moq ที่ถูก group แล้ว
 */
export function groupDetailsToProducts(details: PltFormValues["details"]) {
  const map = new Map<
    string,
    {
      product_id: string;
      moq: { unit_id: string; unit_name: string; qty: number; note: string }[];
    }
  >();

  for (const d of details) {
    const existing = map.get(d.product_id);
    const moqEntry = {
      unit_id: d.unit_id,
      unit_name: d.unit_name,
      qty: d.qty,
      note: d.note,
    };
    if (existing) {
      existing.moq.push(moqEntry);
    } else {
      map.set(d.product_id, {
        product_id: d.product_id,
        moq: [moqEntry],
      });
    }
  }

  return Array.from(map.values());
}
