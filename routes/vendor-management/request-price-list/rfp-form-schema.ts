import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type { RequestPriceList } from "@/types/request-price-list";

/**
 * สร้าง zod schema สำหรับรายการ vendor หนึ่งรายการใน RFP
 * @param tv - ฟังก์ชัน translation สำหรับ validation
 * @param tf - ฟังก์ชัน translation สำหรับชื่อ field
 * @returns zod schema ของ vendor item
 */
function createVendorItemSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    vendor_id: z.string().min(1, tv("required", { field: tf("vendor") })),
    vendor_name: z.string(),
    vendor_code: z.string(),
    contact_person: z.string(),
    contact_phone: z.string(),
    contact_email: z.string(),
    dimension: z.string(),
  });
}

/**
 * สร้าง zod schema ของ RFP form พร้อมตรวจสอบช่วงวันที่และ vendors add/remove
 * @param tv - ฟังก์ชัน translation สำหรับ validation
 * @param tf - ฟังก์ชัน translation สำหรับชื่อ field
 * @returns zod schema ของ RFP form
 */
export function createRfpSchema(tv: TranslationFn, tf: TranslationFn) {
  return z
    .object({
      name: z.string().min(1, tv("required", { field: tf("name") })),
      pricelist_template_id: z.string().min(1, tv("required", { field: tf("template") })),
      start_date: z.string().min(1, tv("required", { field: tf("startDate") })),
      end_date: z.string().min(1, tv("required", { field: tf("endDate") })),
      custom_message: z.string().optional(),
      dimension: z.any(),
      info: z.string().optional(),
      email_template_id: z.string().optional(),
      vendors: z.object({
        add: z.array(createVendorItemSchema(tv, tf)).default([]),
        remove: z.array(z.string()).default([]),
      }).default({ add: [], remove: [] }),
    })
    .refine(
      (data) => {
        if (!data.start_date || !data.end_date) return true;
        return new Date(data.end_date) >= new Date(data.start_date);
      },
      { message: tv("endDateAfterStart"), path: ["end_date"] },
    );
}

export type RfpFormValues = z.infer<ReturnType<typeof createRfpSchema>>;

export const EMPTY_FORM: RfpFormValues = {
  name: "",
  pricelist_template_id: "",
  start_date: "",
  end_date: "",
  custom_message: "",
  dimension: "",
  info: "",
  email_template_id: "",
  vendors: { add: [], remove: [] },
};

/**
 * คำนวณค่าเริ่มต้นของ RFP form จาก RFP ที่มีอยู่ หรือคืนค่า empty form
 * @param rfp - ข้อมูล RFP สำหรับ pre-fill (optional)
 * @returns ค่า default ของ RFP form
 */
export function getDefaultValues(rfp?: RequestPriceList): RfpFormValues {
  if (!rfp) return EMPTY_FORM;
  return {
    name: rfp.name ?? "",
    pricelist_template_id: rfp.pricelist_template?.id ?? "",
    start_date: rfp.start_date ?? "",
    end_date: rfp.end_date ?? "",
    custom_message: rfp.custom_message ?? "",
    dimension: rfp.dimension ?? "",
    info: typeof rfp.info === "string" ? rfp.info : JSON.stringify(rfp.info ?? {}),
    email_template_id: rfp.email_template_id ?? "",
    vendors: { add: [], remove: [] },
  };
}
