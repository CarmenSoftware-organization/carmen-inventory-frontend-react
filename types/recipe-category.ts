export interface RecipeCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  note: string | null;
  is_active: boolean;
  parent_id: string | null;
  level: number;
  default_cost_settings: Record<string, unknown> | null;
  default_margins: Record<string, unknown> | null;
  info: Record<string, unknown> | null;
  dimension: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRecipeCategoryDto {
  code: string;
  name: string;
  description: string | null;
  note: string | null;
  is_active: boolean;
  parent_id: string | null;
  level: number;
  default_cost_settings: Record<string, unknown> | null;
  default_margins: Record<string, unknown> | null;
  info: Record<string, unknown> | null;
  dimension: Record<string, unknown> | null;
}
