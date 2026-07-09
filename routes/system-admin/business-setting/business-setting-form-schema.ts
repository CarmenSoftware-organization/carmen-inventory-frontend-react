import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type {
  BusinessUnitConfigItem,
  BusinessUnitDetail,
  BusinessUnitNumberFormat,
  BusinessUnitPatch,
} from "@/types/business-unit";
import { SEEDED_ITEMS } from "./business-setting-config-registry";

const numberFormatSchema = z.object({
  locales: z.string(),
  minimumIntegerDigits: z.coerce.number().int(),
});

const configItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  datatype: z.string(),
  value: z.string(),
});

/**
 * สร้าง Zod schema ของฟอร์ม Business Setting พร้อมข้อความแปลจาก i18n
 *
 * text field ที่ nullable เก็บเป็น "" ในฟอร์ม (แปลงกลับเป็น null ตอน build patch)
 *
 * @param tv - ฟังก์ชันแปลข้อความ validation (namespace `validation`)
 * @param tf - ฟังก์ชันแปลชื่อ field (namespace `businessSetting.fields`)
 */
export function createBusinessSettingSchema(
  tv: TranslationFn,
  tf: TranslationFn,
) {
  const optionalEmail = z
    .string()
    .refine(
      (v) => v === "" || z.string().email().safeParse(v).success,
      tv("invalidEmail"),
    );

  return z.object({
    code: z.string().min(1, tv("required", { field: tf("code") })),
    name: z.string().min(1, tv("required", { field: tf("name") })),
    alias_name: z.string(),
    description: z.string(),
    info: z.string(),
    default_currency_id: z.string(),

    company_name: z.string(),
    company_address: z.string(),
    company_email: optionalEmail,
    company_tel: z.string(),
    company_zip_code: z.string(),
    tax_no: z.string(),
    branch_no: z.string(),

    hotel_name: z.string(),
    hotel_address: z.string(),
    hotel_email: optionalEmail,
    hotel_tel: z.string(),
    hotel_zip_code: z.string(),

    timezone: z.string(),
    date_format: z.string(),
    date_time_format: z.string(),
    time_format: z.string(),
    short_time_format: z.string(),
    long_time_format: z.string(),

    amount_format: numberFormatSchema,
    quantity_format: numberFormatSchema,
    perpage_format: numberFormatSchema,
    recipe_format: numberFormatSchema,

    config: z.array(configItemSchema),
  });
}

export type BusinessSettingFormValues = z.infer<
  ReturnType<typeof createBusinessSettingSchema>
>;

/** normalize `config` จาก GET (อาจเป็น `{}`) ให้เป็น array เสมอ */
export function normalizeConfig(
  config: BusinessUnitDetail["config"],
): BusinessUnitConfigItem[] {
  return Array.isArray(config) ? config : [];
}

/**
 * merge seeded config (จาก registry) เข้ากับ config จาก backend
 *
 * seed เฉพาะ key ที่ backend ยังไม่มี — ต่อท้าย ใช้ defaultValue + canonical label
 * pure/locale-independent → diff เสถียร (ไม่ false-dirty ตอนสลับ locale)
 *
 * @param items - config items จาก backend (ผ่าน normalizeConfig แล้ว)
 * @returns config items ที่รวม seeded items ที่ยังขาด
 */
export function mergeSeededConfig(
  items: BusinessUnitConfigItem[],
): BusinessUnitConfigItem[] {
  const existing = new Set(items.map((i) => i.key));
  const seeded = SEEDED_ITEMS.filter((s) => !existing.has(s.key)).map((s) => ({
    key: s.key,
    label: s.label,
    datatype: s.datatype,
    value: s.defaultValue,
  }));
  return [...items, ...seeded];
}

const emptyFormat: BusinessUnitNumberFormat = {
  locales: "",
  minimumIntegerDigits: 0,
};

/** แปลง response เป็นค่าเริ่มต้นของฟอร์ม (null → "" / 0 / {} ตามชนิด) */
export function toFormValues(
  data: BusinessUnitDetail,
): BusinessSettingFormValues {
  const s = (v: string | null) => v ?? "";
  return {
    code: data.code,
    name: data.name,
    alias_name: s(data.alias_name),
    description: s(data.description),
    info: s(data.info),
    default_currency_id: s(data.default_currency_id),

    company_name: s(data.company_name),
    company_address: s(data.company_address),
    company_email: s(data.company_email),
    company_tel: s(data.company_tel),
    company_zip_code: s(data.company_zip_code),
    tax_no: s(data.tax_no),
    branch_no: s(data.branch_no),

    hotel_name: s(data.hotel_name),
    hotel_address: s(data.hotel_address),
    hotel_email: s(data.hotel_email),
    hotel_tel: s(data.hotel_tel),
    hotel_zip_code: s(data.hotel_zip_code),

    timezone: s(data.timezone),
    date_format: s(data.date_format),
    date_time_format: s(data.date_time_format),
    time_format: s(data.time_format),
    short_time_format: s(data.short_time_format),
    long_time_format: s(data.long_time_format),

    amount_format: data.amount_format ?? { ...emptyFormat },
    quantity_format: data.quantity_format ?? { ...emptyFormat },
    perpage_format: data.perpage_format ?? { ...emptyFormat },
    recipe_format: data.recipe_format ?? { ...emptyFormat },

    config: mergeSeededConfig(normalizeConfig(data.config)),
  };
}

const NULLABLE_STR_FIELDS = [
  "alias_name",
  "description",
  "info",
  "default_currency_id",
  "company_name",
  "company_address",
  "company_email",
  "company_tel",
  "company_zip_code",
  "tax_no",
  "branch_no",
  "hotel_name",
  "hotel_address",
  "hotel_email",
  "hotel_tel",
  "hotel_zip_code",
  "timezone",
  "date_format",
  "date_time_format",
  "time_format",
  "short_time_format",
  "long_time_format",
] as const;

const NUMBER_FORMAT_FIELDS = [
  "amount_format",
  "quantity_format",
  "perpage_format",
  "recipe_format",
] as const;

/**
 * สร้าง PATCH payload จาก diff ระหว่างค่าฟอร์มปัจจุบันกับค่าเดิม — ส่งเฉพาะที่เปลี่ยน
 *
 * - text field ว่าง ("") แปลงกลับเป็น null (code/name required จึงไม่ว่าง)
 * - number-format ส่งทั้ง object เมื่อส่วนใดเปลี่ยน
 * - config ส่งทั้ง array เมื่อ item ใดเปลี่ยน
 *
 * @param values - ค่าฟอร์มปัจจุบัน
 * @param original - ค่าฟอร์มเดิม (จาก `toFormValues(data)`)
 * @returns partial payload (ว่างถ้าไม่มีอะไรเปลี่ยน)
 */
export function buildPatch(
  values: BusinessSettingFormValues,
  original: BusinessSettingFormValues,
): BusinessUnitPatch {
  const patch: Record<string, unknown> = {};

  if (values.code !== original.code) patch.code = values.code;
  if (values.name !== original.name) patch.name = values.name;

  for (const k of NULLABLE_STR_FIELDS) {
    if (values[k] !== original[k])
      patch[k] = values[k] === "" ? null : values[k];
  }

  for (const k of NUMBER_FORMAT_FIELDS) {
    const a = values[k];
    const b = original[k];
    if (
      a.locales !== b.locales ||
      a.minimumIntegerDigits !== b.minimumIntegerDigits
    ) {
      patch[k] = a;
    }
  }

  if (JSON.stringify(values.config) !== JSON.stringify(original.config)) {
    patch.config = values.config;
  }

  return patch as BusinessUnitPatch;
}
