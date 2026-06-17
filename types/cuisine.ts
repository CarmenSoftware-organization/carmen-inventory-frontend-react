export interface Cuisine {
  id: string;
  doc_version: number;
  name: string;
  description: string | null;
  note: string | null;
  region: string;
  popular_dishes: string[] | null;
  key_ingredients: string[] | null;
  info: Record<string, unknown> | null;
  dimension: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCuisineDto {
  doc_version?: number;
  name: string;
  description: string | null;
  note: string | null;
  region: string;
  popular_dishes: string[] | null;
  key_ingredients: string[] | null;
  info: Record<string, unknown> | null;
  dimension: string[] | null;
  is_active: boolean;
}
