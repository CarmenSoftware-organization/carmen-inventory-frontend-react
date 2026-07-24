import { z } from "zod";
import type { UseFormReturn } from "react-hook-form";

import type { TranslationFn } from "@/lib/i18n-schema";
import type { Audit } from "./audit";

export type ProductStatusType = "active" | "inactive";

export interface ProductInfoItem {
  label: string;
  value: string;
  data_type: string;
}

export interface ProductUnitConversion {
  id?: string;
  from_unit_id: string;
  from_unit_qty: number;
  to_unit_id: string;
  to_unit_qty: number;
  description: string;
  is_default: boolean;
  is_active: boolean;
}

export interface ProductLocationItem {
  id?: string;
  location_id: string;
  location_code?: string;
  location_name?: string;
  location_type?: string;
  is_active?: boolean;
  delivery_point_id?: string;
  delivery_point?: string;
  min_qty?: number | null;
  max_qty?: number | null;
  re_order_qty?: number | null;
  par_qty?: number | null;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  local_name: string;
  product_status_type: ProductStatusType;
  inventory_unit: { id: string; name: string };
  product_item_group: { id?: string; name: string } | null;
  product_sub_category: { id?: string; name: string } | null;
  product_category: { id?: string; name: string } | null;
  // list/detail response omit raw created/updated fields — gateway enrich เป็น audit object
  audit?: Audit;
}

export interface ProductDetail extends Product {
  description: string;
  tax_profile_id: string;
  tax_profile_name: string | null;
  tax_rate: number;
  is_used_in_recipe: boolean;
  is_sold_directly: boolean;
  barcode: string | null;
  sku: string | null;
  price: number | null;
  price_deviation_limit: number | null;
  qty_deviation_limit: number | null;
  info: ProductInfoItem[];
  locations: ProductLocationItem[];
  order_units: ProductUnitConversion[];
  ingredient_units: ProductUnitConversion[];
  doc_version?: number;
}

export interface LocationPairProduct {
  product_id: string;
  product_code: string;
  product_name: string;
  product_local_name: string;
  product_sku: string | null;
  inventory_unit_id: string;
  inventory_unit_name: string;
}

/* ------------------------------------------------------------------ */
/* Attribute label options (Section 4.3)                              */
/* ------------------------------------------------------------------ */

export const PRODUCT_ATTRIBUTE_LABELS = [
  "allergens",
  "calories",
  "serving_size",
  "storage",
  "shelf_life",
  "brand",
  "color",
  "size",
  "weight",
  "dimensions",
  "material",
  "country_of_origin",
  "voltage",
  "wattage",
  "warranty",
] as const;

/* ------------------------------------------------------------------ */
/* Zod schema                                                         */
/* ------------------------------------------------------------------ */

function createUnitConversionSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    id: z.string().optional(),
    from_unit_id: z.string(),
    from_unit_qty: z.coerce
      .number()
      .min(1, tv("minNumber", { field: tf("fromQty"), min: 1 })),
    to_unit_id: z.string(),
    to_unit_qty: z.coerce
      .number()
      .min(1, tv("minNumber", { field: tf("toQty"), min: 1 })),
    description: z.string(),
    is_default: z.boolean(),
    is_active: z.boolean(),
  });
}

function createLocationSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    id: z.string().optional(),
    location_id: z
      .string()
      .min(1, tv("required", { field: tf("location") })),
    location_code: z.string().nullable().optional(),
    location_name: z.string().nullable().optional(),
    location_type: z.string().nullable().optional(),
    is_active: z.boolean().nullable().optional(),
    delivery_point_id: z.string().nullable().optional(),
    delivery_point: z.string().nullable().optional(),
    min_qty: z.preprocess((v) => (v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v)), z.number().nullable().optional()),
    max_qty: z.preprocess((v) => (v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v)), z.number().nullable().optional()),
    re_order_qty: z.preprocess((v) => (v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v)), z.number().nullable().optional()),
    par_qty: z.preprocess((v) => (v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v)), z.number().nullable().optional()),
  });
}

export function createProductSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    name: z.string().min(1, tv("required", { field: tf("name") })),
    code: z.string().optional(),
    local_name: z
      .string()
      .min(1, tv("required", { field: tf("localName") }))
      .max(100, tv("maxLength", { field: tf("localName"), max: 100 })),
    description: z
      .string()
      .max(256, tv("maxLength", { field: tf("description"), max: 256 }))
      .optional()
      .or(z.literal("")),
    inventory_unit_id: z
      .string()
      .min(1, tv("required", { field: tf("inventoryUnit") })),
    product_item_group_id: z
      .string()
      .min(1, tv("required", { field: tf("itemGroup") })),
    product_status_type: z.enum(["active", "inactive"]),
    tax_profile_id: z
      .string()
      .nullable()
      .transform((v) => v ?? ""),
    is_used_in_recipe: z.boolean(),
    is_sold_directly: z.boolean(),
    barcode: z.string().optional().or(z.literal("")),
    sku: z.string().optional().or(z.literal("")),
    price: z.coerce
      .number()
      .nullable()
      .refine(
        (v) => v != null && v >= 0,
        tv("minNumber", { field: tf("price"), min: 0 }),
      ),
    price_deviation_limit: z.coerce.number().min(0).max(100).nullable(),
    qty_deviation_limit: z.coerce.number().min(0).max(100).nullable(),
    info: z.array(
      z.object({
        label: z.string().min(1, tv("required", { field: tf("name") })),
        value: z.string(),
        data_type: z.string(),
      }),
    ),
    locations: z.array(createLocationSchema(tv, tf)),
    order_units: z.array(createUnitConversionSchema(tv, tf)),
    ingredient_units: z.array(createUnitConversionSchema(tv, tf)),
  });
}

export type ProductFormValues = z.infer<ReturnType<typeof createProductSchema>>;
export type ProductFormInstance = UseFormReturn<ProductFormValues>;

type UnitPayload = Omit<ProductUnitConversion, "id">;

export interface LocationPayload {
  location_id: string;
  min_qty: number | null;
  max_qty: number | null;
  re_order_qty: number | null;
  par_qty: number | null;
}

export interface CreateProductDto {
  name: string;
  code?: string;
  local_name: string;
  description: string;
  inventory_unit_id: string;
  product_item_group_id: string;
  product_status_type: ProductStatusType;
  tax_profile_id: string | null;
  price_deviation_limit: number | null;
  qty_deviation_limit: number | null;
  product_info: {
    is_used_in_recipe: boolean;
    is_sold_directly: boolean;
    barcode: string;
    sku: string;
    price: number | null;
    info: ProductInfoItem[];
  };
  locations?: {
    add?: LocationPayload[];
    update?: (LocationPayload & { id: string })[];
    remove?: { id: string }[];
  };
  order_units?: {
    add?: UnitPayload[];
    update?: (UnitPayload & { product_order_unit_id: string })[];
    remove?: { product_order_unit_id: string }[];
  };
  ingredient_units?: {
    add?: UnitPayload[];
    update?: (UnitPayload & { id: string })[];
    remove?: { id: string }[];
  };
}
