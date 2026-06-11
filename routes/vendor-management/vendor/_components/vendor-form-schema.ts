import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type { VendorDetail } from "@/types/vendor";

// --- Zod Schemas ---

/**
 * สร้าง zod schema สำหรับข้อมูลเพิ่มเติมของ vendor (label/value/data_type)
 * ใช้ภายใน createVendorSchema สำหรับ field `info` ที่เป็น array ของข้อมูลแบบ dynamic
 * @returns zod object schema ของ vendor info
 * @example
 * const schema = createVendorInfoSchema();
 * schema.parse({ label: "Tax ID", value: "1234567890", data_type: "string" });
 */
function createVendorInfoSchema() {
  return z.object({
    label: z.string().max(100),
    value: z.string().max(256),
    data_type: z.string(),
  });
}

/**
 * สร้าง zod schema สำหรับที่อยู่ของ vendor — บังคับเฉพาะ address_type
 * field อื่น optional (มีแค่ max length cap)
 * @param tv - ฟังก์ชัน translation สำหรับข้อความ validation
 * @param tf - ฟังก์ชัน translation สำหรับชื่อ field
 * @returns zod schema ของ vendor address
 */
function createVendorAddressSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    id: z.string().optional(),
    address_type: z
      .string()
      .min(1, tv("required", { field: tf("addressType") })),
    address_line1: z.string().max(256),
    address_line2: z.string().max(256),
    city: z.string().max(100),
    district: z.string().max(100),
    sub_district: z.string().max(100),
    province: z.string().max(100),
    postal_code: z.string().max(20),
    country: z.string().max(100),
  });
}

/**
 * สร้าง zod schema สำหรับข้อมูลผู้ติดต่อของ vendor
 * @param tv - ฟังก์ชัน translation สำหรับข้อความ validation
 * @param tf - ฟังก์ชัน translation สำหรับชื่อ field
 * @returns zod schema ของ vendor contact
 */
function createVendorContactSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    id: z.string().optional(),
    name: z.string().min(1, tv("required", { field: tf("name") })).max(100),
    email: z
      .string()
      .max(100)
      .refine(
        (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
        tv("invalidEmail"),
      ),
    phone: z.string().max(20),
    is_primary: z.boolean(),
  });
}

/**
 * สร้าง zod schema รวมของ vendor form ประกอบด้วยข้อมูลหลัก ที่อยู่ และผู้ติดต่อ
 * @param tv - ฟังก์ชัน translation สำหรับข้อความ validation
 * @param tf - ฟังก์ชัน translation สำหรับชื่อ field
 * @returns zod schema ของ vendor form ทั้งหมด
 */
export function createVendorSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    code: z.string().min(1, tv("required", { field: tf("code") })).max(10),
    name: z.string().min(1, tv("required", { field: tf("name") })).max(100),
    description: z.string().max(256),
    is_active: z.boolean(),
    business_types: z.array(z.object({ id: z.string(), name: z.string() })),
    info: z.preprocess(
      (val) => (Array.isArray(val) ? val : []),
      z.array(createVendorInfoSchema()),
    ),
    vendor_address: z.array(createVendorAddressSchema(tv, tf)),
    vendor_contact: z.array(createVendorContactSchema(tv, tf)),
  });
}

export type VendorFormValues = z.infer<ReturnType<typeof createVendorSchema>>;

// --- Empty Constants ---

export const EMPTY_VENDOR_INFO: VendorFormValues["info"][number] = {
  label: "",
  value: "",
  data_type: "string",
} as const;

export const EMPTY_VENDOR_ADDRESS: VendorFormValues["vendor_address"][number] =
  {
    address_type: "",
    address_line1: "",
    address_line2: "",
    city: "",
    district: "",
    sub_district: "",
    province: "",
    postal_code: "",
    country: "",
  } as const;

export const EMPTY_VENDOR_CONTACT: VendorFormValues["vendor_contact"][number] =
  {
    name: "",
    email: "",
    phone: "",
    is_primary: false,
  } as const;

export const EMPTY_FORM: VendorFormValues = {
  code: "",
  name: "",
  description: "",
  is_active: true,
  business_types: [],
  info: [],
  vendor_address: [],
  vendor_contact: [],
} as const;

// --- Payload Mappers ---

