import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type {
  CreateRequestPriceListDto,
  RequestPriceList,
  RequestPriceListVendor,
} from "@/types/request-price-list";

function createVendorRowSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    id: z.string(),
    vendor_id: z.string().min(1, tv("required", { field: tf("vendor") })),
    vendor_name: z.string(),
    vendor_code: z.string(),
    contact_person: z.string(),
    contact_phone: z.string(),
    contact_email: z.string(),
    dimension: z.string(),
  });
}

export function createRfpSchema(tv: TranslationFn, tf: TranslationFn) {
  return z
    .object({
      name: z.string().min(1, tv("required", { field: tf("name") })),
      pricelist_template_id: z
        .string()
        .min(1, tv("required", { field: tf("template") })),
      start_date: z.string().min(1, tv("required", { field: tf("startDate") })),
      end_date: z.string().min(1, tv("required", { field: tf("endDate") })),
      custom_message: z.string().optional(),
      dimension: z.any(),
      info: z.string().optional(),
      email_template_id: z.string().optional(),
      vendors: z.array(createVendorRowSchema(tv, tf)).default([]),
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
  vendors: [],
};

export function getDefaultValues(rfp?: RequestPriceList): RfpFormValues {
  if (!rfp) return EMPTY_FORM;
  return {
    name: rfp.name ?? "",
    pricelist_template_id: rfp.pricelist_template?.id ?? "",
    start_date: rfp.start_date ?? "",
    end_date: rfp.end_date ?? "",
    custom_message: rfp.custom_message ?? "",
    dimension: rfp.dimension ?? "",
    info:
      typeof rfp.info === "string" ? rfp.info : JSON.stringify(rfp.info ?? {}),
    email_template_id: rfp.email_template_id ?? "",
    vendors: (rfp.vendors ?? []).map(toVendorRow),
  };
}

export function toVendorRow(
  vendor: RequestPriceListVendor,
): RfpFormValues["vendors"][number] {
  return {
    id: vendor.id,
    vendor_id: vendor.vendor?.id ?? "",
    vendor_name: vendor.vendor?.name ?? "",
    vendor_code: vendor.vendor?.code ?? "",
    contact_person: vendor.contact_person,
    contact_phone: vendor.contact_phone,
    contact_email: vendor.contact_email,
    dimension: vendor.dimension ?? "",
  };
}

/**
 * รายชื่อผู้ขายบนฟอร์ม -> delta ที่ backend ต้องการ
 *
 * แถวที่ยังไม่มี `id` = เพิ่งเพิ่ม -> `add` · แถวเดิมที่หายไปจากฟอร์ม -> `remove`
 * ไม่มี `update` เพราะข้อมูลผู้ขายในตารางแก้ไม่ได้ ดึงจาก master มาแสดงอย่างเดียว
 *
 * กดลบแล้วเพิ่มคนเดิมกลับในรอบแก้ไขเดียวกันจะไม่ส่งอะไรเลย เพราะตอนเพิ่มกลับ
 * ฟอร์มคืนแถวเดิม (id เดิม) ไม่ได้สร้างแถวใหม่ — ดู `rfp-vendor-fields.tsx`
 */
export function buildVendorChanges(
  current: RfpFormValues["vendors"],
  original: RfpFormValues["vendors"],
): CreateRequestPriceListDto["vendors"] {
  // ผู้ขายที่บันทึกไว้แล้วและยังอยู่ — ผู้ขายใหม่ต่อ sequence จากตรงนี้
  const keptCount = current.filter((v) => v.id).length;
  const add = current
    .filter((v) => !v.id)
    .map((v, i) => ({
      vendor_id: v.vendor_id,
      vendor_name: v.vendor_name,
      vendor_code: v.vendor_code,
      contact_person: v.contact_person,
      contact_phone: v.contact_phone,
      contact_email: v.contact_email,
      sequence_no: keptCount + i + 1,
      dimension: v.dimension,
      id: "",
    }));

  const currentVendorIds = new Set(current.map((v) => v.vendor_id));
  const remove = original
    .filter((v) => !currentVendorIds.has(v.vendor_id))
    .map((v) => ({ vendor_id: v.vendor_id }));

  return {
    add: add.length > 0 ? add : undefined,
    remove: remove.length > 0 ? remove : undefined,
  };
}
