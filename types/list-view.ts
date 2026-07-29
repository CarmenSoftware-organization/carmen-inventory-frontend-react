/** Saved view หนึ่งชุดของหน้า list — filters เก็บค่า URL param ดิบต่อ field */
export interface SavedView {
  id: string;
  name: string;
  /** key = ชื่อ URL param (เช่น "filter", "department"), value = ค่าตามที่อยู่ใน URL */
  filters: Record<string, string>;
  /** "field:asc|desc" — optional, ไม่มี = ใช้ default sort ของหน้า */
  sort?: string;
  created_at: string; // ISO UTC
  created_by_id?: string;
}

export interface ListViewsConfigValue {
  views: SavedView[];
}

export type ViewScope = "user" | "bu";

export const MAX_VIEWS_PER_KEY = 50;

/** config key ของ saved views: list_views_<pageKey> (ใช้ทั้ง BU และ user scope) */
export const listViewsConfigKey = (pageKey: string) => `list_views_${pageKey}`;