/**
 * แปลงข้อมูลที่อยู่จาก form values ให้อยู่ในรูปแบบ payload ของ API
 * @param a - ข้อมูล vendor address จาก form
 * @returns payload object ของ address สำหรับส่งไป API
 */
export function mapAddressPayload(
  a: VendorFormValues["vendor_address"][number],
) {
  return {
    address_type: a.address_type,
    address_line1: a.address_line1,
    address_line2: a.address_line2,
    city: a.city,
    district: a.district,
    sub_district: a.sub_district,
    province: a.province,
    postal_code: a.postal_code,
    country: a.country,
  };
}

/**
 * แปลงข้อมูลผู้ติดต่อจาก form values ให้อยู่ในรูปแบบ payload ของ API
 * @param c - ข้อมูล vendor contact จาก form
 * @returns payload object ของ contact สำหรับส่งไป API
 */
export function mapContactPayload(
  c: VendorFormValues["vendor_contact"][number],
) {
  return {
    name: c.name,
    email: c.email,
    phone: c.phone,
    is_primary: c.is_primary,
  };
}

/**
 * สร้าง payload แบบ nested (add/update/remove) จากค่าของ useFieldArray
 * รายการใหม่ที่ไม่มี id จะเข้า add, รายการเดิมที่ dirty จะเข้า update, และ id ที่ถูกลบจะเข้า remove
 * @param items - รายการปัจจุบันใน form
 * @param dirtyItems - รายการที่ถูกแก้ไขตาม react-hook-form dirtyFields
 * @param removedIds - id ของรายการที่ถูกลบ
 * @param mapFn - ฟังก์ชันแปลง item เป็น payload
 * @param idKey - ชื่อ key ของ id ใน payload
 * @returns object payload ที่มี add/update/remove ตามที่พบ
 */
export function buildNestedPayload<T extends { id?: string }>(
  items: T[],
  dirtyItems: Record<string, unknown>[] | undefined,
  removedIds: string[],
  mapFn: (item: T) => Record<string, unknown>,
  idKey: string,
) {
  const result: {
    add?: Record<string, unknown>[];
    update?: Record<string, unknown>[];
    remove?: Record<string, unknown>[];
  } = {};

  const added = items.filter((item) => !item.id).map(mapFn);
  const updated = items
    .filter((item, i): item is T & { id: string } => {
      if (!item.id) return false;
      const dirty = dirtyItems?.[i];
      return dirty != null && Object.keys(dirty).length > 0;
    })
    .map((item) => ({ [idKey]: item.id, ...mapFn(item) }));
  const removed = removedIds.map((id) => ({ [idKey]: id }));

  if (added.length > 0) result.add = added;
  if (updated.length > 0) result.update = updated;
  if (removed.length > 0) result.remove = removed;
  return result;
}

// --- Default Values ---

/**
 * คำนวณค่าเริ่มต้นของ vendor form จากข้อมูล vendor ที่มีอยู่ หรือคืนค่า empty form
 * @param vendor - ข้อมูล vendor ที่จะใช้ pre-fill (optional)
 * @returns ค่า default ของ vendor form
 */
export function getDefaultValues(vendor?: VendorDetail): VendorFormValues {
  if (vendor) {
    return {
      code: vendor.code,
      name: vendor.name,
      description: vendor.description ?? "",
      is_active: vendor.is_active,
      business_types: vendor.business_type?.map((bt) => ({ id: bt.id, name: bt.name })) ?? [],
      info: vendor.info ?? [],
      vendor_address:
        vendor.vendor_address?.map((a) => ({
          id: a.id,
          address_type: a.address_type,
          address_line1: a.address_line1 ?? "",
          address_line2: a.address_line2 ?? "",
          city: a.city ?? "",
          district: a.district ?? "",
          sub_district: a.sub_district ?? "",
          province: a.province ?? "",
          postal_code: a.postal_code ?? "",
          country: a.country ?? "",
        })) ?? [],
      // detail API ส่ง contacts มาได้หลายชื่อ field — รองรับทั้ง vendor_contact
      // (ปัจจุบัน) / contacts / tb_vendor_contact (@deprecated) กัน contacts หาย
      vendor_contact: (
        vendor.vendor_contact ??
        vendor.contacts ??
        vendor.tb_vendor_contact ??
        []
      ).map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email ?? "",
        phone: c.phone ?? "",
        is_primary: c.is_primary ?? false,
      })),
    };
  }
  return EMPTY_FORM;
}
