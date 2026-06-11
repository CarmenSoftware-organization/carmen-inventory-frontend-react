import { useCan } from "@/hooks/use-can";
import { moduleList, type ModuleDto } from "@/constant/module-list";
import type { Permission } from "@/constant/permissions";

export interface ModuleWithAccess extends ModuleDto {
  /** ผู้ใช้ปัจจุบันไม่มีสิทธิ์เข้า leaf นี้ — UI ควรกด แล้วเด้ง dialog แทน */
  denied: boolean;
  subModules?: ModuleWithAccess[];
}

function annotate(
  modules: ModuleDto[],
  can: (permission: Permission) => boolean,
): ModuleWithAccess[] {
  return modules.map((mod) => {
    const { subModules, ...rest } = mod;
    if (subModules && subModules.length > 0) {
      const subs = annotate(subModules, can);
      return {
        ...rest,
        subModules: subs,
        denied: subs.every((s) => s.denied),
      };
    }
    return {
      ...rest,
      subModules: undefined,
      denied: !!mod.permission && !can(mod.permission),
    };
  });
}

function markAll(modules: ModuleDto[]): ModuleWithAccess[] {
  return modules.map((mod) => {
    const { subModules, ...rest } = mod;
    return {
      ...rest,
      subModules: subModules ? markAll(subModules) : undefined,
      denied: false,
    };
  });
}

/**
 * คืน module ทั้งหมด พร้อม flag `denied` ตามสิทธิ์ของผู้ใช้
 *
 * - Admin → ทุก item `denied: false`
 * - User → leaf ที่มี `permission` แต่ไม่ได้รับสิทธิ์จะมี `denied: true`
 *   parent: `denied: true` ก็ต่อเมื่อ child denied หมด
 *
 * Item ที่ `denied: true` ควร render เป็นปุ่มที่กดแล้วเด้ง dialog
 * แทนที่จะ navigate (ดู `dispatchPermissionDenied` ใน permission-denied-dialog)
 *
 * @param modules - tree ที่จะ annotate ถ้าไม่ส่งใช้ `moduleList` ทั้งก้อน
 */
export function useVisibleModules(
  modules: ModuleDto[] = moduleList,
): ModuleWithAccess[] {
  const { can, isAdmin } = useCan();
  if (isAdmin) return markAll(modules);
  return annotate(modules, can);
}
