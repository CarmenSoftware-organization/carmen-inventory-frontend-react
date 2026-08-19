import { useProfile } from "@/hooks/use-profile";
import { useLicense } from "@/hooks/use-license";
import { dispatchPermissionDenied } from "@/components/permission-denied-dialog";
import type { Permission } from "@/constant/permissions";

const ADMIN_LEVEL = "admin";

/**
 * Hook สำหรับเช็คสิทธิ์ของผู้ใช้ปัจจุบันใน BU ที่เลือก (default BU)
 *
 * Admin bypass: ถ้า `defaultBu.system_level === "admin"` ทุก `can`/`canAny`/`canAll`
 * คืน `true` โดยไม่สนค่าใน `permissions[]` — admin ผูกกับ BU ไม่ใช่ระดับ platform
 * เพื่อให้ user เดียวเป็น admin บาง BU แต่ user ปกติใน BU อื่นได้
 *
 * **`can`/`canAny`/`canAll` ไม่เช็ค license โดยตั้งใจ** — ทั้งสามตัวถูกใช้ตัดสิน
 * การ "แสดงผล" ด้วย ไม่ใช่แค่ "ทำ" ถ้าใส่ license เข้าไป ของที่สัญญาหมดอายุจะหายไป
 * จากจอแทนที่จะอ่านได้ ซึ่งขัดข้อตกลง "หมดอายุ = read-only" ตรง ๆ (ดู
 * hooks/use-license.ts และ phase-c-backend-contract.md ข้อ 9) เฉพาะ `guard()`
 * เท่านั้นที่เช็ค `canWrite` เพราะมันถูกใช้กับ handler ที่ "ทำ" อย่างเดียว
 *
 * @example
 * const { can, isAdmin } = useCan();
 * if (can("procurement.purchase_request.create")) { ... }
 */
export function useCan() {
  const { defaultBu } = useProfile();
  const { canWrite } = useLicense();
  const isAdmin = defaultBu?.system_level === ADMIN_LEVEL;
  const permissions = defaultBu?.permissions ?? [];

  const can = (permission: Permission) =>
    isAdmin || permissions.includes(permission);

  const canAny = (list: Permission[]) =>
    isAdmin || list.some((p) => permissions.includes(p));

  const canAll = (list: Permission[]) =>
    isAdmin || list.every((p) => permissions.includes(p));

  /**
   * Wrapper สำหรับ onClick/handler
   *
   * เช็คสองชั้น: สัญญายังเขียนได้ไหม แล้วค่อยเช็คสิทธิ์ของคน — สัญญาหมดอายุมาก่อน
   * เพราะแก้คนละวิธี (ต่ออายุ ไม่ใช่ขอสิทธิ์เพิ่ม) ถ้ามีสิทธิ์แต่เขียนไม่ได้
   * (สัญญาหมด) จะเห็น dialog "expired" ไม่ใช่ "permission"
   *
   * @example
   * <Button onClick={guard(PERMISSIONS.procurement.purchase_request.create, () => openAdd())}>
   */
  const guard =
    <Args extends unknown[]>(
      permission: Permission,
      callback: (...args: Args) => void,
    ) =>
    (...args: Args) => {
      if (!canWrite) {
        // ทั้ง expired และ inactive ใช้ dialog ใบเดียวกัน — ผู้ใช้ปลายทางแก้วิธีเดียวกัน
        // คือติดต่อคนที่ดูแลสัญญา ส่วนความต่างของสองสถานะเป็นเรื่องของฝั่ง platform
        dispatchPermissionDenied(permission, undefined, "expired");
        return;
      }
      if (can(permission)) {
        callback(...args);
        return;
      }
      dispatchPermissionDenied(permission);
    };

  return { can, canAny, canAll, guard, isAdmin, permissions, canWrite };
}
