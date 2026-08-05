import { useLocation } from "react-router";
import { moduleList, type ModuleDto } from "@/constant/module-list";

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
