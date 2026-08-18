import { useProfile } from "@/hooks/use-profile";
import { getRuntimeConfig } from "@/lib/runtime-config";
import type { BusinessUnitLicense, BusinessUnitSeat } from "@/types/profile";

/**
 * แปลง permission key เป็น license feature key โดยตัด action ท้ายออก
 *
 * license ถือแค่ resource (`procurement.purchase_request`)
 * ส่วน permission ถือ resource + action (`procurement.purchase_request.create`)
 * กติกาการตัดเหมือน `usePermissionPrefix()` ทุกประการ (ตัดหลังจุด**สุดท้าย**ออก)
 * จึงไม่ต้องเพิ่ม metadata ใน module-list.ts เลยสักบรรทัด
 *
 * @param permission - permission key เช่น "procurement.purchase_request.view"
 * @returns feature key เช่น "procurement.purchase_request"
 */
export function featureKeyOf(permission: string): string {
  const lastDot = permission.lastIndexOf(".");
  return lastDot === -1 ? permission : permission.slice(0, lastDot);
}

export interface LicenseInfo {
  /** false = gateway ยังไม่ส่ง field นี้ ทุกอย่างจึงถือว่าไม่จำกัด */
  hasLicenseData: boolean;
  /**
   * ค่าจริงของสวิตช์ `LICENSE_ENFORCEMENT` (runtime config) ตอนนี้
   * ผู้บริโภคต้องเช็คตัวนี้ก่อนใช้ `state` เสมอ — เมื่อ `false` (shadow mode)
   * `state`/`canWrite`/`isLicensed` ยังรายงานค่าจริงเพื่อ debug ได้ แต่ *พฤติกรรม*
   * ของ `canWrite`/`isLicensed` จะไม่ล็อกอะไรเลยไม่ว่า `state` จะเป็นอะไร
   */
  enforced: boolean;
  state: BusinessUnitLicense["state"];
  endDate: string | null;
  /** เขียนได้เมื่อสัญญายัง active (หรือสวิตช์ปิด/state unresolved) — expired/inactive อ่านได้อย่างเดียว */
  canWrite: boolean;
  /**
   * feature นี้อยู่ในสัญญาไหม
   * ไม่มีข้อมูล license เลย หรือสวิตช์ปิด หรือ state เป็น unresolved → true (ไม่จำกัด)
   */
  isLicensed: (featureKey: string) => boolean;
  seat: BusinessUnitSeat | undefined;
}

/**
 * ตรรกะบริสุทธิ์ของ `useLicense` — แยกออกมาเพื่อ unit test ตรง ๆ โดยไม่ต้อง mock
 * `useProfile`/`runtime-config` (ตามแบบ `interfaceEntitled` ใน use-interface-entitlement.ts)
 *
 * กติกาสำคัญ (อ้างอิง phase-c-backend-contract.md):
 * - `license` เป็น `undefined` (gateway รุ่นเก่ายังไม่ส่ง field) → ไม่จำกัด เสมอ ไม่ว่า `enforced`
 *   จะเป็นอะไร — ต่างจาก `state: "none"` ที่แปลว่า "ไม่เคยซื้อ" โดยตั้งใจ
 * - `enforced === false` (shadow mode ของ FE, mirror `license.enforcement_enabled` ของ backend
 *   ที่ default false เช่นกัน) → ปิดพฤติกรรมล็อกทั้งหมด แม้ `state`/`features` จะบอกว่าไม่มีสิทธิ์
 * - `state === "unresolved"` (backend อ่าน DB ไม่สำเร็จตอนประกอบ block) → ไม่ล็อกและเขียนได้
 *   เหมือนกับที่ `LicenseInterceptor` บน backend ปล่อยผ่านทั้ง request โดยไม่ดูสวิตช์เลย
 *   เมื่อเจอ BU ที่ unresolved แม้แค่ตัวเดียว — ห้าม treat เหมือน expired/inactive/none
 */
export function resolveLicense(
  license: BusinessUnitLicense | undefined,
  enforced: boolean,
): LicenseInfo {
  const hasLicenseData = license != null;
  const state = license?.state ?? "active";
  const endDate = license?.end_date ?? null;

  // ปิดพฤติกรรมล็อกทั้งหมดเมื่อสวิตช์ปิด (shadow mode) หรือ backend ยังตัดสินไม่ได้
  const bypass = !enforced || state === "unresolved";

  return {
    hasLicenseData,
    enforced,
    state,
    endDate,
    canWrite: bypass || state === "active",
    isLicensed: (featureKey: string) =>
      bypass || license == null || license.features.includes(featureKey),
    seat: license?.seat,
  };
}

/**
 * Hook อ่าน license ของ BU ปัจจุบัน
 *
 * ⚠️ **ห้ามใส่ admin bypass** — `useCan()` มี `isAdmin → true` ทุกกรณี (use-can.ts)
 * แต่ license ต้องไม่มี เพราะ admin ของ BU ที่ไม่ได้ซื้อโมดูลก็ยังใช้ไม่ได้
 * นี่คือความต่างที่พลาดง่ายที่สุดเวลาลอก useCan มาแก้ เพราะโครงเหมือนกันทุกบรรทัด
 *
 * @example
 * const { isLicensed, canWrite, enforced } = useLicense();
 * if (enforced && !isLicensed("procurement.purchase_request")) { ... }
 */
export function useLicense(): LicenseInfo {
  const { license } = useProfile();
  const enforced = getRuntimeConfig().LICENSE_ENFORCEMENT ?? false;
  return resolveLicense(license, enforced);
}
