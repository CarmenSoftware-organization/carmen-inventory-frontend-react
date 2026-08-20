import { z } from "zod";

const refSchema = z.object({
  id: z.string(),
  name: z.string(),
});

// shape ตาม GET /api/{bu}/stock-replenishment ของจริง (2026-08-20)
const productLocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: refSchema,
  sub_category: refSchema,
  item_group: refSchema,
  on_hand_qty: z.number(),
  min_qty: z.number(),
  max_qty: z.number(),
  par_qty: z.number(),
  reorder_qty: z.number(),
  status: z.enum(["low", "warning", "critical"]),
  product_location_id: z.string(),
  code: z.string(),
  local_name: z.string().nullish(),
});

const locationSchema = z.object({
  location_id: z.string(),
  location_code: z.string(),
  location_name: z.string(),
  products_location: z.array(productLocationSchema),
});

const locationsSchema = z.array(locationSchema);

type ProductLocation = z.infer<typeof productLocationSchema>;
type Location = z.infer<typeof locationSchema>;
type Locations = z.infer<typeof locationsSchema>;

export {
  productLocationSchema,
  locationSchema,
  locationsSchema,
  type ProductLocation,
  type Location,
  type Locations,
};
