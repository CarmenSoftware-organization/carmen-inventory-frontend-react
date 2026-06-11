import { useProfile } from "@/hooks/use-profile";
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
 * @example
 * const { can, isAdmin } = useCan();
 * if (can("procurement.purchase_request.create")) { ... }
 */
export function useCan() {
  const { defaultBu } = useProfile();
  const isAdmin = defaultBu?.system_level === ADMIN_LEVEL;
  const permissions = defaultBu?.permissions ?? [];

  const can = (permission: Permission) =>
    isAdmin || permissions.includes(permission);

  const canAny = (list: Permission[]) =>
    isAdmin || list.some((p) => permissions.includes(p));

  const canAll = (list: Permission[]) =>
    isAdmin || list.every((p) => permissions.includes(p));

  /**
   * Wrapper สำหรับ onClick/handler — ถ้ามีสิทธิ์รัน callback,
   * ถ้าไม่มี dispatch event ให้ `PermissionDeniedDialog` แสดง
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
      if (can(permission)) {
        callback(...args);
        return;
      }
      dispatchPermissionDenied(permission);
    };

  return { can, canAny, canAll, guard, isAdmin, permissions };
}
