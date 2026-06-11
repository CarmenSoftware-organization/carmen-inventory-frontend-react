export interface RecipeImage {
  id: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  url: string;
}

/**
 * One gallery manifest entry. References an existing image by `id` XOR a newly
 * uploaded file by `file_index` (index into the multipart `images` part).
 * Array order = sort_order. At most one item may set `is_primary: true`.
 */
export type RecipeGalleryManifestItem =
  | {
      id: string;
      is_primary?: boolean;
      alt_text?: string | null;
      caption?: string | null;
    }
  | { file_index: number; is_primary?: boolean; alt_text?: string | null };

export interface RecipeCategoryRef {
  id: string;
  name: string;
  code: string;
}

export interface RecipeCuisineRef {
  id: string;
  name: string;
  region: string;
}

export interface RecipeAuditEntry {
  at: string;
  id: string;
  name: string;
}

export interface RecipeAudit {
  created: RecipeAuditEntry;
  updated: RecipeAuditEntry;
}

export interface Recipe {
  id: string;
  code: string;
  name: string;
  description: string | null;
  note: string | null;
  is_active: boolean;
  category_id: string;
  cuisine_id: string;
  difficulty: string;
  base_yield: number;
  base_yield_unit: string;
  default_variant_id: string | null;
  prep_time: number;
  cook_time: number;
  total_ingredient_cost: number;
  labor_cost: number;
  overhead_cost: number;
  cost_per_portion: number;
  suggested_price: number | null;
  selling_price: number | null;
  target_food_cost_percentage: number | null;
  actual_food_cost_percentage: number | null;
  gross_margin: number | null;
  gross_margin_percentage: number | null;
  labor_cost_percentage: number | null;
  overhead_percentage: number | null;
  carbon_footprint: number | null;
  deduct_from_stock: boolean;
  status: string;
  tags: string[];
  allergens: string[];
  published_at: string | null;
  archived_at: string | null;
  category: RecipeCategoryRef;
  cuisine: RecipeCuisineRef;
  // Element shapes returned empty by the API — left untyped until real data is available
  ingredients: unknown[];
  preparation_steps: unknown[];
  yield_variants: unknown[];
  images: RecipeImage[];
  audit: RecipeAudit;
}

export interface CreateRecipeDto {
  code: string;
  name: string;
  description: string | null;
  note: string | null;
  status: string;
  difficulty: string;
  cuisine_id: string;
  category_id: string;
  prep_time: number;
  cook_time: number;
  base_yield: number;
  base_yield_unit: string;
  total_ingredient_cost: number;
  labor_cost: number;
  overhead_cost: number;
  cost_per_portion: number;
  selling_price: number | null;
  suggested_price: number | null;
  gross_margin: number | null;
  gross_margin_percentage: number | null;
  actual_food_cost_percentage: number | null;
  target_food_cost_percentage: number | null;
  labor_cost_percentage: number | null;
  overhead_percentage: number | null;
  allergens: string[];
  tags: string[];
  carbon_footprint: number | null;
  deduct_from_stock: boolean;
  default_variant_id: string | null;
  info: Record<string, unknown> | null;
  dimension: Record<string, unknown> | null;
  is_active: boolean;
}

/**
 * Variables for creating a recipe via multipart.
 * `gallery` present → send manifest + `images`; absent → no images.
 */
export interface CreateRecipeVars extends CreateRecipeDto {
  images?: File[];
  gallery?: RecipeGalleryManifestItem[];
}

/**
 * Variables for updating a recipe via multipart (full-sync gallery).
 * `gallery` present → full-sync (omitted existing ids are deleted); absent → keep all existing.
 */
export interface UpdateRecipeVars extends CreateRecipeDto {
  id: string;
  images?: File[];
  gallery?: RecipeGalleryManifestItem[];
}
