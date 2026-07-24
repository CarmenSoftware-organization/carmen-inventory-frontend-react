import type { Audit } from "./audit";

export interface RecipeCategory {
  id: string;
  doc_version: number;
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
  // list/detail response omit raw created/updated fields — gateway enrich เป็น audit object
  audit?: Audit;
}

export interface CreateRecipeCategoryDto {
  doc_version?: number;
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
