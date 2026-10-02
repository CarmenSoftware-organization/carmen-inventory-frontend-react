import { useEntitiesByIds } from "@/hooks/use-entities-by-ids";
import { clauseTokens, firstPlusRest } from "@/lib/list-filter-encode";
import {
  entityGetId,
  type AnyEntityFilterSource,
} from "@/components/filter/entity-filter-source";

interface EntityChipValueProps {
  readonly entity: AnyEntityFilterSource;
  readonly value: string;
  /** ข้อความระหว่างรอชื่อ (จำนวนรายการจาก chipValueText) */
  readonly fallback?: string;
}

/**
 * ค่าบน chip ของ field `entity` — ดึงเฉพาะแถวที่ id ถูกเลือก แล้วแสดง "ชื่อแรก +N"
 * query key ตรงกับ EntityMultiFilter (useEntitiesByIds เรียง id ก่อน) เปิด popover
 * ทีหลังจึงไม่ยิงซ้ำ · ระหว่างโหลดตกเป็น fallback (จำนวน) ไม่แสดง id ดิบ
 */
export function EntityChipValue({
  entity,
  value,
  fallback,
}: EntityChipValueProps) {
  const ids = clauseTokens(value);
  const getId = entityGetId(entity);
  const { items } = useEntitiesByIds({
    useListHook: entity.useListHook,
    ids,
    idFilterKey: entity.idFilterKey,
  });
  const names = ids
    .map((id) => items.find((it) => getId(it) === id))
    .filter((it) => it !== undefined)
    .map((it) => entity.getLabel(it));
  return <>{firstPlusRest(names) ?? fallback}</>;
}
