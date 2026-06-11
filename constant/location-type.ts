import { createLabelGetter } from "@/lib/i18n/label-map";
import type { LocationType } from "@/types/physical-count";

const LOCATION_TYPE_LABEL_KEYS = {
  inventory: "typeInventory",
  direct: "typeDirect",
  consignment: "typeConsignment",
} as const satisfies Record<LocationType, string>;

export const getLocationTypeLabel = createLabelGetter(
  LOCATION_TYPE_LABEL_KEYS,
  "consignment",
);
