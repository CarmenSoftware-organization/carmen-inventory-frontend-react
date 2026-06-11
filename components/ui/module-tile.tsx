
import { SubTile } from "@/components/icons/tiles";
import { useModuleTile } from "@/hooks/use-module-color";

/**
 * ไอคอน illustrated ของ module ปัจจุบัน (SubTile) — derive จาก route ผ่าน
 * `useModuleTile()` ใช้บนหัว list page คู่กับ title
 */
export function ModuleTileIcon() {
  const { name, parentName } = useModuleTile();
  return <SubTile name={name ?? ""} parentName={parentName ?? ""} size={28} />;
}
