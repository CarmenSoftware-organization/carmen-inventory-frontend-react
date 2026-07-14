export const NODE_TYPE = {
  CATEGORY: "category",
  SUBCATEGORY: "subcategory",
  ITEM_GROUP: "itemGroup",
} as const;

export type NodeType = (typeof NODE_TYPE)[keyof typeof NODE_TYPE];

export type CategoryType = "category" | "subcategory" | "itemgroup";

export interface CategoryNode {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: NodeType;
  children?: CategoryNode[];
  is_active: boolean;
  price_deviation_limit?: number;
  qty_deviation_limit?: number;
  is_used_in_recipe?: boolean;
  is_sold_directly?: boolean;
  tax_profile_id?: string;
  tax_profile_name?: string;
  tax_rate?: number;
  product_category_id?: string;
  product_subcategory_id?: string;
  itemCount?: number;
  cascade_deviation: boolean;
  /** Optimistic-concurrency token — backend requires it back on update. */
  doc_version?: number;
}

export interface CategoryDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  price_deviation_limit?: number;
  qty_deviation_limit?: number;
  is_used_in_recipe?: boolean;
  is_sold_directly?: boolean;
  tax_profile_id?: string;
  tax_profile_name?: string;
  tax_rate?: number;
  /** Optimistic-concurrency token — backend requires it back on update. */
  doc_version?: number;
}

export interface SubCategoryDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  product_category_id: string;
  price_deviation_limit?: number;
  qty_deviation_limit?: number;
  is_used_in_recipe?: boolean;
  is_sold_directly?: boolean;
  tax_profile_id?: string;
  tax_profile_name?: string;
  tax_rate?: number;
  cascade_deviation: boolean;
  /** Optimistic-concurrency token — backend requires it back on update. */
  doc_version?: number;
}

export interface ItemGroupDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  product_subcategory_id: string;
  price_deviation_limit?: number;
  qty_deviation_limit?: number;
  is_used_in_recipe?: boolean;
  is_sold_directly?: boolean;
  tax_profile_id?: string;
  tax_profile_name?: string;
  tax_rate?: number;
  cascade_deviation: boolean;
  sub_category?: { id: string; code: string; name: string };
  category?: { id: string; code: string; name: string };
  /** Optimistic-concurrency token — backend requires it back on update. */
  doc_version?: number;
}

export interface CreateCategoryDto {
  code?: string;
  name: string;
  description?: string;
  is_active: boolean;
  price_deviation_limit?: number;
  qty_deviation_limit?: number;
  is_used_in_recipe?: boolean;
  is_sold_directly?: boolean;
  tax_profile_id?: string;
  tax_profile_name?: string;
  tax_rate?: number;
  /** Only sent on update for optimistic concurrency; absent on create. */
  doc_version?: number;
}

export interface CreateSubCategoryDto {
  code?: string;
  name: string;
  description?: string;
  is_active: boolean;
  product_category_id: string;
  price_deviation_limit?: number;
  qty_deviation_limit?: number;
  is_used_in_recipe?: boolean;
  is_sold_directly?: boolean;
  tax_profile_id?: string;
  tax_profile_name?: string;
  tax_rate?: number;
  /** Only sent on update for optimistic concurrency; absent on create. */
  doc_version?: number;
}

export interface CreateItemGroupDto {
  code?: string;
  name: string;
  description?: string;
  is_active: boolean;
  product_subcategory_id: string;
  price_deviation_limit?: number;
  qty_deviation_limit?: number;
  is_used_in_recipe?: boolean;
  is_sold_directly?: boolean;
  tax_profile_id?: string;
  tax_profile_name?: string;
  tax_rate?: number;
  /** Only sent on update for optimistic concurrency; absent on create. */
  doc_version?: number;
}
