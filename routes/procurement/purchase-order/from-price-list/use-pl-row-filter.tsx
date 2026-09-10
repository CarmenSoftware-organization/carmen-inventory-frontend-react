import { useCallback, useMemo, useState } from "react";

import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import type { FilterFieldDef } from "@/types/list-filter";

/**
 * รูปร่างขั้นต่ำของแถวที่กรองได้ — ประกาศเป็น structural type ไม่ import `PlRow`
 * จาก step-select-items เพื่อไม่ให้สองไฟล์อ้างกันไปมา
 */
interface FilterableRow {
  readonly detail: {
    readonly product_id: string;
    readonly product_name: string;
  };
  readonly currency: { readonly id: string; readonly code: string };
}

const FILTER_KEYS = ["product_id", "currency_id"] as const;

type FilterKey = (typeof FILTER_KEYS)[number];

type FilterValues = Record<FilterKey, string>;

const EMPTY_VALUES: FilterValues = { product_id: "", currency_id: "" };

interface Option {
  readonly label: string;
  readonly value: string;
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

export interface PlRowFilter {
  readonly fields: FilterFieldDef[];
  readonly values: Record<string, string>;
  readonly setValue: (key: string, value: string) => void;
  readonly clearAll: () => void;
  readonly activeCount: number;
  /** แถวนี้ผ่านตัวกรองไหม */
  readonly matches: (row: FilterableRow) => boolean;
}

/**
 * กรองแถว price list ฝั่ง client — ท่าเดียวกับตัวกรองรายการสินค้าของ PR
 * (`use-pr-item-filter.tsx`) แต่กรองจาก array ตรง ๆ ได้เลย เพราะตารางนี้ผูก cell
 * กับ `pricelist_detail_id` ไม่ใช่ index ของ field array — ตัดแถวออกจากที่ render
 * แล้ว index ไม่เพี้ยนตามเหมือนฝั่ง PR
 *
 * ตัวเลือกสร้างจากแถวที่โหลดมาแล้วทั้งหมด ไม่ยิง lookup API — price list ของผู้ขาย
 * รายหนึ่งมีสินค้าไม่กี่ตัว เอารายชื่อสินค้าทั้งระบบมาให้เลือกจะเลือกค่าที่กรองแล้ว
 * ได้ 0 แถวได้ด้วย
 */
export function usePlRowFilter(allRows: readonly FilterableRow[]): PlRowFilter {
  const [values, setValues] = useState<FilterValues>(EMPTY_VALUES);

  const optionsByKey = useMemo(
    () => ({
      product_id: toOptions(
        allRows.map(
          (r) => [r.detail.product_id, r.detail.product_name] as const,
        ),
      ),
      currency_id: toOptions(
        allRows.map((r) => [r.currency.id, r.currency.code] as const),
      ),
    }),
    [allRows],
  );

  const fields = useMemo<FilterFieldDef[]>(() => {
    // control "custom" ไม่ใช่ "multi-select" เพราะ FilterFieldControl แปล labelKey
    // ผ่าน t() ส่วนตัวเลือกที่นี่เป็นชื่อสินค้า/สกุลเงินจริง ไม่ใช่คีย์ i18n
    const field = (key: FilterKey, labelKey: string): FilterFieldDef => ({
      key,
      control: "custom",
      labelKey,
      // ไม่มี clause ลง URL — ตัวกรองนี้อยู่ใน state ของ wizard ไม่ใช่ query ของ list
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
      field("product_id", "field.product"),
      field("currency_id", "field.currency"),
    ];
  }, [optionsByKey]);

  const setValue = (key: string, value: string) => {
    if (!FILTER_KEYS.includes(key as FilterKey)) return;
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const clearAll = () => setValues(EMPTY_VALUES);

  const activeCount = FILTER_KEYS.filter((k) => values[k]).length;

  // ต้องคงตัวตนข้าม render — ผู้เรียกเอาไปเป็น dep ของ useMemo ที่คำนวณ `data`
  // ของตาราง ถ้าเปลี่ยนทุกรอบ TanStack จะเห็น data ใหม่ทุกรอบแล้ว autoReset วน
  const matches = useCallback(
    (row: FilterableRow) => {
      const picked = {
        product_id: row.detail.product_id,
        currency_id: row.currency.id,
      };
      return FILTER_KEYS.every(
        (key) => !values[key] || values[key].split(",").includes(picked[key]),
      );
    },
    [values],
  );

  return { fields, values, setValue, clearAll, activeCount, matches };
}
