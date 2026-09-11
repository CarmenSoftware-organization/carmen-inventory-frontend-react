import { useTranslations } from "use-intl";

import { useCan } from "@/hooks/use-can";
import { usePermissionPrefix } from "@/hooks/use-permission-prefix";
import { buildPermissionKey, type Permission } from "@/constant/permissions";

export interface DeleteGate {
  /** ไม่มีสิทธิ์ `<prefix>.delete` — ปุ่มยัง dim แต่กดได้ แล้วเด้ง permission dialog */
  readonly deleteDenied: boolean;
  /** key ที่จะส่งไปกับ dialog — `undefined` เมื่อ route นี้ไม่มี permission prefix */
  readonly deletePermission: Permission | undefined;
  /** สัญญาหมดอายุ/ถูกระงับ — ปิดปุ่มจริง ไม่ใช่แค่ dim */
  readonly writeDisabled: boolean;
  /** Tooltip ของปุ่มที่ถูกปิดด้วย `writeDisabled` */
  readonly writeDisabledTitle: string | undefined;
}

/**
 * สถานะของปุ่ม "ลบ" ในหน้าปัจจุบัน — permission + license ในก้อนเดียว
 *
 * เดิมตรรกะชุดนี้อยู่ใน `useConfigTable` ที่เดียว ตารางที่ประกอบ column เองจึงส่ง
 * `actionColumn(onDelete)` เปล่า ๆ แล้วปุ่มลบไม่ถูกเช็คสิทธิ์เลย (เปิด dialog ยืนยัน
 * แล้วไปตาย 403 เอาข้างหน้า) ส่วนการ์ดในโหมด grid ยิ่งหนักกว่านั้นเพราะ
 * `ConfigListTemplate` ส่ง `setDeleteTarget` ให้ตรง ๆ — ตารางกับการ์ดของหน้าเดียวกัน
 * จึงเคยคุมสิทธิ์คนละแบบ hook นี้คือจุดเดียวที่ทั้งสองทางอ่านร่วมกัน
 *
 * **license มาก่อน permission เสมอ** — แก้คนละวิธี (ต่ออายุ ไม่ใช่ขอสิทธิ์) ผู้เรียก
 * ต้องเช็ค `writeDisabled` ก่อน `deleteDenied` ตามลำดับเดียวกับ `FormToolbar`
 *
 * @param permissionPrefix - บังคับ prefix เอง ไม่ส่ง = derive จาก route ปัจจุบัน
 * @example
 * const gate = useDeleteGate();
 * actionColumn<Role>(onDelete, { ...gate, activity: {...} })
 */
export function useDeleteGate(permissionPrefix?: string): DeleteGate {
  const { can, isAdmin, canWrite } = useCan();
  const tl = useTranslations("license");
  const autoPrefix = usePermissionPrefix();
  const prefix = permissionPrefix ?? autoPrefix;

  const deletePermission = prefix
    ? buildPermissionKey(prefix, "delete")
    : undefined;

  return {
    deleteDenied: !!deletePermission && !isAdmin && !can(deletePermission),
    deletePermission,
    writeDisabled: !canWrite,
    writeDisabledTitle: canWrite ? undefined : tl("writeDisabledTitle"),
  };
}
