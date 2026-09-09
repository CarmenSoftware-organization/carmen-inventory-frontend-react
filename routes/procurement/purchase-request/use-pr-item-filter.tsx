import { useMemo, useState } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";

import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import type { FilterFieldDef } from "@/types/list-filter";
import type { PrFormValues } from "./pr-form-schema";

/** คีย์ของตัวกรอง = ชื่อฟิลด์ใน item ตรง ๆ ค่าที่เก็บคือ id คั่นด้วย `,` */
const FILTER_KEYS = [
  "location_id",
  "product_id",
  "currency_id",
  "delivery_point_id",
] as const;

type FilterKey = (typeof FILTER_KEYS)[number];

type FilterValues = Record<FilterKey, string>;

const EMPTY_VALUES: FilterValues = {
  location_id: "",
  product_id: "",
  currency_id: "",
  delivery_point_id: "",
};

interface Option {
  readonly label: string;
  readonly value: string;
}

/** id + ชื่อที่จะโชว์ ของ field หนึ่งในทุกแถว — ตัดซ้ำ ตัดค่าว่าง เรียงตามชื่อ */
function optionsOf(
  items: readonly Record<string, unknown>[],
  idField: string,
  labelField: string,
): Option[] {
  const seen = new Map<string, string>();
  for (const item of items) {
    const id = item?.[idField];
    if (typeof id !== "string" || !id) continue;
    const label = item?.[labelField];
    if (seen.has(id)) continue;
    seen.set(id, typeof label === "string" && label ? label : id);
  }
  return [...seen]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export interface PrItemFilter {
  readonly fields: FilterFieldDef[];
  readonly values: Record<string, string>;
  readonly setValue: (key: string, value: string) => void;
  readonly clearAll: () => void;
  readonly activeCount: number;
  /**
   * ค่าที่ส่งเข้า `globalFilter` ของ table — ว่าง = ไม่กรอง (TanStack ข้าม
   * filter model ไปเลย) เปลี่ยนเมื่อไรตารางคำนวณใหม่
   */
  readonly signature: string;
  /** แถว index นี้ผ่านตัวกรองไหม (index = ตำแหน่งใน field array ของฟอร์ม) */
  readonly matches: (index: number) => boolean;
}

/**
 * ตัวกรองแถวของตารางรายการสินค้าใน PR — ค่าทั้งหมดมาจากฝั่ง client
 *
 * ตัวเลือกของแต่ละช่องสร้างจาก**แถวที่มีอยู่จริงในใบนี้** ไม่ยิง lookup API เพราะ
 * รายชื่อคลัง/สินค้าทั้งระบบมีเป็นพัน แต่ใบหนึ่งมีไม่กี่ค่า — เอามาทั้งระบบแล้ว
 * ผู้ใช้ต้องไล่หาค่าที่ตัวเองมี ซึ่งช้ากว่าและเลือกค่าที่กรองแล้วได้ 0 แถวได้ด้วย
 *
 * อ่านค่าผ่าน `useWatch` ไม่ใช่ `fields` ของ field array เพราะ field array เป็น
 * snapshot ตอน mount — พิมพ์แก้คลัง/สินค้าแล้วตัวเลือกต้องขยับตาม
 *
 * ผลของการกรองส่งออกเป็น `matches(index)` ไม่ใช่ array ที่กรองแล้ว เพราะทุก cell
 * ผูกกับ `items.${index}` ของฟอร์ม การตัดแถวออกจาก `data` จะทำให้ index เพี้ยนทั้ง
 * ตาราง (เหตุผลเดียวกับที่ sorting ทำที่ table ไม่ใช่ที่ data)
 */
export function usePrItemFilter(form: UseFormReturn<PrFormValues>): PrItemFilter {
  const [values, setValues] = useState<FilterValues>(EMPTY_VALUES);

  const items = useWatch({ control: form.control, name: "items" });

  const optionsByKey = useMemo(() => {
    // `?? []` ต้องอยู่ในนี้ ไม่ใช่ข้างนอก — array ใหม่ทุก render จะทำให้ memo พัง
    const rows = items ?? [];
    return {
      location_id: optionsOf(rows, "location_id", "location_name"),
      product_id: optionsOf(rows, "product_id", "product_name"),
      currency_id: optionsOf(rows, "currency_id", "currency_code"),
      delivery_point_id: optionsOf(
        rows,
        "delivery_point_id",
        "delivery_point_name",
      ),
    };
  }, [items]);

  const fields = useMemo<FilterFieldDef[]>(() => {
    // control "custom" ไม่ใช่ "multi-select" เพราะ FilterFieldControl แปล labelKey
    // ผ่าน t() ส่วนตัวเลือกที่นี่เป็นชื่อคลัง/สินค้าจริง ไม่ใช่คีย์ i18n
    // (ทรงเดียวกับช่องสถานะของ filter หน้า list — use-pr-filter-fields.tsx)
    const field = (key: FilterKey, labelKey: string): FilterFieldDef => ({
      key,
      control: "custom",
      labelKey,
      // ไม่มี clause ลง URL — ตัวกรองนี้อยู่ใน state ของฟอร์ม ไม่ใช่ query ของ list
      toClause: () => "",
      render: (value, onChange) => (
        <MultiSelectFilter
          value={value}
          onChange={onChange}
          options={optionsByKey[key]}
          searchable
          className="w-full"
        />
      ),
    });

    return [
      field("location_id", "field.location"),
      field("product_id", "field.product"),
      field("currency_id", "field.currency"),
      field("delivery_point_id", "field.deliveryPoint"),
    ];
  }, [optionsByKey]);

  const setValue = (key: string, value: string) => {
    if (!FILTER_KEYS.includes(key as FilterKey)) return;
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const clearAll = () => setValues(EMPTY_VALUES);

  const activeCount = FILTER_KEYS.filter((k) => values[k]).length;
  const signature = FILTER_KEYS.map((k) => `${k}=${values[k]}`)
    .filter((s) => !s.endsWith("="))
    .join("&");

  const matches = (index: number) => {
    if (!signature) return true;
    const item = form.getValues(`items.${index}`);
    return FILTER_KEYS.every((key) => {
      const selected = values[key];
      if (!selected) return true;
      return selected.split(",").includes(String(item?.[key] ?? ""));
    });
  };

  return { fields, values, setValue, clearAll, activeCount, signature, matches };
}
