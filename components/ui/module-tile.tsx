import { hasSubTile, SubTile } from "@/components/icons/tiles";
import { useModuleTile } from "@/hooks/use-module-tile";

/**
 * ไอคอน illustrated ของ module ปัจจุบัน (SubTile) — derive จาก route ผ่าน
 * `useModuleTile()` ใช้บนหัว list page คู่กับ title
 *
 * route ที่ยังไม่มี tile ของตัวเอง (หรืออยู่นอก moduleList เช่นหน้าที่ mount
 * ในเทสต์) คืน null ไม่ใช่ tile เปล่าของ `SubTile` — หัวหน้าจะเหลือแค่ title
 * ซึ่งดูตั้งใจกว่าไอคอนว่างที่ไม่สื่ออะไร
 */
export function ModuleTileIcon() {
  const { name, parentName } = useModuleTile();
  if (!name || !hasSubTile(name)) return null;
  return <SubTile name={name} parentName={parentName ?? ""} size={28} />;
}
