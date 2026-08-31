import type { FilterFieldDef } from "@/types/list-filter";
import type { SavedView } from "@/types/list-view";

/**
 * รวมค่า filter ของทุก field เป็น backend filter string (join ";")
 * field ที่ค่าว่างถูกข้าม — ไม่มีสัก field คืน undefined
 */
export function encodeFilterParam(
  fields: readonly FilterFieldDef[],
  values: Record<string, string>,
): string | undefined {
  const clauses = fields
    .map((f) => {
      const v = values[f.key]?.trim();
      if (!v) return "";
      return f.toClause ? f.toClause(v) : v;
    })
    .filter(Boolean);
  return clauses.length > 0 ? clauses.join(";") : undefined;
}

/** ตัด key ที่ค่าว่างออก — ค่าว่าง ≡ ไม่มี key (กัน dirty ปลอม) */
function normalize(
  record: Record<string, string | undefined>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(record).filter(([, v]) => !!v && v.trim() !== ""),
  ) as Record<string, string>;
}

/** view ตรงกับ filter + sort ปัจจุบันหรือไม่ (ใช้คำนวณ dirty state) */
export function viewMatchesCurrent(
  view: SavedView,
  values: Record<string, string>,
  sort: string,
): boolean {
  const a = normalize(view.filters);
  const b = normalize(values);
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if ((a[k] ?? "") !== (b[k] ?? "")) return false;
  }
  return (view.sort ?? "") === (sort ?? "");
}
