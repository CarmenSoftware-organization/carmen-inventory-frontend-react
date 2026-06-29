
import { useLocation } from "react-router";
import { getModuleColor } from "@/constant/module-color-map";
import { moduleList, type ModuleDto } from "@/constant/module-list";

/**
 * Hook คืนค่าสี accent ของ module ปัจจุบันตาม pathname
 *
 * อ่าน `pathname` จาก next/navigation แล้ว map ผ่าน `getModuleColor()`
 * ใช้ใน `ModuleTileIcon` บนหัว list page และ badge ของแต่ละ module
 * สีถูก define ไว้ใน `constant/module-color-map.ts`
 *
 * @returns สี (string) ที่แมปกับ module จาก pathname
 * @example
 * ```ts
 * const color = useModuleColor();
 * <span className="h-2 w-2 rounded-full" style={{ background: color }} />
 * ```
 */
export function useModuleColor(): string {
  const pathname = useLocation().pathname;
  return getModuleColor(pathname);
}

/**
 * Hook คืน `{ name, parentName }` ของ submodule ปัจจุบันตาม pathname
 *
 * ใช้กับ `<SubTile>` — `name` = sub.name (= SubTiles key), `parentName` = ชื่อ
 * top module (= palette key) หา parent ด้วย prefix match แล้วเลือก sub ที่
 * เจาะจงสุด (path ยาวสุด) ถ้าไม่ตรง route ใดเลยคืน `{}` (SubTile แสดง fallback)
 *
 * @returns object ของ name และ parentName (อาจ undefined)
 * @example
 * ```ts
 * const { name, parentName } = useModuleTile();
 * <SubTile name={name ?? ""} parentName={parentName ?? ""} />
 * ```
 */
export function useModuleTile(): {
  name?: string;
  parentName?: string;
} {
  const pathname = useLocation().pathname;
  const parent = moduleList.find(
    (m) => pathname === m.path || pathname.startsWith(m.path + "/"),
  );
  if (!parent) return {};

  let best: ModuleDto | undefined;
  for (const sub of parent.subModules ?? []) {
    if (
      (pathname === sub.path || pathname.startsWith(sub.path + "/")) &&
      (!best || sub.path.length > best.path.length)
    ) {
      best = sub;
    }
  }
  return { name: best?.name, parentName: parent.name };
}
