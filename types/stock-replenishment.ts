import { z } from "zod";

const refSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const productLocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: refSchema,
  sub_category: refSchema,
  item_group: refSchema,
  current: z.number().min(0),
  par_level: z.number().min(0),
  need: z.number().min(0),
  status: z.enum(["low", "warning", "critical"]),
});

const locationSchema = z.object({
  location_id: z.string(),
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
