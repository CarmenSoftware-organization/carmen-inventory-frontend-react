/**
 * License ของผู้ใช้ — มาจาก `GET /api/license` ไม่ใช่ `GET /api/user/profile` อีกแล้ว
 *
 * backend ถอด `business_unit[i].license` ออกจาก profile (breaking change ฝั่ง gateway
 * 2026-09-09) แล้วย้ายมาเป็น endpoint ของตัวเอง เพราะสิทธิ์ที่ FE ใช้วาดเมนูไม่ควรผูก
 * กับ payload ของ profile และต้องมีที่ทางให้สิทธิ์ระดับ user (รวมทุก BU)
 */

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
 * `state: "none"` = ยังไม่เคยขายให้ BU นี้ (ต่างจากก้อนที่หายไปทั้งอัน ดู useLicense)
 * `state: "unresolved"` = backend อ่าน DB ไม่สำเร็จตอนประกอบ block ชั่วคราว — **ไม่ใช่**
 * "ยังไม่เคยซื้อ" ห้าม treat เหมือน none/expired/inactive (backend เองก็ปล่อยผ่านทั้ง
 * request เมื่อเจอค่านี้แม้แค่ BU เดียว)
 *
 * ตั้งแต่ backend เปลี่ยน `resolveBatch` เป็น union (2026-09-09) `features` คือสิทธิ์รวม
 * ของ **ทุกสัญญาที่ active** ของ BU นี้ ไม่ใช่ของใบที่ชนะ best-pick ใบเดียวเหมือนก่อน
 */
export interface BusinessUnitLicense {
  state: "active" | "expired" | "inactive" | "none" | "unresolved";
  /** ISO 8601 Z — null เมื่อ state เป็น "none" หรือ "unresolved" */
  end_date: string | null;
  /** feature key ที่อยู่ในสัญญา รวม module ระดับบนและ resource ระดับล่าง เรียงตัวอักษรเสมอ */
  features: string[];
  /**
   * feature key ที่ platform ปลดระวางแล้ว (`tb_license_feature.state = "hide"`)
   *
   * เป็นลิสต์ **global เดียวกันทุก BU** ไม่ใช่ของที่ BU นี้ซื้อ และ backend ตัดคีย์เหล่านี้
   * ออกจาก `features` มาให้แล้ว — ฝั่งนี้ใช้มันตอบคำถามเดียวคือ "จะซ่อน หรือจะใส่แม่กุญแจ"
   *
   * **optional โดยตั้งใจ** — gateway รุ่นเก่ายังไม่ส่ง field นี้ `undefined` ต้องแปลว่า
   * "ไม่ซ่อนอะไรเลย" (fail-open) ไม่ใช่ "ซ่อนทุกอย่าง"
   */
  hidden_features?: string[];
  /**
   * คีย์ที่ BU นี้เคยมีแต่สัญญาหมดอายุ — **ไม่ทับกับ `features`**
   * `undefined` = backend รุ่นเก่ายังไม่ส่ง ตีความว่า "ไม่มีอะไรหมดอายุ"
   */
  expired_features?: string[];
  seat: BusinessUnitSeat;
}

/**
 * สิทธิ์รวมข้ามทุก BU ที่ผู้ใช้เข้าถึงได้
 *
 * **ไม่มี `state`/`end_date` โดยเจตนาของ backend** — สถานะเป็นของสัญญาราย BU การยุบเป็น
 * ค่าเดียวข้าม BU ทำให้ตีความผิด ใครต้องการสถานะต้องอ่านจาก `business_unit`
 * และ **ไม่มี `seat`** เพราะที่นั่งเป็น pool ของ cluster รวมข้าม cluster ไม่มีความหมาย
 *
 * ⚠️ **ยังไม่มีผู้ใช้ในแอปนี้** — ประกาศไว้ให้ตรงกับ contract เท่านั้น ทุกจุดที่ตัดสิน
 * การล็อก/ซ่อนอ่านจาก `business_unit[<BU ปัจจุบัน>]` เพราะ `union` ตอบไม่ได้ว่าเขียนได้ไหม
 */
export interface LicenseUnion {
  features: string[];
  hidden_features: string[];
  expired_features: string[];
}

/** รูปการตอบกลับของ `GET /api/license` — `business_unit` คีย์ด้วย `business_unit_id` */
export interface UserLicenseResponse {
  union: LicenseUnion;
  business_unit: Record<string, BusinessUnitLicense>;
}
