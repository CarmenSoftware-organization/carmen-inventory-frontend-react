export interface UpdateProfileDto {
  alias_name: string;
  firstname: string;
  middlename: string;
  lastname: string;
  telephone: string;
}

export interface ChangePasswordDto {
  current_password: string;
  new_password: string;
}

export interface UserProfile {
  id: string;
  email: string;
  alias_name: string | null;
  platform_role: string;
  user_info: {
    firstname: string;
    middlename: string;
    lastname: string;
    telephone: string | null;
    /** Object storage key for the avatar source — never display directly */
    avatar_file_token: string | null;
  };
  business_unit: BusinessUnit[];
  /** Pre-signed avatar URL (S3 / object storage). Expires — re-fetch profile to refresh */
  avatar_url: string | null;
  /** Pre-signed signature URL (transparent PNG). Expires — re-fetch profile to refresh. Null when unset. */
  signature_url: string | null;
}

export interface CurrentPeriod {
  id: string;
  period: string;
  fiscal_year: number;
  fiscal_month: number;
  start_at: string;
  end_at: string;
  status: string;
}

/**
 * ที่นั่งของ BU — เป็นตัวเลขของ **cluster** ที่ BU นี้สังกัด ไม่ใช่ของ BU เดี่ยว
 * BU ทุกตัวใน cluster เดียวกันได้ค่าชุดเดียวกันซ้ำ ๆ โดยตั้งใจ (pool ระดับ cluster) —
 * ห้ามเอาไปบวกกันข้าม BU
 */
export interface BusinessUnitSeat {
  used: number;
  /** ไม่ nullable — ไม่มีค่าไหนแปลว่า "ไม่จำกัด" ศูนย์ที่นั่งคือศูนย์จริง ๆ */
  cap: number;
  pending_invites: number;
}

/**
 * License ของ BU ที่ platform ขายให้
 *
 * `state` ตอบว่าสัญญาอยู่ในสภาพไหน ส่วน `features` ตอบว่า feature ไหนอยู่ในสัญญา
 * สองชั้นนี้แยกกัน — BU ที่ state เป็น active แต่ไม่มี feature ในลิสต์ก็ใช้ไม่ได้
 *
 * `state: "none"` = ยังไม่เคยขายให้ BU นี้ (ต่างจาก field ที่หายไปทั้งก้อน ดู useLicense)
 * `state: "unresolved"` = backend อ่าน DB ไม่สำเร็จตอนประกอบ block ชั่วคราว — **ไม่ใช่**
 * "ยังไม่เคยซื้อ" ห้าม treat เหมือน none/expired/inactive (backend เองก็ปล่อยผ่านทั้ง
 * request เมื่อเจอค่านี้แม้แค่ BU เดียว)
 */
export interface BusinessUnitLicense {
  state: "active" | "expired" | "inactive" | "none" | "unresolved";
  /** ISO 8601 Z — null เมื่อ state เป็น "none" หรือ "unresolved" */
  end_date: string | null;
  /** feature key ที่อยู่ในสัญญา รวม module ระดับบนและ resource ระดับล่าง เรียงตัวอักษรเสมอ */
  features: string[];
  seat: BusinessUnitSeat;
}

export interface BusinessUnit {
  id: string;
  name: string;
  code: string;
  alias_name: string;
  /** Object storage key for the BU logo — never display directly */
  logo_file_token: string | null;
  is_default: boolean;
  system_level: string;
  is_active: boolean;
  /**
   * Per-BU interface entitlement — `<category>_<brand>` keys the platform licensed for this
   * business unit (e.g. `"pos_micros"`). The UI shows ONLY the listed brands. Absent (backend
   * did not send it / platform selected none) or an empty array → the UI shows nothing.
   */
  enabled_interfaces?: string[];
  /**
   * License ของ BU นี้ — **field ที่หายไปกับ state "none" ความหมายต่างกันสิ้นเชิง**
   *
   * หายไปทั้งก้อน = gateway รุ่นเก่ายังไม่ส่ง → UI ถือว่าไม่จำกัด (กันลำดับ deploy ผิด)
   * มีแต่ state "none" = platform ยังไม่ขายให้ BU นี้ → UI ล็อกทุก module (เมื่อสวิตช์
   * enforcement เปิด — ดู `useLicense`)
   */
  license?: BusinessUnitLicense;
  department: {
    id: string;
    name: string;
  } | null;
  hod_department: { id: string; name: string }[];
  current_period?: CurrentPeriod;
  config: BusinessUnitConfig;
  permissions: string[];
  /** Pre-signed logo URL — for documents (PDF/print). May be wide/landscape. Null when `logo_file_token` is null. */
  logo_url: string | null;
  /** Pre-signed avatar URL — for UI display only (square thumbnail, headers, lists). */
  avatar_url: string | null;
}

export interface BusinessUnitConfig {
  calculation_method: string;
  default_currency_id: string;
  default_currency: {
    code: string;
    name: string;
    symbol: string;
    description: string;
    decimal_places: number;
  } | null;
  hotel: ContactInfo;
  company: ContactInfo;
  tax_no: string;
  branch_no: string;
  date_format: string;
  time_format: string;
  date_time_format: string;
  long_time_format: string;
  short_time_format: string;
  timezone: string;
  perpage_format: NumberFormat;
  amount_format: NumberFormat;
  quantity_format: NumberFormat;
  recipe_format: NumberFormat;
  description: string | null;
  info: unknown;
  is_hq: boolean;
  is_active: boolean;
}

export interface ContactInfo {
  name: string;
  tel: string;
  email: string;
  address: string;
  zip_code: string;
}

interface NumberFormat {
  locales: string;
  minimumIntegerDigits: number;
}
