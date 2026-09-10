import { useCallback, useMemo, useState } from "react";

import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import type { FilterFieldDef } from "@/types/list-filter";
import type { LucideIcon } from "lucide-react";

/** ช่องกรองหนึ่งช่อง — บอกว่าจะดึง "ค่าที่ใช้กรอง" กับ "ชื่อที่โชว์" มาจากไหน */
export interface PoFilterField<TRow> {
  /** คีย์ของช่อง — ใช้เป็น key ของค่าที่เก็บ ต้องไม่ซ้ำกันในชุดเดียวกัน */
  readonly key: string;
  /** i18n key ของป้ายกำกับ (คีย์เต็มจาก root เช่น `field.product`) */
  readonly labelKey: string;
  /**
   * ไอคอนหน้าแถวในเมนูตัวกรอง — ไม่ระบุแล้ว ListFilterMenu จะหาให้จาก labelKey
   * ก่อน แล้วค่อยตกไปใช้ไอคอนกลางของ control ซึ่งช่อง custom ได้ตัวเดียวกันหมด
   * ระบุเมื่อ labelKey ของช่องนั้นยังไม่มีในตารางของ ListFilterMenu
   */
  readonly icon?: LucideIcon;
  /** ค่าของแถวนี้ในช่องนี้ — `[ค่าที่ใช้กรอง, ชื่อที่โชว์]` */
  readonly of: (row: TRow) => readonly [string, string];
}

interface Option {
  readonly label: string;
  readonly value: string;
}

export interface PoRowFilter<TRow> {
  readonly fields: FilterFieldDef[];
  readonly values: Record<string, string>;
  readonly setValue: (key: string, value: string) => void;
  readonly clearAll: () => void;
  readonly activeCount: number;
  /** แถวนี้ผ่านตัวกรองไหม */
  readonly matches: (row: TRow) => boolean;
}

/** ตัดซ้ำ ตัดค่าว่าง เรียงตามชื่อ */
function toOptions(pairs: readonly (readonly [string, string])[]): Option[] {
  const seen = new Map<string, string>();
  for (const [value, label] of pairs) {
    if (!value || seen.has(value)) continue;
    seen.set(value, label || value);
  }
  return [...seen]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * ตัวกรองแถวฝั่ง client ที่ใช้ UI ชุดเดียวกับ filter ของหน้า list
 *
 * **ตัวเลือกสร้างจากแถวที่โหลดมาแล้ว ไม่ยิง lookup API** — รายชื่อสินค้า/คนใน
 * ระบบมีเป็นร้อยเป็นพัน แต่ตารางตรงหน้ามีไม่กี่แถว ดึงมาทั้งระบบแล้วผู้ใช้ต้อง
 * ไล่หาค่าที่ตัวเองมี ซึ่งช้ากว่าและเลือกค่าที่กรองแล้วเหลือ 0 แถวได้ด้วย
 *
 * ใช้กับตารางที่ **ตัดแถวออกจาก `data` ได้เลย** — ตารางที่ทุก cell ผูกกับ index
 * ของ field array (เช่นตารางสินค้าใน PR/PO) ต้องกรองที่ table ผ่าน `globalFilter`
 * แทน ไม่งั้น index เพี้ยนทั้งตาราง
 *
 * @param rows - แถวทั้งหมดที่โหลดมา (ก่อนกรอง) — ต้องเป็น reference ที่นิ่ง
 * @param fields - นิยามช่องกรอง **ประกาศไว้ระดับ module** ไม่ใช่สร้างใหม่ทุก render
 * @example
 * const FIELDS: PoFilterField<Row>[] = [
 *   { key: "product_id", labelKey: "field.product",
 *     of: (r) => [r.product_id, r.product_name] },
 * ];
 * const filter = usePoRowFilter(rows, FIELDS);
 * const visible = useMemo(() => rows.filter(filter.matches), [rows, filter.matches]);
 */
export function usePoRowFilter<TRow>(
  rows: readonly TRow[],
  fields: readonly PoFilterField<TRow>[],
): PoRowFilter<TRow> {
  const [values, setValues] = useState<Record<string, string>>({});

  const optionsByKey = useMemo(
    () =>
      Object.fromEntries(
        fields.map((f) => [f.key, toOptions(rows.map(f.of))]),
      ) as Record<string, Option[]>,
    [rows, fields],
  );

  const fieldDefs = useMemo<FilterFieldDef[]>(
    () =>
      // control "custom" ไม่ใช่ "multi-select" เพราะ FilterFieldControl แปล
      // labelKey ของตัวเลือกผ่าน t() ส่วนตัวเลือกที่นี่เป็นชื่อจริงจากข้อมูล
      // ไม่ใช่คีย์ i18n
      fields.map(({ key, labelKey, icon }) => ({
        key,
        control: "custom" as const,
        labelKey,
        icon,
        // ไม่มี clause ลง URL — ตัวกรองนี้อยู่ใน state ของหน้า ไม่ใช่ query ของ list
        toClause: () => "",
        render: (value: string, onChange: (next: string) => void) => (
          <MultiSelectFilter
            value={value}
            onChange={onChange}
            options={optionsByKey[key]}
            searchable
            className="w-full"
          />
        ),
      })),
    [fields, optionsByKey],
  );

  const setValue = useCallback(
    (key: string, value: string) => {
      if (!fields.some((f) => f.key === key)) return;
      setValues((prev) => ({ ...prev, [key]: value }));
    },
    [fields],
  );

  const clearAll = useCallback(() => setValues({}), []);

  const activeCount = fields.filter((f) => values[f.key]).length;

  // ต้องคงตัวตนข้าม render — ผู้เรียกเอาไปเป็น dep ของ useMemo ที่คำนวณ `data`
  // ของตาราง ถ้าเปลี่ยนทุกรอบ TanStack จะเห็น data ใหม่ทุกรอบแล้ว autoReset วน
  const matches = useCallback(
    (row: TRow) =>
      fields.every(({ key, of }) => {
        const selected = values[key];
        return !selected || selected.split(",").includes(of(row)[0]);
      }),
    [fields, values],
  );

  return {
    fields: fieldDefs,
    values,
    setValue,
    clearAll,
    activeCount,
    matches,
  };
}
