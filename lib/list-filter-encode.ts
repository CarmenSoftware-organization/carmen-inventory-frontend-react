import type { FilterFieldDef } from "@/types/list-filter";
import type { SavedView } from "@/types/list-view";

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

function normalize(
  record: Record<string, string | undefined>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(record).filter(([, v]) => !!v && v.trim() !== ""),
  ) as Record<string, string>;
}

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

/**
 * id/ค่าใน clause ของ field เดียว — อ่านได้ทั้ง `<col>|string:a,b`,
 * รูปเก่าของ MultiSelectFilter `<col>|string:a,<col>|string:b` และค่าเปล่า `a,b`
 */
export function clauseTokens(value: string): string[] {
  return value
    .split(",")
    .map((part) =>
      part.includes(":") ? part.slice(part.lastIndexOf(":") + 1) : part,
    )
    .map((v) => v.trim())
    .filter(Boolean);
}

export function firstPlusRest(names: readonly string[]): string | undefined {
  if (names.length === 0) return undefined;
  return names[0] + (names.length > 1 ? ` +${names.length - 1}` : "");
}
