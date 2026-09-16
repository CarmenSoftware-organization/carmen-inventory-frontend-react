export interface SavedView {
  id: string;
  name: string;
  filters: Record<string, string>;
  sort?: string;
  created_at: string; // ISO UTC
  created_by_id?: string;
}

export interface ListViewsConfigValue {
  views: SavedView[];
}

export type ViewScope = "user" | "bu";

export const MAX_VIEWS_PER_KEY = 50;

export const listViewsConfigKey = (pageKey: string) => `list_views_${pageKey}`;
