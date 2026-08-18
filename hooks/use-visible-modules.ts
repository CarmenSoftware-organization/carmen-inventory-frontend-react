import { useCan } from "@/hooks/use-can";
import { useLicense, licenseFeatureOf } from "@/hooks/use-license";
import { moduleList, type ModuleDto } from "@/constant/module-list";
import type { Permission } from "@/constant/permissions";

export interface ModuleWithAccess extends ModuleDto {
  /** ผู้ใช้ปัจจุบันไม่มีสิทธิ์เข้า leaf นี้ — UI ควรกด แล้วเด้ง dialog แทน */
  denied: boolean;
  /** BU ปัจจุบันไม่ได้ซื้อ feature นี้ — คนละเรื่องกับ denied และแก้ด้วยเงินไม่ใช่สิทธิ์ */
  locked: boolean;
  subModules?: ModuleWithAccess[];
}

/**
 * ตรรกะบริสุทธิ์ของ annotate สาย non-admin — export ไว้ unit test ตรง ๆ
 * (ตามแบบ `resolveLicense` ใน use-license.ts) โดยไม่ต้อง mock useCan/useLicense
 */
export function annotate(
  modules: ModuleDto[],
  can: (permission: Permission) => boolean,
  isLicensed: (featureKey: string) => boolean,
): ModuleWithAccess[] {
  return modules.map((mod) => {
    const { subModules, ...rest } = mod;
    if (subModules && subModules.length > 0) {
      const subs = annotate(subModules, can, isLicensed);
      return {
        ...rest,
        subModules: subs,
        denied: subs.every((s) => s.denied),
        // parent locked ก็ต่อเมื่อ child locked หมด — กติกาเดียวกับ denied
        locked: subs.every((s) => s.locked),
      };
    }
    const feature = licenseFeatureOf(mod);
    return {
      ...rest,
      subModules: undefined,
      denied: !!mod.permission && !can(mod.permission),
      locked: !!feature && !isLicensed(feature),
    };
  });
}

/**
 * Admin ข้าม permission ได้ทุกอย่าง แต่ **ข้าม license ไม่ได้**
 * จึงยัง annotate locked ตามปกติ ต่างจาก denied ที่บังคับเป็น false
 *
 * Export ไว้ unit test ตรง ๆ เช่นเดียวกับ `annotate` — เคสบังคับที่สุดคือ
 * "admin + ไม่มี license → ยัง locked" ซึ่งเป็นบั๊กที่ทำให้ licensing ไร้ความหมาย
 * ถ้าฟังก์ชันนี้คืน `locked: false` เสมอ
 */
export function markAll(
  modules: ModuleDto[],
  isLicensed: (featureKey: string) => boolean,
): ModuleWithAccess[] {
  return modules.map((mod) => {
    const { subModules, ...rest } = mod;
    if (subModules && subModules.length > 0) {
      const subs = markAll(subModules, isLicensed);
      return {
        ...rest,
        subModules: subs,
        denied: false,
        locked: subs.every((s) => s.locked),
      };
    }
    const feature = licenseFeatureOf(mod);
    return {
      ...rest,
      subModules: undefined,
      denied: false,
      locked: !!feature && !isLicensed(feature),
    };
  });
}

/**
 * คืน module ทั้งหมด พร้อม flag `denied`/`locked` ตามสิทธิ์และสัญญาของผู้ใช้
 *
 * - `denied` — ผู้ใช้ไม่มีสิทธิ์ RBAC เข้า leaf นี้
 *   - Admin → ทุก item `denied: false` เสมอ (admin ข้าม permission ได้)
 *   - User → leaf ที่มี `permission` แต่ไม่ได้รับสิทธิ์จะมี `denied: true`
 *   - parent: `denied: true` ก็ต่อเมื่อ child denied หมด
 * - `locked` — BU ปัจจุบันไม่ได้ซื้อ feature นี้ (license) คนละเรื่องกับ `denied`
 *   - **ไม่มี admin bypass** — admin ของ BU ที่ไม่ได้ซื้อโมดูลก็ยัง `locked: true`
 *     (license ไม่มีแนวคิดเรื่อง role เลย ต่างจาก permission)
 *   - parent: `locked: true` ก็ต่อเมื่อ child locked หมด เหมือนกติกาของ denied
 *
 * Item ที่ `denied`/`locked` เป็น true ควร render เป็นปุ่มที่กดแล้วเด้ง dialog
 * แทนที่จะ navigate (ดู `dispatchPermissionDenied` ใน permission-denied-dialog)
 *
 * @param modules - tree ที่จะ annotate ถ้าไม่ส่งใช้ `moduleList` ทั้งก้อน
 */
export function useVisibleModules(
  modules: ModuleDto[] = moduleList,
): ModuleWithAccess[] {
  const { can, isAdmin } = useCan();
  const { isLicensed } = useLicense();
  if (isAdmin) return markAll(modules, isLicensed);
  return annotate(modules, can, isLicensed);
}
