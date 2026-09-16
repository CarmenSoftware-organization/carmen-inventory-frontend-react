import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import { transferPayloadSchema } from "@/lib/transfer-handler";
import { INVENTORY_TYPE } from "@/constant/location";
import type { Location } from "@/types/location";

export function createLocationSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    code: z.string().min(1, tv("required", { field: tf("code") })),
    name: z.string().min(1, tv("required", { field: tf("name") })),
    location_type: z.nativeEnum(INVENTORY_TYPE, {
      message: tv("required", { field: tf("locationType") }),
    }),
    physical_count_type: z.enum(["yes", "no"], {
      message: tv("required", { field: tf("physicalCount") }),
    }),
    description: z.string(),
    is_active: z.boolean(),
    delivery_point_id: z
      .string()
      .min(1, tv("required", { field: tf("deliveryPoint") })),
    delivery_point_name: z.string(),
    users: transferPayloadSchema,
    products: transferPayloadSchema,
  });
}

export type LocationFormValues = z.infer<
  ReturnType<typeof createLocationSchema>
>;

const emptyTransfer = { add: [], remove: [] };

export const EMPTY_FORM: LocationFormValues = {
  code: "",
  name: "",
  location_type: "" as unknown as INVENTORY_TYPE,
  physical_count_type: "" as unknown as "yes" | "no",
  description: "",
  is_active: true,
  delivery_point_id: "",
  delivery_point_name: "",
  users: { ...emptyTransfer },
  products: { ...emptyTransfer },
};

export function getDefaultValues(location?: Location): LocationFormValues {
  if (!location) return { ...EMPTY_FORM };
  return {
    code: location.code,
    name: location.name,
    location_type: location.location_type,
    physical_count_type: location.physical_count_type,
    description: location.description,
    is_active: location.is_active,
    delivery_point_id: location.delivery_point?.id ?? "",
    delivery_point_name: location.delivery_point?.name ?? "",
    users: { ...emptyTransfer },
    products: { ...emptyTransfer },
  };
}
