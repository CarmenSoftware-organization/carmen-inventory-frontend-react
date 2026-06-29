
import { useLocation } from "react-router";
import { findRouteLeaf } from "@/constant/module-list";

/**
 * Auto-derive permission prefix จาก pathname ปัจจุบัน
 *
 * - หา leaf ใน moduleList ที่ match pathname (รวม nested route)
 * - ตัด `.view` ท้าย permission ของ leaf → ได้ prefix สำหรับ `.create`/`.update`/`.delete`
 *
 * ใช้ใน `ConfigListTemplate`, `useConfigTable`, `FormToolbar` เพื่อไม่ต้อง
 * ส่ง permissionPrefix ผ่านทุก layer ของ component
 *
 * @returns prefix เช่น `"configuration.department"` หรือ `undefined` ถ้าไม่มี leaf
 *   หรือ leaf ไม่ระบุ permission
 *
 * @example
 * // pathname = "/config/department/abc-123"
 * // leaf.permission = "configuration.department.view"
 * usePermissionPrefix() // → "configuration.department"
 */
export function usePermissionPrefix(): string | undefined {
  const pathname = useLocation().pathname;
  const leaf = findRouteLeaf(pathname);
  const perm = leaf?.permission;
  if (!perm) return undefined;
  return perm.replace(/\.view$/, "");
}
