import { createLabelGetter } from "@/lib/i18n/label-map";
import type { ProductStatusType } from "@/types/product";

const PRODUCT_STATUS_LABEL_KEYS = {
  active: "active",
  inactive: "inactive",
} as const satisfies Record<ProductStatusType, string>;

export const getProductStatusLabel = createLabelGetter(
  PRODUCT_STATUS_LABEL_KEYS,
  "inactive",
);
