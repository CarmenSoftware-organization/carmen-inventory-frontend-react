/**
 * รายละเอียด Business Unit จาก `GET api/business-units`
 *
 * ใช้ในหน้า Business Setting (system-admin) — สะท้อน response ทั้งหมด
 * ยกเว้น `users[]` ที่หน้านี้ไม่ได้ใช้จึงไม่ระบุไว้
 */

/** ข้อมูล connection ของฐานข้อมูลประจำ BU */
export interface BusinessUnitDbConnection {
  host: string;
  port: number;
  schema: string;
  database: string;
  /** รหัสผ่าน DB — UI แสดงแบบ mask พร้อมปุ่ม reveal เท่านั้น */
  password: string;
  provider: string;
  username: string;
}

/** รูปแบบตัวเลข (Intl) — ใช้ร่วมกับ amount/quantity/perpage/recipe */
export interface BusinessUnitNumberFormat {
  locales: string;
  minimumIntegerDigits: number;
}

/** URL รูปภาพ pre-signed พร้อมเวลาหมดอายุ (logo/avatar) */
export interface BusinessUnitImage {
  url: string;
  expires_at: string;
}

/** รายการตั้งค่าใน `config` — value เป็น string เสมอ ตีความตาม `datatype` */
export interface BusinessUnitConfigItem {
  key: string;
  label: string;
  datatype: string;
  value: string;
}

/** รายการ audit หนึ่งครั้ง (created/updated) */
export interface BusinessUnitAuditEntry {
  at: string;
  id: string;
  name: string;
}

export interface BusinessUnitAudit {
  created?: BusinessUnitAuditEntry;
  updated?: BusinessUnitAuditEntry;
}

export interface BusinessUnitDetail {
  id: string;
  cluster_id: string;
  code: string;
  name: string;
  alias_name: string | null;
  description: string | null;
  info: string | null;
  is_hq: boolean;
  is_active: boolean;
  db_connection: BusinessUnitDbConnection | null;
  /** GET อาจคืน `{}` (ว่าง) หรือ array ของ setting — component normalize เป็น array เสมอ */
  config: BusinessUnitConfigItem[] | Record<string, unknown>;
  default_currency_id: string | null;
  calculation_method: string | null;
  max_license_users: number | null;
  branch_no: string | null;

  company_name: string | null;
  company_address: string | null;
  company_email: string | null;
  company_tel: string | null;
  company_zip_code: string | null;
  tax_no: string | null;

  hotel_name: string | null;
  hotel_address: string | null;
  hotel_email: string | null;
  hotel_tel: string | null;
  hotel_zip_code: string | null;

  date_format: string | null;
  date_time_format: string | null;
  time_format: string | null;
  short_time_format: string | null;
  long_time_format: string | null;
  timezone: string | null;

  amount_format: BusinessUnitNumberFormat | null;
  quantity_format: BusinessUnitNumberFormat | null;
  perpage_format: BusinessUnitNumberFormat | null;
  recipe_format: BusinessUnitNumberFormat | null;

  doc_version: number;
  cluster_name: string | null;

  logo: BusinessUnitImage | null;
  avatar: BusinessUnitImage | null;
  audit: BusinessUnitAudit | null;
}

/** field ที่แก้ไขได้ในหน้า Business Setting (ฐานของ PATCH payload) */
export interface BusinessUnitEditable {
  code: string;
  name: string;
  alias_name: string | null;
  description: string | null;
  info: string | null;
  is_active: boolean;
  default_currency_id: string | null;

  company_name: string | null;
  company_address: string | null;
  company_email: string | null;
  company_tel: string | null;
  company_zip_code: string | null;
  tax_no: string | null;
  branch_no: string | null;

  hotel_name: string | null;
  hotel_address: string | null;
  hotel_email: string | null;
  hotel_tel: string | null;
  hotel_zip_code: string | null;

  timezone: string | null;
  date_format: string | null;
  date_time_format: string | null;
  time_format: string | null;
  short_time_format: string | null;
  long_time_format: string | null;

  amount_format: BusinessUnitNumberFormat | null;
  quantity_format: BusinessUnitNumberFormat | null;
  perpage_format: BusinessUnitNumberFormat | null;
  recipe_format: BusinessUnitNumberFormat | null;

  config: BusinessUnitConfigItem[];
}

/** payload PATCH — ส่งเฉพาะ field ที่แก้จริง (partial) + doc_version สำหรับ
 * optimistic lock (กัน 409 ตอน backend เทียบ version) */
export type BusinessUnitPatch = Partial<BusinessUnitEditable> & {
  doc_version?: number;
};
